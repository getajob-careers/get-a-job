import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus, Clock, MapPin, Loader2, ChevronLeft, ChevronRight,
  ClipboardList, CheckSquare, CalendarDays, ArrowRight,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, addDays, subDays, addWeeks, subWeeks,
  parseISO, compareAsc,
} from "date-fns";
import AddEventDialog from "../components/calendar/AddEventDialog";

// PR 3I — Calendar restyled on rd-* tokens. Restyle-only on behavior;
// every data-source aggregation, the routing on chip click, AddEventDialog's
// CRUD (INSERT calendar_events with optional application_id linkage), and
// the RLS user_id scoping are preserved byte-for-byte.
//
// No dedicated Calendar mockup exists (only docs/design/redesign/getajob_tasks.html
// which shows Calendar as a declined tab merger). Restyle follows the
// established rd token design system for visual consistency with Tasks,
// Profile, StoryBank, Tracker.
//
// Calendar.jsx no longer imports ACT_CSS. activityStyles.js itself stays
// alive: Internship.jsx + 6 internship sub-components still consume `.act-*`
// classes. Full teardown is a later cleanup PR after Internship restyles.

// Flattened legend: 4 categories that map every data source through one of
// 4 colour families. Replaces the previous 7-dot legend.
//
// rd-token mapping (preserving distinct tones across all 4):
//   - apply       → applications.applied_date → teal-dark (submitted = done)
//   - interview   → calendar_events of interview type → coral (priority/heat)
//   - followup    → events of follow-up or networking → soft neutral
//   - task        → tasks.due_date (all priorities) → golden (open work)
const CATEGORY_OF_EVENT_TYPE = {
  interview: "interview",
  application_deadline: "task",
  networking_event: "followup",
  task_deadline: "task",
  follow_up: "followup",
};
const CATEGORY_LABELS = {
  apply:     "Applied",
  interview: "Interview",
  followup:  "Follow-up / Networking",
  task:      "Task",
};
const CATEGORY_DOT = {
  apply:     "var(--rd-teal-dark)",
  interview: "var(--rd-primary)",
  followup:  "var(--rd-text-secondary)",
  task:      "var(--rd-golden-dark)",
};
const CATEGORY_CHIP_TONE = {
  apply:     { bg: "var(--rd-teal-tint)",   fg: "var(--rd-teal-dark)" },
  interview: { bg: "var(--rd-primary-tint)",  fg: "var(--rd-primary-dark)" },
  followup:  { bg: "var(--rd-bg-soft)",     fg: "var(--rd-text-secondary)" },
  task:      { bg: "var(--rd-golden-tint)", fg: "var(--rd-golden-dark)" },
};
const CATEGORIES_FOR_LEGEND = ["apply", "interview", "followup", "task"];

const VIEW_MODES = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

function safeParseDate(value) {
  if (!value) return null;
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// rd-token class strings (shared across Calendar's children).
const RD_CARD       = "rounded-[18px] border border-rd-border bg-rd-bg-card p-4 shadow-rd";
const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_OUTLINE_SM = "inline-flex items-center justify-center gap-1 font-display font-semibold text-[12px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-2.5 py-1.5 transition-colors";

export default function Calendar() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // PR-B2: page-only context for the agent drawer. Calendar doesn't
  // have a single "selected event" — a selected day surfaces multiple
  // items — so the spec's event-level application_id wiring isn't a
  // natural fit today. Setting {page: "Calendar"} alone still gives
  // the agent meaningful situational awareness; per-item application_id
  // wiring can land as a follow-up when the surface gains a single-event
  // selection state.
  // Depend on the STABLE setPageContext, not the whole agentDrawer object,
  // which changes identity on every pageContext/isOpen update and ping-pongs
  // this effect into "Maximum update depth exceeded" (audit S-B1). Same fix
  // Home.jsx and Career.jsx carry.
  const { setPageContext } = useAgentDrawer();
  useEffect(() => {
    setPageContext({ page: "Calendar" });
    return () => setPageContext(null);
  }, [setPageContext]);

  const { data: events = [], isLoading: loadingEvents, isError: eventsError } = useQuery({
    queryKey: ["calendarEvents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Normalize all three sources into a single item list. Each item carries
  // a `category` from the 4-category palette (apply / interview / followup
  // / task). Task priority moves to a sub-badge inside the chip — previously
  // it was 3 pink shades on the legend.
  const items = useMemo(() => {
    const out = [];

    for (const event of events) {
      const date = safeParseDate(event.start_date);
      if (!date) continue;
      const category = CATEGORY_OF_EVENT_TYPE[event.event_type] || "interview";
      out.push({
        id: `event-${event.id}`,
        kind: "event",
        category,
        title: event.title || "Untitled event",
        subtitle: event.event_type ? event.event_type.replace(/_/g, " ") : "Event",
        date,
        allDay: !!event.all_day,
        startISO: event.start_date,
        endISO: event.end_date,
        location: event.location,
        description: event.description,
        route: event.application_id ? `/Career?pipeline=open&app=${event.application_id}` : "/Calendar",
      });
    }

    for (const task of tasks) {
      if (!task.due_date) continue;
      const date = safeParseDate(task.due_date);
      if (!date) continue;
      const priority = task.priority || "medium";
      out.push({
        id: `task-${task.id}`,
        kind: "task",
        category: "task",
        title: task.title || "Untitled task",
        subtitle: `${priority} priority${task.is_complete ? " · done" : ""}`,
        date,
        allDay: true,
        completed: !!task.is_complete,
        priority,
        description: task.description,
        route: "/Tasks",
      });
    }

    for (const app of applications) {
      if (!app.applied_date) continue;
      const date = safeParseDate(app.applied_date);
      if (!date) continue;
      out.push({
        id: `app-${app.id}`,
        kind: "application",
        category: "apply",
        title: app.role_title || "Application",
        subtitle: app.company ? `Applied · ${app.company}` : "Applied",
        date,
        allDay: true,
        route: `/Career?pipeline=open&app=${app.id}`,
      });
    }

    return out;
  }, [events, tasks, applications]);

  const itemsByDay = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = format(it.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareAsc(a.date, b.date));
    }
    return map;
  }, [items]);

  const getItems = (day) => itemsByDay.get(format(day, "yyyy-MM-dd")) || [];
  const selectedDateItems = getItems(selectedDate);

  const handleItemClick = (item) => {
    if (!item.route) return;
    navigate(item.route);
  };

  const handlePrev = () => {
    if (viewMode === "month") setCursor(subMonths(cursor, 1));
    else if (viewMode === "week") setCursor(subWeeks(cursor, 1));
    else setCursor(subDays(cursor, 1));
  };
  const handleNext = () => {
    if (viewMode === "month") setCursor(addMonths(cursor, 1));
    else if (viewMode === "week") setCursor(addWeeks(cursor, 1));
    else setCursor(addDays(cursor, 1));
  };
  const handleToday = () => {
    setCursor(new Date());
    setSelectedDate(new Date());
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(cursor, "MMMM yyyy");
    if (viewMode === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 0 });
      const end = endOfWeek(cursor, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(cursor, "EEEE, MMM d, yyyy");
  }, [cursor, viewMode]);

  const isLoading = loadingEvents || loadingApps || loadingTasks;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-rd-text-secondary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      {eventsError && (
        <div className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-primary-tint border border-rd-primary/30 text-rd-primary-dark mb-6">
          Could not load calendar events. Please refresh the page to try again.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Calendar
          </p>
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Your career on a calendar.
          </h1>
          <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
            Every task due date, application, and interview in one view.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className={`${RD_BTN_PRIMARY} flex-shrink-0`}
        >
          <Plus className="w-3.5 h-3.5" />Add event
        </button>
      </div>

      {/* Legend — flattened to 4 categories */}
      <div className="flex flex-wrap gap-4 mb-6">
        {CATEGORIES_FOR_LEGEND.map((cat) => (
          <span key={cat} className="inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary">
            <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_DOT[cat] }} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrev}
            className={`${RD_BTN_OUTLINE_SM} px-2`}
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className={RD_BTN_OUTLINE_SM}
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`${RD_BTN_OUTLINE_SM} px-2`}
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 font-display font-bold text-[15px] text-rd-text">
            {headerLabel}
          </span>
        </div>
        <div className="inline-flex gap-1.5">
          {VIEW_MODES.map((mode) => {
            const selected = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                data-mode={mode.id}
                aria-pressed={selected}
                className={[
                  "inline-flex items-center font-display font-bold text-[12px] rounded-full px-3 py-1 transition-colors duration-150 whitespace-nowrap",
                  selected
                    ? "bg-rd-primary text-white"
                    : "bg-rd-bg-soft text-rd-text-secondary hover:bg-rd-border hover:text-rd-text",
                ].join(" ")}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "day" ? (
        <DayView
          date={cursor}
          items={getItems(cursor)}
          onItemClick={handleItemClick}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className={`lg:col-span-2 ${RD_CARD}`}>
            {viewMode === "month" ? (
              <MonthGrid
                cursor={cursor}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getItems={getItems}
              />
            ) : (
              <WeekGrid
                cursor={cursor}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getItems={getItems}
              />
            )}
          </div>

          <div className={RD_CARD}>
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-3">
              {format(selectedDate, "EEE · MMM d")}
            </p>
            {selectedDateItems.length === 0 ? (
              <p className="text-[13px] text-rd-text-tertiary text-center py-8">
                Nothing scheduled for this day.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDateItems.map((item) => (
                  <ItemCard key={item.id} item={item} onClick={() => handleItemClick(item)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddEventDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        applications={applications}
        onEventAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
        }}
      />
    </div>
  );
}

function MonthGrid({ cursor, selectedDate, setSelectedDate, getItems }) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono text-center py-2"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, cursor)}
            items={getItems(day)}
            selected={isSameDay(day, selectedDate)}
            isToday={isSameDay(day, new Date())}
            onClick={() => setSelectedDate(day)}
            compact={false}
          />
        ))}
      </div>
    </div>
  );
}

function WeekGrid({ cursor, selectedDate, setSelectedDate, getItems }) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(cursor, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono text-center py-2"
          >
            {format(d, "EEE")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            inMonth
            items={getItems(day)}
            selected={isSameDay(day, selectedDate)}
            isToday={isSameDay(day, new Date())}
            onClick={() => setSelectedDate(day)}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, inMonth, items, selected, isToday, onClick, compact }) {
  const visible = items.slice(0, compact ? 6 : 3);
  const overflow = items.length - visible.length;
  const dayKey = format(day, "yyyy-MM-dd");
  return (
    <button
      type="button"
      onClick={onClick}
      data-day={dayKey}
      data-selected={selected}
      data-today={isToday}
      data-out-of-month={!inMonth}
      className={[
        "flex flex-col items-stretch text-left rounded-[10px] p-1.5 transition-colors min-h-[72px]",
        compact ? "min-h-[120px]" : "min-h-[72px] sm:min-h-[88px]",
        selected
          ? "bg-rd-primary-tint border-2 border-rd-primary"
          : isToday
          ? "bg-rd-golden-tint/40 border border-rd-golden/40 hover:border-rd-golden"
          : "bg-rd-bg-card border border-rd-border-subtle hover:border-rd-border-hover",
        !inMonth && "opacity-50",
      ].filter(Boolean).join(" ")}
    >
      <span
        className={[
          "text-[11px] font-display font-bold mb-1",
          isToday && !selected ? "text-rd-primary-dark" : "text-rd-text",
        ].filter(Boolean).join(" ")}
      >
        {format(day, "d")}
      </span>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {visible.map((it) => {
          const tone = CATEGORY_CHIP_TONE[it.category] || CATEGORY_CHIP_TONE.interview;
          return (
            <div
              key={it.id}
              className="text-[10.5px] font-display font-semibold truncate rounded-[6px] px-1.5 py-0.5"
              title={`${it.title}${it.subtitle ? ` - ${it.subtitle}` : ""}`}
              style={{
                background: tone.bg,
                color: tone.fg,
                textDecoration: it.completed ? "line-through" : undefined,
                opacity: it.completed ? 0.6 : 1,
              }}
            >
              <span className="block truncate">{it.title}</span>
            </div>
          );
        })}
        {overflow > 0 && (
          <span className="text-[10px] text-rd-text-tertiary px-1">+{overflow} more</span>
        )}
      </div>
    </button>
  );
}

function DayView({ date, items, onItemClick }) {
  return (
    <div className={RD_CARD}>
      <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5">
        {format(date, "EEEE · MMM d")}
      </p>
      {items.length === 0 ? (
        <p className="text-[13px] text-rd-text-tertiary text-center py-10">
          Nothing scheduled for this day.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {items.map((it) => (
            <ItemCard key={it.id} item={it} onClick={() => onItemClick(it)} expanded />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onClick, expanded = false }) {
  const Icon =
    item.kind === "task" ? CheckSquare : item.kind === "application" ? ClipboardList : CalendarDays;
  const tone = CATEGORY_CHIP_TONE[item.category] || CATEGORY_CHIP_TONE.interview;
  return (
    <button
      type="button"
      onClick={onClick}
      data-kind={item.category}
      className="w-full text-left rounded-[12px] border border-rd-border bg-rd-bg-card hover:border-rd-border-hover hover:shadow-rd transition-all px-3 py-2.5"
      style={{
        opacity: item.completed ? 0.6 : 1,
        borderLeftWidth: 3,
        borderLeftColor: tone.fg,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 flex-shrink-0 text-rd-text-secondary" />
            <span
              className="font-display font-semibold text-[13px] text-rd-text truncate"
              style={item.completed ? { textDecoration: "line-through" } : undefined}
            >
              {item.title}
            </span>
          </div>
          {item.subtitle && (
            <p className="text-[11px] text-rd-text-secondary mt-0.5">{item.subtitle}</p>
          )}
          {item.kind === "event" && !item.allDay && item.startISO && (
            <div className="flex items-center gap-1 text-[11px] text-rd-text-secondary mt-1">
              <Clock className="w-3 h-3" />
              <span>
                {(() => {
                  try { return format(parseISO(item.startISO), "h:mm a"); }
                  catch { return ""; }
                })()}
                {item.endISO && (
                  <>
                    <span> – </span>
                    {(() => {
                      try { return format(parseISO(item.endISO), "h:mm a"); }
                      catch { return ""; }
                    })()}
                  </>
                )}
              </span>
            </div>
          )}
          {item.location && (
            <div className="flex items-center gap-1 text-[11px] text-rd-text-secondary mt-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{item.location}</span>
            </div>
          )}
          {expanded && item.description && (
            <p className="text-[11px] text-rd-text-secondary mt-1.5 whitespace-pre-wrap">{item.description}</p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-1 text-rd-text-tertiary" />
      </div>
    </button>
  );
}
