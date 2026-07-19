import React from "react";
import { isNextDesign } from "@/lib/nextDesign";
import Home from "./Home";
import ThreeTabHome from "@/components/redesign/home/ThreeTabHome";

// The authenticated home. NOTE: this is the "Home" LAZY_PAGES key = the /Home
// route; `/` is the PUBLIC landing (LandingV2Preview), which redirects authed
// users here. So the 3-tab home lives at /Home.
//   flag OFF -> the current Today dashboard (Home), byte-identical.
//   flag ON  -> the canvas 3-tab home.
// Do NOT redirect /Home -> / : `/` is the landing, and it redirects authed users
// back to /Home, so a /Home->/ redirect creates an infinite loop.
export default function Home3Tab() {
  return isNextDesign() ? <ThreeTabHome /> : <Home />;
}
