import React from "react";
import { TrendingUp, MessageCircle, Users, UserPlus, Eye, Clock, AlertCircle } from "lucide-react";

// Static educational content for the Networking tab. All claims grounded
// in docs/research/linkedin-post-performance.md sections 5+6. Hardcoded
// (no LLM calls) — this is reference content that doesn't change per-user.
//
// Per Eli's call PR #34 (option 9C): inline Israeli-specific tips where
// research has them; skip a generic "data is global" disclaimer.

export default function NetworkingPrinciples() {
  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">Commenting beats posting at your follower count</h3>
            <p className="text-xs text-emerald-800 leading-snug mt-1">
              For accounts under 1K followers, substantive comments on others' posts produce a reported <strong>~55% lift in profile views</strong> when delivered 5–10× per day. Posting alone reaches no one when you have no audience yet. Build the audience by joining other people's conversations first.
            </p>
            <p className="text-[11px] text-emerald-700 italic mt-1.5">
              The Comment Coach below is the highest-leverage AI tool in this app for getting noticed.
            </p>
          </div>
        </div>
      </div>

      <PrincipleCard Icon={MessageCircle} title="What makes a comment count">
        <ul className="text-xs text-[#52545A] leading-snug space-y-1.5 list-none">
          <li>• <strong>15+ words minimum.</strong> "Great post!" / "So true!" / "100%" add nothing — research-backed signal of low effort</li>
          <li>• <strong>Reference something specific</strong> the original poster said (a phrase, a number, a claim)</li>
          <li>• <strong>Add your own concrete experience</strong> — a real number, a real example, a real counterexample</li>
          <li>• <strong>Sweet spot: 50–150 words.</strong> Over 200 words reads as hijacking the post for your own monologue</li>
        </ul>
      </PrincipleCard>

      <PrincipleCard Icon={Clock} title="Reply window matters">
        <p className="text-xs text-[#52545A] leading-snug">
          When someone comments on your post, replying within <strong>30 minutes</strong> correlates with 64% more total comments and 2.3× more views. The first 60 minutes determine whether the post breaks out beyond your direct connections — under 500 impressions in hour 1 typically caps further reach.
        </p>
      </PrincipleCard>

      <PrincipleCard Icon={UserPlus} title="Connection request strategy">
        <ul className="text-xs text-[#52545A] leading-snug space-y-1.5 list-none">
          <li>• <strong>Weekly cap:</strong> ~100 invites/week is the standard limit. Spread across 5–6 days; sending 100 in one morning gets flagged</li>
          <li>• <strong>Acceptance floor:</strong> stay above 30% acceptance rate or LinkedIn restricts your account</li>
          <li>• <strong>With note vs without — contested:</strong> personalized notes don't always lift acceptance rate, but they DO lift the post-acceptance reply rate (9.4% vs 5.4%). A short note referencing mutual context (alumni, course, shared event) is the safe default</li>
        </ul>
      </PrincipleCard>

      <PrincipleCard Icon={Users} title="Cold outreach reply rates by recipient">
        <ul className="text-xs text-[#52545A] leading-snug space-y-1.5 list-none">
          <li>• <strong>HR / talent acquisition: ~12.1% reply rate</strong> — the highest of any recipient type. For students, DMing recruiters is higher-yield than DMing hiring managers</li>
          <li>• <strong>First-degree connections: ~16.9% reply rate</strong> — leverage existing network before going cold</li>
          <li>• <strong>LinkedIn DMs vs cold email: 10.3% vs 5.1%</strong> — LinkedIn outperforms email for reaching new people</li>
        </ul>
      </PrincipleCard>

      <PrincipleCard Icon={Eye} title="Open To Work — toggle, not the green badge">
        <ul className="text-xs text-[#52545A] leading-snug space-y-1.5 list-none">
          <li>• <strong>The private "Open to Recruiters" toggle is uncontroversial</strong> — only LinkedIn Recruiter customers see your status. Use it.</li>
          <li>• <strong>The public green #OpenToWork badge is contested.</strong> 70% of recruiters in a LinkedIn poll view it positively, but reporting in Fortune (Sept 2024) and trade press argues it can read as desperate or trigger lowball offers in competitive markets</li>
          <li>• <strong>Trade-off, not a rule.</strong> If you're applying broadly to many roles → the public badge surfaces you to more recruiters. If you're targeting a few specific competitive roles → consider the private toggle</li>
        </ul>
      </PrincipleCard>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Israeli market — where the data is thin</h3>
            <ul className="text-xs text-blue-800 leading-snug mt-2 space-y-1 list-none">
              <li>• <strong>Workweek:</strong> Sunday–Thursday. Tuesday + Wednesday during work hours align with Israeli mid-week peak engagement</li>
              <li>• <strong>Hebrew vs English:</strong> Israeli tech companies often request English even for Israel-based roles. English profiles + posts work for our pilot's target sector</li>
              <li>• <strong>Comment register:</strong> Israeli LinkedIn users tend to comment more directly than US norms. Don't soften with American hedging ("just my two cents", "happy to be wrong")</li>
              <li>• <strong>Open gaps:</strong> no Israel-specific posting-time data, no Hebrew-vs-English engagement comparison, no Israeli-tech-sector study. Pilot data should fill these in</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrincipleCard({ Icon, title, children }) {
  return (
    <div className="bg-white border border-[#DDDDDB] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#0E1014]" />
        <h3 className="text-sm font-semibold text-[#0E1014]">{title}</h3>
      </div>
      {children}
    </div>
  );
}
