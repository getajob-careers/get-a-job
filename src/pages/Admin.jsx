import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Loader2,
  AlertTriangle,
  Activity,
  DollarSign,
  Users,
  AlertCircle,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// Admin dashboard — Wk 2 Day 5. Five cards over real-time observability:
//   1. Cost & call-volume trend (toggleable 7/14/30 day window)
//   2. Per-function volume bar chart (last 7d fixed)
//   3. Conversion funnel (Signed up → 1+ Offer)
//   4. Color-coded error feed (latest 20 failures)
//   5. Per-student engagement table
//
// Defense-in-depth gating:
//   - SQL gate: admin_users table + is_admin() helper + RLS policies on
//     every data table the dashboard reads from. Each admin_* RPC also
//     RAISES if caller isn't admin.
//   - Frontend gate (this file): render NotFound-style placeholder if
//     is_admin() returns false. UI doesn't leak the route's existence.

const TREND_WINDOWS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
];

// Color-coded error palette by error_code prefix. Matches the existing
// error taxonomy from PR #6 + extends as needed.
const ERROR_COLORS = {
  auth: "bg-amber-50 border-amber-200 text-amber-800",
  rate_limit: "bg-blue-50 border-blue-200 text-blue-800",
  payload_too_large: "bg-blue-50 border-blue-200 text-blue-800",
  bad_input: "bg-blue-50 border-blue-200 text-blue-800",
  missing_input: "bg-blue-50 border-blue-200 text-blue-800",
  bad_json: "bg-blue-50 border-blue-200 text-blue-800",
  bad_ownership: "bg-blue-50 border-blue-200 text-blue-800",
  json_parse: "bg-orange-50 border-orange-200 text-orange-800",
  bad_shape: "bg-orange-50 border-orange-200 text-orange-800",
  truncated: "bg-orange-50 border-orange-200 text-orange-800",
  truncated_after_retry: "bg-orange-50 border-orange-200 text-orange-800",
  no_openai_key: "bg-red-50 border-red-200 text-red-800",
  unhandled: "bg-red-100 border-red-300 text-red-900",
};
const errorChip = (code) => {
  if (!code) return "bg-gray-50 border-gray-200 text-gray-700";
  if (ERROR_COLORS[code]) return ERROR_COLORS[code];
  // openai_<status>, openai_retry_<status> — bucket by family
  if (code.startsWith("openai_"))
    return "bg-red-50 border-red-200 text-red-800";
  return "bg-gray-50 border-gray-200 text-gray-700";
};

// Funnel bar colors — gradient amber-to-rose to visually convey drop-off
const FUNNEL_COLORS = ["#10b981", "#34d399", "#fbbf24", "#fb923c", "#ef4444"];

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
        <div className="mt-3 pt-3 border-t border-[#F5F5F5] text-[11px] text-[#6E6E6E]">
          {footer}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center h-40 text-xs text-[#6E6E6E]">
      {message}
    </div>
  );
}

// Headline real-user counts. Source: admin_user_counts() RPC (SECURITY DEFINER,
// admin-gated) — the only path that can read auth.users for the sign-in count.
// All three counts EXCLUDE internal/test accounts (see src/lib/internalUsers.js;
// kept in lockstep with the SQL is_internal_user() helper).
//   - visited:            auth.users.last_sign_in_at IS NOT NULL (signed in ≥ once)
//   - started_onboarding: has a profiles row
//   - onboarded:          profiles.onboarding_complete = true
function UserCountsCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_user_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_counts");
      if (error) throw error;
      // RPC returns a single row { visited, started_onboarding, onboarded }
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
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
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
              <div className="text-[11px] text-[#6E6E6E]">{s.sub}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TrendCard() {
  const [days, setDays] = useState(7);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_cost_trend", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_cost_trend", {
        p_days: days,
      });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const chartData = useMemo(() => {
    return (data || []).map((d) => ({
      day: format(new Date(d.day), "MMM d"),
      cost: Number(d.total_cost),
      calls: Number(d.total_calls),
      failures: Number(d.total_failures),
    }));
  }, [data]);

  const totalCost = chartData.reduce((acc, d) => acc + d.cost, 0);
  const totalCalls = chartData.reduce((acc, d) => acc + d.calls, 0);

  return (
    <Card
      title="Cost & call volume"
      icon={DollarSign}
      footer={`Window: last ${days} days · ${chartData.length} bucket(s) · $${totalCost.toFixed(4)} total · ${totalCalls} calls`}
    >
      <div className="flex justify-end gap-1 mb-3">
        {TREND_WINDOWS.map((w) => (
          <button
            key={w.value}
            onClick={() => setDays(w.value)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
              days === w.value
                ? "bg-[#0A0A0A] text-white"
                : "bg-white border border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading trend: ${error.message}`} />
      ) : chartData.length === 0 ? (
        <EmptyState message="No data in this window yet." />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#525252" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#525252" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#525252" }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #E5E5E5",
              }}
              formatter={(v, name) =>
                name === "cost" ? `$${Number(v).toFixed(4)}` : v
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="calls"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="calls"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cost"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="cost ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function VolumeCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_function_volume"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_function_volume");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const chartData = useMemo(() => {
    return (data || []).map((d) => ({
      name: d.function_name
        .replace(/^generate-/, "g-")
        .replace(/^extract-/, "e-"),
      fullName: d.function_name,
      calls: Number(d.calls),
      failures: Number(d.failures),
      successes: Number(d.calls) - Number(d.failures),
      cost: Number(d.total_cost),
      avgLatency: Math.round(Number(d.avg_latency_ms)),
    }));
  }, [data]);

  return (
    <Card
      title="Per-function volume (7d)"
      icon={Activity}
      footer={`${chartData.length} function(s) · ${chartData.reduce((a, d) => a + d.calls, 0)} total calls · ${chartData.reduce((a, d) => a + d.failures, 0)} failures`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading volume: ${error.message}`} />
      ) : chartData.length === 0 ? (
        <EmptyState message="No function calls in the last 7 days." />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#525252" }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 10, fill: "#525252" }} />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #E5E5E5",
              }}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.fullName || label
              }
              formatter={(v, name, p) => {
                if (name === "successes")
                  return [`${v} (avg ${p.payload.avgLatency}ms)`, "successes"];
                return v;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="successes"
              stackId="a"
              fill="#10b981"
              name="successes"
            />
            <Bar
              dataKey="failures"
              stackId="a"
              fill="#ef4444"
              name="failures"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function FunnelCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_funnel"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_funnel");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  // Compute drop-off % vs. previous stage; first stage is 100%.
  const funnelRows = useMemo(() => {
    if (!data || data.length === 0) return [];
    const top = Number(data[0].count) || 1;
    return data.map((row, i) => {
      const count = Number(row.count);
      const prev = i === 0 ? count : Number(data[i - 1].count);
      const dropPct =
        i === 0
          ? 0
          : prev === 0
            ? 0
            : Math.round(((prev - count) / prev) * 100);
      const widthPct = top === 0 ? 0 : Math.round((count / top) * 100);
      return {
        stage: row.stage,
        count,
        dropPct,
        widthPct,
        color: FUNNEL_COLORS[i] || "#737373",
      };
    });
  }, [data]);

  return (
    <Card
      title="Conversion funnel"
      icon={Users}
      footer={
        funnelRows.length === 0
          ? "No data yet"
          : `${funnelRows[0].stage}: ${funnelRows[0].count} · ${funnelRows[funnelRows.length - 1].stage}: ${funnelRows[funnelRows.length - 1].count} · excl. internal`
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading funnel: ${error.message}`} />
      ) : funnelRows.length === 0 ? (
        <EmptyState message="No cohort data yet." />
      ) : (
        <div className="space-y-2">
          {funnelRows.map((row, i) => (
            <div key={row.stage}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium text-[#0A0A0A]">{row.stage}</span>
                <span className="text-[#525252]">
                  <strong>{row.count}</strong>
                  {i > 0 && row.dropPct > 0 && (
                    <span className="text-[#6E6E6E] ml-2">
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

function ErrorFeedCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_error_feed"],
    queryFn: async () => {
      // Direct query; RLS gates to admin via the function_metrics admin policy
      const { data, error } = await supabase
        .from("function_metrics")
        .select(
          "id, function_name, error_code, http_status, latency_ms, user_id, created_at",
        )
        .eq("ok", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });

  return (
    <Card
      title="Recent failures"
      icon={AlertCircle}
      footer={`Latest 20 ok=false rows · refreshes every 30s · ${(data || []).length} shown`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading feed: ${error.message}`} />
      ) : (data || []).length === 0 ? (
        <EmptyState message="No failures recorded. 🎉" />
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {data.map((r) => (
            <div
              key={r.id}
              className={`px-3 py-2 rounded border text-[11px] ${errorChip(r.error_code)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold">{r.function_name}</span>
                  <span className="opacity-70 ml-2">
                    {r.error_code || "(no code)"}
                  </span>
                  <span className="opacity-50 ml-2">
                    → HTTP {r.http_status}
                  </span>
                </div>
                <div className="opacity-60 flex-shrink-0 text-[10px]">
                  {format(new Date(r.created_at), "MMM d HH:mm:ss")} ·{" "}
                  {r.latency_ms}ms
                </div>
              </div>
              {r.user_id && (
                <div className="opacity-50 text-[10px] mt-0.5 truncate">
                  user_id: {r.user_id.slice(0, 8)}…
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EngagementCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_student_engagement"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_student_engagement");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card
      title="Student engagement"
      icon={Users}
      footer={`${(data || []).length} student(s) total`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading engagement: ${error.message}`} />
      ) : (data || []).length === 0 ? (
        <EmptyState message="No students yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[#6E6E6E] border-b border-[#F5F5F5]">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">Onboarded</th>
                <th className="py-2 pr-3 font-medium text-right">Apps</th>
                <th className="py-2 pr-3 font-medium text-right">Apps 7d</th>
                <th className="py-2 pr-3 font-medium text-right">Stories</th>
                <th className="py-2 pr-3 font-medium text-right">Calls 7d</th>
                <th className="py-2 pr-3 font-medium text-right">Cost</th>
                <th className="py-2 font-medium">Last app</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.user_id} className="border-b border-[#FAFAFA]">
                  <td
                    className="py-2 pr-3 truncate max-w-[140px]"
                    title={r.user_id}
                  >
                    {r.full_name || "(no name)"}
                  </td>
                  <td className="py-2 pr-3">
                    {r.onboarding_complete ? (
                      <span className="text-emerald-700">✓</span>
                    ) : (
                      <span className="text-[#6E6E6E]">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {r.total_applications}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {r.applications_7d > 0 ? (
                      <span className="font-semibold text-emerald-700">
                        {r.applications_7d}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">{r.total_stories}</td>
                  <td className="py-2 pr-3 text-right">
                    {r.function_calls_7d}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    ${Number(r.total_cost_usd).toFixed(4)}
                  </td>
                  <td className="py-2 text-[#525252]">
                    {r.last_application_at
                      ? format(new Date(r.last_application_at), "MMM d")
                      : "—"}
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

// ─── Student picker shared by ChatLogsCard + StoryBrowserCard ────────
function useStudentList() {
  return useQuery({
    queryKey: ["admin_list_students"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_students");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });
}

// ─── ChatLogsCard ─────────────────────────────────────────────────────
// Internal tool — student dropdown → grouped conversations → expandable
// message threads with pretty-printed suggested_*_json blocks. Per Eli's
// design call: no auto-select, force admin to choose what to look at.
const SUGGESTED_BLOCK_FIELDS = [
  ["suggested_tasks", "TASKS"],
  ["suggested_roadmap_changes", "ROADMAP_CHANGES"],
  ["suggested_application_actions", "APPLICATION_ACTIONS"],
  ["suggested_agent", "AGENT"],
  ["suggested_cv_generation", "CV_GENERATION"],
];

function ChatLogsCard() {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [expandedConvos, setExpandedConvos] = useState(() => new Set());
  const { data: students } = useStudentList();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin_chat_messages", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_chat_messages", {
        p_user_id: selectedUserId,
        p_limit: 200,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
    refetchInterval: 60_000,
  });

  // Group flat message list by conversation_id (RPC already returns
  // sorted by conversation_id, then created_at ASC within).
  const conversations = useMemo(() => {
    const byConvo = new Map();
    for (const m of messages || []) {
      if (!byConvo.has(m.conversation_id)) {
        byConvo.set(m.conversation_id, {
          conversation_id: m.conversation_id,
          title: m.conversation_title,
          agent: m.agent,
          application_id: m.application_id,
          messages: [],
        });
      }
      byConvo.get(m.conversation_id).messages.push(m);
    }
    // Sort conversations by most recent message DESC for the display order.
    return Array.from(byConvo.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_at || "";
      const bLast = b.messages[b.messages.length - 1]?.created_at || "";
      return bLast.localeCompare(aLast);
    });
  }, [messages]);

  const toggleConvo = (id) => {
    setExpandedConvos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card
      title="Chat logs"
      icon={MessageSquare}
      footer={
        selectedUserId
          ? `${conversations.length} conversation(s) · ${(messages || []).length} message(s) · cap 200`
          : "Select a student to view their chat history"
      }
    >
      <div className="mb-3">
        <select
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value);
            setExpandedConvos(new Set());
          }}
          className="w-full text-xs border border-[#E5E5E5] rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">— Select a student —</option>
          {(students || []).map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name || "(no name)"} · {s.user_id.slice(0, 8)}…
            </option>
          ))}
        </select>
      </div>

      {!selectedUserId ? (
        <EmptyState message="Pick a student from the dropdown above." />
      ) : isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading messages: ${error.message}`} />
      ) : conversations.length === 0 ? (
        <EmptyState message="No chat history for this student." />
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {conversations.map((c) => (
            <ConversationBlock
              key={c.conversation_id}
              convo={c}
              expanded={expandedConvos.has(c.conversation_id)}
              onToggle={() => toggleConvo(c.conversation_id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ConversationBlock({ convo, expanded, onToggle }) {
  const lastMsg = convo.messages[convo.messages.length - 1];
  const lastTime = lastMsg?.created_at
    ? formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: true })
    : "—";
  return (
    <div className="border border-[#E5E5E5] rounded-md bg-[#FAFAFA]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-[#F5F5F5]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-[#525252]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[#525252]" />
          )}
          <span className="text-[10px] uppercase tracking-wider font-medium text-[#525252] px-1.5 py-0.5 bg-white border border-[#E5E5E5] rounded">
            {convo.agent || "?"}
          </span>
          <span className="text-xs font-medium text-[#0A0A0A] truncate">
            {convo.title || "(untitled)"}
          </span>
          {convo.application_id && (
            <span className="text-[10px] text-[#6E6E6E] flex-shrink-0">
              · app {convo.application_id.slice(0, 8)}…
            </span>
          )}
        </div>
        <div className="text-[10px] text-[#6E6E6E] flex-shrink-0">
          {convo.messages.length} msg · {lastTime}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[#E5E5E5] bg-white">
          {convo.messages.map((m) => (
            <MessageBubble key={m.message_id} msg={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const isError = msg.is_error;
  const bubbleClass = isError
    ? "bg-red-50 border-red-200"
    : isUser
      ? "bg-blue-50 border-blue-200"
      : "bg-white border-[#E5E5E5]";
  const hasSuggested = SUGGESTED_BLOCK_FIELDS.some(([k]) => msg[k] != null);
  return (
    <div className={`border rounded-md px-3 py-2 ${bubbleClass}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#525252]">
          {isUser ? "User" : "Assistant"}
          {isError && <span className="ml-2 text-red-700">· ERROR</span>}
        </span>
        <span className="text-[10px] text-[#6E6E6E]">
          {format(new Date(msg.created_at), "MMM d HH:mm:ss")}
        </span>
      </div>
      {isError && msg.original_user_message && (
        <div className="mb-2 text-[11px]">
          <div className="text-[10px] uppercase tracking-wider text-red-800 font-medium mb-0.5">
            Failed prompt
          </div>
          <div className="bg-white border border-red-200 rounded px-2 py-1 text-red-900 whitespace-pre-wrap">
            {msg.original_user_message}
          </div>
        </div>
      )}
      <p className="text-[11px] text-[#0A0A0A] whitespace-pre-wrap leading-snug">
        {msg.content}
      </p>
      {hasSuggested && (
        <div className="mt-2 space-y-1.5">
          {SUGGESTED_BLOCK_FIELDS.map(([key, label]) =>
            msg[key] == null ? null : (
              <div key={key}>
                <div className="text-[9px] uppercase tracking-wider text-[#6E6E6E] font-medium mb-0.5">
                  {label}
                </div>
                <pre className="text-[10px] bg-[#FAFAFA] border border-[#E5E5E5] rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(msg[key], null, 2)}
                </pre>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ─── StoryBrowserCard ────────────────────────────────────────────────
// Internal tool — story-by-story prompt-tuning signal. "All students" is
// the default; switching to a single student filters server-side. When
// source='conversation', raw_source_text shows the latest user message
// before the story was captured (best-effort, per Eli's design call).
function StoryBrowserCard() {
  const [selectedUserId, setSelectedUserId] = useState(""); // "" = all students
  const { data: students } = useStudentList();

  const {
    data: stories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin_stories_browse", selectedUserId || "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stories_browse", {
        p_user_id: selectedUserId || null,
        p_limit: 50,
      });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card
      title="Story browser"
      icon={BookOpen}
      footer={`${(stories || []).length} story(ies) · cap 50 · ${selectedUserId ? "filtered" : "all students"}`}
    >
      <div className="mb-3">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full text-xs border border-[#E5E5E5] rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">All students</option>
          {(students || []).map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name || "(no name)"} · {s.user_id.slice(0, 8)}…
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-4 h-4 animate-spin text-[#6E6E6E]" />
        </div>
      ) : error ? (
        <EmptyState message={`Error loading stories: ${error.message}`} />
      ) : (stories || []).length === 0 ? (
        <EmptyState
          message={
            selectedUserId
              ? "No stories captured for this student yet."
              : "No stories captured yet."
          }
        />
      ) : (
        <div className="space-y-3 max-h-[700px] overflow-y-auto">
          {stories.map((s) => (
            <StoryCard
              key={s.story_id}
              story={s}
              showStudentName={!selectedUserId}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function StoryCard({ story, showStudentName }) {
  const hasRawText = !!story.raw_source_text;
  return (
    <div className="border border-[#E5E5E5] rounded-md p-3 bg-white">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#0A0A0A] truncate">
            {story.title || "(untitled)"}
          </p>
          {showStudentName && (
            <p className="text-[10px] text-[#525252] mt-0.5">
              {story.full_name || "(no name)"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[9px] uppercase tracking-wider font-medium text-[#525252] px-1.5 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded">
            {story.source}
          </span>
          <span className="text-[10px] text-[#6E6E6E]">
            {format(new Date(story.created_at), "MMM d")}
          </span>
        </div>
      </div>
      <div
        className={`grid gap-3 ${hasRawText ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
      >
        <div className="space-y-1.5">
          <StarField label="Situation" value={story.situation} />
          <StarField label="Task" value={story.task} />
          <StarField label="Action" value={story.action} />
          <StarField label="Result" value={story.result} />
        </div>
        {hasRawText && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#6E6E6E] font-medium mb-0.5">
              Source text
            </div>
            <pre className="text-[11px] bg-[#FAFAFA] border border-[#E5E5E5] rounded px-2 py-1.5 whitespace-pre-wrap overflow-x-auto leading-snug">
              {story.raw_source_text}
            </pre>
          </div>
        )}
      </div>
      {(story.metrics?.length > 0 ||
        story.skills_demonstrated?.length > 0 ||
        story.tools_used?.length > 0 ||
        story.relevance_tags?.length > 0) && (
        <div className="mt-3 pt-2 border-t border-[#F5F5F5] flex flex-wrap gap-1">
          {(story.metrics || []).map((m, i) => (
            <span
              key={`m-${i}`}
              className="text-[10px] px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded"
            >
              {m}
            </span>
          ))}
          {(story.skills_demonstrated || []).map((m, i) => (
            <span
              key={`s-${i}`}
              className="text-[10px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded"
            >
              {m}
            </span>
          ))}
          {(story.tools_used || []).map((m, i) => (
            <span
              key={`t-${i}`}
              className="text-[10px] px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 rounded"
            >
              {m}
            </span>
          ))}
          {(story.relevance_tags || []).map((m, i) => (
            <span
              key={`rt-${i}`}
              className="text-[10px] px-1.5 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] text-[#525252] rounded"
            >
              #{m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StarField({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[#6E6E6E] font-medium">
        {label}
      </div>
      {value ? (
        <p className="text-[11px] text-[#0A0A0A] leading-snug whitespace-pre-wrap">
          {value}
        </p>
      ) : (
        <p className="text-[11px] text-[#6E6E6E] italic">
          — (extractor left null)
        </p>
      )}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();

  // Frontend gate — defense in depth (the SQL gate is the actual security
  // boundary; this just keeps non-admins from seeing the page chrome).
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user?.id,
  });

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#6E6E6E]" />
      </div>
    );
  }

  if (!isAdmin) {
    // 404-style — don't acknowledge the route exists
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-2">
        <AlertTriangle className="w-8 h-8 text-[#6E6E6E]" />
        <p className="text-sm font-medium text-[#525252]">Page not found</p>
        <p className="text-xs text-[#6E6E6E]">
          The page you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
          Admin Dashboard
        </h1>
        <p className="text-sm text-[#6E6E6E] mt-1">
          Real-time observability over the platform. Auto-refreshes every
          30–60s.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <UserCountsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <TrendCard />
        <VolumeCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <FunnelCard />
        <ErrorFeedCard />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <EngagementCard />
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <ChatLogsCard />
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <StoryBrowserCard />
      </div>
    </div>
  );
}
