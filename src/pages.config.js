/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Profile from './pages/Profile';
import CareerAgent from './pages/CareerAgent';
import CVAgent from './pages/CVAgent';
import InterviewCoach from './pages/InterviewCoach';
import SkillDevelopmentAdvisor from './pages/SkillDevelopmentAdvisor';
import Roadmap from './pages/Roadmap';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Resources from './pages/Resources';
import Subagents from './pages/Subagents';
import Tasks from './pages/Tasks';
import Tracker from './pages/Tracker';
import Calendar from './pages/Calendar';
import Jobs from './pages/Jobs';
import Admin from './pages/Admin';
import Linkedin from './pages/Linkedin';
import Practicum from './pages/Practicum';
import Settings from './pages/Settings';
import StoryBank from './pages/StoryBank';
// Landing is NOT registered here — it routes at the outer App.jsx level
// to bypass the dashboard Layout (no sidebar) and the auth gate (visible
// to logged-out visitors). See App.jsx for the explicit /, /Landing routes.
import __Layout from './Layout.jsx';


export const PAGES = {
    "Profile": Profile,
    "CareerAgent": CareerAgent,
    "CVAgent": CVAgent,
    "InterviewCoach": InterviewCoach,
    "SkillDevelopmentAdvisor": SkillDevelopmentAdvisor,
    "Roadmap": Roadmap,
    "Home": Home,
    "Onboarding": Onboarding,
    "Resources": Resources,
    "Subagents": Subagents,
    "Tasks": Tasks,
    "Tracker": Tracker,
    "Calendar": Calendar,
    "Jobs": Jobs,
    "Admin": Admin,
    "Linkedin": Linkedin,
    "Practicum": Practicum,
    "Settings": Settings,
    "StoryBank": StoryBank,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};