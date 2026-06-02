import React from "react";
import { TrendingUp, MessageCircle, Users, UserPlus, Eye, Clock } from "lucide-react";

// PR 3J-C — restyled on rd-* tokens. Static educational content for the
// Networking tab (now consumed only by Resources.jsx — NetworkingTab
// renders the live tools directly). All claims grounded in
// docs/research/linkedin-post-performance.md sections 5+6. Hardcoded
// (no LLM calls) — reference content that doesn't change per-user.

export default function NetworkingPrinciples() {
  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-rd-teal/30 bg-rd-teal-tint p-4">
        <div className="flex items-start gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-rd-teal-dark flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-bold text-[14px] text-rd-text">Commenting beats posting at your follower count</h3>
            <p className="text-[12px] text-rd-text leading-snug mt-1">
              For accounts under 1K followers, substantive comments on others&apos; posts produce a reported{" "}
              <strong className="font-display font-semibold">~55% lift in profile views</strong> when delivered 5–10× per day. Posting alone reaches no one when you have no audience yet. Build the audience by joining other people&apos;s conversations first.
            </p>
            <p className="text-[11px] text-rd-teal-dark italic mt-1.5">
              The Comment Coach below is the highest-leverage AI tool in this app for getting noticed.
            </p>
          </div>
        </div>
      </div>

      <PrincipleCard Icon={MessageCircle} title="What makes a comment count">
        <ul className="text-[12px] text-rd-text-secondary leading-snug space-y-1.5 list-none">
          <li>• <strong className="font-display font-semibold text-rd-text">15+ words minimum.</strong> &quot;Great post!&quot; / &quot;So true!&quot; / &quot;100%&quot; add nothing — research-backed signal of low effort</li>
          <li>• <strong className="font-display font-semibold text-rd-text">Reference something specific</strong> the original poster said (a phrase, a number, a claim)</li>
          <li>• <strong className="font-display font-semibold text-rd-text">Add your own concrete experience</strong> — a real number, a real example, a real counterexample</li>
          <li>• <strong className="font-display font-semibold text-rd-text">Sweet spot: 50–150 words.</strong> Over 200 words reads as hijacking the post for your own monologue</li>
        </ul>
      </PrincipleCard>

      <PrincipleCard Icon={Clock} title="Reply window matters">
        <p className="text-[12px] text-rd-text-secondary leading-snug">
          When someone comments on your post, replying within <strong className="font-display font-semibold text-rd-text">30 minutes</strong> correlates with 64% more total comments and 2.3× more views. The first 60 minutes determine whether the post breaks out beyond your direct connections — under 500 impressions in hour 1 typically caps further reach.
        </p>
      </PrincipleCard>

      <PrincipleCard Icon={UserPlus} title="Connection request strategy">
        <ul className="text-[12px] text-rd-text-secondary leading-snug space-y-1.5 list-none">
          <li>• <strong className="font-display font-semibold text-rd-text">Weekly cap:</strong> ~100 invites/week is the standard limit. Spread across 5–6 days; sending 100 in one morning gets flagged</li>
          <li>• <strong className="font-display font-semibold text-rd-text">Acceptance floor:</strong> stay above 30% acceptance rate or LinkedIn restricts your account</li>
          <li>• <strong className="font-display font-semibold text-rd-text">With note vs without — contested:</strong> personalized notes don&apos;t always lift acceptance rate, but they DO lift the post-acceptance reply rate (9.4% vs 5.4%). A short note referencing mutual context (alumni, course, shared event) is the safe default</li>
          <li>• <strong className="font-display font-semibold text-rd-text">Free LinkedIn track: </strong> only 5 personalized note invites per month. Premium lifts this</li>
        </ul>
      </PrincipleCard>

      <PrincipleCard Icon={Users} title="Cold outreach reply rates by recipient">
        <ul className="text-[12px] text-rd-text-secondary leading-snug space-y-1.5 list-none">
          <li>• <strong className="font-display font-semibold text-rd-text">HR / talent acquisition: ~12.1% reply rate</strong> — the highest of any recipient type. For students, DMing recruiters is higher-yield than DMing hiring managers</li>
          <li>• <strong className="font-display font-semibold text-rd-text">First-degree connections: ~16.9% reply rate</strong> — leverage existing network before going cold</li>
          <li>• <strong className="font-display font-semibold text-rd-text">LinkedIn DMs vs cold email: 10.3% vs 5.1%</strong> — LinkedIn outperforms email for reaching new people</li>
        </ul>
      </PrincipleCard>

      <PrincipleCard Icon={Eye} title="Open To Work — toggle, not the green badge">
        <ul className="text-[12px] text-rd-text-secondary leading-snug space-y-1.5 list-none">
          <li>• <strong className="font-display font-semibold text-rd-text">The private &quot;Open to Recruiters&quot; toggle is uncontroversial</strong> — only LinkedIn Recruiter customers see your status. Use it.</li>
          <li>• <strong className="font-display font-semibold text-rd-text">The public green #OpenToWork badge is contested.</strong> 70% of recruiters in a LinkedIn poll view it positively, but reporting in Fortune (Sept 2024) and trade press argues it can read as desperate or trigger lowball offers in competitive markets</li>
          <li>• <strong className="font-display font-semibold text-rd-text">Trade-off, not a rule.</strong> If you&apos;re applying broadly to many roles → the public badge surfaces you to more recruiters. If you&apos;re targeting a few specific competitive roles → consider the private toggle</li>
        </ul>
      </PrincipleCard>

    </div>
  );
}

function PrincipleCard({ Icon, title, children }) {
  return (
    <div className="bg-white border border-rd-border rounded-[18px] p-4 shadow-rd">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-rd-coral" />
        <h3 className="font-display font-bold text-[14px] text-rd-text">{title}</h3>
      </div>
      {children}
    </div>
  );
}
