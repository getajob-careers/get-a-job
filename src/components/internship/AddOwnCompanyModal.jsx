import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { pickReusableCompany, isDuplicateKeyError } from "@/lib/addOwnCompanyHelpers";

// "Add my own company" — lets internship students (any path) drop a company
// they found into their pipeline. Three-step flow:
//   1. LOOKUP companies on case-insensitive name (+ domain when provided)
//      ORDER BY canonical-source preference. If a row exists, REUSE its id —
//      otherwise the user gets a silent duplicate row and a duplicate
//      kanban card (the pre-fix bug).
//   2. If no match, INSERT a new companies row (source='manual',
//      created_by=user.id). Otherwise skip — reuse only, never edit.
//   3. INSERT into company_targets with source='self_added',
//      status='exploring'. UNIQUE (user_id, company_id) on this table
//      catches the "already in this user's pipeline" case (23505) →
//      tailored toast.
//
// Orphan rollback: if step 3 fails on the INSERT path (not the reuse
// path) we delete the just-inserted companies row so a step-1 success
// doesn't leak when step 3 dies. Reuse path has nothing to roll back —
// the registry row was already there.
//
// Schema reference (verified live 2026-05-31):
//   companies.source values present: registry (428) | research (391) | manual (1)
//   companies SELECT RLS: any authenticated user may read all rows
//   company_targets.source CHECK: matched | faculty_assigned | self_added
//   company_targets UNIQUE (user_id, company_id) IS live (migration comment is stale)
//
// Notes go on company_targets.notes — user-specific. companies.description
// is intentionally NOT set from this form; the user's notes belong to their
// own pipeline view, not the shared company record.

export default function AddOwnCompanyModal({ open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDomain("");
    setIndustry("");
    setNotes("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!user?.id) {
      toast.error("Not signed in.");
      return;
    }
    const trimmedDomain = domain.trim();
    setSubmitting(true);
    try {
      // ── Step 1: lookup-or-create on companies ──────────────────────
      // Case-insensitive name match; require a domain match too when one
      // was provided. ORDER BY canonical-source preference mirrors
      // pickReusableCompany so SQL LIMIT(1) returns the same row the
      // helper would pick. ilike with no wildcards == case-insensitive
      // equality in PostgREST.
      let lookupQuery = supabase
        .from("companies")
        .select("id, name, domain, source, created_at")
        .ilike("name", trimmedName);
      if (trimmedDomain) lookupQuery = lookupQuery.ilike("domain", trimmedDomain);
      const { data: lookupRows, error: lookupErr } = await lookupQuery;
      if (lookupErr) {
        console.error("[add-own-company] companies lookup failed:", lookupErr);
        toast.error("Couldn't check existing companies. Please try again.");
        return;
      }

      const reusable = pickReusableCompany(lookupRows);
      let companyId = reusable?.id ?? null;
      const didCreate = !reusable;

      if (!reusable) {
        const { data: created, error: companyErr } = await supabase
          .from("companies")
          .insert({
            name: trimmedName,
            domain: trimmedDomain || null,
            industry: industry.trim() || null,
            source: "manual",
            created_by: user.id,
          })
          .select("id")
          .single();

        if (companyErr || !created?.id) {
          console.error("[add-own-company] companies insert failed:", companyErr);
          toast.error("Couldn't save the company. Please try again.");
          return;
        }
        companyId = created.id;
      }

      // ── Step 2: insert into company_targets ────────────────────────
      // UNIQUE (user_id, company_id) catches the reuse-of-an-already-pipelined
      // company case (Postgres 23505) — toast specifically rather than the
      // generic "couldn't add" message.
      const { error: targetErr } = await supabase
        .from("company_targets")
        .insert({
          user_id: user.id,
          company_id: companyId,
          source: "self_added",
          status: "exploring",
          notes: notes.trim() || null,
        });

      if (targetErr) {
        if (isDuplicateKeyError(targetErr)) {
          toast.error(`${trimmedName} is already in your pipeline.`);
        } else {
          console.error("[add-own-company] company_targets insert failed:", targetErr);
          toast.error("Couldn't add it to your pipeline. Please try again.");
        }
        // Orphan rollback — only when we created a fresh companies row.
        // On the reuse path the registry row was already there; don't
        // touch it. RLS scopes the DELETE to created_by = user.id +
        // source = 'manual', so even a broken reuse path can't nuke a
        // canonical row.
        if (didCreate && companyId) {
          const { error: rollbackErr } = await supabase
            .from("companies")
            .delete()
            .eq("id", companyId)
            .eq("created_by", user.id)
            .eq("source", "manual");
          if (rollbackErr) {
            console.error("[add-own-company] orphan companies rollback failed:", rollbackErr);
          }
        }
        return;
      }

      toast.success(`${trimmedName} added to your pipeline.`);
      queryClient.invalidateQueries({ queryKey: ["company_targets", user.id] });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a company</DialogTitle>
          <DialogDescription asChild>
            <p className="text-xs text-rd-text-secondary -mt-2 mb-3">
              Drop in any company you&apos;ve found. It lands in your pipeline as &quot;Exploring&quot; - drag it through the stages as you go.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Company name" required>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wix"
              disabled={submitting}
              className="text-sm"
            />
          </Field>

          <Field label="Domain (optional)">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. wix.com"
              disabled={submitting}
              className="text-sm"
            />
          </Field>

          <Field label="Industry (optional)">
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. SaaS, Fintech, AdTech"
              disabled={submitting}
              className="text-sm"
            />
          </Field>

          <Field label="Notes (optional)">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this company? Where did you find it? Anyone you know there?"
              rows={3}
              disabled={submitting}
              className="text-sm resize-none"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="bg-rd-coral hover:bg-rd-coral-dark text-white font-display font-bold rounded-full"
          >
            {submitting ? (
              <><Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Adding…</>
            ) : (
              "Add to pipeline"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-1">
        {label}
        {required && <span className="text-rd-coral ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
