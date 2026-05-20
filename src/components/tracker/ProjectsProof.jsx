import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
const STATUS_COLORS = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  complete: "bg-emerald-100 text-emerald-700",
};

export default function ProjectsProof({ app, onUpdate }) {
  const [projects, setProjects] = useState(
    (app.projects_proof || []).map((p) => ({ ...p, id: p.id || crypto.randomUUID() }))
  );
  const [newProject, setNewProject] = useState({
    project_name: "",
    skill_proven: "",
    status: "not_started",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    if (!newProject.project_name || !newProject.skill_proven || saving) return;
    const previous = projects;
    const updated = [...projects, { ...newProject, id: crypto.randomUUID() }];
    setProjects(updated);
    saveProjects(updated, previous);
    setNewProject({ project_name: "", skill_proven: "", status: "not_started" });
  };

  const handleRemove = (id) => {
    if (saving) return;
    const previous = projects;
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    saveProjects(updated, previous);
  };

  const handleUpdate = (id, field, value) => {
    if (saving) return;
    const previous = projects;
    const updated = projects.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    setProjects(updated);
    saveProjects(updated, previous);
  };

  const saveProjects = async (updated, previous) => {
    setSaving(true);
    const { error } = await supabase.from("applications").update({ projects_proof: updated }).eq("id", app.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save projects:", error);
      setProjects(previous);
      toast.error("Failed to save. Please try again.");
      return;
    }
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
        Projects to Prove Skills
      </p>

      {projects.length === 0 ? (
        <p className="text-xs text-[#9C9DA1] py-4 text-center">
          No projects yet. Add projects to build proof for missing skills.
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map((project, i) => (
            <div key={project.id ?? i} className="bg-[#F4F4F2] rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0E1014]">{project.project_name}</p>
                  <p className="text-xs text-[#9C9DA1] mt-0.5">Proves: {project.skill_proven}</p>
                  <Select
                    value={project.status}
                    onValueChange={(v) => handleUpdate(project.id, "status", v)}
                  >
                    <SelectTrigger className="mt-2 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button onClick={() => handleRemove(project.id)} className="text-[#9C9DA1] hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#DDDDDB] pt-4 space-y-3">
        <p className="text-xs font-medium text-[#52545A]">Add New Project</p>
        <Input
          placeholder="Project name (e.g., SQL Data Analysis Project)"
          value={newProject.project_name}
          onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
          className="text-sm"
        />
        <Input
          placeholder="Skill it proves (e.g., SQL, Data Visualization)"
          value={newProject.skill_proven}
          onChange={(e) => setNewProject({ ...newProject, skill_proven: e.target.value })}
          className="text-sm"
        />
        <Button onClick={handleAdd} className="bg-[#0E1014] hover:bg-[#F87060] text-sm w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>
    </div>
  );
}