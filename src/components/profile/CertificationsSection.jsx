import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useCertificationsQuery, certificationsQueryKey } from "@/lib/queries/useCertifications";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Award, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SkillTagInput from "@/components/onboarding/SkillTagInput";
import { recomputeProfileSkillsCanonical } from "@/lib/recomputeProfileSkillsCanonical";
import EntityCard from "./EntityCard";

// PR 3F — CertificationsSection restyled on rd-* tokens. Restyle-only:
// every write path, RLS guard, and the recomputeProfileSkillsCanonical
// call (PR #178 narrow-projection invariant) is preserved byte-for-byte.
//
// PR 2 of entity IA: certifications become rich entities under Education.
// Mirrors EducationTab's form-on-top + list-below pattern. In-progress
// certs supported via the existing is_current boolean (students often
// add a cert they're mid-way through; that's first-class here, not edge).
//
// Skills feed entity_spine via certifications.skills (already in the
// unified text[] column from P1.0). The save hook calls
// recomputeProfileSkillsCanonical so the user's canonical aggregation
// updates immediately after a cert edit.

const EMPTY_FORM = {
  id: undefined,
  name: "",
  issuer: "",
  date_earned: "",
  description: "",
  is_current: false,
  skills: [],
};

const RD_CARD_LG    = "rounded-[18px] border border-rd-border bg-rd-bg-card p-6 sm:p-7 shadow-rd";
const RD_LABEL      = "block text-[11px] font-display font-semibold text-rd-text mb-1.5";
const RD_INPUT_CLS  = "border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary focus-visible:border-rd-coral focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-coral-tint)]";
const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";

export default function CertificationsSection({ user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: certs = [], isLoading } = useCertificationsQuery(user?.id);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Add a certification name before saving.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        issuer: form.issuer.trim() || null,
        // is_current=true relaxes the date_earned requirement and
        // semantically means "in progress"; date_earned, if provided,
        // is treated as an expected-completion hint.
        date_earned: form.date_earned.trim() || null,
        description: form.description.trim() || null,
        is_current: !!form.is_current,
        skills: form.skills || [],
      };

      if (form.id) {
        const { error } = await supabase
          .from("certifications")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Certification updated.");
      } else {
        const { error } = await supabase.from("certifications").insert(payload);
        if (error) throw error;
        toast.success("Certification added.");
      }

      queryClient.invalidateQueries({ queryKey: certificationsQueryKey(user.id) });
      // userProfile callers (Home, edge fns) include nested certs.
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });

      // certifications.skills feeds profiles.skills_canonical. Recompute
      // from fresh DB rows (PR #178 incident pattern — don't reuse cached
      // React state).
      const recompute = await recomputeProfileSkillsCanonical(supabase, user.id);
      if (!recompute.ok) {
        console.error("Failed to recompute skills_canonical after cert save:", recompute.error);
      }

      resetForm();
    } catch (e) {
      console.error("Certification save error:", e);
      toast.error(e.message || "Failed to save certification.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c) => {
    setForm({
      id: c.id,
      name: c.name || "",
      issuer: c.issuer || "",
      date_earned: c.date_earned || "",
      description: c.description || "",
      is_current: !!c.is_current,
      skills: c.skills || [],
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row) => {
    if (!confirm(`Remove ${row.name || "this certification"}?`)) return;
    const { error } = await supabase
      .from("certifications")
      .delete()
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) { toast.error("Failed to delete."); return; }
    if (form.id === row.id) resetForm();
    queryClient.invalidateQueries({ queryKey: certificationsQueryKey(user.id) });
    queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
    toast.success("Certification removed.");
  };

  return (
    <div className="space-y-4">
      {/* Add / Edit form */}
      <div className={`${RD_CARD_LG} space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-[14px] text-rd-text">
            {form.id ? "Edit Certification" : "Add Certification"}
          </h3>
          {form.id && (
            <button onClick={resetForm} className="text-[12px] text-rd-text-tertiary hover:text-rd-text underline">
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={RD_LABEL}>Certification name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={RD_INPUT_CLS}
              placeholder="e.g. AWS Certified Solutions Architect – Associate"
            />
          </div>
          <div>
            <label className={RD_LABEL}>Issuer</label>
            <Input
              value={form.issuer}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
              className={RD_INPUT_CLS}
              placeholder="e.g. AWS, Google, HubSpot Academy"
            />
          </div>
          <div className="md:col-span-2">
            <label className={RD_LABEL}>
              {form.is_current ? "Expected completion (optional)" : "Date earned"}
            </label>
            <Input
              value={form.date_earned}
              onChange={(e) => setForm({ ...form, date_earned: e.target.value })}
              className={RD_INPUT_CLS}
              placeholder={form.is_current ? "e.g. December 2026" : "e.g. March 2024, 2024"}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="cert_is_current"
            checked={!!form.is_current}
            onCheckedChange={(v) => setForm({ ...form, is_current: !!v })}
            className="border-rd-border data-[state=checked]:bg-rd-coral data-[state=checked]:border-rd-coral"
          />
          <Label htmlFor="cert_is_current" className="text-[12px] text-rd-text-secondary cursor-pointer">
            I&apos;m currently pursuing this
          </Label>
        </div>

        <div>
          <label className={RD_LABEL}>Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)] resize-y min-h-[110px]"
            rows={4}
            placeholder="What you did or what it covered - e.g. core topics, projects completed, hands-on labs."
          />
        </div>

        <SkillTagInput
          label="Skills"
          description="Programs, methods, or tools this certification covers - search the library or type custom."
          tags={form.skills}
          onChange={(v) => setForm({ ...form, skills: v })}
          placeholder="e.g. AWS Lambda, IAM, S3"
          suggestionType="library_skills"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={RD_BTN_PRIMARY}
        >
          {saving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
          ) : form.id ? (
            "Update Certification"
          ) : (
            <><Plus className="w-3.5 h-3.5" />Add Certification</>
          )}
        </button>
      </div>

      {/* List of saved entries */}
      <div className="space-y-2">
        {isLoading && <p className="text-[12px] text-rd-text-tertiary">Loading…</p>}
        {!isLoading && certs.length === 0 && (
          <div className="rounded-[18px] border border-rd-border bg-rd-bg-card text-center py-8 shadow-rd">
            <Award className="w-9 h-9 text-rd-coral mx-auto mb-2.5" />
            <p className="text-[12.5px] text-rd-text-tertiary">
              No certifications yet - add your first one above.
            </p>
          </div>
        )}
        {certs.map((c) => {
          const subtitleParts = [];
          if (c.issuer) subtitleParts.push(c.issuer);
          // In-progress: show "expected [date]" only if a date was provided.
          // Otherwise the In-progress badge alone carries the status, and
          // we don't repeat the issuer twice.
          if (!c.is_current && c.date_earned) subtitleParts.push(c.date_earned);
          else if (c.is_current && c.date_earned) subtitleParts.push(`expected ${c.date_earned}`);

          const nSkills = c.skills?.length || 0;
          const metaLine = nSkills > 0 ? `${nSkills} skill${nSkills === 1 ? "" : "s"}` : null;

          return (
            <EntityCard
              key={c.id}
              entityId={c.id}
              icon={<Award className="w-4 h-4 text-rd-golden-dark" />}
              iconBg="bg-rd-golden-tint"
              title={c.name}
              subtitle={subtitleParts.join(" · ")}
              statusBadge={
                c.is_current ? (
                  <span className="text-[10px] uppercase tracking-[0.07em] font-mono font-semibold px-2 py-0.5 rounded-full bg-rd-coral-tint text-rd-coral-dark flex-shrink-0">
                    In progress
                  </span>
                ) : null
              }
              description={c.description}
              metaLine={metaLine}
              onEdit={() => handleEdit(c)}
              onDelete={() => handleDelete(c)}
            />
          );
        })}
      </div>
    </div>
  );
}
