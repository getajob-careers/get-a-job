import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isNextDesign } from "@/lib/nextDesign";
import Home from "./Home";
import ThreeTabHome from "@/components/redesign/home/ThreeTabHome";

// The `/` (and `/Home`) page, FLAG-GATED so the route repoint keeps flag-off
// byte-identical - it stays the "Home" LAZY_PAGES key, so currentPageName remains
// "Home" and the legacy sidebar's Today highlight is unchanged flag-off.
//   flag OFF -> the current Today dashboard (Home), unchanged.
//   flag ON  -> the canvas 3-tab home at `/`; the old /Home ("Today", trashed
//               from nav) redirects to `/` so links keep working.
export default function Home3Tab() {
  const { pathname } = useLocation();
  if (isNextDesign()) {
    if (pathname === "/Home") return <Navigate to="/" replace />;
    return <ThreeTabHome />;
  }
  return <Home />;
}
