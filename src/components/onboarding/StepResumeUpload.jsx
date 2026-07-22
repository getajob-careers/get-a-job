import React, { useState, useRef, useEffect } from "react";

// PDF text extraction is server-side via the `extract-cv-text` edge
// function. The browser pdfjs path was repeatedly broken on iOS Safari
// <17.4 by missing modern JS APIs (Promise.withResolvers et al.); the
// Deno runtime on Supabase Edge has the full surface, so parsing moved
// off the device. See supabase/functions/extract-cv-text/index.ts.
//
// IMPORTANT: callers must finish the storage upload (and ideally the
// signed-URL roundtrip) BEFORE invoking — the server reads the uploaded
// copy, and an unawaited upload races into a 404.
// Throws an Error with `.code` set to extract-cv-text's structured
// error_code (e.g. "empty_text", "pdf_parse_failed") so handleFile's
// catch can branch on it. supabase-js v2 stuffs the raw Response into
// error.context.response — we clone() because reading the body
// consumes the stream and other code may want it.
async function extractTextFromPdfServer(filePath, signal) {
  const { data, error } = await supabase.functions.invoke("extract-cv-text", {
    body: { file_path: filePath },
    ...(signal ? { signal } : {}),
  });
  if (error) {
    let code = null;
    let serverMessage = null;
    try {
      const body = await error.context?.response?.clone?.().json();
      code = body?.error_code || null;
      serverMessage = body?.error || null;
    } catch {
      /* non-JSON body (relay/fetch error) — fall back to error.message */
    }
    const e = new Error(serverMessage || error.message || "PDF parse failed");
    e.code = code;
    throw e;
  }
  const text = data?.text || "";
  if (!text) {
    // Defensive: 2xx response with empty text shouldn't happen (the
    // function returns 422 + error_code="empty_text" instead), but if
    // a future regression sneaks one through, treat it the same way.
    const e = new Error("Couldn't extract text from this PDF.");
    e.code = "empty_text";
    throw e;
  }
  return text;
}

async function extractTextFromDocx(file) {
  const { default: mammoth } = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

function isDocxFile(file) {
  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return true;
  return /\.docx$/i.test(file.name || "");
}

import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { getPendingCv, clearPendingCv } from "@/lib/pendingCv";
import { track, EVENTS } from "@/lib/analytics";
import { buildResumeExtractionPrompt } from "@/lib/resumeExtractionPrompt";
import { parseExtractedJson } from "@/lib/parseExtractedJson";
import { logOnboardingEvent } from "@/lib/logOnboardingEvent";
import {
  resilientUploadEnabled,
  withTimeout,
  UPLOAD_TIMEOUT_MS,
  PARSE_TIMEOUT_MS,
} from "@/lib/onboardingUploadResiliency";

import {
  Loader2,
  Upload,
  CheckCircle2,
  ArrowRight,
  Info,
  ExternalLink,
  X,
  GraduationCap,
  Briefcase,
  Search,
  Pause,
  Sparkles,
} from "lucide-react";
import RdButton from "@/components/redesign/RdButton";

// StepResumeUpload — restyled for PR 2A.
// Behaviour identical to the Direction-3 version; only the visual layer
// changes. Employment-status XOR (PR #64) rules preserved verbatim:
//   - `unemployed` ⊕ `employed`, `unemployed` ⊕ `looking_for_job`
//   - `employed` ⊕ `looking_for_job`
//   - `student` + `freelance` stack with everything
// Resume-parse pipeline (ai-chat + extract-proof-signals in parallel)
// preserved verbatim — onExtracted/onChange contracts unchanged.

const LI_EXPORT_DISMISS_KEY = "gaj.onb.li_export_dismissed";

const EMPLOYMENT_OPTIONS = [
  { value: "student", label: "Student", Icon: GraduationCap },
  { value: "employed", label: "Have a job", Icon: Briefcase },
  { value: "looking_for_job", label: "Looking for a job", Icon: Search },
  { value: "unemployed", label: "Unemployed", Icon: Pause },
  { value: "freelance", label: "Freelancing", Icon: Sparkles },
];

const UNEMPLOYED_CONFLICTS = ["employed", "looking_for_job"];

export default function StepResumeUpload({
  onNext,
  onExtracted,
  profileData,
  onChange,
  // Onboarding V2 (decision (a), flag-gated by the caller): when true, do NOT
  // block onExtracted on proof-signals — return the resume-extractor fields
  // immediately and background-resolve proof-signals, delivering them via
  // onProofSignals when they land. Default false = legacy behavior, byte-
  // identical (proof-signals awaited before onExtracted). See the redesign brief.
  deferProofSignals = false,
  onProofSignals,
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [emptyTextMode, setEmptyTextMode] = useState(false);
  // Resilient-upload failure mode (gated by resilientUploadEnabled()). When
  // set, renders a prominent honest recovery banner + always-forward CTA
  // instead of a subtle error line. Values: 'timeout' | 'upload_failed' |
  // 'extract_none'. Kept separate from `error` so the legacy (flag-off)
  // path is byte-identical.
  const [uploadFailMode, setUploadFailMode] = useState(null);
  const [cvTruncated, setCvTruncated] = useState(false);
  const [liExportDismissed, setLiExportDismissed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    try {
      if (localStorage.getItem(LI_EXPORT_DISMISS_KEY) === "1")
        setLiExportDismissed(true);
    } catch {
      /* private mode */
    }
  }, []);

  const dismissLiExport = () => {
    setLiExportDismissed(true);
    try {
      localStorage.setItem(LI_EXPORT_DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
  };

  const toggleEmploymentStatus = (value) => {
    const current = profileData?.employment_status || [];
    const isOn = current.includes(value);
    let updated;
    if (isOn) {
      updated = current.filter((s) => s !== value);
    } else if (value === "unemployed") {
      updated = [
        ...current.filter((s) => !UNEMPLOYED_CONFLICTS.includes(s)),
        value,
      ];
    } else if (UNEMPLOYED_CONFLICTS.includes(value)) {
      updated = [...current.filter((s) => s !== "unemployed"), value];
    } else {
      updated = [...current, value];
    }
    onChange({ employment_status: updated });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setEmptyTextMode(false);
    setUploadFailMode(null);
    setUploading(true);

    const resilient = resilientUploadEnabled();
    const fileType =
      file.type === "application/pdf"
        ? "pdf"
        : isDocxFile(file)
          ? "docx"
          : file.type === "application/msword" ||
              /\.doc$/i.test(file.name || "")
            ? "doc"
            : "other";
    // Breadcrumb (unconditional, fire-and-forget) — closes the DB blind spot
    // on the upload/parse legs. `stage` attributes a thrown error to the leg
    // that failed (upload vs parse).
    logOnboardingEvent(0, "upload_attempt", {
      detail: { file_type: fileType, size: file.size ?? null },
    });
    let stage = "upload";
    const tUpload = Date.now();

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const runUpload = (signal) =>
        supabase.storage.from("resumes").upload(filePath, file, {
          upsert: true,
          ...(signal ? { signal } : {}),
        });
      const { error: uploadError } = resilient
        ? await withTimeout(runUpload, UPLOAD_TIMEOUT_MS, "Upload")
        : await runUpload();
      if (uploadError) throw uploadError;

      logOnboardingEvent(0, "upload_ok", {
        detail: { file_type: fileType, ms: Date.now() - tUpload },
      });

      const { data: signedData } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 315360000);

      const resumeUrl = signedData?.signedUrl || filePath;
      onChange({ resume_url: resumeUrl });

      setUploading(false);
      setExtracting(true);
      stage = "parse";
      const tParse = Date.now();
      logOnboardingEvent(0, "parse_attempt", {
        detail: { file_type: fileType },
      });

      let fileText = "";
      if (file.type === "application/pdf") {
        // Upload + signed URL above are fully awaited — the server reads
        // the uploaded copy from storage, so the file must be in place
        // before we invoke or the download 404s.
        fileText = resilient
          ? await withTimeout(
              (signal) => extractTextFromPdfServer(filePath, signal),
              PARSE_TIMEOUT_MS,
              "PDF text extraction",
            )
          : await extractTextFromPdfServer(filePath);
      } else if (isDocxFile(file)) {
        fileText = await extractTextFromDocx(file);
      } else if (
        file.type === "application/msword" ||
        /\.doc$/i.test(file.name || "")
      ) {
        throw new Error(
          "Legacy .doc files aren't supported. Please save your CV as .docx or .pdf and upload again.",
        );
      } else {
        fileText = await file.text();
      }

      if (fileText.length > 15000) setCvTruncated(true);

      const extractionPrompt = buildResumeExtractionPrompt(fileText);

      const runExtract = (signal) =>
        supabase.functions.invoke("ai-chat", {
          body: {
            message: extractionPrompt,
            agent: "resume-extractor",
            conversation_history: [],
          },
          ...(signal ? { signal } : {}),
        });
      const extractPromise = resilient
        ? withTimeout(runExtract, PARSE_TIMEOUT_MS, "Resume extraction")
        : runExtract();
      const proofSignalsPromise = supabase.functions
        .invoke("extract-proof-signals", {
          body: { cv_text: fileText.slice(0, 15000) },
        })
        .catch((err) => {
          console.debug("Proof signal extraction failed (non-fatal):", err);
          return { data: null };
        });

      const { data: extractData, error: fnError } = await extractPromise;

      if (fnError) throw new Error(fnError.message || "Edge function error");

      const replyText =
        extractData?.reply || extractData?.content || extractData?.text || "";

      if (replyText) {
        // Hardened parse chain — replaces the prior loose greedy regex that
        // dropped 4 of 19 pilot users (nevo, agam, redheadeg, ybarshain)
        // when gpt-4o-mini emitted JSON wrapped in prose. Strategy:
        //   1. Direct parse — works when the model emits clean JSON (the
        //      response_format=json_object route now ensures this on the
        //      resume-extractor agent).
        //   2. Strip a single markdown fence wrapper (```json ... ```).
        //   3. Balanced-brace match from the FIRST `{` to its matching `}` —
        //      tighter than the prior greedy `{[\s\S]*}` which spanned
        //      trailing-prose objects and produced invalid JSON.
        //   4. Legacy double-escape unescape — kept for backwards-compat
        //      with any older clients still in the wild.
        const extracted = parseExtractedJson(replyText);
        if (extracted == null) {
          console.warn(
            "[StepResumeUpload] all parse paths failed - falling back to manual entry banner. reply head:",
            replyText.slice(0, 200),
          );
        } else {
          if (deferProofSignals) {
            // (a) V2: don't wait on the proof-signals tail (p90 ~25s / p99 ~48s).
            // Return the resume-extractor fields now; deliver proof-signals in the
            // background when they land (null/failure => onProofSignals not called,
            // so primary_domain simply stays unset — same end state as today's
            // graceful-failure path, just non-blocking).
            onExtracted({
              ...extracted,
              proof_signals: [],
              primary_domain: null,
              adjacent_fields: [],
            });
            proofSignalsPromise
              .then(({ data: psData }) => {
                if (psData?.proof_signals?.length) {
                  onProofSignals?.({
                    proof_signals: psData.proof_signals,
                    primary_domain: psData.primary_domain || null,
                    adjacent_fields: psData.adjacent_fields || [],
                  });
                }
              })
              .catch(() => {
                /* already .catch'd to {data:null} above; belt-and-braces */
              });
          } else {
            let proofSignals = [];
            let primaryDomain = null;
            let adjacentFields = [];
            const { data: psData } = await proofSignalsPromise;
            if (psData?.proof_signals?.length) {
              proofSignals = psData.proof_signals;
              primaryDomain = psData.primary_domain || null;
              adjacentFields = psData.adjacent_fields || [];
            }

            onExtracted({
              ...extracted,
              proof_signals: proofSignals,
              primary_domain: primaryDomain,
              adjacent_fields: adjacentFields,
            });
          }
          const extractedFieldsCount = Object.values(extracted || {}).filter(
            (v) =>
              v !== null &&
              v !== undefined &&
              v !== "" &&
              !(Array.isArray(v) && v.length === 0),
          ).length;
          track(EVENTS.RESUME_UPLOADED, {
            file_type: fileType,
            extracted_fields_count: extractedFieldsCount,
          });
          logOnboardingEvent(0, "parse_ok", {
            detail: {
              file_type: fileType,
              ms: Date.now() - tParse,
              fields: extractedFieldsCount,
            },
          });
          setExtracting(false);
          setDone(true);
          return;
        }
      }

      // Reached here = empty reply or unparseable JSON: extraction produced
      // nothing usable. Do NOT silently hand the user an empty form — record
      // the miss and (resilient path) explain why + offer an obvious way on.
      console.debug("Extraction fallback. Response was:", extractData);
      logOnboardingEvent(0, "parse_failed", {
        errorCode: "extract_none",
        detail: { file_type: fileType, ms: Date.now() - tParse },
      });
      setExtracting(false);
      setDone(true);
      if (resilient) {
        setUploadFailMode("extract_none");
      } else {
        setError(
          `Resume uploaded successfully! However, automatic extraction wasn't possible. Please fill in your details manually.`,
        );
      }
    } catch (err) {
      console.error("Resume upload error:", err);
      setUploading(false);
      setExtracting(false);
      logOnboardingEvent(0, `${stage}_failed`, {
        errorCode:
          err.code || (stage === "upload" ? "upload_error" : "edge_error"),
        detail: {
          file_type: fileType,
          message: String(err?.message || err).slice(0, 300),
          ms: Date.now() - tUpload,
        },
      });
      // empty_text gets the tailored nudge (image-only PDF / Print-to-PDF
      // export). Otherwise: the resilient path shows a prominent always-
      // forward recovery banner; the legacy path keeps the subtle error line.
      if (err.code === "empty_text") {
        setEmptyTextMode(true);
      } else if (resilient) {
        setUploadFailMode(err.code === "timeout" ? "timeout" : "upload_failed");
      } else {
        setError(
          `Upload failed: ${err.message}. Please try again or enter details manually.`,
        );
      }
    }
  };

  // Auto-consume a CV carried over from the landing-page dropzone (stashed in
  // IndexedDB pre-signup). Runs once auth is ready; clears the entry on pickup
  // so it never lingers or re-fires. If none is present (e.g. cross-device
  // email confirm), the normal manual upload UI renders unchanged.
  const carriedConsumedRef = useRef(false);
  useEffect(() => {
    if (carriedConsumedRef.current || !user?.id) return;
    let cancelled = false;
    (async () => {
      const file = await getPendingCv();
      if (cancelled || !file) return;
      carriedConsumedRef.current = true;
      await clearPendingCv(); // clear on pickup; never leave it lingering
      handleFile(file); // normal upload -> extract -> done pipeline (post-auth)
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const resetUploadForRetry = () => {
    setEmptyTextMode(false);
    setUploadFailMode(null);
    setError(null);
    setFileName(null);
    setDone(false);
    setUploading(false);
    setExtracting(false);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  // Honest, always-forward recovery banner copy for the resilient-upload
  // failure modes. Pre-fills nothing silently: tells the user what happened
  // and offers both "fill in manually" and "try another file".
  const UPLOAD_FAIL_COPY = {
    extract_none: {
      title: "We couldn't read the details from this CV",
      body: "The file uploaded, but we couldn't pull structured text from it - it may be a scanned image or an unusual layout. Try a text-based PDF (File → Download → PDF in Google Docs/Word), or just fill your details in manually below.",
    },
    timeout: {
      title: "That took too long",
      body: "Reading your CV timed out. Your connection may be slow, or the file may be large. You can try uploading again, or fill your details in manually below - nothing is lost.",
    },
    upload_failed: {
      title: "We couldn't upload that file",
      body: "The upload didn't go through. Check your connection and try again, or fill your details in manually below.",
    },
  };

  const selected = new Set(profileData?.employment_status || []);

  return (
    <div className="space-y-7">
      {/* Dismissible LinkedIn export reminder — surfaces early so users can
          request the export now and have it ready when LinkedIn Hub needs it
          a few hours later. */}
      {!liExportDismissed && (
        <div className="bg-rd-coral-tint border border-rd-coral/40 rounded-[14px] p-3.5 pr-10 text-[13px] text-rd-coral-dark flex items-start gap-3 relative">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p className="font-display font-semibold text-rd-text">
              Get a head start on LinkedIn Hub - request your data export now
            </p>
            <p className="mt-1 text-rd-text-secondary">
              We use it to optimise your profile, draft posts in your voice, and
              find warm intros at companies you target. LinkedIn takes a few
              hours to prepare the export.
            </p>
            <a
              href="https://www.linkedin.com/mypreferences/d/download-my-data"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[13px] font-semibold text-rd-coral hover:text-rd-coral-dark underline underline-offset-2"
            >
              Request LinkedIn data export <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={dismissLiExport}
            className="absolute top-2.5 right-2.5 p-1 hover:bg-rd-bg-soft rounded-md"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-rd-text-secondary" />
          </button>
        </div>
      )}

      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 1 of 6 · your cv
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Let&apos;s start with your CV.
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Drop your CV and we&apos;ll extract everything from it - no manual
          entry needed.
        </p>
      </div>

      {/* Employment status — 5 visual cards. XOR rules preserved. */}
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow">
          Your current situation
        </p>
        <div className="mt-2.5 grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {EMPLOYMENT_OPTIONS.map(({ value, label, Icon }) => {
            const isSelected = selected.has(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleEmploymentStatus(value)}
                data-selected={isSelected}
                className={[
                  "flex flex-col items-center gap-2 p-3 rounded-[14px] border transition-[border-color,background-color,box-shadow] duration-150",
                  isSelected
                    ? "border-rd-coral bg-rd-coral-tint shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                    : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-rd-coral text-white"
                      : "bg-rd-bg-soft text-rd-text-secondary",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[12px] font-display font-semibold text-rd-text text-center leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drop zone — primary action on the page */}
      <div
        className={[
          "rounded-[18px] p-8 text-center cursor-pointer transition-[border-color,background-color] duration-150 border-2 border-dashed",
          dragOver
            ? "border-rd-coral bg-rd-coral-tint"
            : "border-rd-border-hover bg-rd-bg-soft hover:border-rd-coral hover:bg-rd-coral-tint",
        ].join(" ")}
        data-dragover={dragOver}
        data-state={
          uploading
            ? "uploading"
            : extracting
              ? "extracting"
              : emptyTextMode
                ? "empty_text"
                : done
                  ? "done"
                  : "idle"
        }
        onClick={() => !uploading && !extracting && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!uploading && !extracting && !done && !emptyTextMode && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-rd-coral-tint flex items-center justify-center">
              <Upload className="w-6 h-6 text-rd-coral" />
            </div>
            <div>
              <p className="font-display font-semibold text-[15px] text-rd-text">
                Drop your CV here, or click to browse
              </p>
              <p className="text-[11.5px] text-rd-text-secondary mt-1">
                PDF or DOCX · stays private to you
              </p>
            </div>
          </div>
        )}

        {emptyTextMode && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-rd-golden-tint flex items-center justify-center">
              <Info className="w-6 h-6 text-rd-golden-dark" />
            </div>
            <div>
              <p className="font-display font-semibold text-[15px] text-rd-text">
                CV uploaded - but no text inside
              </p>
              <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                {fileName}
              </p>
            </div>
          </div>
        )}

        {(uploading || extracting) && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-rd-coral" />
            <p className="font-display font-semibold text-[14px] text-rd-text">
              {uploading ? "Uploading…" : "Extracting your details…"}
            </p>
            {fileName && (
              <p className="text-[11.5px] text-rd-text-secondary">{fileName}</p>
            )}
          </div>
        )}

        {done && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-rd-teal-dark" />
            <div>
              <p className="font-display font-semibold text-[15px] text-rd-text">
                CV extracted
              </p>
              <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
                {fileName}
              </p>
            </div>
          </div>
        )}
      </div>

      {emptyTextMode && (
        <div className="bg-rd-golden-tint border border-rd-golden/40 rounded-[14px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-rd-golden-dark" />
            <div className="text-[13px] text-rd-text leading-relaxed">
              <p className="font-display font-semibold mb-1">
                We couldn&apos;t find any text in this PDF.
              </p>
              <p className="text-rd-text-secondary">
                It looks like an image-only PDF or a &ldquo;Print to PDF&rdquo;
                export - common with Google Docs on Windows, Canva, or scanned
                files. Two easy fixes:
              </p>
              <ul className="mt-2 ml-4 list-disc text-rd-text-secondary space-y-0.5">
                <li>
                  Upload your CV as a <strong>Word document (.docx)</strong>{" "}
                  instead.
                </li>
                <li>
                  In Google Docs, use{" "}
                  <strong>File → Download → PDF Document (.pdf)</strong> - not
                  the Print menu.
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
            <RdButton onClick={onNext}>
              Continue and fill in details manually{" "}
              <ArrowRight className="w-4 h-4" />
            </RdButton>
            <button
              type="button"
              onClick={resetUploadForRetry}
              className="px-4 py-2.5 text-[13px] font-semibold rounded-full border border-rd-border text-rd-text bg-rd-bg-card hover:bg-rd-bg-soft transition-colors"
            >
              Upload a different file
            </button>
          </div>
        </div>
      )}

      {/* Resilient-upload recovery banner (flag-gated via handleFile). Any
          non-empty_text failure — timeout, upload error, or empty extraction
          — lands here with an honest explanation and an obvious way forward,
          instead of a silent empty form behind a subtle skip link. */}
      {uploadFailMode && UPLOAD_FAIL_COPY[uploadFailMode] && (
        <div className="bg-rd-golden-tint border border-rd-golden/40 rounded-[14px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-rd-golden-dark" />
            <div className="text-[13px] text-rd-text leading-relaxed">
              <p className="font-display font-semibold mb-1">
                {UPLOAD_FAIL_COPY[uploadFailMode].title}
              </p>
              <p className="text-rd-text-secondary">
                {UPLOAD_FAIL_COPY[uploadFailMode].body}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
            <RdButton onClick={onNext}>
              Continue and fill in details manually{" "}
              <ArrowRight className="w-4 h-4" />
            </RdButton>
            <button
              type="button"
              onClick={resetUploadForRetry}
              className="px-4 py-2.5 text-[13px] font-semibold rounded-full border border-rd-border text-rd-text bg-rd-bg-card hover:bg-rd-bg-soft transition-colors"
            >
              Upload a different file
            </button>
          </div>
        </div>
      )}

      {cvTruncated && (
        <div className="bg-rd-golden-tint border border-rd-golden/40 rounded-[14px] px-3.5 py-2.5 text-[12.5px] text-rd-golden-dark leading-snug">
          Your CV is long - only the first 15,000 characters were sent for
          extraction. Review the pre-filled details and add anything that
          wasn&apos;t captured.
        </div>
      )}
      {error && (
        <div className="bg-rd-coral-tint border border-rd-coral/40 rounded-[14px] px-3.5 py-2.5 text-[12.5px] text-rd-coral-dark leading-snug">
          {error}
        </div>
      )}

      {/* LinkedIn URL is no longer asked here — it is auto-extracted from the
          CV when present and otherwise editable in Settings/Profile. We never
          ask for something we may already have. */}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onNext}
          className="text-[12px] text-rd-text-tertiary hover:text-rd-text underline underline-offset-2"
        >
          Skip - I&apos;ll enter details manually
        </button>
        <RdButton
          onClick={onNext}
          disabled={!done && !error && !emptyTextMode && !uploadFailMode}
        >
          {done ? (
            <>
              Continue <ArrowRight className="w-4 h-4" />
            </>
          ) : error || uploadFailMode ? (
            <>
              Continue anyway <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            "Upload to continue"
          )}
        </RdButton>
      </div>
    </div>
  );
}
