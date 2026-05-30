import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import CommentCoach from "./networking/CommentCoach";
import OutreachConversationsList from "./networking/OutreachConversationsList";
import OutreachComposer from "./networking/OutreachComposer";

// NetworkingTab — Phase 4 (PRs A + B). Two AI tools:
//   - Comment Coach (AI tool, highest-leverage motion per research)
//   - Outreach Coach (PR B): conversation-coach for 8 outreach modes —
//     list of past conversations + new/resume composer with goal-aware
//     coaching, multi-turn threads, warm-up-vs-ask judgment.
//
// The networking strategy/principles content lives in Resources (linked
// at the top) — it's reference material, not something users want to
// scroll past on every visit to the tools.
export default function NetworkingTab() {
  // Outreach section view state. null/list = show list; "new" = composer
  // with no conversation; UUID = composer loaded for that conversation.
  const [outreachView, setOutreachView] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Internship's drawer deep-links here with:
  //   ?tab=networking&goal=propose_internship&prefillCompany=<co>
  //     &prefillFunction=<func>&prefillContact=<who_to_contact[0]>
  // PR13: goal in the URL is pre-picked → composer skips the picker
  // and lands at describe_target with company + contact role +
  // function-as-relationship seeded. Strip the params after capturing
  // so back/refresh doesn't keep re-triggering the jump.
  const [prefill, setPrefill] = useState({ company: null, function: null, contact: null, goal: null });
  useEffect(() => {
    const company = searchParams.get("prefillCompany");
    const fn = searchParams.get("prefillFunction");
    const contact = searchParams.get("prefillContact");
    const goalParam = searchParams.get("goal");
    if (!company && !fn && !contact && !goalParam) return;
    setPrefill({
      company: company || null,
      function: fn || null,
      contact: contact || null,
      goal: goalParam || null,
    });
    setOutreachView("new");
    const next = new URLSearchParams(searchParams);
    next.delete("prefillCompany");
    next.delete("prefillFunction");
    next.delete("prefillContact");
    next.delete("goal");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPrefill = () => setPrefill({ company: null, function: null, contact: null, goal: null });
  const openConversation = (id) => {
    clearPrefill();
    setOutreachView(id);
  };
  const newConversation = () => {
    clearPrefill();
    setOutreachView("new");
  };
  const backToList = () => {
    clearPrefill();
    setOutreachView(null);
    setRefreshKey((k) => k + 1);
  };
  const onConvoChange = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to={createPageUrl("Resources")}
        className="block bg-[#F4F4F2] hover:bg-[#E8E8E5] border border-[#DDDDDB] rounded-lg px-4 py-3 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#52545A] leading-snug">
            New to LinkedIn networking? <span className="font-medium text-[#0E1014]">Read the strategy guide</span> — comment + reply windows, connection-request strategy, cold outreach reply rates.
          </p>
          <ArrowRight className="w-4 h-4 text-[#52545A] flex-shrink-0" />
        </div>
      </Link>

      {/* PR13: Outreach Coach surfaced first — it's the action the
          internship flow drives to. Comment Coach (still high-leverage
          per research) sits below as a discovery surface. */}
      <Section title="Outreach Coach">
        {outreachView === null ? (
          <OutreachConversationsList
            onOpen={openConversation}
            onNew={newConversation}
            refreshKey={refreshKey}
          />
        ) : (
          <OutreachComposer
            conversationId={outreachView === "new" ? null : outreachView}
            prefillCompany={prefill.company}
            prefillFunction={prefill.function}
            prefillContact={prefill.contact}
            prefillGoal={prefill.goal}
            onBack={backToList}
            onChange={onConvoChange}
          />
        )}
      </Section>

      <Section title="Comment Coach">
        <CommentCoach />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-[#9C9DA1] font-medium mb-3">{title}</h2>
      {children}
    </section>
  );
}
