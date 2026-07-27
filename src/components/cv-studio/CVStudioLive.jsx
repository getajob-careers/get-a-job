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
import { isNextDesign } from "@/lib/nextDesign";
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
import { useProfileQuery, profileQueryKey } from "@/lib/queries/useProfile";
import {
  useExperiencesQuery,
  experiencesQueryKey,
} from "@/lib/queries/useExperiences";

import { triggerBlobDownload, cvFilename } from "@/lib/downloadFile";
import { trackCvGenerated } from "@/lib/analytics";
import CvGenerationProgress from "@/components/cv-studio/CvGenerationProgress";
import { useCvGenerationProgress } from "@/hooks/useCvGenerationProgress";
import {
  useEducationQuery,
  educationQueryKey,
} from "@/lib/queries/useEducation";
import {
  fromCvData,
  toCvData,
  buildMasterCvData,
  rebuildLanguages,
  masterSkillsFlat,
} from "@/lib/cvDataAdapter";
import {
  writeProfileEntity,
  undoProfileWrite,
  reorderExperiences,
  createProfileRow,
  deleteProfileRow,
  restoreProfileRow,
} from "@/lib/writeProfileEntity";
import { createSerializedWriter } from "@/lib/serializedWriteThrough";
import { revertCvDataField } from "@/lib/revertCvDataField";
import { useSeededCvModel } from "@/components/cv-studio/useSeededCvModel";

const uid = () => Math.random().toString(36).slice(2, 9);

function Centered({ children }) {
  return (
    <div className="h-full grid place-items-center bg-rd-bg-page text-rd-text-secondary text-sm px-6 text-center">
      {children}
    </div>
  );
}

// rightRail / enablePieceRevise are passed ONLY by the flag-on home CV tab
// (ThreeTabHome). The /CVAgent page renders <CVStudioLive/> with no props, so its
// View gets no rightRail (keeps the CV Agent panel) and no onRevisePiece (no
// affordance) - byte-identical to before.
export default function CVStudioLive({
  rightRail = null,
  enablePieceRevise = false,
} = {}) {
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
  const [autoFocusId, setAutoFocusId] = useState(null); // model id of a just-added entry → its title/institution field auto-focuses
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
  // Honest determinate ring: poll the refine-cv progress row while tailoring.
  const tailorProgress = useCvGenerationProgress({
    userId: user?.id,
    source: "refine-cv",
    enabled: tailoring,
  });
  const [tailorResult, setTailorResult] = useState(null); // { cvId, role, company } — outcome card
  const [noJdOpen, setNoJdOpen] = useState(false); // no-JD card overlay
  const { data: tailorApp } = useApplicationForTailor(
    pendingTailor?.applicationId,
  );
  const { data: jdApplications = [], isError: jdApplicationsError } =
    useApplicationsWithJd(user?.id, noJdOpen);

  // Selection: honor ?cv / ?application_id ONCE (the tracker's "Generate tailored
  // CV → Open in CV editor" deep-link), waiting for the refetch to land a freshly
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

  // Auto-focus a just-added entry's first field (title / institution) so the
  // user can type immediately. Imperative + from THIS stable effect (the entry's
  // own mount effect raced the mount/remount and the focus didn't land): once
  // the model update has committed the new node, a rAF lets it paint, then we
  // query it by data-entry-id and focus it, and clear so it fires exactly once.
  // Self-contained (writes only autoFocusId, never model) - no two-effect clobber.
  useEffect(() => {
    if (!autoFocusId) return;
    const id = autoFocusId;
    // A plain timeout (NOT rAF with a cancel-on-cleanup): the id is captured
    // locally, and re-renders around the add (autosave "saving" state, dnd
    // remount) don't cancel it. 80ms lets the new node settle; then focus it by
    // data-entry-id. Clearing the state re-runs this effect into the early
    // return - the already-scheduled timeout still fires.
    // Retry across a few frames: the new entry can re-render/remount once (dnd,
    // autosave state) right after it mounts, blurring a single-shot focus. Each
    // attempt re-queries by data-entry-id (fresh node) and focuses only if it's
    // not already the active field, so it settles on the title/institution.
    [30, 120, 260, 450].forEach((d) =>
      window.setTimeout(() => {
        const el = document.querySelector(
          `[data-entry-id="${id}"] [contenteditable="true"]`,
        );
        if (el && document.activeElement !== el) el.focus();
      }, d),
    );
    setAutoFocusId(null);
  }, [autoFocusId]);

  // ---- debounced autosave to application_cvs.cv_data (RLS own-row) ----
  const [saveState, setSaveState] = useState("saved");
  const saveTimer = useRef(null);
  // Session-scoped undo stack (Requirement 1). Each MASTER write-through pushes a
  // { prevModel, revertSource, label }; "Undo last change" restores BOTH the
  // source row (revertSource -> another audited write) and the editor model.
  // In-memory + capped + lost on refresh; the durable trail lives in
  // profile_edits. Only master edits mutate source, so only they are undoable.
  const undoStackRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  // Per-(field, entity) write-through serializer (strict FIFO + burst
  // coalescing). Without it, two commits to the SAME field/entity can read the
  // same stale "prior" concurrently and last-write-wins can clobber the newer
  // edit (the reproduced exp_bullets race). Created once per mount.
  const serializeWriteRef = useRef(null);
  if (!serializeWriteRef.current)
    serializeWriteRef.current = createSerializedWriter();
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Debounced write of the editor model to application_cvs.cv_data. For the
  // MASTER this row is a re-derived CACHE - the source-of-truth write goes
  // through writeField() on each field commit (below); for a TAILORED CV this
  // row IS the document. Either way it keeps the loaded row + its react-query
  // cache in sync so a reload re-seeds the same content. The old master->profile
  // "Save to profile" toast (S8) is gone: every master edit now persists to
  // source immediately via write-through, so there is nothing left to promote.
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
      if (!modelRef.current) return null;
      const next = updater(modelRef.current);
      modelRef.current = next;
      setModel(next);
      persist(selectedCvId, next);
      return next;
    },
    [persist, selectedCvId],
  );

  // ── Master write-through (Option-A) ────────────────────────────────────────
  // On the MASTER, each field commit persists to its SOURCE row (profiles /
  // experiences / education) through the shared write layer, IN ADDITION to the
  // debounced cv_data cache write in persist(). TAILORED CVs are documents:
  // writeField no-ops for them, so persist() (cv_data only) is their sole writer.
  // Requirement 3's two modes are thus enforced here, not just signalled in UI.
  const isMasterCv = useCallback(
    () => !!cvOptions.find((o) => o.id === selectedCvId)?.isMaster,
    [cvOptions, selectedCvId],
  );

  const pushUndo = useCallback((entry) => {
    const stack = undoStackRef.current;
    stack.push(entry);
    if (stack.length > 30) stack.shift();
    setCanUndo(stack.length > 0);
  }, []);

  // Resolve an experience/education source-row id; on the master, surface loudly
  // when it's missing (older masters built before the id-stamp) rather than
  // silently writing cv_data only (spec S2: an unattributable edit is surfaced,
  // not dropped). Returns null when it can't attribute.
  const attributedId = useCallback(
    (srcId, kind) => {
      if (srcId) return srcId;
      if (isMasterCv())
        toast.error(
          `This ${kind} isn't linked to your profile yet, so the edit stayed on this CV only. Rebuild your master CV to link it.`,
        );
      return null;
    },
    [isMasterCv],
  );

  // Route one field commit to its source row (master only). Never a silent
  // no-op: conflict / needs-confirm / error / audit-failure each surface.
  const writeField = useCallback(
    async ({
      field,
      entityId = null,
      newValue,
      priorOverride,
      prevModel,
      confirmed = false,
      label,
    }) => {
      if (!isMasterCv() || !user?.id) return;
      // Serialize per (field, entity): FIFO + coalesce a burst to its latest
      // request, so an intermediate re-commit can't land after the user's newest
      // edit. A superseded write is skipped (never touches the DB, never undoes).
      const key = `${field}:${entityId ?? "profile"}`;
      return serializeWriteRef.current(key, async () => {
        const res = await writeProfileEntity(supabase, {
          userId: user.id,
          field,
          entityId,
          newValue,
          // Baseline destructive-confirm + the undo token on what the user saw
          // (the editor's pre-edit value), never the source row, which can be
          // drifted leaner than cv_data. Guarantees undo restores the pre-edit
          // cv_data and no empty-prior token is minted off a drifted source.
          priorOverride,
          source: "studio",
          confirmed,
          // baseVersion omitted: the Studio edits a re-derived cache and doesn't
          // hold the source row's load-time version. Concurrency is fail-open
          // (last-write-wins) here; the coach path - the reason optimistic
          // concurrency exists - carries versions and is a separate arc.
        });
        if (res.conflict) {
          toast.error(
            "This changed elsewhere since you opened it - reload to see the latest.",
          );
          return;
        }
        if (res.needsConfirm) {
          toast.error("That change needs confirmation and wasn't saved.");
          return;
        }
        if (!res.ok) {
          setSaveState("error");
          toast.error(res.error || "Couldn't save that to your profile.");
          return;
        }
        // No diff from what the user saw: nothing was written or logged, so
        // there is nothing to undo (item 4 - a blur on an unedited field must
        // not push a spurious undo entry).
        if (res.noop) return;
        if (res.audit_ok === false)
          toast("Saved, but the change history couldn't be recorded.");
        pushUndo({
          label: label || field,
          prevModel,
          // field + entityId let onUndo revert ONLY this field in cv_data
          // (surgically, matching the mediated source revert), instead of
          // clobbering the whole model - the item-1 divergence fix.
          field,
          entityId,
          revertSource: () =>
            undoProfileWrite(supabase, {
              userId: user.id,
              undoToken: res.undo_token,
            }),
        });
      });
    },
    [isMasterCv, user, pushUndo],
  );

  // Undo the last master write-through: revert the source row (an audited
  // reversal), then restore the editor model + cv_data cache to the pre-edit
  // snapshot and remount so contentEditable re-seeds (the chat-apply mechanism).
  const onUndo = useCallback(async () => {
    const entry = undoStackRef.current.pop();
    setCanUndo(undoStackRef.current.length > 0);
    if (!entry) return;
    const res = await entry.revertSource();
    if (res && res.ok === false) {
      undoStackRef.current.push(entry); // keep it so the user can retry
      setCanUndo(true);
      toast.error(res.error || "Couldn't undo that change.");
      return;
    }
    // Revert ONLY the field this entry changed (matching the mediated source
    // revert above), never the whole pre-edit model: a whole-model persist was
    // the item-1 bug - it clobbered cv_data fields (e.g. bullets) that had
    // drifted from the snapshot, diverging the stores with an unlogged write.
    // Structural entries (row add/delete/reorder) carry no `field`; they still
    // restore their pre-edit model, which IS the structure they changed.
    const restored = entry.field
      ? revertCvDataField(
          modelRef.current,
          entry.prevModel,
          entry.field,
          entry.entityId,
        )
      : entry.prevModel;
    modelRef.current = restored;
    setModel(restored);
    setEditVersion((v) => v + 1);
    persist(selectedCvId, restored);
    queryClient.invalidateQueries({ queryKey: experiencesQueryKey(user?.id) });
    queryClient.invalidateQueries({ queryKey: educationQueryKey(user?.id) });
    queryClient.invalidateQueries({ queryKey: profileQueryKey(user?.id) });
    toast.success(`Undid your ${entry.label} change.`);
  }, [persist, selectedCvId, user, queryClient]);

  // Header: name/headline/linkedin/location write through; email is a LOUD
  // EXCEPTION (auth-owned, read-only on the master in the View) so it never
  // reaches writeField for the master.
  const HEADER_FIELD = {
    name: "full_name",
    headline: "headline",
    linkedin: "linkedin",
    location: "location",
    phone: "phone",
  };
  const EXP_FIELD = { title: "exp_title", org: "exp_company" };
  const EDU_FIELD = {
    institution: "edu_institution",
    degree: "edu_degree",
    field: "edu_field",
  };
  const CERT_FIELD = {
    name: "cert_name",
    issuer: "cert_issuer",
    date: "cert_date",
  };
  // project_name / project_url write through; project BULLETS have no source
  // column (cv_data-only) -> deliberately absent, so a bullet edit loud-surfaces.
  const PROJ_FIELD = { name: "project_name", url: "project_url" };

  const onPatchHeader = (patch) => {
    const prevModel = modelRef.current;
    update((m) => ({ ...m, header: { ...m.header, ...patch } }));
    for (const [k, val] of Object.entries(patch)) {
      const field = HEADER_FIELD[k];
      if (field)
        writeField({
          field,
          newValue: val,
          priorOverride: prevModel?.header?.[k],
          prevModel,
          label: k,
        });
    }
  };
  const onPatchSummary = (v) => {
    const prevModel = modelRef.current;
    update((m) => ({ ...m, summary: v }));
    writeField({
      field: "summary",
      newValue: v,
      priorOverride: prevModel?.summary,
      prevModel,
      label: "summary",
    });
  };
  // Experience handlers are keyed by section ("experiences" | "military" |
  // "volunteering" | "leadership") so the four buckets share one set of logic.
  // dates are a LOUD EXCEPTION (read-only on the master in the View).
  const onPatchExp = (section, id, patch) => {
    const prevModel = modelRef.current;
    const next = update((m) => ({
      ...m,
      [section]: m[section].map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    if (!next) return;
    const srcId =
      next[section].find((e) => e.id === id)?.__src?.experience_id || null;
    const prevEntry = prevModel?.[section]?.find((e) => e.id === id);
    for (const [k, val] of Object.entries(patch)) {
      const field = EXP_FIELD[k];
      if (!field) continue;
      const eid = attributedId(srcId, "role");
      if (eid)
        writeField({
          field,
          entityId: eid,
          newValue: val,
          priorOverride: prevEntry?.[k],
          prevModel,
          label: k,
        });
    }
  };
  const onPatchBullet = (section, expId, bId, text) => {
    const prevModel = modelRef.current;
    const next = update((m) => ({
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
    if (!next || !isMasterCv()) return;
    const entry = next[section].find((e) => e.id === expId);
    const eid = attributedId(entry?.__src?.experience_id || null, "role");
    if (!eid) return;
    const toBullets = (e) =>
      (e?.bullets || [])
        .map((b) => String(b.text || "").trim())
        .filter(Boolean);
    writeField({
      field: "exp_bullets",
      entityId: eid,
      newValue: toBullets(entry),
      priorOverride: toBullets(
        prevModel?.[section]?.find((e) => e.id === expId),
      ),
      prevModel,
      label: "bullets",
    });
  };
  // Add creates an EMPTY editable line; no source write yet (the text lands via
  // onPatchBullet on blur). cv_data cache only, so the new line renders.
  const onAddBullet = (section, expId) =>
    update((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? { ...e, bullets: [...e.bullets, { id: uid(), text: "" }] }
          : e,
      ),
    }));
  // Destructive: on the master this removes a bullet from the profile, so confirm
  // first (undoable). The write is pre-confirmed so the layer doesn't re-prompt.
  const onRemoveBullet = (section, expId, bId) => {
    const prevModel = modelRef.current;
    const srcId =
      prevModel?.[section]?.find((e) => e.id === expId)?.__src?.experience_id ||
      null;
    const master = isMasterCv();
    if (
      master &&
      srcId &&
      !window.confirm(
        "Remove this bullet from your profile? You can undo it after.",
      )
    )
      return;
    const next = update((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? { ...e, bullets: e.bullets.filter((b) => b.id !== bId) }
          : e,
      ),
    }));
    if (!next || !master) return;
    if (!srcId) {
      attributedId(null, "role"); // told: removed from this CV only
      return;
    }
    const entry = next[section].find((e) => e.id === expId);
    const toBullets = (e) =>
      (e?.bullets || [])
        .map((b) => String(b.text || "").trim())
        .filter(Boolean);
    writeField({
      field: "exp_bullets",
      entityId: srcId,
      newValue: toBullets(entry),
      priorOverride: toBullets(
        prevModel?.[section]?.find((e) => e.id === expId),
      ),
      prevModel,
      confirmed: true,
      label: "bullets",
    });
  };
  const onDragEnd = (section, result) => {
    if (!result.destination) return;
    const prevModel = modelRef.current;
    const next = update((m) => {
      const arr = [...m[section]];
      const [moved] = arr.splice(result.source.index, 1);
      arr.splice(result.destination.index, 0, moved);
      return { ...m, [section]: arr };
    });
    if (!next || !isMasterCv() || !user?.id) return;
    // Reorder writes experiences.display_order across the whole render order
    // (all four buckets), so a rebuild reproduces the new order. Any entry
    // missing a source id makes the order unattributable -> surface, don't drop.
    const BUCKETS = ["experiences", "military", "volunteering", "leadership"];
    const idsOf = (model) =>
      BUCKETS.flatMap((b) => model[b] || []).map(
        (e) => e?.__src?.experience_id || null,
      );
    const orderedIds = idsOf(next);
    if (orderedIds.some((id) => !id)) {
      toast.error(
        "Some experiences aren't linked to your profile yet, so the new order stayed on this CV only. Rebuild your master CV to save ordering.",
      );
      return;
    }
    const priorOrderedIds = idsOf(prevModel).filter(Boolean);
    reorderExperiences(supabase, {
      userId: user.id,
      orderedIds,
      priorOrderedIds,
      source: "studio",
    }).then((res) => {
      if (!res.ok) {
        toast.error(res.error || "Couldn't save the new order.");
        return;
      }
      if (res.audit_ok === false)
        toast("Order saved, but the change history couldn't be recorded.");
      pushUndo({
        label: "order",
        prevModel,
        revertSource: () =>
          reorderExperiences(supabase, {
            userId: user.id,
            orderedIds: priorOrderedIds,
            priorOrderedIds: orderedIds,
            source: "studio",
          }),
      });
      queryClient.invalidateQueries({ queryKey: experiencesQueryKey(user.id) });
    });
  };
  const onPatchEdu = (id, patch) => {
    const prevModel = modelRef.current;
    const next = update((m) => ({
      ...m,
      education: m.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    if (!next) return;
    const srcId =
      next.education.find((e) => e.id === id)?.__src?.education_id || null;
    const prevEntry = prevModel?.education?.find((e) => e.id === id);
    for (const [k, val] of Object.entries(patch)) {
      const field = EDU_FIELD[k];
      if (!field) continue;
      const eid = attributedId(srcId, "education entry");
      if (eid)
        writeField({
          field,
          entityId: eid,
          newValue: val,
          priorOverride: prevEntry?.[k],
          prevModel,
          label: k,
        });
    }
  };
  // Certifications (S7): name/issuer/date write through to the certifications
  // row (entityId = certification_id stamped by the master build). Edit-existing
  // only; add/delete stays on the Profile page.
  const onPatchCert = (id, patch) => {
    const prevModel = modelRef.current;
    const next = update((m) => ({
      ...m,
      certifications: m.certifications.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
    if (!next) return;
    const srcId =
      next.certifications.find((c) => c.id === id)?.__src?.certification_id ||
      null;
    const prevEntry = prevModel?.certifications?.find((c) => c.id === id);
    for (const [k, val] of Object.entries(patch)) {
      const field = CERT_FIELD[k];
      if (!field) continue;
      const eid = attributedId(srcId, "certification");
      if (eid)
        writeField({
          field,
          entityId: eid,
          newValue: val,
          priorOverride: prevEntry?.[k],
          prevModel,
          label: k,
        });
    }
  };
  // Projects (S7): name/url write through to the projects row. Project BULLETS
  // are cv_data-only (no source column) - editing them loud-surfaces as
  // "stayed on this CV only" and never writes through (Eli ruling, option a).
  const onPatchProject = (id, patch) => {
    const prevModel = modelRef.current;
    const next = update((m) => ({
      ...m,
      projects: m.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    if (!next) return;
    const srcId =
      next.projects.find((p) => p.id === id)?.__src?.project_id || null;
    const prevEntry = prevModel?.projects?.find((p) => p.id === id);
    for (const [k, val] of Object.entries(patch)) {
      if (k === "bullets") {
        if (isMasterCv())
          toast(
            "Project bullets live on this CV only - your name and link save to your profile, but bullets stay here.",
          );
        continue;
      }
      const field = PROJ_FIELD[k];
      if (!field) continue;
      const eid = attributedId(srcId, "project");
      if (eid)
        writeField({
          field,
          entityId: eid,
          newValue: val,
          priorOverride: prevEntry?.[k],
          prevModel,
          label: k,
        });
    }
  };
  // ── Entry add / delete (PR-B) ───────────────────────────────────────────────
  // Adding/deleting an experience or education ENTRY is a whole-ROW op (insert /
  // delete), routed through the dedicated audited helpers (create/delete/restore
  // ProfileRow). Master mutates the source row + is undoable (delete captures a
  // full-row snapshot so undo re-inserts awards/honors too); tailored is
  // cv_data-only. New rows start blank; the user then edits fields which write
  // through via the existing per-field handlers.
  const onAddExperience = async () => {
    const prevModel = modelRef.current;
    if (!prevModel) return;
    const entry = {
      id: uid(),
      title: "",
      org: "",
      dates: "",
      bullets: [],
      __src: {},
    };
    if (!isMasterCv()) {
      // Set autoFocusId in the SAME commit that mounts the entry (not before the
      // async row insert below - the auto-clear timer would fire during the
      // await and clear it before the entry ever mounts).
      setAutoFocusId(entry.id);
      update((m) => ({ ...m, experiences: [...m.experiences, entry] }));
      return;
    }
    if (!user?.id) return;
    const res = await createProfileRow(supabase, {
      userId: user.id,
      entity: "experience",
      values: { title: "", company: "" },
    });
    if (!res.ok) {
      toast.error(res.error || "Couldn't add that role.");
      return;
    }
    entry.__src = { experience_id: res.id };
    setAutoFocusId(entry.id); // its title field focuses when it mounts (below)
    update((m) => ({ ...m, experiences: [...m.experiences, entry] }));
    if (res.audit_ok === false)
      toast("Added, but the change history couldn't be recorded.");
    pushUndo({
      label: "added role",
      prevModel,
      revertSource: () =>
        deleteProfileRow(supabase, {
          userId: user.id,
          entity: "experience",
          rowId: res.id,
        }),
    });
  };
  const onAddEducation = async () => {
    const prevModel = modelRef.current;
    if (!prevModel) return;
    const entry = {
      id: uid(),
      institution: "",
      degree: "",
      dates: "",
      field: "",
      __src: {},
    };
    if (!isMasterCv()) {
      setAutoFocusId(entry.id); // same commit that mounts the entry (see above)
      update((m) => ({ ...m, education: [...m.education, entry] }));
      return;
    }
    if (!user?.id) return;
    const res = await createProfileRow(supabase, {
      userId: user.id,
      entity: "education",
      values: {},
    });
    if (!res.ok) {
      toast.error(res.error || "Couldn't add that education entry.");
      return;
    }
    entry.__src = { education_id: res.id };
    setAutoFocusId(entry.id); // its institution field focuses when it mounts (below)
    update((m) => ({ ...m, education: [...m.education, entry] }));
    if (res.audit_ok === false)
      toast("Added, but the change history couldn't be recorded.");
    pushUndo({
      label: "added education",
      prevModel,
      revertSource: () =>
        deleteProfileRow(supabase, {
          userId: user.id,
          entity: "education",
          rowId: res.id,
        }),
    });
  };
  // Destructive. On the master, confirm first - surfacing the S4 cascade (an
  // experience's awards / an education entry's honors feed the CV Honors section
  // and go with the row). Undo restores the full-row snapshot.
  const onDeleteExperience = async (section, id) => {
    const prevModel = modelRef.current;
    const entry = prevModel?.[section]?.find((e) => e.id === id);
    if (!entry) return;
    const master = isMasterCv();
    const srcId = entry.__src?.experience_id || null;
    if (master && srcId) {
      const dbRow = experiences.find((x) => x.id === srcId);
      const awards = Array.isArray(dbRow?.awards)
        ? dbRow.awards.filter(Boolean).length
        : 0;
      const cascade = awards
        ? ` This also removes ${awards} award${awards > 1 ? "s" : ""} from your Honors section.`
        : "";
      if (
        !window.confirm(
          `Delete this experience from your profile?${cascade} You can undo it after.`,
        )
      )
        return;
    }
    const next = update((m) => ({
      ...m,
      [section]: m[section].filter((e) => e.id !== id),
    }));
    if (!next || !master) return;
    if (!srcId) {
      attributedId(null, "role"); // removed from this CV only
      return;
    }
    const res = await deleteProfileRow(supabase, {
      userId: user.id,
      entity: "experience",
      rowId: srcId,
    });
    if (!res.ok) {
      modelRef.current = prevModel;
      setModel(prevModel);
      setEditVersion((v) => v + 1);
      persist(selectedCvId, prevModel);
      toast.error(res.error || "Couldn't delete that role.");
      return;
    }
    if (res.audit_ok === false)
      toast("Removed, but the change history couldn't be recorded.");
    pushUndo({
      label: "deleted role",
      prevModel,
      revertSource: () =>
        restoreProfileRow(supabase, {
          userId: user.id,
          entity: "experience",
          snapshot: res.snapshot,
        }),
    });
  };
  const onDeleteEducation = async (id) => {
    const prevModel = modelRef.current;
    const entry = prevModel?.education?.find((e) => e.id === id);
    if (!entry) return;
    const master = isMasterCv();
    const srcId = entry.__src?.education_id || null;
    if (master && srcId) {
      const dbRow = education.find((x) => x.id === srcId);
      const honors = Array.isArray(dbRow?.honors)
        ? dbRow.honors.filter(Boolean).length
        : 0;
      const cascade = honors
        ? ` This also removes ${honors} honor${honors > 1 ? "s" : ""} from your Honors section.`
        : "";
      if (
        !window.confirm(
          `Delete this education entry from your profile?${cascade} You can undo it after.`,
        )
      )
        return;
    }
    const next = update((m) => ({
      ...m,
      education: m.education.filter((e) => e.id !== id),
    }));
    if (!next || !master) return;
    if (!srcId) {
      attributedId(null, "education entry");
      return;
    }
    const res = await deleteProfileRow(supabase, {
      userId: user.id,
      entity: "education",
      rowId: srcId,
    });
    if (!res.ok) {
      modelRef.current = prevModel;
      setModel(prevModel);
      setEditVersion((v) => v + 1);
      persist(selectedCvId, prevModel);
      toast.error(res.error || "Couldn't delete that education entry.");
      return;
    }
    if (res.audit_ok === false)
      toast("Removed, but the change history couldn't be recorded.");
    pushUndo({
      label: "deleted education",
      prevModel,
      revertSource: () =>
        restoreProfileRow(supabase, {
          userId: user.id,
          entity: "education",
          snapshot: res.snapshot,
        }),
    });
  };
  // Skills: the edited domain line writes back to the single flat profiles.skills,
  // MERGED with the preserved tools + technical buckets so editing domain never
  // drops them. Honest scope: the master categorizes profile.skills UNION every
  // experience's skills[]; a skill sourced only from an experience is re-derived
  // on rebuild and is not managed by this write - it owns profiles.skills only.
  const onPatchSkills = (line) => {
    const prevModel = modelRef.current;
    const domain = line
      .split("·")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = update((m) => ({ ...m, skills: domain }));
    if (!next) return;
    const flat = masterSkillsFlat({
      domain: next.skills,
      tools: next.skillsTools,
      technical: next.skillsTechnical,
    });
    const priorFlat = masterSkillsFlat({
      domain: prevModel?.skills,
      tools: prevModel?.skillsTools,
      technical: prevModel?.skillsTechnical,
    });
    writeField({
      field: "skills",
      newValue: flat,
      priorOverride: priorFlat,
      prevModel,
      label: "skills",
    });
  };
  // Languages edit names only; preserve each language's stored proficiency by
  // name-match (profiles.languages is [{language, proficiency}] or bare names).
  const onPatchLanguages = (line) => {
    const prevModel = modelRef.current;
    const names = line
      .split("·")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = update((m) => ({ ...m, languages: names }));
    if (!next) return;
    writeField({
      field: "languages",
      newValue: rebuildLanguages(names, profile?.languages),
      priorOverride: rebuildLanguages(prevModel?.languages, profile?.languages),
      prevModel,
      label: "languages",
    });
  };

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

  // Piece-targeted "Revise with AI" (flag-on home tab). Path A: edit-cv has no
  // target param, so we send the WHOLE cv_data with a targeted instruction, then
  // apply ONLY the targeted piece's returned value in place - discarding any
  // incidental drift elsewhere - through the normal patch handlers, so
  // write-through + undo behave exactly like a manual edit. Throws on failure so
  // the affordance can show its error state. See generate-tailored-cv's
  // debug_timing / Path B follow-ups (PR body) for the latency story: edit-cv
  // regenerates the whole document, so a one-bullet revise can take tens of
  // seconds.
  const onRevisePiece = useCallback(
    async (target, { preset, feedback }) => {
      const model = modelRef.current;
      if (!model || !selectedCvId) throw new Error("No CV loaded.");

      let currentText = "";
      let ctxLabel = "";
      if (target.kind === "summary") {
        currentText = model.summary || "";
        ctxLabel = "the professional summary";
      } else {
        const exp = model[target.section]?.find((e) => e.id === target.expId);
        const bullet = exp?.bullets?.find((b) => b.id === target.bulletId);
        currentText = bullet?.text || "";
        ctxLabel = exp
          ? `one bullet from the "${exp.title}${exp.org ? ` at ${exp.org}` : ""}" experience`
          : "one bullet";
      }

      const parts = [
        `Revise ONLY ${ctxLabel}, and return the COMPLETE CV with every other bullet, section, and field byte-identical.`,
        `The exact text to revise: "${currentText}".`,
      ];
      if (preset) parts.push(preset);
      if (feedback)
        parts.push(
          `The user's feedback on the current version: "${feedback}".`,
        );
      const instruction = parts.join(" ");

      const current = cvOptions.find((o) => o.id === selectedCvId);
      const { data, error } = await supabase.functions.invoke("edit-cv", {
        body: {
          cv_data: toCvData(model),
          instruction,
          target_role: current?.role ?? "",
        },
      });
      if (error || !data || data.error || !data.cv_data)
        throw new Error("edit-cv failed");

      // Merge over the pre-edit doc (edit-cv may omit passthrough sections),
      // then read back ONLY the targeted piece by its position. Reading at the
      // fixed index is drift-safe: if edit-cv touched a different piece, the
      // targeted index is unchanged and we apply a no-op rather than the drift.
      const merged = { ...toCvData(model), ...data.cv_data };
      const editedModel = fromCvData(merged);
      if (target.kind === "summary") {
        const newText = (editedModel.summary || "").trim();
        if (!newText) throw new Error("Empty revision.");
        onPatchSummary(newText);
      } else {
        const expIdx = model[target.section].findIndex(
          (e) => e.id === target.expId,
        );
        const bulIdx = model[target.section][expIdx]?.bullets.findIndex(
          (b) => b.id === target.bulletId,
        );
        const newText =
          editedModel[target.section]?.[expIdx]?.bullets?.[
            bulIdx
          ]?.text?.trim();
        if (!newText) throw new Error("Empty revision.");
        onPatchBullet(target.section, target.expId, target.bulletId, newText);
      }
      // Remount so the uncontrolled contentEditable re-seeds with the revision.
      setEditVersion((v) => v + 1);
    },
    [selectedCvId, cvOptions, onPatchSummary, onPatchBullet],
  );

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
        setTailoring(false);
      }
    },
    [tailoring, user?.id, queryClient, cvOptions],
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
            <CvGenerationProgress label="Building your CV…" />
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rd-primary text-white text-[13px] font-display font-semibold hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        onPatchCert={onPatchCert}
        onPatchProject={onPatchProject}
        onAddExperience={onAddExperience}
        onDeleteExperience={onDeleteExperience}
        onAddEducation={onAddEducation}
        onDeleteEducation={onDeleteEducation}
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
        isMaster={!!currentCv?.isMaster}
        canUndo={canUndo}
        onUndo={onUndo}
        saveState={saveState}
        onDownload={onDownload}
        chatMessages={chatMessages}
        onSendMessage={onSendMessage}
        chatBusy={chatBusy}
        onTailorNew={startTailor}
        tailorContext={tailorContext}
        onTailorContext={startTailor}
        tailoring={tailoring}
        tailorProgress={tailorProgress}
        tailorLabel={tailorLabel}
        tailorResult={tailorResult}
        onViewTailored={onViewTailored}
        onDownloadTailored={onDownloadTailored}
        rightRail={rightRail}
        onRevisePiece={enablePieceRevise ? onRevisePiece : null}
        headerFallback={{
          name: profile?.full_name,
          email: profile?.email || user?.email,
          linkedin: profile?.linkedin_url,
          location: profile?.location,
          phone: profile?.phone_number,
        }}
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
  // Overlay manners: Esc closes; the backdrop-click handler is on the outer
  // grid; the panel stops propagation so inner clicks don't dismiss it.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center bg-rd-text/20 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[520px] bg-rd-bg-card border border-rd-border rounded-2xl shadow-rd p-5 max-h-[80%] overflow-y-auto cv-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="font-display font-bold text-rd-text text-[15px]">
            {role
              ? `No job description for ${role} yet`
              : isNextDesign()
                ? "Generate for a job"
                : "Tailor to a job"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
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
          <p className="text-[12px] text-rd-primary-dark leading-relaxed mb-4">
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
              className="w-full px-3 py-2 rounded-lg border border-rd-border bg-rd-bg-card text-[12.5px] text-rd-text focus:outline-none focus:border-rd-primary resize-y"
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
                className="px-3 py-1.5 rounded-lg bg-rd-primary text-white text-[12.5px] font-display font-semibold hover:bg-rd-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
