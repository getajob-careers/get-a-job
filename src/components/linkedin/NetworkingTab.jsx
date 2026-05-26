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

  // Practicum's drawer links here with ?prefillCompany=...&prefillRole=...
  // — when those params exist, jump straight into the new-conversation
  // composer so the user lands at the goal picker with the target context
  // available. Strip the params after capturing so back-button or refresh
  // doesn't keep re-triggering the jump.
  const [prefill, setPrefill] = useState({ company: null, role: null });
  useEffect(() => {
    const company = searchParams.get("prefillCompany");
    const role = searchParams.get("prefillRole");
    if (!company && !role) return;
    setPrefill({ company: company || null, role: role || null });
    setOutreachView("new");
    const next = new URLSearchParams(searchParams);
    next.delete("prefillCompany");
    next.delete("prefillRole");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConversation = (id) => {
    setPrefill({ company: null, role: null });
    setOutreachView(id);
  };
  const newConversation = () => {
    setPrefill({ company: null, role: null });
    setOutreachView("new");
  };
  const backToList = () => {
    setPrefill({ company: null, role: null });
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

      <Section title="Comment Coach">
        <CommentCoach />
      </Section>

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
            prefillRole={prefill.role}
            onBack={backToList}
            onChange={onConvoChange}
          />
        )}
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
