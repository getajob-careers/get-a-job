import React, { useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { track, EVENTS } from "@/lib/analytics";
import { scoreApplication } from "@/lib/scoreApplication";
import { stripHtml } from "../../../scripts/lib/normalize.ts";

// Manual "Add application" dialog — extracted from Tracker.jsx so the
// same call site can mount inside Career.jsx's inline pipeline board
// (PR-A2) without duplicating the insert / analytics / scoreApplication
// chain. Byte-equivalent JSX + handler logic; state lives inside the
// component so the parent just hands open / onOpenChange.
//
// Behavior preserved verbatim from Tracker.jsx:129-157:
//   - role_title gate, paste-boundary stripHtml on JD, insert into
//     applications with source='manual'.
//   - APPLICATION_TRACKED analytics event with source + has_jd.
//   - queryClient.invalidateQueries on ["applications"] (Career strip +
//     Tracker board read the same canonical key).
//   - scoreApplication kicked off when inserted.id + jd are both present.
export default function AddApplicationDialog({ open, onOpenChange, onAdded }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newApp, setNewApp] = useState({ role_title: "", company: "", status: "interested" });
  const [jobDescription, setJobDescription] = useState("");
  const [importError, setImportError] = useState("");
  const [addingApp, setAddingApp] = useState(false);

  const closeAndClear = (next) => {
    onOpenChange(next);
    if (!next) setImportError("");
  };

  const handleAdd = async () => {
    if (!newApp.role_title) return;
    setAddingApp(true);
    const jd = stripHtml(jobDescription || "") || "";

    const { data: inserted, error } = await supabase.from("applications").insert({
      user_id: user.id,
      role_title: newApp.role_title,
      company: newApp.company,
      status: newApp.status,
      source: "manual",
      ...(jd && { job_description: jd }),
    }).select("id").single();
    if (error) {
      console.error("Error adding application:", error);
      setImportError(`Could not add application: ${error.message}`);
      setAddingApp(false);
      return;
    }

    track(EVENTS.APPLICATION_TRACKED, { source: "manual", has_jd: !!jd });

    setNewApp({ role_title: "", company: "", status: "interested" });
    setJobDescription("");
    onOpenChange(false);
    setAddingApp(false);
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    if (inserted?.id && jd) scoreApplication(supabase, queryClient, inserted.id, jd, user.id);
    onAdded?.(inserted?.id ?? null);
  };

  return (
    <Dialog open={open} onOpenChange={closeAndClear}>
      <DialogContent className="bg-rd-bg-card border border-rd-border rounded-[18px]">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-[20px] text-rd-text">
            Add application
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {importError && (
            <div className="flex items-center gap-2 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[12.5px] text-[#991B1B]">
              {importError}
            </div>
          )}
          <div>
            <label className="block text-[12px] font-display font-semibold text-rd-text mb-1.5">
              Role title
            </label>
            <input
              value={newApp.role_title}
              onChange={(e) => setNewApp({ ...newApp, role_title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
              placeholder="e.g. Junior Data Analyst"
            />
          </div>
          <div>
            <label className="block text-[12px] font-display font-semibold text-rd-text mb-1.5">
              Company
            </label>
            <input
              value={newApp.company}
              onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
              placeholder="e.g. Google"
            />
          </div>
          <div>
            <label className="block text-[12px] font-display font-semibold text-rd-text mb-1.5">
              Job description{" "}
              <span className="text-rd-text-tertiary font-normal">
                (optional - AI will use this to set the track)
              </span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)] resize-y min-h-[110px]"
            />
            {!jobDescription && (
              <p className="text-[11px] text-rd-text-secondary mt-1.5 leading-snug">
                Without AI classification, track will be unset. Add the role to your Career Roadmap to get track classification.
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-4 py-2 transition-colors"
          >
            <X className="w-3.5 h-3.5" />Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={addingApp || !newApp.role_title}
            className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
          >
            {addingApp ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analysing…</>
            ) : "Add"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
