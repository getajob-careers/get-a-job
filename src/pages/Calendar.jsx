import React, { useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
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
import { ACT_CSS } from "../components/activity/activityStyles";

// Flattened legend: 4 categories that map every data source through one of
// 4 colour families. Replaces the previous 7-dot legend (interview / deadline
// / networking / follow-up / task-high / task-medium / task-low). Cleaner
// for users and the priority distinction inside tasks moves into a small
// badge inside the chip rather than three pink shades on the legend.
//
// Mapping:
//   - apply       → applications.applied_date            (info blue)
//   - interview   → calendar_events of interview type    (coral)
//   - followup    → events of follow-up or networking    (success green)
//   - task        → tasks.due_date (all priorities)      (warning amber)
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
const CATEGORY_CHIP_CLASS = {
  apply:     "act-chip-apply",
  interview: "act-chip-interview",
  followup:  "act-chip-followup",
  task:      "act-chip-task",
};
const CATEGORY_DOT = {
  apply:     "#2B5DC4",
  interview: "#F87060",
  followup:  "#1D7556",
  task:      "#B8841C",
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

export default function Calendar() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [showAddDialog, setShowAddDialog] = useState(false);

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
        route: event.application_id ? "/Tracker" : "/Calendar",
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
        route: "/Tracker",
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
      <>
        <style>{ACT_CSS}</style>
        <div className="act min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{ACT_CSS}</style>
      <div className="act">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {eventsError && (
            <div className="act-banner act-banner-error mb-6">
              Could not load calendar events. Please refresh the page to try again.
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
            <div>
              <p className="act-eyebrow">Calendar</p>
              <h1 className="act-h1 mt-1.5">Your career on a calendar.</h1>
              <p className="act-sub">Every task due date, application, and interview in one view.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="act-btn act-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />Add event
            </button>
          </div>

          {/* Legend — flattened to 4 categories */}
          <div className="flex flex-wrap gap-4 mb-6">
            {CATEGORIES_FOR_LEGEND.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5 text-xs text-[#52545A]">
                <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_DOT[cat] }} />
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="act-btn act-btn-outline act-btn-sm"
                aria-label="Previous"
                style={{ padding: "6px 10px" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={handleToday} className="act-btn act-btn-outline act-btn-sm">
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="act-btn act-btn-outline act-btn-sm"
                aria-label="Next"
                style={{ padding: "6px 10px" }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="ml-2 text-base font-semibold text-[#0E1014]">{headerLabel}</span>
            </div>
            <div className="inline-flex gap-1.5">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className="act-pill act-pill-sm"
                  data-selected={viewMode === mode.id}
                >
                  {mode.label}
                </button>
              ))}
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
              <div className="lg:col-span-2 act-card" style={{ padding: 16 }}>
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

              <div className="act-card">
                <p className="act-eyebrow mb-3">{format(selectedDate, "EEE · MMM d")}</p>
                {selectedDateItems.length === 0 ? (
                  <p className="text-sm text-[#9C9DA1] text-center py-8">
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
      </div>
    </>
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
          <div key={d} className="act-eyebrow text-center py-2">{d}</div>
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
          <div key={d.toISOString()} className="act-eyebrow text-center py-2">
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`act-day-cell ${compact ? "act-day-cell-compact" : ""}`}
      data-out-of-month={!inMonth}
      data-selected={selected}
      data-today={isToday}
    >
      <span className="act-day-cell-num">{format(day, "d")}</span>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {visible.map((it) => (
          <div
            key={it.id}
            className={`act-chip ${CATEGORY_CHIP_CLASS[it.category]}`}
            title={`${it.title}${it.subtitle ? ` — ${it.subtitle}` : ""}`}
            style={it.completed ? { textDecoration: "line-through", opacity: 0.6 } : undefined}
          >
            <span className="truncate" style={{ maxWidth: "100%" }}>{it.title}</span>
          </div>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-[#9C9DA1] px-1">+{overflow} more</span>
        )}
      </div>
    </button>
  );
}

function DayView({ date, items, onItemClick }) {
  return (
    <div className="act-card">
      <p className="act-eyebrow mb-1.5">{format(date, "EEEE · MMM d")}</p>
      {items.length === 0 ? (
        <p className="text-sm text-[#9C9DA1] text-center py-10">
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="act-itemcard"
      data-kind={item.category}
      style={item.completed ? { opacity: 0.6 } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[#52545A]" />
            <span
              className="text-sm font-semibold text-[#0E1014] truncate"
              style={item.completed ? { textDecoration: "line-through" } : undefined}
            >
              {item.title}
            </span>
          </div>
          {item.subtitle && (
            <p className="text-[11px] text-[#52545A] mt-0.5">{item.subtitle}</p>
          )}
          {item.kind === "event" && !item.allDay && item.startISO && (
            <div className="flex items-center gap-1 text-[11px] text-[#52545A] mt-1">
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
            <div className="flex items-center gap-1 text-[11px] text-[#52545A] mt-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{item.location}</span>
            </div>
          )}
          {expanded && item.description && (
            <p className="text-[11px] text-[#52545A] mt-1.5 whitespace-pre-wrap">{item.description}</p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-1 text-[#9C9DA1]" />
      </div>
    </button>
  );
}
