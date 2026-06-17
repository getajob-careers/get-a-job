import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  AlertCircle,
  DollarSign,
  MessageSquare,
  Ticket,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// Launch-night admin dashboard. Parallel to /Admin (which keeps its
// per-student drilldown + chat-log + story-browser feature set). This
// page is intentionally slim, read-only, and direct-query-only so it
// can ship the night before launch with zero shared-component risk.
//
// Gate: same `supabase.rpc('is_admin')` pattern Admin.jsx uses.
// Non-admins are <Navigate>'d to /Home before any page shell renders —
// they don't see this page exists. RLS is the actual security boundary
// (admin SELECT policies are live on every table queried here), the
// frontend gate is just the UX guard.
//
// Panels:
//   1. Capacity — invite_codes (cohort fill)
//   2. Funnel — signups → onboarded → analysis → apps → stories
//   3. Recent signups — last 7d
//   4. System health — function_metrics ok=false (24h) + last 20 error_logs
//   5. Cost — function_metrics grouped by day (7d)
//   6. Feedback — last 30 from the feedback table
//
// Per-user drill-down + cost-per-active-user economics intentionally
// deferred to a v2 — see Admin.jsx for the rich per-student surface.

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * TWENTY_FOUR_HOURS_MS;

// ────────────────────────────────────────────────────────────────────
// Shared UI primitives — neutral palette to match the existing Admin
// page. Deliberately NOT pulling from the rd-token redesign system so
// nothing here can drift if rd tokens change before launch.
// ────────────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, footer, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-4 h-4 text-[#525252]" />}
        <h2 className="text-sm font-semibold text-[#0A0A0A] tracking-tight">
          {title}
        </h2>
      </div>
      <div>{children}</div>
      {footer && (
        <div className="mt-3 pt-3 border-t border-[#F5F5F5] text-[11px] text-[#A3A3A3]">
          {footer}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center h-32 text-xs text-[#A3A3A3]">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-4 h-4 animate-spin text-[#A3A3A3]" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel 1 — Capacity (invite_codes)
// ────────────────────────────────────────────────────────────────────

function CapacityCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_launch_capacity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("code, cohort_label, current_uses, max_uses, is_active")
        .order("cohort_label", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card
      title="Cohort capacity"
      icon={Ticket}
      footer={`${(data || []).length} code(s) · highlights any cohort at ≥80% of cap`}
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading capacity: ${error.message}`} />
      ) : (data || []).length === 0 ? (
        <EmptyState message="No invite codes yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[#A3A3A3] border-b border-[#F5F5F5]">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Cohort</th>
                <th className="py-2 pr-3 font-medium text-right">Used</th>
                <th className="py-2 pr-3 font-medium text-right">Cap</th>
                <th className="py-2 pr-3 font-medium text-right">Slots left</th>
                <th className="py-2 pr-3 font-medium">Fill</th>
                <th className="py-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const used = Number(r.current_uses) || 0;
                const cap = Number(r.max_uses) || 0;
                const slotsLeft = cap - used;
                const pct = cap === 0 ? 0 : Math.round((used / cap) * 100);
                const nearCap = pct >= 80;
                return (
                  <tr
                    key={r.code}
                    className={`border-b border-[#FAFAFA] ${nearCap ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="py-2 pr-3 font-mono text-[#0A0A0A]">
                      {r.code}
                    </td>
                    <td className="py-2 pr-3 text-[#525252]">
                      {r.cohort_label || "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">{used}</td>
                    <td className="py-2 pr-3 text-right text-[#525252]">
                      {cap}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right ${nearCap ? "font-semibold text-amber-700" : ""}`}
                    >
                      {slotsLeft}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-[#FAFAFA] rounded-full overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: nearCap ? "#d97706" : "#10b981",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#525252]">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      {r.is_active ? (
                        <span className="text-emerald-700">✓</span>
                      ) : (
                        <span className="text-[#A3A3A3]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel 2 — Signups & activation funnel
// Server-side admin_activation_funnel() RPC (internal/test accounts excluded);
// renders a drop-off-aware bar list.
// ────────────────────────────────────────────────────────────────────

function FunnelCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_activation_funnel"],
    queryFn: async () => {
      // Server-side via the admin-gated RPC: it reads auth.users to exclude
      // internal/test accounts (the client can't) and dedupes per-user
      // career_roles / applications / stories in SQL. Returns one row per
      // stage as { ord, stage, count } ordered by ord.
      const { data, error } = await supabase.rpc("admin_activation_funnel");
      if (error) throw error;
      return (data || []).map((r) => ({
        stage: r.stage,
        count: Number(r.count) || 0,
      }));
    },
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => {
    if (!data || data.length === 0) return [];
    const top = data[0].count || 1;
    const palette = ["#10b981", "#34d399", "#fbbf24", "#fb923c", "#ef4444"];
    return data.map((row, i) => {
      const prev = i === 0 ? row.count : data[i - 1].count;
      const dropPct =
        i === 0 || prev === 0
          ? 0
          : Math.round(((prev - row.count) / prev) * 100);
      const widthPct = top === 0 ? 0 : Math.round((row.count / top) * 100);
      return { ...row, dropPct, widthPct, color: palette[i] };
    });
  }, [data]);

  return (
    <Card
      title="Activation funnel"
      icon={Users}
      footer={
        rows.length === 0
          ? "No data yet"
          : `${rows[0].count} ${rows[0].stage.toLowerCase()} → ${rows[rows.length - 1].count} ${rows[rows.length - 1].stage.toLowerCase()} · excl. internal`
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading funnel: ${error.message}`} />
      ) : rows.length === 0 ? (
        <EmptyState message="No signups yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={row.stage}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium text-[#0A0A0A]">{row.stage}</span>
                <span className="text-[#525252]">
                  <strong>{row.count}</strong>
                  {i > 0 && row.dropPct > 0 && (
                    <span className="text-[#A3A3A3] ml-2">
                      −{row.dropPct}% from prev
                    </span>
                  )}
                </span>
              </div>
              <div className="h-6 bg-[#FAFAFA] rounded">
                <div
                  className="h-6 rounded transition-all"
                  style={{
                    width: `${row.widthPct}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel 3 — Recent signups (last 7 days)
// ────────────────────────────────────────────────────────────────────

function RecentSignupsCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_launch_recent_signups"],
    queryFn: async () => {
      const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, created_at, onboarding_complete, referral_source",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card
      title="Recent signups (7d)"
      icon={UserPlus}
      footer={`${(data || []).length} signup(s) in the last 7 days`}
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading signups: ${error.message}`} />
      ) : (data || []).length === 0 ? (
        <EmptyState message="No signups in the last 7 days." />
      ) : (
        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-[#A3A3A3] border-b border-[#F5F5F5]">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Onboarded</th>
                <th className="py-2 font-medium">Referral</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-[#FAFAFA]">
                  <td className="py-2 pr-3 text-[#525252]" title={r.created_at}>
                    {formatDistanceToNow(new Date(r.created_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="py-2 pr-3 truncate max-w-[180px]">
                    {r.full_name || (
                      <span className="text-[#A3A3A3]">(no name yet)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {r.onboarding_complete ? (
                      <span className="text-emerald-700">✓</span>
                    ) : (
                      <span className="text-[#A3A3A3]">—</span>
                    )}
                  </td>
                  <td className="py-2 text-[#525252]">
                    {r.referral_source || (
                      <span className="text-[#A3A3A3]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel 4 — System health (24h)
// Failures grouped client-side from function_metrics, plus last 20
// error_logs raw.
// ────────────────────────────────────────────────────────────────────

function SystemHealthCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_launch_system_health"],
    queryFn: async () => {
      const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
      const [failures, errors] = await Promise.all([
        supabase
          .from("function_metrics")
          .select("function_name, created_at")
          .eq("ok", false)
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("error_logs")
          .select("function_name, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (failures.error) throw failures.error;
      if (errors.error) throw errors.error;

      // Group failures client-side: { function_name, count, last_seen }
      const grouped = new Map();
      for (const f of failures.data || []) {
        const k = f.function_name;
        if (!grouped.has(k))
          grouped.set(k, {
            function_name: k,
            count: 0,
            last_seen: f.created_at,
          });
        const entry = grouped.get(k);
        entry.count += 1;
        if (f.created_at > entry.last_seen) entry.last_seen = f.created_at;
      }
      const byFn = Array.from(grouped.values()).sort(
        (a, b) => b.count - a.count,
      );
      return { byFn, errors: errors.data || [] };
    },
    refetchInterval: 30_000,
  });

  return (
    <Card
      title="System health (24h)"
      icon={AlertCircle}
      footer={
        data
          ? `${data.byFn.length} function(s) with failures · ${data.errors.length} recent error_log(s)`
          : "—"
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading health: ${error.message}`} />
      ) : !data || (data.byFn.length === 0 && data.errors.length === 0) ? (
        <EmptyState message="No failures or errors recorded. 🎉" />
      ) : (
        <div className="space-y-4">
          {data.byFn.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">
                Failures by function (24h)
              </p>
              <div className="space-y-1">
                {data.byFn.map((f) => (
                  <div
                    key={f.function_name}
                    className="flex items-center justify-between text-[11px] border border-[#F5F5F5] rounded px-2.5 py-1.5"
                  >
                    <span className="font-medium text-[#0A0A0A] truncate">
                      {f.function_name}
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-semibold text-red-700">
                        {f.count}
                      </span>
                      <span className="text-[10px] text-[#A3A3A3]">
                        last{" "}
                        {formatDistanceToNow(new Date(f.last_seen), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.errors.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">
                Last {data.errors.length} error_logs
              </p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {data.errors.map((e, idx) => (
                  <div
                    key={`${e.created_at}-${idx}`}
                    className="border border-red-100 bg-red-50/60 rounded px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-red-900 truncate">
                        {e.function_name}
                      </span>
                      <span className="text-[10px] text-red-700 flex-shrink-0">
                        {format(new Date(e.created_at), "MMM d HH:mm")}
                      </span>
                    </div>
                    <p className="text-red-800 mt-0.5 line-clamp-2 break-words">
                      {e.error_message || "(no message)"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel 5 — Cost (7d), grouped by day client-side
// ────────────────────────────────────────────────────────────────────

function CostCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_launch_cost_7d"],
    queryFn: async () => {
      const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from("function_metrics")
        .select("created_at, user_id, cost_usd")
        .gte("created_at", since);
      if (error) throw error;

      // Group by YYYY-MM-DD (UTC). Volumes are small per the spec, so a
      // single client-side pass is fine.
      const byDay = new Map();
      for (const r of data || []) {
        const day = r.created_at.slice(0, 10);
        if (!byDay.has(day))
          byDay.set(day, { day, calls: 0, users: new Set(), cost: 0 });
        const entry = byDay.get(day);
        entry.calls += 1;
        if (r.user_id) entry.users.add(r.user_id);
        const c = Number(r.cost_usd) || 0;
        entry.cost += c;
      }
      return Array.from(byDay.values())
        .map((e) => ({
          day: e.day,
          calls: e.calls,
          users: e.users.size,
          cost: e.cost,
        }))
        .sort((a, b) => b.day.localeCompare(a.day));
    },
    refetchInterval: 60_000,
  });

  const totals = useMemo(() => {
    if (!data) return null;
    return {
      calls: data.reduce((a, d) => a + d.calls, 0),
      cost: data.reduce((a, d) => a + d.cost, 0),
    };
  }, [data]);

  return (
    <Card
      title="Cost (7d)"
      icon={DollarSign}
      footer={
        totals
          ? `${totals.calls} call(s) · $${totals.cost.toFixed(4)} total across the window`
          : "—"
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading cost: ${error.message}`} />
      ) : !data || data.length === 0 ? (
        <EmptyState message="No function calls in the last 7 days." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[#A3A3A3] border-b border-[#F5F5F5]">
                <th className="py-2 pr-3 font-medium">Day (UTC)</th>
                <th className="py-2 pr-3 font-medium text-right">Calls</th>
                <th className="py-2 pr-3 font-medium text-right">
                  Active users
                </th>
                <th className="py-2 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.day} className="border-b border-[#FAFAFA]">
                  <td className="py-2 pr-3 font-mono text-[#0A0A0A]">
                    {r.day}
                  </td>
                  <td className="py-2 pr-3 text-right">{r.calls}</td>
                  <td className="py-2 pr-3 text-right">{r.users}</td>
                  <td className="py-2 text-right font-medium text-[#0A0A0A]">
                    ${r.cost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Panel 6 — Feedback (newest 30 from the feedback table)
// ────────────────────────────────────────────────────────────────────

const CATEGORY_PALETTE = {
  bug: "bg-red-50 border-red-200 text-red-800",
  confusing: "bg-amber-50 border-amber-200 text-amber-800",
  missing_feature: "bg-blue-50 border-blue-200 text-blue-800",
  other: "bg-[#FAFAFA] border-[#E5E5E5] text-[#525252]",
};

function FeedbackCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_launch_feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, created_at, category, route, message")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });

  return (
    <Card
      title="Feedback (latest 30)"
      icon={MessageSquare}
      footer={`${(data || []).length} submission(s) shown · refreshes every 30s`}
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading feedback: ${error.message}`} />
      ) : (data || []).length === 0 ? (
        <EmptyState message="No feedback submitted yet." />
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {data.map((f) => (
            <div
              key={f.id}
              className={`px-3 py-2 rounded border text-[11px] ${
                CATEGORY_PALETTE[f.category] || CATEGORY_PALETTE.other
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold uppercase tracking-wider text-[9px]">
                    {f.category}
                  </span>
                  {f.route && (
                    <span className="opacity-70 font-mono text-[10px] truncate">
                      {f.route}
                    </span>
                  )}
                </div>
                <span className="opacity-60 text-[10px] flex-shrink-0">
                  {format(new Date(f.created_at), "MMM d HH:mm")}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-snug">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Headline real-user counts — admin_user_counts() RPC (SECURITY DEFINER,
// admin-gated; the only path that can read auth.users for the sign-in count).
// All three EXCLUDE internal/test accounts, kept in lockstep with
// src/lib/internalUsers.js via the SQL is_internal_user() helper.
// ────────────────────────────────────────────────────────────────────

function UserCountsCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_user_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_counts");
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    refetchInterval: 60_000,
  });

  const stats = [
    { label: "Visited", sub: "signed in ≥ once", value: data?.visited },
    {
      label: "Started onboarding",
      sub: "has a profile",
      value: data?.started_onboarding,
    },
    { label: "Onboarded", sub: "completed onboarding", value: data?.onboarded },
  ];

  return (
    <Card
      title="Real users"
      icon={UserCheck}
      footer="Excludes internal / test accounts"
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState message={`Error loading counts: ${error.message}`} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
                {s.value ?? "—"}
              </div>
              <div className="text-xs font-medium text-[#525252] mt-0.5">
                {s.label}
              </div>
              <div className="text-[11px] text-[#A3A3A3]">{s.sub}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Page root — admin gate + grid
// ────────────────────────────────────────────────────────────────────

export default function AdminLaunch() {
  const { user } = useAuth();

  // Frontend gate. Same `supabase.rpc('is_admin')` pattern Admin.jsx
  // already uses — verified in /Users/elienglard/getajob/src/pages/Admin.jsx:763.
  // RLS is the actual security boundary; this is just the UX guard so
  // non-admins never see the page shell.
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user?.id,
  });

  if (!user?.id || checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
      </div>
    );
  }

  if (!isAdmin) {
    // Spec: "Non-admins must be redirected to Home — never render the
    // page shell to them." Redirect happens before any panel mounts so
    // no queries fire for non-admins.
    return <Navigate to="/Home" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
          Launch dashboard
        </h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Read-only pilot observability. Auto-refreshes every 30–60s.
        </p>
      </div>

      <UserCountsCard />

      <CapacityCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelCard />
        <RecentSignupsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemHealthCard />
        <CostCard />
      </div>

      <FeedbackCard />
    </div>
  );
}
