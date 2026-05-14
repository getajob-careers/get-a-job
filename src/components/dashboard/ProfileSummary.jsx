import React from "react";
import { User, Target, Briefcase } from "lucide-react";
import { pickPrimaryEducation } from "@/lib/educationPolicy";

export default function ProfileSummary({ profile }) {
  // Education moved off profiles flat columns to a separate table in
  // Phase B. Callers passing `profile` from a `.select('*, education(*)')`
  // query get an `education` array on the profile object; we pick the
  // primary row client-side. Defaults to empty array for safety.
  const primaryEdu = pickPrimaryEducation(profile?.education || []);
  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
            <User className="w-5 h-5 text-[#A3A3A3]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0A0A0A]">No profile set up yet</p>
            <p className="text-xs text-[#A3A3A3]">Add your information to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#0A0A0A] flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0A0A0A]">{profile.full_name}</p>
          <p className="text-xs text-[#A3A3A3]">
            {primaryEdu?.field_of_study || "No field specified"}
            {primaryEdu?.education_level ? ` / ${primaryEdu.education_level.replace("_", " ")}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Target className="w-4 h-4 text-[#A3A3A3] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">5-Year Target</p>
            <p className="text-sm font-medium text-[#0A0A0A] mt-0.5">
              {profile.five_year_role || "Not defined"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Briefcase className="w-4 h-4 text-[#A3A3A3] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Current Tier 1 Role</p>
            <p className="text-sm font-medium text-[#0A0A0A] mt-0.5">
              {profile.current_tier1_role || "Not determined"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}