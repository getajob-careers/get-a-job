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
  fetchCvData,
  useApplicationForTailor,
  useApplicationsWithJd,
} from "@/lib/queries/useApplicationCvs";
import { useProfileQuery } from "@/lib/queries/useProfile";
import {
  useExperiencesQuery,
  experiencesQueryKey,
} from "@/lib/queries/useExperiences";
import { promoteBulletsToProfile } from "@/lib/promoteBulletsToProfile";
import { triggerBlobDownload, cvFilename } from "@/lib/downloadFile";
import { trackCvGenerated } from "@/lib/analytics";
import CvGenerationProgress from "@/components/cv-studio/CvGenerationProgress";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { fromCvData, toCvData, buildMasterCvData } from "@/lib/cvDataAdapter";
import { useSeededCvModel } from "@/components/cv-studio/useSeededCvModel";

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
  const {
    data: cvOptions = [],
    isLoading: optsLoading,
    isFetching: optsFetching,
  } = useApplicationCvs(user?.id);
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
  // Tracks which ?cv/?application_id value we've already RESOLVED to a selection.
  // Not a one-shot boolean: a deep-linked application may have no tailored copy
  // when the effect first runs and the copy lands moments later (post-generation
  // refetch) - keying on the param lets a later cvOptions update re-resolve it.
  const resolvedParamRef = useRef(null);

  // Tailoring ("Tailor to a job"). pendingTailor is a tracked application the
  // user wants a tailored CV for that has NO tailored row yet — set from the
  // deep-link branch below (instead of silently dropping it) or from the
  // explicit Tailor action. tailorApp hydrates its role/company/JD. The studio
  // stays on the master CV while a target is pending, with a "Tailor it to …"
  // banner over the real master content.
  const [pendingTailor, setPendingTailor] = useState(null); // { applicationId } | null
  const [tailoring, setTailoring] = useState(false); // the refine-cv select+reword call (~16s)
  const [tailorStage, setTailorStage] = useState(""); // client-side staged progress label
  const [tailorResult, setTailorResult] = useState(null); // { cvId, role, company } — outcome card
  const [noJdOpen, setNoJdOpen] = useState(false); // no-JD card overlay
  const stageTimers = useRef([]); // timers driving tailorStage; cleared on finish/unmount
  const { data: tailorApp } = useApplicationForTailor(
    pendingTailor?.applicationId,
  );
  const { data: jdApplications = [], isError: jdApplicationsError } =
    useApplicationsWithJd(user?.id, noJdOpen);

  // Selection: honor ?cv / ?application_id ONCE (the tracker's "Generate tailored
  // CV → Open in CV Agent" deep-link), waiting for the refetch to land a freshly
  // generated copy. Otherwise default to master (or most recent), and recover if
  // the current selection drops out of the list.
  useEffect(() => {
    if (!cvOptions.length) return;
    const cvParam = searchParams.get("cv");
    const appParam = searchParams.get("application_id");
    const paramKey = cvParam
      ? `cv:${cvParam}`
      : appParam
        ? `app:${appParam}`
        : null;
    if (paramKey && resolvedParamRef.current !== paramKey) {
      const target =
        (cvParam && cvOptions.find((o) => o.id === cvParam)) ||
        (appParam && cvOptions.find((o) => o.applicationId === appParam)) ||
        null;
      if (target) {
        // Found the deep-linked copy - commit to it, strip the params, and mark
        // this param resolved so we never re-run for it.
        resolvedParamRef.current = paramKey;
        const next = new URLSearchParams(searchParams);
        next.delete("cv");
        next.delete("application_id");
        setSearchParams(next, { replace: true });
        setSelectedCvId(target.id);
        return;
      }
      // Not found yet. refetchOnMount is "always", so a freshly generated copy
      // lands moments after mount - and a background generation can land much
      // later. Wait while the list is in flight; do NOT commit to master mid-fetch.
      if (optsLoading || optsFetching) return;
      // Settled without the target: show master + the "Tailor it to …" banner,
      // but do NOT mark the param resolved and do NOT strip it - a later refetch
      // (e.g. the generation completing) re-runs this and selects the tailored
      // copy the moment it appears, instead of latching to master forever.
      if (appParam) setPendingTailor({ applicationId: appParam });
    }
    if (selectedCvId && cvOptions.some((o) => o.id === selectedCvId)) return;
    const master = cvOptions.find((o) => o.isMaster);
    setSelectedCvId((master || cvOptions[0]).id);
  }, [
    cvOptions,
    selectedCvId,
    searchParams,
    setSearchParams,
    optsLoading,
    optsFetching,
  ]);

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

  // Editor model — seeded from the selected CV's loaded row by useSeededCvModel
  // (defined above the component). modelRef mirrors it so autosave + handlers read
  // the current value without stale closures.
  const { model, setModel, modelRef } = useSeededCvModel(cvRow, selectedCvId);

  // Conversation is per-CV — reset when the user switches CVs. (Model reset lives
  // inside useSeededCvModel; do NOT setModel here — a second effect writing model
  // reintroduces the two-effects-clobber spinner bug.)
  useEffect(() => {
    setChatMessages([]);
  }, [selectedCvId]);

  // ---- debounced autosave to application_cvs.cv_data (RLS own-row) ----
  const [saveState, setSaveState] = useState("saved");
  const saveTimer = useRef(null);
  const profilePromptedRef = useRef(false);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  useEffect(() => () => stageTimers.current.forEach(clearTimeout), []);

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
        // FIX 2b: the master is a pure derivative (rebuilt from the profile on
        // every tailor), so a direct studio edit to it is ephemeral. Offer to
        // promote the change to the PROFILE (the source of truth). Deduped via
        // profilePromptedRef so the debounced autosave prompts once per edit burst.
        const savedCv = cvOptions.find((o) => o.id === cvId);
        if (savedCv?.isMaster && !profilePromptedRef.current) {
          profilePromptedRef.current = true;
          toast("Saved to this CV.", {
            description: "Save these bullet edits to your profile too?",
            action: {
              label: "Save to profile",
              onClick: async () => {
                const res = await promoteBulletsToProfile({
                  supabase,
                  user,
                  cvData: toCvData(nextModel),
                });
                if (res.updated > 0) {
                  queryClient.invalidateQueries({
                    queryKey: experiencesQueryKey(user.id),
                  });
                  toast.success(
                    `Saved to your profile (${res.updated} experience${res.updated > 1 ? "s" : ""}).`,
                  );
                } else {
                  toast.error("Couldn't save that to your profile.");
                }
              },
            },
          });
        }
      }, 800);
    },
    [queryClient, cvOptions, user],
  );

  const update = useCallback(
    (updater) => {
      if (!modelRef.current) return;
      const next = updater(modelRef.current);
      modelRef.current = next;
      setModel(next);
      profilePromptedRef.current = false;
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
    // The renderer always fits the whole CV on one page and never cuts content.
    // For a very dense CV it offers an OPTIONAL, calm, dismissible hint — never
    // an error, never implying anything was dropped. Default: no notice.
    if (data.fit?.dense) {
      toast("This CV is dense", {
        description:
          "It all fits on one page - you can trim items if you'd like more breathing room.",
        duration: 8000,
      });
    }
    try {
      await triggerBlobDownload(
        data.cv_url,
        cvFilename(
          profile?.full_name,
          current?.isMaster ? "Master" : current?.role,
        ),
      );
    } catch {
      toast.error("Couldn't download the PDF. Please try again.");
    }
  }, [cvOptions, selectedCvId, templateId, profile]);

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
            content: "Sorry - I couldn't reach the editor. Please try again.",
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

  // Client-side staged progress for the tailoring call. refine-cv is a single
  // blocking request (no streaming), so these stages are timed estimates that
  // show motion rather than a blank spinner. When the user has no master yet,
  // refine-cv lazy-builds it inline (~40s, once) — lead with that stage so the
  // first tailor never looks hung.
  const stopStages = useCallback(() => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    setTailorStage("");
  }, []);
  const startStages = useCallback((hasMaster) => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    const seq = hasMaster
      ? [
          [0, "Reading the role…"],
          [2500, "Reframing your experience for this role…"],
          [9000, "Rendering your PDF…"],
        ]
      : [
          [0, "Preparing your master CV (one-time, this can take ~40s)…"],
          [40000, "Reading the role…"],
          [42500, "Reframing your experience for this role…"],
          [49000, "Rendering your PDF…"],
        ];
    for (const [ms, label] of seq) {
      if (ms === 0) setTailorStage(label);
      else
        stageTimers.current.push(setTimeout(() => setTailorStage(label), ms));
    }
  }, []);

  // Tailor via refine-cv — the extension's proven select-and-reword path
  // (~16s): it picks + reframes the JD-relevant material from the user's master
  // reservoir and persists a new is_master=false row tied to application_id.
  // refine-cv REQUIRES an application_id (no engine-side app creation), returns
  // cv_url + tailoring (coverage) but NOT cv_id, so we select the new row by
  // application_id from the refetched list. No cv_data is echoed back.
  const runTailor = useCallback(
    async (target) => {
      // target: { applicationId: string, role?: string, company?: string, jobDescription: string }
      if (tailoring || !user?.id) return;
      // refine-cv 400s without an application_id; route back to the no-JD card
      // (pick/create an app) rather than firing a doomed call.
      if (!target.applicationId) {
        setNoJdOpen(true);
        return;
      }
      setNoJdOpen(false);
      setTailorResult(null); // clear any prior outcome card
      setTailoring(true);
      startStages(cvOptions.some((o) => o.isMaster));
      const genStartedAt = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("refine-cv", {
          body: {
            application_id: target.applicationId,
            job_description: target.jobDescription,
            cv_model: "sonnet",
            ops_variant: "v3",
            grounding: "default",
          },
        });
        if (error || !data || data.error) {
          const status = error?.context?.status ?? error?.status;
          trackCvGenerated({
            success: false,
            source: "studio",
            model: "sonnet",
            application_id: target.applicationId,
            role_title: target.role,
            duration_ms: Math.round(performance.now() - genStartedAt),
            failure_reason:
              data?.error ||
              error?.message ||
              (status ? `http_${status}` : "unknown"),
          });
          toast.error(
            status === 429
              ? "Tailoring limit reached (30/hour). Please try again a little later."
              : "Couldn't tailor your CV. Please try again.",
          );
          return;
        }
        // Tailoring succeeded server-side. The outcome card is the SOLE
        // completion surface; the coverage read is folded into the card below.
        const appId = data.application_id ?? target.applicationId ?? null;
        trackCvGenerated({
          success: true,
          source: "studio",
          model: data?.model || "sonnet",
          application_id: appId,
          role_title: target.role,
          duration_ms: Math.round(performance.now() - genStartedAt),
          unsourced_bullets_count: Array.isArray(data?.unsourced_bullets)
            ? data.unsourced_bullets.length
            : 0,
        });
        const tail = data.tailoring;
        const matched = Array.isArray(tail?.matched_phrases)
          ? tail.matched_phrases.length
          : null;
        const missed = Array.isArray(tail?.missed_phrases)
          ? tail.missed_phrases.length
          : 0;
        const fitLine =
          matched != null
            ? `Matched ${matched} of ${matched + missed} key phrases.`
            : null;
        // Refetch the list and AUTO-SELECT the freshly generated row so the
        // editor renders it immediately (no "View it" click, no stale copy). The
        // outcome card still shows the fit line + Download. refine-cv doesn't
        // return cv_id, so select by application_id from the refetched, deduped
        // list (newest per app); keep the cv_id path for forward-compat.
        try {
          await queryClient.invalidateQueries({
            queryKey: applicationCvsQueryKey(user.id),
          });
          const fresh = await queryClient.fetchQuery({
            queryKey: applicationCvsQueryKey(user.id),
            queryFn: () => fetchApplicationCvs(user.id),
          });
          const newCvId =
            data.cv_id ||
            (appId &&
              fresh.find((o) => !o.isMaster && o.applicationId === appId)
                ?.id) ||
            null;
          setPendingTailor(null);
          if (newCvId) {
            setSelectedCvId(newCvId); // render the new row now; the single seed
            // effect clears the prior model and re-seeds from the fresh row.
            setTailorResult({
              cvId: newCvId,
              role: target.role || null,
              company: target.company || null,
              fit: fitLine,
            });
          } else {
            toast.error(
              "Your tailored CV was created - refresh to see it in your CV list.",
            );
          }
        } catch {
          toast.error(
            "Your tailored CV was created - refresh to see it in your CV list.",
          );
        }
      } finally {
        stopStages();
        setTailoring(false);
      }
    },
    [tailoring, user?.id, queryClient, cvOptions, startStages, stopStages],
  );

  // Outcome card "View it": load the just-tailored CV in the editor like the
  // master (deterministic — the row id came straight from the engine).
  const onViewTailored = useCallback((cvId) => {
    if (!cvId) return;
    setTailorResult(null);
    setPendingTailor(null);
    setSelectedCvId(cvId);
  }, []);

  // Outcome card "Download": re-render the just-tailored CV via render-cv at the
  // selected template (template fidelity + one-page floor), not the engine's
  // raw cv_url. Fetches that row's cv_data (it isn't the loaded editor model).
  const onDownloadTailored = useCallback(
    async (cvId) => {
      if (!cvId) return;
      const opt = cvOptions.find((o) => o.id === cvId);
      const t = toast.loading("Rendering PDF…");
      const cv_data =
        cvId === selectedCvId && modelRef.current
          ? toCvData(modelRef.current)
          : ((await fetchCvData(cvId))?.cv_data ?? null);
      if (!cv_data) {
        toast.dismiss(t);
        toast.error("Couldn't load that CV to download.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("render-cv", {
        body: {
          cv_data,
          cv_id: cvId,
          application_id: opt?.applicationId ?? null,
          target_role: opt?.role ?? "",
          template: templateId,
        },
      });
      toast.dismiss(t);
      if (error || !data?.cv_url) {
        toast.error("Couldn't render the PDF. Please try again.");
        return;
      }
      try {
        await triggerBlobDownload(
          data.cv_url,
          cvFilename(profile?.full_name, opt?.role),
        );
      } catch {
        toast.error("Couldn't download the PDF. Please try again.");
      }
    },
    [cvOptions, selectedCvId, templateId, profile],
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
  // attaches to the PENDING application only (refine-cv requires an application_id
  // — we never silently create a tracked application). The paste box is gated in
  // the card on canPaste = a pending app exists, so this never fires without one.
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
    // Fetch projects + certifications so the studio's empty-state build has the
    // same section richness as the refine-cv / prewarm masters (extras parity).
    const [projRes, certRes] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("certifications").select("*").eq("user_id", user.id),
    ]);
    const cv_data = buildMasterCvData(
      profile,
      experiences,
      education,
      user?.email,
      {
        projects: projRes.data || [],
        certifications: certRes.data || [],
      },
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
    // Building the first master is a ~40s blank wait — the worst "dead spinner"
    // surface. Show the honest CV-shaped skeleton + phase labels instead (S1).
    if (building) {
      return (
        <Centered>
          <div className="max-w-sm w-full">
            <CvGenerationProgress hasMaster={false} />
          </div>
        </Centered>
      );
    }
    return (
      <Centered>
        <div className="max-w-sm space-y-3">
          <FileText className="w-7 h-7 mx-auto text-rd-text-tertiary" />
          <p className="font-display font-bold text-rd-text text-[15px]">
            No master CV yet
          </p>
          <p>
            Build your master CV straight from your profile - it&apos;s your
            onboarding CV, 1:1, and fully editable here.
          </p>
          <button
            onClick={buildMaster}
            disabled={building || !profile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rd-coral text-white text-[13px] font-display font-semibold hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {"Build my master CV"}
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
        onSelectCv={(id) => {
          setTailorResult(null); // dismiss the outcome card on a manual switch
          setSelectedCvId(id);
        }}
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
        tailorStage={tailorStage}
        tailorResult={tailorResult}
        onViewTailored={onViewTailored}
        onDownloadTailored={onDownloadTailored}
      />
      {noJdOpen && (
        <NoJdCard
          role={tailorApp?.role || null}
          applications={jdApplications}
          applicationsError={jdApplicationsError}
          canPaste={!!pendingTailor?.applicationId}
          onPick={submitPickedApp}
          onPaste={submitPastedJd}
          onClose={() => setNoJdOpen(false)}
        />
      )}
    </div>
  );
}

// No-JD overlay — lives in CVStudioLive (over CVStudioView) so the View stays
// pure. Shown when tailoring is requested without a usable job description: pick
// a tracked application that has a JD, or (only when a specific application is in
// context) paste one for it. Never fake-tailors and never creates a phantom
// application — refine-cv requires a real application_id.
function NoJdCard({
  role,
  applications,
  applicationsError,
  canPaste,
  onPick,
  onPaste,
  onClose,
}) {
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
          {canPaste
            ? "Tailoring needs the job description. Paste it for this role below, or pick another tracked application that already has one."
            : "Pick a tracked application that has a job description. To tailor for a new job, add it as a tracked application first."}
        </p>

        {applicationsError && (
          <p className="text-[12px] text-rd-coral-dark leading-relaxed mb-4">
            We couldn't load your tracked applications - this is a loading
            problem, not an empty list. Refresh and try again.
          </p>
        )}

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

        {canPaste ? (
          <>
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.08em] text-rd-text-eyebrow mb-2">
              Or paste this role&apos;s job description
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
          </>
        ) : (
          <div className="flex justify-end mt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-[12.5px] text-rd-text-secondary hover:bg-rd-bg-soft transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
