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
import { Loader2, FileText } from "lucide-react";
import CVStudioView from "@/components/cv-studio/CVStudioView";
import {
  useApplicationCvs,
  useCvData,
  cvDataQueryKey,
  applicationCvsQueryKey,
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
      } else {
        paramAppliedRef.current = true;
      }
    }
    if (selectedCvId && cvOptions.some((o) => o.id === selectedCvId)) return;
    const master = cvOptions.find((o) => o.isMaster);
    setSelectedCvId((master || cvOptions[0]).id);
  }, [cvOptions, selectedCvId, searchParams, setSearchParams, optsLoading]);

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

  return (
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
    />
  );
}
