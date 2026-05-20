import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Sparkles, Download, Save, FileSearch, FileCheck } from "lucide-react";
import { toast } from "sonner";

export default function CVManagement({ app, onUpdate }) {
  const [cvName, setCvName] = useState(app.cv_version_name || "");
  const [cvStatus, setCvStatus] = useState(app.cv_status || "not_started");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  // Template style — controls visual chrome on the generated docx. Both
  // are single-column for ATS survival; Polished adds color accents,
  // section rules, optional photo. Default to ATS-Optimized — safer for
  // students applying via job portals where parsing matters most.
  const [templateStyle, setTemplateStyle] = useState("ats-optimized");

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
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tailored-cv", {
        body: {
          job_description: app.job_description,
          target_role: app.role_title,
          application_id: app.id,
          template_style: templateStyle,
        },
      });

      if (error) throw error;

      toast.success(data?.message || "CV generated successfully!");
      onUpdate(); // Refresh application data
    } catch (error) {
      toast.error("Failed to generate CV: " + error.message);
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
                {skill}
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
          <a
            href={app.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#0E1014] underline flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Download (.docx)
          </a>
        </div>
      )}

      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium mb-2 block">
          CV Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTemplateStyle("ats-optimized")}
            className={`text-left rounded-lg border p-3 transition-colors ${
              templateStyle === "ats-optimized"
                ? "border-[#0E1014] bg-[#F4F4F2]"
                : "border-[#DDDDDB] hover:border-[#A3A3A3]"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileSearch className="w-3.5 h-3.5 text-[#52545A]" />
              <span className="text-xs font-semibold text-[#0E1014]">ATS-Optimized</span>
            </div>
            <p className="text-[11px] text-[#52545A] leading-snug">
              Best for applying through job portals and company application forms where your CV is parsed by software first.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setTemplateStyle("polished")}
            className={`text-left rounded-lg border p-3 transition-colors ${
              templateStyle === "polished"
                ? "border-[#0E1014] bg-[#F4F4F2]"
                : "border-[#DDDDDB] hover:border-[#A3A3A3]"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileCheck className="w-3.5 h-3.5 text-[#52545A]" />
              <span className="text-xs font-semibold text-[#0E1014]">Polished</span>
            </div>
            <p className="text-[11px] text-[#52545A] leading-snug">
              Best for sending directly to a recruiter, networking contacts, or email applications where a human reads it first.
            </p>
          </button>
        </div>
      </div>

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
    </div>
  );
}