import React from "react";

export default function ProgressSnapshot({ roles, applications }) {
  const track1Count = roles.filter((r) => r.track === "track_1").length;
  const track2Count = roles.filter((r) => r.track === "track_2").length;
  const activeApps = applications.filter(
    (a) => !["rejected", "withdrawn"].includes(a.status)
  ).length;
  const interviews = applications.reduce(
    (sum, a) => sum + (a.interviews_completed || 0),
    0
  );

  const stats = [
    { label: "Track 1 Roles", value: track1Count, color: "bg-emerald-500" },
    { label: "Track 2 Roles", value: track2Count, color: "bg-amber-500" },
    { label: "Active Applications", value: activeApps, color: "bg-blue-500" },
    { label: "Interviews", value: interviews, color: "bg-indigo-500" },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <h3 className="text-xs uppercase tracking-wider text-[#A3A3A3] font-medium mb-4">
        Progress Snapshot
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-[#0A0A0A]">
                {stat.value}
              </span>
            </div>
            <p className="text-[11px] text-[#A3A3A3] font-medium uppercase tracking-wider">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}