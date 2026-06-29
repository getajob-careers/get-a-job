// CVStudioLive — the real-data CV studio container: reads the signed-in user's
// application_cvs (master + tailored copies), feeds CVStudioView, and owns the
// edit/autosave/chat(edit-cv)/download(render-cv)/delete/build-master behaviour.
//
// Layout-LESS on purpose. The real CVAgent page renders <CVStudioLive/> directly
// (App.jsx's LayoutWrapper already provides the dashboard shell); the DEV preview
// (CVAgentLivePreview) wraps it in <Layout> for standalone viewing. Uses the
// app's real AuthProvider + QueryClient — no stubbing.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Loader2, FileText, X } from "lucide-react";
import CVStudioView from "@/components/cv-studio/CVStudioView";
import {
  useApplicationCvs,
  useCvData,
  cvDataQueryKey,
  applicationCvsQueryKey,
  fetchApplicationCvs,
  useApplicationForTailor,
  useApplicationsWithJd,
} from "@/lib/queries/useApplicationCvs";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { fromCvData, toCvData, buildMasterCvData } from "@/lib/cvDataAdapter";

const uid = () => Math.random().toString(36).slice(2, 9);

function Centered({ children }) {
  return (
    <div className="h-full grid place-items-center bg-rd-bg-page text-rd-text-secondary text-sm px-6 text-center">
      {children}
    </div>
  );
}

export default function CVStudioLive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: cvOptions = [], isLoading: optsLoading } = useApplicationCvs(
    user?.id,
  );
  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: education = [] } = useEducationQuery(user?.id);
  const [building, setBuilding] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState(null);
  const [templateId, setTemplateId] = useState("modern");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [editVersion, setEditVersion] = useState(0); // bumps on chat-applied edits → remount so contentEditable re-seeds
  const [searchParams, setSearchParams] = useSearchParams();
  const paramAppliedRef = useRef(false);

  // Tailoring ("Tailor to a job"). pendingTailor is a tracked application the
  // user wants a tailored CV for that has NO tailored row yet — set from the
  // deep-link branch below (instead of silently dropping it) or from the
  // explicit Tailor action. tailorApp hydrates its role/company/JD. The studio
  // stays on the master CV while a target is pending, with a "Tailor it to …"
  // banner over the real master content.
  const [pendingTailor, setPendingTailor] = useState(null); // { applicationId } | null
  const [tailoring, setTailoring] = useState(false); // the ~30-60s authoring call
  const [noJdOpen, setNoJdOpen] = useState(false); // no-JD card overlay
  const { data: tailorApp } = useApplicationForTailor(
    pendingTailor?.applicationId,
  );
  const { data: jdApplications = [] } = useApplicationsWithJd(
    user?.id,
    noJdOpen,
  );

  // Selection: honor ?cv / ?application_id ONCE (the tracker's "Generate tailored
  // CV → Open in CV Agent" deep-link), waiting for the refetch to land a freshly
  // generated copy. Otherwise default to master (or most recent), and recover if
  // the current selection drops out of the list.
  useEffect(() => {
    if (!cvOptions.length) return;
    if (!paramAppliedRef.current) {
      const cvParam = searchParams.get("cv");
      const appParam = searchParams.get("application_id");
      if (cvParam || appParam) {
        const target =
          (cvParam && cvOptions.find((o) => o.id === cvParam)) ||
          (appParam && cvOptions.find((o) => o.applicationId === appParam)) ||
          null;
        if (!target && optsLoading) return; // wait for the refetch to bring it in
        paramAppliedRef.current = true;
        const next = new URLSearchParams(searchParams);
        next.delete("cv");
        next.delete("application_id");
        setSearchParams(next, { replace: true });
        if (target) {
          setSelectedCvId(target.id);
          return;
        }
        // Deep-linked application with NO tailored copy yet: keep it as a
        // pending tailor target (master shows with the "Tailor it to …" banner)
        // rather than silently dropping the context.
        if (appParam) setPendingTailor({ applicationId: appParam });
      } else {
        paramAppliedRef.current = true;
      }
    }
    if (selectedCvId && cvOptions.some((o) => o.id === selectedCvId)) return;
    const master = cvOptions.find((o) => o.isMaster);
    setSelectedCvId((master || cvOptions[0]).id);
  }, [cvOptions, selectedCvId, searchParams, setSearchParams, optsLoading]);

  // Clear the pending tailor target once a tailored CV for that application
  // exists and is selected (after onTailor's refetch+select, or if one already
  // lands from elsewhere). Keeps the banner from lingering over a real copy.
  useEffect(() => {
    if (!pendingTailor) return;
    const opt = cvOptions.find(
      (o) => !o.isMaster && o.applicationId === pendingTailor.applicationId,
    );
    if (opt && selectedCvId === opt.id) setPendingTailor(null);
  }, [pendingTailor, cvOptions, selectedCvId]);

  const { data: cvRow, isLoading: cvLoading } = useCvData(selectedCvId);

  // Editor model — adapter output held locally for editing. modelRef mirrors it
  // so the autosave + handlers read the current value without stale closures.
  const [model, setModel] = useState(null);
  const modelRef = useRef(null);
  useEffect(() => {
    if (cvRow && cvRow.id === selectedCvId) {
      const m = fromCvData(cvRow.cv_data);
      modelRef.current = m;
      setModel(m);
    }
  }, [cvRow, selectedCvId]);

  // Conversation is per-CV — reset when the user switches CVs.
  useEffect(() => {
    setChatMessages([]);
  }, [selectedCvId]);

  // ---- debounced autosave to application_cvs.cv_data (RLS own-row) ----
  const [saveState, setSaveState] = useState("saved");
  const saveTimer = useRef(null);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const persist = useCallback(
    (cvId, nextModel) => {
      if (!cvId) return;
      setSaveState("saving");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const cv_data = toCvData(nextModel);
        const { error } = await supabase
          .from("application_cvs")
          .update({ cv_data })
          .eq("id", cvId);
        if (error) {
          setSaveState("error");
          toast.error("Couldn't save your edits.");
          return;
        }
        setSaveState("saved");
        queryClient.setQueryData(cvDataQueryKey(cvId), (prev) =>
          prev ? { ...prev, cv_data } : prev,
        );
      }, 800);
    },
    [queryClient],
  );

  const update = useCallback(
    (updater) => {
      if (!modelRef.current) return;
      const next = updater(modelRef.current);
      modelRef.current = next;
      setModel(next);
      persist(selectedCvId, next);
    },
    [persist, selectedCvId],
  );

  const onPatchHeader = (patch) =>
    update((m) => ({ ...m, header: { ...m.header, ...patch } }));
  const onPatchSummary = (v) => update((m) => ({ ...m, summary: v }));
  // Experience handlers are keyed by section ("experiences" | "military" |
  // "volunteering" | "leadership") so the four buckets share one set of logic.
  const onPatchExp = (section, id, patch) =>
    update((m) => ({
      ...m,
      [section]: m[section].map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  const onPatchBullet = (section, expId, bId, text) =>
    update((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? {
              ...e,
              bullets: e.bullets.map((b) =>
                b.id === bId ? { ...b, text } : b,
              ),
            }
          : e,
      ),
    }));
  const onAddBullet = (section, expId) =>
    update((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? { ...e, bullets: [...e.bullets, { id: uid(), text: "" }] }
          : e,
      ),
    }));
  const onRemoveBullet = (section, expId, bId) =>
    update((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? { ...e, bullets: e.bullets.filter((b) => b.id !== bId) }
          : e,
      ),
    }));
  const onDragEnd = (section, result) => {
    if (!result.destination) return;
    update((m) => {
      const next = [...m[section]];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return { ...m, [section]: next };
    });
  };
  const onPatchEdu = (id, patch) =>
    update((m) => ({
      ...m,
      education: m.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  const onPatchSkills = (line) =>
    update((m) => ({
      ...m,
      skills: line
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  const onPatchLanguages = (line) =>
    update((m) => ({
      ...m,
      languages: line
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean),
    }));

  const onDownload = useCallback(async () => {
    if (!modelRef.current) return;
    const current = cvOptions.find((o) => o.id === selectedCvId);
    const t = toast.loading("Rendering PDF…");
    const { data, error } = await supabase.functions.invoke("render-cv", {
      body: {
        cv_data: toCvData(modelRef.current),
        cv_id: selectedCvId,
        application_id: current?.applicationId ?? null,
        target_role: current?.role ?? "",
        template: templateId,
      },
    });
    toast.dismiss(t);
    if (error || !data?.cv_url) {
      toast.error("Couldn't render the PDF. Please try again.");
      return;
    }
    window.open(data.cv_url, "_blank", "noopener");
  }, [cvOptions, selectedCvId, templateId]);

  const onDeleteCv = useCallback(
    async (id) => {
      const { error } = await supabase
        .from("application_cvs")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error("Couldn't delete that CV.");
        return;
      }
      toast.success("CV deleted.");
      if (id === selectedCvId) setSelectedCvId(null); // selection effect re-picks master/first
      queryClient.removeQueries({ queryKey: cvDataQueryKey(id) });
      queryClient.invalidateQueries({
        queryKey: applicationCvsQueryKey(user?.id),
      });
    },
    [selectedCvId, queryClient, user?.id],
  );

  // CV Agent chat → general edits via edit-cv. The returned cv_data replaces the
  // model (bump editVersion so the document remounts + re-seeds), then autosaves.
  const onSendMessage = useCallback(
    async (text) => {
      if (!modelRef.current || !selectedCvId) return;
      setChatMessages((ms) => [
        ...ms,
        { id: uid(), role: "user", content: text },
      ]);
      setChatBusy(true);
      const current = cvOptions.find((o) => o.id === selectedCvId);
      const { data, error } = await supabase.functions.invoke("edit-cv", {
        body: {
          cv_data: toCvData(modelRef.current),
          instruction: text,
          target_role: current?.role ?? "",
        },
      });
      setChatBusy(false);
      if (error || !data || data.error) {
        setChatMessages((ms) => [
          ...ms,
          {
            id: uid(),
            role: "assistant",
            content: "Sorry — I couldn't reach the editor. Please try again.",
          },
        ]);
        return;
      }
      if (data.cv_data) {
        // edit-cv edits the document we send but may not echo every section
        // back. Merge its output OVER the pre-edit cv_data so any section it
        // omits (military / volunteering / leadership, and unsurfaced
        // passthrough sections like certifications / projects / honors) is
        // preserved from what we already had — never silently dropped.
        const merged = { ...toCvData(modelRef.current), ...data.cv_data };
        const m = fromCvData(merged);
        modelRef.current = m;
        setModel(m);
        setEditVersion((v) => v + 1);
        persist(selectedCvId, m);
      }
      setChatMessages((ms) => [
        ...ms,
        { id: uid(), role: "assistant", content: data.message || "Done." },
      ]);
    },
    [cvOptions, selectedCvId, persist],
  );

  // Tailor: author a NEW tailored copy via generate-tailored-cv (NOT an in-place
  // chat edit). The engine ignores the open editor model — it authors from the
  // profile + JD and persists its own is_master=false row tied to application_id,
  // returning only cv_url + fit_analysis (no cv_data). So we refetch the list and
  // select the new row rather than swapping cv_data in like edit-cv does.
  const runTailor = useCallback(
    async (target) => {
      // target: { applicationId?: string|null, role?: string, company?: string, jobDescription: string }
      if (tailoring || !user?.id) return;
      setNoJdOpen(false);
      setTailoring(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-tailored-cv",
          {
            body: {
              target_role: target.role || "",
              application_id: target.applicationId ?? null,
              job_description: target.jobDescription,
              cv_model: "sonnet",
              // never master:true — that would overwrite the master row.
            },
          },
        );
        if (error || !data || data.error) {
          const status = error?.context?.status ?? error?.status;
          toast.error(
            status === 429
              ? "Tailoring limit reached (30/hour). Please try again a little later."
              : "Couldn't tailor your CV. Please try again.",
          );
          return;
        }
        // Tailoring succeeded server-side. Surface the fit read FIRST, so the
        // success is visible even if the list refetch below fails.
        const appId = data.application_id ?? target.applicationId ?? null;
        const fit = data.fit_analysis;
        const fitLine =
          fit && typeof fit === "object"
            ? fit.summary || fit.verdict || null
            : typeof fit === "string"
              ? fit
              : null;
        setChatMessages([
          {
            id: uid(),
            role: "assistant",
            content:
              (data.message ||
                `Tailored a new CV${target.role ? ` for ${target.role}` : ""}.`) +
              (fitLine ? `\n\n${fitLine}` : ""),
          },
        ]);
        // Bring the new row into the list and select it (mirrors the deep-link
        // "wait for the refetch" pattern). If the refetch throws (network), the
        // CV still exists server-side — tell the user to refresh rather than
        // failing silently.
        try {
          await queryClient.invalidateQueries({
            queryKey: applicationCvsQueryKey(user.id),
          });
          const fresh = await queryClient.fetchQuery({
            queryKey: applicationCvsQueryKey(user.id),
            queryFn: () => fetchApplicationCvs(user.id),
          });
          const opt =
            (appId &&
              fresh.find((o) => !o.isMaster && o.applicationId === appId)) ||
            null;
          if (opt) {
            setSelectedCvId(opt.id);
            setPendingTailor(null);
          }
        } catch {
          toast.error(
            "Your tailored CV was created — refresh to see it in your CV list.",
          );
        }
      } finally {
        setTailoring(false);
      }
    },
    [tailoring, user?.id, queryClient],
  );

  // Entry point for the persistent action (chip + selector item) and the banner
  // CTA. A pending application with a JD tailors straight away; anything else
  // (no JD, or no application context) opens the no-JD card.
  const startTailor = useCallback(() => {
    if (tailorApp?.hasJd) {
      runTailor({
        applicationId: tailorApp.applicationId,
        role: tailorApp.role,
        company: tailorApp.company,
        jobDescription: tailorApp.jobDescription,
      });
    } else {
      setNoJdOpen(true);
    }
  }, [tailorApp, runTailor]);

  // No-JD card submit. A picked application carries its own JD + id; a pasted JD
  // attaches to the pending application when there is one, else the engine
  // creates a tracked application (application_id null) as it does from the
  // tracker's "Generate tailored CV".
  const submitPickedApp = useCallback(
    (app) =>
      runTailor({
        applicationId: app.applicationId,
        role: app.role,
        company: app.company,
        jobDescription: app.jobDescription,
      }),
    [runTailor],
  );
  const submitPastedJd = useCallback(
    (jdText) =>
      runTailor({
        applicationId: pendingTailor?.applicationId ?? null,
        role: tailorApp?.role || "",
        company: tailorApp?.company || "",
        jobDescription: jdText,
      }),
    [runTailor, pendingTailor, tailorApp],
  );

  // Build the master 1:1 from the user's profile (= their onboarding CV) — no
  // LLM, deterministic. Inserts the is_master application_cvs row, then selects it.
  const buildMaster = async () => {
    if (building || !profile) return;
    setBuilding(true);
    const cv_data = buildMasterCvData(
      profile,
      experiences,
      education,
      user?.email,
    );
    const { data, error } = await supabase
      .from("application_cvs")
      .insert({
        user_id: user.id,
        is_master: true,
        version: 1,
        application_id: null,
        cv_data,
      })
      .select("id")
      .single();
    setBuilding(false);
    if (error) {
      toast.error("Couldn't build your master CV. Try again.");
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: applicationCvsQueryKey(user.id),
    });
    if (data?.id) setSelectedCvId(data.id);
  };

  if (!user) return <Centered>Sign in to load your CVs.</Centered>;
  if (optsLoading)
    return (
      <Centered>
        <Loader2 className="w-5 h-5 animate-spin" />
      </Centered>
    );
  if (!cvOptions.length) {
    return (
      <Centered>
        <div className="max-w-sm space-y-3">
          <FileText className="w-7 h-7 mx-auto text-rd-text-tertiary" />
          <p className="font-display font-bold text-rd-text text-[15px]">
            No master CV yet
          </p>
          <p>
            Build your master CV straight from your profile — it&apos;s your
            onboarding CV, 1:1, and fully editable here.
          </p>
          <button
            onClick={buildMaster}
            disabled={building || !profile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rd-coral text-white text-[13px] font-display font-semibold hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {building ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Building…
              </>
            ) : (
              "Build my master CV"
            )}
          </button>
        </div>
      </Centered>
    );
  }
  if (cvLoading || !model)
    return (
      <Centered>
        <Loader2 className="w-5 h-5 animate-spin" />
      </Centered>
    );

  const currentCv = cvOptions.find((o) => o.id === selectedCvId) || null;

  // Banner context: only when a tailor target is pending AND we're showing the
  // master (the "no tailored copy yet" state). Drives the master-with-banner CTA.
  const tailorContext =
    pendingTailor && currentCv?.isMaster
      ? {
          role: tailorApp?.role || "this role",
          company: tailorApp?.company || null,
        }
      : null;
  const tailorLabel = tailorApp?.role || "this job";

  return (
    <div className="relative h-full">
      <CVStudioView
        key={`${selectedCvId}:${editVersion}`}
        cv={model}
        onPatchHeader={onPatchHeader}
        onPatchSummary={onPatchSummary}
        onPatchExp={onPatchExp}
        onPatchBullet={onPatchBullet}
        onAddBullet={onAddBullet}
        onRemoveBullet={onRemoveBullet}
        onDragEnd={onDragEnd}
        onPatchEdu={onPatchEdu}
        onPatchSkills={onPatchSkills}
        onPatchLanguages={onPatchLanguages}
        templateId={templateId}
        onTemplateChange={setTemplateId}
        cvOptions={cvOptions}
        selectedCvId={selectedCvId}
        onSelectCv={setSelectedCvId}
        onDeleteCv={onDeleteCv}
        currentCv={currentCv}
        saveState={saveState}
        onDownload={onDownload}
        chatMessages={chatMessages}
        onSendMessage={onSendMessage}
        chatBusy={chatBusy}
        onTailorNew={startTailor}
        tailorContext={tailorContext}
        onTailorContext={startTailor}
        tailoring={tailoring}
        tailorLabel={tailorLabel}
      />
      {noJdOpen && (
        <NoJdCard
          role={tailorApp?.role || null}
          applications={jdApplications}
          onPick={submitPickedApp}
          onPaste={submitPastedJd}
          onClose={() => setNoJdOpen(false)}
        />
      )}
    </div>
  );
}

// No-JD overlay — lives in CVStudioLive (over CVStudioView) so the View stays
// pure. Shown when tailoring is requested without a usable job description:
// pick a tracked application that has a JD, or paste one. Never fake-tailors.
function NoJdCard({ role, applications, onPick, onPaste, onClose }) {
  const [jd, setJd] = useState("");
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-rd-text/20 px-4">
      <div className="w-full max-w-[520px] bg-rd-bg-card border border-rd-border rounded-2xl shadow-rd p-5 max-h-[80%] overflow-y-auto cv-scroll">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="font-display font-bold text-rd-text text-[15px]">
            {role ? `No job description for ${role} yet` : "Tailor to a job"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-rd-text-tertiary hover:text-rd-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[12.5px] text-rd-text-secondary leading-relaxed mb-4">
          Tailoring needs the job description. Pick a tracked application that
          has one, or paste a JD below.
        </p>

        {applications.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-rd-text-eyebrow mb-2">
              Your tracked applications with a JD
            </p>
            <div className="space-y-1.5">
              {applications.map((a) => (
                <button
                  key={a.applicationId}
                  onClick={() => onPick(a)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-rd-border bg-rd-bg-card hover:bg-rd-bg-soft text-left transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-rd-text-tertiary shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-rd-text truncate">
                      {a.role}
                    </span>
                    {a.company && (
                      <span className="block text-[10.5px] text-rd-text-tertiary truncate">
                        {a.company}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-rd-text-eyebrow mb-2">
          Or paste a job description
        </p>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={6}
          placeholder="Paste the job description here…"
          className="w-full px-3 py-2 rounded-lg border border-rd-border bg-rd-bg-card text-[12.5px] text-rd-text focus:outline-none focus:border-rd-coral resize-y"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12.5px] text-rd-text-secondary hover:bg-rd-bg-soft transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onPaste(jd.trim())}
            disabled={!jd.trim()}
            className="px-3 py-1.5 rounded-lg bg-rd-coral text-white text-[12.5px] font-display font-semibold hover:bg-rd-coral-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Tailor with this JD
          </button>
        </div>
      </div>
    </div>
  );
}
