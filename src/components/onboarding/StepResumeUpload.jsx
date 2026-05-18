import React, { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text;
}

// Extract plain text from a .docx file. mammoth supports modern Word
// documents (.docx) but NOT legacy binary .doc — those need to be saved as
// .docx or .pdf first. The default accept attribute on the file input was
// updated to drop .doc.
//
// Dynamic import: mammoth + its dependencies (jszip, xmldom) add ~510 KB to
// the bundle. Loading on demand keeps that off the initial Vite chunk for
// the ~50% of users who upload PDF or skip CV entirely.
async function extractTextFromDocx(file) {
  const { default: mammoth } = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

// Detect a .docx by either MIME or extension — some browsers (Safari,
// older Chrome) leave file.type empty for Office formats.
function isDocxFile(file) {
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  return /\.docx$/i.test(file.name || "");
}

import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { track, EVENTS } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, CheckCircle2, ArrowRight, Linkedin, Info, ExternalLink } from "lucide-react";

// Note: the JSON-Schema constant that previously lived here was dead code —
// never referenced (the ai-chat call below uses a plain prose prompt, not
// structured-output enforcement), and its shape had drifted from the live
// prompt below (e.g. education as array vs flat fields). Deleted as part of
// PR-1 cleanup, 2026-05-14. If we later want OpenAI structured-output
// enforcement, the schema should be defined once on the edge function
// side, not redundantly here.

export default function StepResumeUpload({ onNext, onExtracted, profileData, onChange }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [cvTruncated, setCvTruncated] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(profileData?.linkedin_url || "");
  const [extractingLinkedin, setExtractingLinkedin] = useState(false);
  const [linkedinDone, setLinkedinDone] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setUploading(true);

    try {
      // Upload to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get a long-lived signed URL (bucket is private)
      const { data: signedData } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 315360000); // ~10 years

      // Save URL to local state — persisted when saveProgress runs at next step
      const resumeUrl = signedData?.signedUrl || filePath;
      onChange({ resume_url: resumeUrl });

      setUploading(false);
      setExtracting(true);

      // Try to extract resume content via LLM. Branch by format:
      //   .pdf  → pdfjs-dist (existing path)
      //   .docx → mammoth (added for N-O37; previously fell through to
      //           file.text() which read the binary as UTF-8 garbage)
      //   legacy .doc → reject — mammoth doesn't support the old binary
      //           format; user must save as .docx or .pdf
      //   anything else → fall through to file.text() so plain-text uploads
      //           still work the way they did before
      let fileText = "";
      if (file.type === "application/pdf") {
        fileText = await extractTextFromPdf(file);
      } else if (isDocxFile(file)) {
        fileText = await extractTextFromDocx(file);
      } else if (file.type === "application/msword" || /\.doc$/i.test(file.name || "")) {
        throw new Error("Legacy .doc files aren't supported. Please save your CV as .docx or .pdf and upload again.");
      } else {
        fileText = await file.text();
      }

      if (fileText.length > 15000) {
        setCvTruncated(true);
      }

      const extractionPrompt = `Extract structured information from this resume text. Return ONLY a raw JSON object (no markdown, no code blocks) with these fields: full_name, phone_number, location, linkedin_url, summary, institution, degree, field_of_study, education_level, education_dates (string, e.g. "2023 - Present"), gpa (string, e.g. "3.7" or "85"), honors (array of strings, e.g. ["Dean's List", "Cum Laude"]), academic_projects (array of strings — thesis title, capstone projects, named coursework projects. Do NOT include workplace projects), secondary_education (object with {institution, dates, location, highlights} — only if a high school OR earlier institution is mentioned, otherwise omit the field entirely), languages (array of {language, proficiency} — proficiency is one of "Native", "Fluent", "Conversational", "Basic"), skills (one flat array of every skill, tool, methodology, language, and competency you can identify in the resume — do NOT bucket into categories, just return one combined deduplicated list), experiences (array of {title, company, type, start_date, end_date, is_current, responsibilities, skills_used}), projects (array of {name, description, url, skills_demonstrated}), certifications (array of {name, issuer, date_earned}).

INSTITUTION — official name of the school/university for the MOST RECENT degree, exactly as it appears on the CV (e.g. "Reichman University", "Tel Aviv University", "IDC Herzliya", "Hebrew University of Jerusalem", "Technion - Israel Institute of Technology"). Do NOT abbreviate. If multiple institutions appear, pick the one matching the most recent degree (i.e. the one in education_dates). Leave "" if no institution is named.

EDUCATION_LEVEL — return EXACTLY one of these lowercase strings: "high_school" | "associate" | "bachelors" | "masters" | "phd" | "bootcamp" | "self_taught". Map credentials as follows: B.A. / B.Sc. / BA / BSc / LLB / "undergraduate" → "bachelors"; M.A. / M.Sc. / MA / MSc / MBA / J.D. / M.D. / LL.M / "graduate" → "masters"; Ph.D. / doctorate → "phd". For a degree in progress, return the level of the degree being pursued (an undergraduate currently studying returns "bachelors", not the high school they previously completed). Do NOT return free-text like "Bachelor's Degree" or "BA" — return the canonical lowercase value.

ACADEMIC_PROJECTS — only items the resume itself labels as academic / coursework / thesis / capstone. Do NOT promote bullet points from job experiences into this array. Empty array if none mentioned.

PROJECTS / CERTIFICATIONS — only extract real ones:
- projects: standalone work (capstone, side project, hackathon, open source). NOT coursework. NOT job responsibilities.
- certifications: industry credentials (AWS, Coursera Pro, CFA, PMP, Google certifications). NOT bootcamps in progress, NOT online courses without a credential.

EDUCATION DATES — set education_dates to the date range of the MOST RECENT degree (e.g. "2023 - Present", "2020 - 2024"). Use "Present" for current students.

GPA / HONORS — return at the root level for the MOST RECENT degree only. Honours is the awards earned during that degree (Dean's List, Cum Laude, named scholarships). Do NOT include workplace awards here — those belong in experiences[].responsibilities.

SECONDARY EDUCATION — only populate if the resume lists a high school or earlier institution separately from the main degree. Otherwise OMIT the field entirely (do not return null, do not return {}). Highlights array is for student-leadership roles or notable achievements at that school.

LANGUAGES — only include human languages (English, Hebrew, Spanish, etc.), NEVER programming languages. If proficiency level isn't stated, infer "Fluent" for the resume's primary language (matches the writing tone) and "Conversational" for any others mentioned.

EXPERIENCE.is_current — set to true if the role's end_date is "Present", "Current", missing, or the resume otherwise indicates ongoing employment. Otherwise false.

EXPERIENCE.skills_used — pull skills/tools the resume names within that specific role's bullets. Leave [] if none are explicitly tied to the role.

PHONE NUMBER — scan the full document, not just the header:
- Search the ENTIRE resume text for a phone number, including the header, "Contact" section, email signature area, and anywhere near the email/LinkedIn.
- Accept any of these formats and keep the original formatting:
  • Israeli mobile: "054-3000613", "050 123 4567", "+972-54-300-0613", "+972 54 300 0613"
  • US: "(212) 555-0100", "212-555-0100", "+1 212 555 0100"
  • International: "+44 20 7946 0958", "+49 30 12345678"
- Strip any labels ("Phone:", "Mobile:", "M:", "Tel:") from the value.
- If no phone number is present in the resume, leave phone_number as an empty string — do NOT fabricate.

JOB TITLE RULES — applies to EVERY experience (professional, military, volunteering, leadership):
- The title field is a SHORT NOUN PHRASE, typically 2–5 words (e.g. "Senior Product Manager", "Sergeant First Class", "Marketing Intern", "President of Debate Club").
- NEVER put a responsibility sentence or action-verb statement in the title field. "Supervised and trained teams of soldiers" is NOT a title — it is a responsibility bullet. If the resume shows a block like:
    Nahal Brigade | 2020–2022
    • Supervised and trained teams of up to 30 soldiers...
  then the title is a RANK (see MILITARY section below), NOT the bullet text.
- Titles never start with verbs like Supervised / Managed / Led / Coordinated / Trained / Oversaw / Delivered / Assisted / Designed. If you see one of these starting a candidate-title, it's a responsibility — route it into the responsibilities array, not title.
- Never leave the title blank. If the resume doesn't state a title explicitly, infer the most likely short title from context (see MILITARY defaults below for military roles). For non-military roles without a clear title, use the closest standard role name (e.g. "Marketing Intern", "Research Assistant", "Program Coordinator").

EXPERIENCE TYPE CLASSIFICATION (required for every experience):
Set the "type" field on each experience to EXACTLY ONE of these values:
- "military"    — any military service. See military section below.
- "internship"  — explicit internships or summer placements
- "full_time"   — regular full-time employment (default when unclear but the role looks like a paid job)
- "part_time"   — part-time paid work
- "freelance"   — freelance / contract / self-employed / consulting
- "volunteer"   — unpaid volunteer work, community service, pro bono
- "leadership"  — student club president, team captain, society chair, founder of a student initiative

MILITARY SERVICE — recognise and extract carefully:
Treat any of the following as MILITARY experience (type="military"):
- English mentions: "IDF", "Israel Defense Forces", "Israeli Defense Forces", "Israeli military", "army service", "mandatory service", "reserve service", "commander", "combat soldier"
- Hebrew mentions: "צה״ל", "צהל", "שירות צבאי", "שירות מילואים", "מפקד"
- Specific units/corps (any of these → military): Givati, Golani, Nahal, Nachal, Paratroopers, Tzanhanim, Sayeret, Sayeret Matkal, Shaldag, Duvdevan, Kfir, Egoz, Maglan, Unit 8200, 8200, Mamram, Talpiot, Havatzalot, Intelligence Corps, Modi'in, Cyber Defense, IAF, Israeli Air Force, Navy, Shayetet, Home Front Command, Pikud Haoref, Combat Engineering, Artillery Corps, Armored Corps, Gaza Division, Officer's School, Bahad 1

When you classify an experience as military:
- Set company to the specific unit if named ("Nahal Brigade", "Unit 8200", "Golani Brigade", etc.), otherwise "Israel Defense Forces (IDF)".
- Title MUST be a rank or a short role name — NEVER a responsibility sentence. Prefer, in this priority order:
    1. An explicit rank named in the resume: "Sergeant First Class", "Staff Sergeant", "First Sergeant", "Lieutenant", "Captain", "Major", "Samal Rishon", "Samal", "Segen", "Seren", etc.
    2. An explicit role named in the resume: "Squad Commander", "Team Commander", "Platoon Commander", "Company Commander", "Intelligence Officer", "Intelligence Analyst", "Signals Intelligence Analyst", "Cyber Analyst", "Software Developer (IDF)", "Combat Medic", "Instructor", "Drill Sergeant".
    3. If the resume says the person was a commander/team lead but gives no explicit rank or role, use "Team Commander".
    4. If the resume shows only combat service with no rank or role named, use "Combat Soldier".
    5. Absolute last resort: "Military Service Member". Never leave title blank and never use a bullet-point sentence.
- Keep awards/commendations (Presidential Award for Excellence, unit citations, excellence commendations) in the responsibilities text — do not drop them.
- Translate Hebrew responsibility bullets to concise English.

Here is the resume:\n\n${fileText.slice(0, 15000)}`;

      const { data: extractData, error: fnError } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: extractionPrompt,
          agent: "resume-extractor",
          conversation_history: [],
        },
      });

      if (fnError) throw new Error(fnError.message || "Edge function error");


      const replyText = extractData?.reply || extractData?.content || extractData?.text || "";

      if (replyText) {
        const jsonMatch = replyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let extracted = null;

          // Attempt 1: direct parse
          try { extracted = JSON.parse(jsonMatch[0]); } catch {}

          // Attempt 2: only unescape if the JSON looks double-escaped
          // (guard prevents corrupting valid JSON that contains backslashes)
          if (!extracted && /\{\s*\\"/.test(jsonMatch[0])) {
            try {
              const unescaped = jsonMatch[0]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t');
              extracted = JSON.parse(unescaped);
            } catch (e) {
              console.error("JSON parse failed after unescaping:", e);
            }
          }

          if (extracted) {
            // Run proof signal extraction in parallel — non-blocking, failure is non-fatal
            let proofSignals = [];
            let primaryDomain = null;
            let adjacentFields = [];
            try {
              const { data: psData } = await supabase.functions.invoke("extract-proof-signals", {
                body: { cv_text: fileText.slice(0, 15000) },
              });
              if (psData?.proof_signals?.length) {
                proofSignals = psData.proof_signals;
                primaryDomain = psData.primary_domain || null;
                adjacentFields = psData.adjacent_fields || [];
              }
            } catch (psErr) {
              console.debug("Proof signal extraction failed (non-fatal):", psErr);
            }

            onExtracted({ ...extracted, proof_signals: proofSignals, primary_domain: primaryDomain, adjacent_fields: adjacentFields });
            // cv_uploaded — count non-empty top-level fields as a coarse
            // "extraction quality" signal. file_type bucketed via the same
            // logic the upload branches use (pdf vs docx vs other).
            const fileType = file.type === "application/pdf"
              ? "pdf"
              : isDocxFile(file)
                ? "docx"
                : "other";
            const extractedFieldsCount = Object.values(extracted || {}).filter(
              (v) => v !== null && v !== undefined && v !== "" &&
                     !(Array.isArray(v) && v.length === 0)
            ).length;
            track(EVENTS.CV_UPLOADED, {
              file_type: fileType,
              extracted_fields_count: extractedFieldsCount,
            });
            setExtracting(false);
            setDone(true);
            return;
          }
        }
      }

      // File uploaded but extraction failed — still a success
      console.debug("Extraction fallback. Response was:", extractData);
      setExtracting(false);
      setDone(true);
      setError(`Resume uploaded successfully! However, automatic extraction wasn't possible. Please fill in your details manually.`);
    } catch (err) { 
      console.error("Resume upload error:", err);
      setUploading(false);
      setExtracting(false);
      setError(`Upload failed: ${err.message}. Please try again or enter details manually.`);
    }
  };

  const handleLinkedinExtract = () => {
    if (!linkedinUrl.trim()) return;
    onChange({ linkedin_url: linkedinUrl });
    onExtracted({ linkedin_url: linkedinUrl });
    setLinkedinDone(true);
  };

  const employmentOptions = [
    { value: "student", label: "Student" },
    { value: "looking_for_job", label: "Looking for a job" },
    { value: "employed", label: "Have a job" },
    { value: "unemployed", label: "Unemployed" },
    { value: "freelance", label: "Freelancing" },
  ];

  // Pair of contradictory statuses. Checking one auto-unchecks the other —
  // "Have a job" and "Unemployed" can't be true simultaneously. Other combos
  // (Student + Looking, Freelancer + Looking, etc.) stay allowed.
  const EMPLOYMENT_CONFLICTS = {
    employed: "unemployed",
    unemployed: "employed",
  };

  const toggleEmploymentStatus = (value) => {
    const current = profileData?.employment_status || [];
    const isChecking = !current.includes(value);
    let updated;
    if (isChecking) {
      const conflict = EMPLOYMENT_CONFLICTS[value];
      updated = conflict
        ? [...current.filter((s) => s !== conflict), value]
        : [...current, value];
    } else {
      updated = current.filter((s) => s !== value);
    }
    onChange({ employment_status: updated });
  };

  return (
    <div className="space-y-6">
      {/* Persistent LinkedIn data-export hint — non-dismissible, visible
          for the entire CV-upload step. LinkedIn's data export takes a few
          hours to generate, so we surface this as early as possible so users
          can start the request now and have it ready when they reach the
          LinkedIn Hub features post-onboarding. Info-tone (not alert-tone)
          because it's optional. */}
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Optional but recommended — request your LinkedIn data export now
          </p>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">
            LinkedIn takes a few hours to prepare your data export. Request it now and you&apos;ll have it ready when you reach LinkedIn Hub features (profile optimization, posts, networking) later.
          </p>
          <a
            href="https://www.linkedin.com/mypreferences/d/download-my-data"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Request LinkedIn data export <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Upload Your CV</h2>
        <p className="text-sm text-[#525252] mt-1">
          We're building a complete picture of your qualifications, experience, and career goals — so we can recommend exactly which roles you're ready for and what steps to take next.
        </p>
        <p className="text-sm text-[#A3A3A3] mt-2">
          Upload your CV and we'll extract your details automatically — no manual entry needed. PDF or DOCX preferred.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#0A0A0A] mb-3">What's your current situation?</h3>
        <div className="space-y-3">
          {employmentOptions.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={option.value}
                checked={(profileData?.employment_status || []).includes(option.value)}
                onCheckedChange={() => toggleEmploymentStatus(option.value)}
              />
              <Label htmlFor={option.value} className="text-sm text-[#525252] cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* LinkedIn Section */}
      <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
          <h3 className="text-sm font-semibold text-[#0A0A0A]">LinkedIn Profile (optional)</h3>
        </div>

        <div>
          <p className="text-xs text-[#A3A3A3] mb-3">Paste your LinkedIn URL to save it to your profile.</p>
          <div className="flex gap-2">
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              className="text-sm flex-1"
            />
            <Button
              onClick={handleLinkedinExtract}
              disabled={!linkedinUrl.trim() || linkedinDone}
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
            >
              {linkedinDone ? <CheckCircle2 className="w-3 h-3" /> : "Save"}
            </Button>
          </div>
          {linkedinDone && <p className="text-xs text-emerald-600 mt-2">✓ LinkedIn URL saved</p>}
        </div>
      </div>

      <div
        className="bg-white rounded-xl border-2 border-dashed border-[#E5E5E5] p-10 text-center cursor-pointer hover:border-[#A3A3A3] transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!uploading && !extracting && !done && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[#525252]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0A0A0A]">Drop your CV here or click to browse</p>
              <p className="text-xs text-[#A3A3A3] mt-1">PDF or DOCX supported</p>
            </div>
          </div>
        )}

        {(uploading || extracting) && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#525252]" />
            <p className="text-sm font-medium text-[#0A0A0A]">
              {uploading ? "Uploading..." : "Extracting your details with AI..."}
            </p>
            {fileName && <p className="text-xs text-[#A3A3A3]">{fileName}</p>}
          </div>
        )}

        {done && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-[#0A0A0A]">CV extracted successfully</p>
              <p className="text-xs text-[#A3A3A3] mt-1">{fileName}</p>
            </div>
          </div>
        )}
      </div>

      {cvTruncated && (
        <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-lg">
          Your CV is long — only the first 15,000 characters were sent for extraction. Some later experience may be missing. Please review the pre-filled details and add anything that wasn't captured.
        </p>
      )}
      {error && (
        <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-lg">{error}</p>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={onNext}
          className="text-xs text-[#A3A3A3] hover:text-[#525252] underline underline-offset-2 transition-colors"
        >
          Skip — I'll enter details manually
        </button>
        <Button
          onClick={onNext}
          disabled={!done && !error && !linkedinDone}
          className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6 flex items-center gap-2"
        >
          {done ? (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          ) : error ? (
            <>Continue Anyway <ArrowRight className="w-4 h-4" /></>
          ) : (
            "Upload to Continue"
          )}
        </Button>
      </div>
    </div>
  );
}