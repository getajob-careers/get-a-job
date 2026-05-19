import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// "Add my own company" — lets practicum students (any path) drop a company
// they found into their pipeline. Two-write flow:
//   1. INSERT into companies with source='manual', created_by=user.id
//   2. INSERT into company_targets pointing at that new company row with
//      source='self_added', status='exploring'.
//
// Schema reference (verified against live DB before build):
//   companies.source CHECK: jsearch | manual | faculty_seeded | research
//   company_targets.source CHECK: matched | faculty_assigned | self_added
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
    setSubmitting(true);
    try {
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({
          name: trimmedName,
          domain: domain.trim() || null,
          industry: industry.trim() || null,
          source: "manual",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (companyErr || !company?.id) {
        console.error("[add-own-company] companies insert failed:", companyErr);
        toast.error("Couldn't save the company. Please try again.");
        return;
      }

      const { error: targetErr } = await supabase
        .from("company_targets")
        .insert({
          user_id: user.id,
          company_id: company.id,
          source: "self_added",
          status: "exploring",
          notes: notes.trim() || null,
        });

      if (targetErr) {
        console.error("[add-own-company] company_targets insert failed:", targetErr);
        toast.error("Saved the company, but couldn't add it to your pipeline. Try refreshing.");
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
        </DialogHeader>
        <p className="text-xs text-[#525252] -mt-2 mb-3">
          Drop in any company you've found. It lands in your pipeline as &quot;Exploring&quot; — drag it through the stages as you go.
        </p>

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
            className="bg-[#0A0A0A] hover:bg-[#262626]"
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
      <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
