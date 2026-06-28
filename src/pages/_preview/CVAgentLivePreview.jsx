// DEV-only LIVE CV Studio — the real-data version of the CV Agent. Same
// CVStudioView as the design mock, but fed by the signed-in user's actual
// application_cvs (master + tailored copies), with inline edits autosaving back
// to the row and Download routed through the render-cv edge function.
//
// Uses the app's REAL providers (AuthProvider + QueryClient from App.jsx root) —
// no stubbing — and mounts inside the real Layout shell. When this is solid it
// becomes the body of the real CVAgent.jsx page.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";
import Layout from "@/Layout";
import CVStudioView from "@/components/cv-studio/CVStudioView";
import { useApplicationCvs, useCvData, cvDataQueryKey, applicationCvsQueryKey } from "@/lib/queries/useApplicationCvs";
import { fromCvData, toCvData } from "@/lib/cvDataAdapter";

const uid = () => Math.random().toString(36).slice(2, 9);

function Centered({ children }) {
  return (
    <div className="h-full grid place-items-center bg-rd-bg-page text-rd-text-secondary text-sm px-6 text-center">
      {children}
    </div>
  );
}

function LiveStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: cvOptions = [], isLoading: optsLoading } = useApplicationCvs(user?.id);
  const [selectedCvId, setSelectedCvId] = useState(null);
  const [templateId, setTemplateId] = useState("modern");

  // Default to the master (or the most recent) once the list loads, and recover
  // if the current selection drops out of the list.
  useEffect(() => {
    if (!cvOptions.length) return;
    if (selectedCvId && cvOptions.some((o) => o.id === selectedCvId)) return;
    const master = cvOptions.find((o) => o.isMaster);
    setSelectedCvId((master || cvOptions[0]).id);
  }, [cvOptions, selectedCvId]);

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

  // ---- debounced autosave to application_cvs.cv_data (RLS own-row) ----
  const [saveState, setSaveState] = useState("saved");
  const saveTimer = useRef(null);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const persist = useCallback((cvId, nextModel) => {
    if (!cvId) return;
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const cv_data = toCvData(nextModel);
      const { error } = await supabase.from("application_cvs").update({ cv_data }).eq("id", cvId);
      if (error) { setSaveState("error"); toast.error("Couldn't save your edits."); return; }
      setSaveState("saved");
      queryClient.setQueryData(cvDataQueryKey(cvId), (prev) => (prev ? { ...prev, cv_data } : prev));
    }, 800);
  }, [queryClient]);

  const update = useCallback((updater) => {
    if (!modelRef.current) return;
    const next = updater(modelRef.current);
    modelRef.current = next;
    setModel(next);
    persist(selectedCvId, next);
  }, [persist, selectedCvId]);

  const onPatchHeader = (patch) => update((m) => ({ ...m, header: { ...m.header, ...patch } }));
  const onPatchSummary = (v) => update((m) => ({ ...m, summary: v }));
  const onPatchExp = (id, patch) => update((m) => ({ ...m, experiences: m.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const onPatchBullet = (expId, bId, text) => update((m) => ({ ...m, experiences: m.experiences.map((e) => (e.id === expId ? { ...e, bullets: e.bullets.map((b) => (b.id === bId ? { ...b, text } : b)) } : e)) }));
  const onAddBullet = (expId) => update((m) => ({ ...m, experiences: m.experiences.map((e) => (e.id === expId ? { ...e, bullets: [...e.bullets, { id: uid(), text: "" }] } : e)) }));
  const onRemoveBullet = (expId, bId) => update((m) => ({ ...m, experiences: m.experiences.map((e) => (e.id === expId ? { ...e, bullets: e.bullets.filter((b) => b.id !== bId) } : e)) }));
  const onDragEnd = (result) => {
    if (!result.destination) return;
    update((m) => {
      const next = [...m.experiences];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return { ...m, experiences: next };
    });
  };
  const onPatchEdu = (id, patch) => update((m) => ({ ...m, education: m.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const onPatchSkills = (line) => update((m) => ({ ...m, skills: line.split("·").map((s) => s.trim()).filter(Boolean) }));
  const onPatchLanguages = (line) => update((m) => ({ ...m, languages: line.split("·").map((s) => s.trim()).filter(Boolean) }));

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
      },
    });
    toast.dismiss(t);
    if (error || !data?.cv_url) {
      toast.error("Couldn't render the PDF. (render-cv may not be deployed yet.)");
      return;
    }
    window.open(data.cv_url, "_blank", "noopener");
  }, [cvOptions, selectedCvId]);

  const onDeleteCv = useCallback(async (id) => {
    const { error } = await supabase.from("application_cvs").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete that CV."); return; }
    toast.success("CV deleted.");
    if (id === selectedCvId) setSelectedCvId(null); // selection effect re-picks master/first
    queryClient.removeQueries({ queryKey: cvDataQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: applicationCvsQueryKey(user?.id) });
  }, [selectedCvId, queryClient, user?.id]);

  if (!user) return <Centered>Sign in to load your CVs.</Centered>;
  if (optsLoading) return <Centered><Loader2 className="w-5 h-5 animate-spin" /></Centered>;
  if (!cvOptions.length) {
    return (
      <Centered>
        <div className="max-w-sm space-y-2">
          <FileText className="w-7 h-7 mx-auto text-rd-text-tertiary" />
          <p className="font-display font-bold text-rd-text text-[15px]">No CV yet</p>
          <p>Generate your master CV from the CV Agent chat and it&apos;ll open here, fully editable.</p>
        </div>
      </Centered>
    );
  }
  if (cvLoading || !model) return <Centered><Loader2 className="w-5 h-5 animate-spin" /></Centered>;

  const currentCv = cvOptions.find((o) => o.id === selectedCvId) || null;

  return (
    <CVStudioView
      key={selectedCvId}
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
    />
  );
}

export default function CVAgentLivePreview() {
  return (
    <Layout currentPageName="CVAgent">
      <LiveStudio />
    </Layout>
  );
}
