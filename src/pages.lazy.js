// pages.lazy.js — lazy-import map for AuthenticatedApp's route table.
//
// Sibling of pages.config.js (which is auto-generated per its header
// comment — do not edit it manually). Every page key here matches a
// key in pages.config.js's PAGES object, but the value is a
// React.lazy(() => import(...)) instead of an eager import.
//
// Why a separate file: pages.config.js says "DO NOT edit manually"
// and there's no generator script in /scripts/ that produces it.
// Treating it as effectively-read-only avoids fighting whatever
// external tooling created it (Base44 scaffolder).
//
// Eager exceptions (NOT in this map; loaded eagerly via App.jsx):
//   - Onboarding: every new pilot student lands here from the
//     WhatsApp invite link. Trading ~80KB main-bundle weight for
//     zero perceived delay on the first-impression screen. PR F
//     decision.
//
// Public routes (not gated by AuthenticatedApp, not in this map):
//   - Landing, Login, ResetPassword. Already eager in App.jsx.

import { lazy } from "react";

// Lazy page imports. Each one becomes its own chunk in dist/assets.
// Ordering doesn't matter — kept alphabetical for grep-ability.
const Admin = lazy(() => import("./pages/Admin"));
const AdminLaunch = lazy(() => import("./pages/AdminLaunch"));
const Career = lazy(() => import("./pages/Career"));
const Calendar = lazy(() => import("./pages/Calendar"));
const CareerAgent = lazy(() => import("./pages/CareerAgent"));
const CVAgent = lazy(() => import("./pages/CVAgent"));
const Home = lazy(() => import("./pages/Home"));
const InterviewCoach = lazy(() => import("./pages/InterviewCoach"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Linkedin = lazy(() => import("./pages/Linkedin"));
const Internship = lazy(() => import("./pages/Internship"));
const Profile = lazy(() => import("./pages/Profile"));
const Resources = lazy(() => import("./pages/Resources"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Settings = lazy(() => import("./pages/Settings"));
const SkillDevelopmentAdvisor = lazy(() => import("./pages/SkillDevelopmentAdvisor"));
const StoryBank = lazy(() => import("./pages/StoryBank"));
const Subagents = lazy(() => import("./pages/Subagents"));
const Tasks = lazy(() => import("./pages/Tasks"));
// PR-A2 — the live /Tracker route is now a redirect to /Career?pipeline=open
// (preserving ?app= passthrough). Loaded eagerly because the redirect is a
// one-shot <Navigate>; a lazy chunk would add a perceived flicker on every
// legacy-link click.
import TrackerRedirect from "./pages/TrackerRedirect";

// Onboarding stays eager — imported here without lazy() so the
// shape matches the rest of the map but no chunk fetch happens.
// See file header comment for rationale.
import Onboarding from "./pages/Onboarding";

export const LAZY_PAGES = {
  Admin,
  AdminLaunch,
  Career,
  Calendar,
  CareerAgent,
  CVAgent,
  Home,
  InterviewCoach,
  Jobs,
  Internship,
  Linkedin,
  Onboarding,
  Profile,
  Resources,
  Roadmap,
  Settings,
  SkillDevelopmentAdvisor,
  StoryBank,
  Subagents,
  Tasks,
  // PR-A2: live route is a redirect to /Career?pipeline=open.
  Tracker: TrackerRedirect,
};

// Same mainPage value as pages.config.js — kept in sync manually since
// there's no shared source. Update both if the main page ever changes.
export const LAZY_MAIN_PAGE = "Home";
