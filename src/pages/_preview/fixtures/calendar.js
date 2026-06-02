// Calendar preview fixtures — drive every render branch of Calendar.jsx.
// Each fixture seeds the 3 query keys Calendar reads:
//   ["calendarEvents", UID] — calendar_events table
//   ["applications", UID]   — applications table (for "applied" chips on
//                              the day they were submitted)
//   ["tasks", UID]          — tasks table (for "task" chips on due_date)

const UID = "calendar-fixture-user";

// Anchor relative to "today" (cursor + selectedDate default to new Date()).
// The MonthGrid renders the week containing today, so most fixtures bias
// events around 0…+14 days from today so they land on the visible grid.
const D = (daysFromNow, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const TODAY_ISO_DATE = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
})();

const APPLICATIONS = [
  // 5 days ago — past application chip lands as "Applied · monday.com"
  {
    id: "app-1",
    user_id: UID,
    role_title: "Associate Product Manager",
    company: "monday.com",
    applied_date: D(-5, 0, 0),
  },
  {
    id: "app-2",
    user_id: UID,
    role_title: "Product Analyst",
    company: "Riverside",
    applied_date: D(-2, 0, 0),
  },
];

const CALENDAR_EVENTS = [
  // Today, timed interview
  {
    id: "evt-1",
    user_id: UID,
    title: "1st-round interview · monday.com",
    description: "Hiring manager call. Bring the activation funnel deck.",
    event_type: "interview",
    start_date: D(0, 14, 0),
    end_date: D(0, 14, 45),
    all_day: false,
    application_id: "app-1",
    location: "Zoom",
    reminder_minutes: 30,
  },
  // +2 days, networking event (all-day)
  {
    id: "evt-2",
    user_id: UID,
    title: "Reichman PM meetup",
    description: "Product community mixer — bring 3 follow-up targets.",
    event_type: "networking_event",
    start_date: D(2, 0, 0),
    end_date: null,
    all_day: true,
    application_id: null,
    location: "Herzliya Innovation Center",
    reminder_minutes: 60,
  },
  // +5 days, follow-up
  {
    id: "evt-3",
    user_id: UID,
    title: "Follow up with the Wix recruiter",
    description: "Send a polite nudge if no reply by then.",
    event_type: "follow_up",
    start_date: D(5, 10, 0),
    end_date: null,
    all_day: false,
    application_id: null,
    location: null,
    reminder_minutes: 30,
  },
  // +9 days, application deadline (renders as task tone)
  {
    id: "evt-4",
    user_id: UID,
    title: "Fireblocks BizOps Analyst — application deadline",
    description: null,
    event_type: "application_deadline",
    start_date: D(9, 0, 0),
    end_date: null,
    all_day: true,
    application_id: null,
    location: null,
    reminder_minutes: 60,
  },
  // +12 days, second interview
  {
    id: "evt-5",
    user_id: UID,
    title: "Riverside take-home review",
    description: "Walk through the SQL exercise + the dashboard prototype.",
    event_type: "interview",
    start_date: D(12, 11, 0),
    end_date: D(12, 12, 0),
    all_day: false,
    application_id: "app-2",
    location: "Zoom",
    reminder_minutes: 15,
  },
];

const TASKS = [
  // Due today, high priority — drops on the grid as a golden chip
  {
    id: "task-1",
    user_id: UID,
    title: "Tailor CV for the Riverside Product Analyst role",
    description: "Three bullets, STAR format, lead with the activation A/B win.",
    category: "cv",
    priority: "high",
    due_date: D(0, 0, 0),
    is_complete: false,
  },
  // Due in 3 days, medium
  {
    id: "task-2",
    user_id: UID,
    title: "DM 3 monday.com PMs on LinkedIn",
    description: "Use the 'I'm a Reichman BA student researching X' opener.",
    category: "networking",
    priority: "medium",
    due_date: D(3, 0, 0),
    is_complete: false,
  },
  // Past + completed (renders strikethrough, opacity 0.6)
  {
    id: "task-3",
    user_id: UID,
    title: "Update LinkedIn headline",
    description: "Already done — adds the 'Aspiring PM' keyword.",
    category: "networking",
    priority: "low",
    due_date: D(-3, 0, 0),
    is_complete: true,
  },
];

function makeMonthOverflowEvents() {
  // 8 events on one day = overflow `+5 more` on month view (visible=3, compact=6).
  const out = [];
  for (let i = 0; i < 8; i++) {
    out.push({
      id: `evt-burst-${i}`,
      user_id: UID,
      title: `Networking event ${i + 1}`,
      description: null,
      event_type: i % 2 === 0 ? "networking_event" : "follow_up",
      start_date: D(4, 9 + i, 0),
      end_date: null,
      all_day: false,
      application_id: null,
      location: null,
      reminder_minutes: 60,
    });
  }
  return out;
}

export const CALENDAR_FIXTURES = {
  "calendar-loading": {
    label: "Calendar · loading spinner (all 3 queries in flight)",
    events: [],
    applications: [],
    tasks: [],
    loading: true,
  },
  "calendar-empty": {
    label: "Calendar · empty · month grid with no chips",
    events: [],
    applications: [],
    tasks: [],
  },
  "calendar-populated-month": {
    label: "Calendar · month view · 5 events + 3 tasks + 2 applications",
    events: CALENDAR_EVENTS,
    applications: APPLICATIONS,
    tasks: TASKS,
  },
  "calendar-week-view": {
    label: "Calendar · week view (compact day cells, 6-item budget)",
    events: CALENDAR_EVENTS,
    applications: APPLICATIONS,
    tasks: TASKS,
    viewMode: "week",
  },
  "calendar-day-view": {
    label: "Calendar · day view (today's items expanded with descriptions)",
    events: CALENDAR_EVENTS,
    applications: APPLICATIONS,
    tasks: TASKS,
    viewMode: "day",
  },
  "calendar-error-banner": {
    label: "Calendar · events query error banner (red retry hint)",
    events: [],
    applications: APPLICATIONS,
    tasks: TASKS,
    eventsError: true,
  },
  "calendar-overflow-day": {
    label: "Calendar · day with 8 events (overflow '+5 more' indicator)",
    events: makeMonthOverflowEvents(),
    applications: APPLICATIONS,
    tasks: TASKS,
  },
  "calendar-add-event-dialog": {
    label: "Calendar · Add-event dialog open (default 'Interview' type)",
    events: CALENDAR_EVENTS,
    applications: APPLICATIONS,
    tasks: TASKS,
    openAddDialog: true,
  },
};

export const CALENDAR_STATE_IDS = Object.keys(CALENDAR_FIXTURES);
export const CALENDAR_FIXTURE_UID = UID;
export const CALENDAR_TODAY_ISO_DATE = TODAY_ISO_DATE;
