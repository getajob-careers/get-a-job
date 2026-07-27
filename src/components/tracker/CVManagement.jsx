import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/api/supabaseClient";
import { invokeWithAuthRetry } from "@/api/invokeWithAuthRetry";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Sparkles, Download, Save, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import { track, EVENTS } from "@/lib/analytics";
import { triggerBlobDownload, cvFilename } from "@/lib/downloadFile";
import { useProfileQuery } from "@/lib/queries/useProfile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CVManagement({ app, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfileQuery(user?.id);
  const [cvName, setCvName] = useState(app.cv_version_name || "");
  const [cvStatus, setCvStatus] = useState(app.cv_status || "not_started");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  // Last-generation diagnostics: unsourced bullets, fit, tailoring score.
  // Snapshotted from the most recent generate-tailored-cv response so the
  // user gets a credibility warning right next to the download chip.
  const [lastResult, setLastResult] = useState(null);
  // Thin-source check: is the user's profile substantive enough that the
  // generator will have something real to write about? Set true when the
  // sum of responsibilities across experiences is below 200 chars.
  const [thinSource, setThinSource] = useState(false);
  const [thinConfirmOpen, setThinConfirmOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return undefined;
    (async () => {
      const { data } = await supabase
        .from("experiences")
        .select("responsibilities")
        .eq("user_id", user.id);
      if (cancelled) return;
      const total = (data || []).reduce(
        (n, e) => n + (typeof e.responsibilities === "string" ? e.responsibilities.length : 0),
        0,
      );
      setThinSource(total < 200);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("applications").update({
      cv_version_name: cvName,
      cv_status: cvStatus,
    }).eq("id", app.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save CV details:", error);
      toast.error("Failed to save. Please try again.");
      return;
    }
    onUpdate();
  };

  const handleGenerateCV = async () => {
    if (!app.job_description) {
      toast.error("Please add a job description first in the Job Description tab");
      return;
    }
    if (thinSource) {
      // Confirm before burning a generation on a profile that's too thin to
      // produce substantive bullets. The LLM will elaborate plausibly when
      // source content is sparse; this surfaces the risk before we ship. Uses an
      // in-app modal (not native confirm) so the warning doesn't read as a
      // browser phishing prompt — same words, trustworthy vessel.
      setThinConfirmOpen(true);
      return;
    }
    await runGenerateCV();
  };

  const runGenerateCV = async () => {
    setGenerating(true);
    const startedAt = performance.now();
    try {
      const { data, error } = await invokeWithAuthRetry("generate-tailored-cv", {
        body: {
          job_description: app.job_description,
          target_role: app.role_title,
          application_id: app.id,
          cv_model: "sonnet",
        },
      });

      if (error) throw error;

      // Value moment: the tailored CV is back. One event powers
      // attempted-vs-succeeded — always carries success.
      track(EVENTS.CV_GENERATED, {
        success: true,
        source: "tracker",
        model: data?.model || "sonnet",
        application_id: app.id,
        role_title: app.role_title,
        duration_ms: Math.round(performance.now() - startedAt),
        unsourced_bullets_count: Array.isArray(data?.unsourced_bullets)
          ? data.unsourced_bullets.length
          : 0,
      });

      setLastResult(data || null);
      toast.success(data?.message || "CV generated successfully!");
      onUpdate(); // Refresh application data
    } catch (error) {
      track(EVENTS.CV_GENERATED, {
        success: false,
        source: "tracker",
        model: "sonnet",
        application_id: app.id,
        role_title: app.role_title,
        duration_ms: Math.round(performance.now() - startedAt),
        failure_reason: error?.isAuthExpired
          ? "auth_expired"
          : (error?.message || "unknown"),
      });
      toast.error(error?.isAuthExpired
        ? "Your session expired. Redirecting to log in again."
        : "Failed to generate CV: " + error.message);
    } finally {
      setGenerating(false);
    }
  };


  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
          CV Version Name
        </label>
        <Input
          value={cvName}
          onChange={(e) => setCvName(e.target.value)}
          placeholder="e.g., Customer Success CV - Monday"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
          CV Status
        </label>
        <Select value={cvStatus} onValueChange={setCvStatus}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {app.cv_skills_emphasized && app.cv_skills_emphasized.length > 0 && (
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-2 block">
            Skills Emphasized
          </label>
          <div className="flex flex-wrap gap-2">
            {app.cv_skills_emphasized.map((skill, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {humanizeSkillId(skill)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {app.cv_url && (
        <div className="bg-[#E8E8E5] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#52545A]" />
            <span className="text-xs text-[#52545A]">CV Generated</span>
          </div>
          <div className="flex items-center gap-3">
            {/* View in CV editor (Eli PR-D item 8): opens THIS tailored version in
                the CV surface. Deep-links /CVAgent?application_id; the route gate
                resolves it - flag-off = the editor, flag-on = Home's CV bank tab
                with this CV selected. */}
            <button
              type="button"
              onClick={() =>
                navigate(createPageUrl("CVAgent") + `?application_id=${encodeURIComponent(app.id)}`)
              }
              className="text-xs text-[#52545A] hover:text-[#0E1014] flex items-center gap-1 cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1014] focus-visible:ring-offset-1 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              View in CV editor
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await triggerBlobDownload(app.cv_url, cvFilename(profile?.full_name, app.role_title));
                } catch (err) {
                  toast.error(`Download failed: ${err?.message || "unknown error"}`);
                }
              }}
              className="text-xs text-[#0E1014] underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Download (.pdf)
            </button>
          </div>
        </div>
      )}

      {Array.isArray(lastResult?.unsourced_bullets) && lastResult.unsourced_bullets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-amber-900">
              Review before sending ({lastResult.unsourced_bullets.length} {lastResult.unsourced_bullets.length === 1 ? "bullet" : "bullets"})
            </p>
            <p className="text-amber-900 mt-0.5 leading-relaxed">
              Some bullets reference numbers or tools that we couldn&apos;t trace back to your profile data. Open the CV and double-check each one is accurate before sending - the AI sometimes elaborates.
            </p>
          </div>
        </div>
      )}

      {thinSource && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-amber-900">Your profile is light on content</p>
            <p className="text-amber-900 mt-0.5 leading-relaxed">
              Add more detail in your Experience section before generating - without responsibilities text, the AI has to elaborate plausibly, and bullets may not reflect your actual work.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="outline"
          className="text-sm"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Changes</>
          )}
        </Button>
        <Button
          onClick={handleGenerateCV}
          disabled={generating}
          className="bg-[#0E1014] hover:bg-[#F87060] text-sm"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />AI Generate CV</>
          )}
        </Button>
      </div>

      <AlertDialog open={thinConfirmOpen} onOpenChange={setThinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate with limited profile content?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile has limited content in the Experience section. The
              generated CV may include bullets the AI inferred rather than ones
              grounded in your actual work. Continue, or add more detail to your
              experiences first?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Add detail first</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setThinConfirmOpen(false);
                runGenerateCV();
              }}
              className="bg-rd-primary hover:bg-rd-primary-dark focus:ring-rd-primary text-white"
            >
              Generate anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}