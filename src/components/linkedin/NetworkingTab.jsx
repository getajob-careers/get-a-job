import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import CommentCoach from "./networking/CommentCoach";
import OutreachConversationsList from "./networking/OutreachConversationsList";
import OutreachComposer from "./networking/OutreachComposer";

// PR 3J-C — restyled on rd-* tokens. Restyle-only on behavior; the
// Practicum prefill capture + URL-strip + clearPrefill (P14), the
// outreachView state machine, and the refreshKey trigger pattern are
// preserved byte-for-byte.
//
// Mockup adds a tool-toggle pill row ("Outreach Coach" / "Comment
// Coach") between which view is shown. Eli ruled the toggle is
// DECORATIVE here — both tools stay rendered (stacked) so we don't
// change discoverability behavior. The pills are eyebrow labels above
// each section, not view-switching controls.

export default function NetworkingTab() {
  // Outreach section view state. null/list = show list; "new" = composer
  // with no conversation; UUID = composer loaded for that conversation.
  const [outreachView, setOutreachView] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // P14: Internship's drawer deep-links here with:
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
        className="block bg-rd-bg-soft hover:bg-rd-border border border-rd-border rounded-[14px] px-4 py-3 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-rd-text-secondary leading-snug">
            New to LinkedIn networking?{" "}
            <span className="font-display font-semibold text-rd-text">Read the strategy guide</span>{" "}
            — comment + reply windows, connection-request strategy, cold outreach reply rates.
          </p>
          <ArrowRight className="w-4 h-4 text-rd-text-secondary flex-shrink-0" />
        </div>
      </Link>

      {/* Decorative tool-pill row per mockup — labels each tool below
          but doesn't switch views (Eli's ruling: keep stacked, don't
          change discoverability behavior). */}
      <div className="flex gap-2 flex-wrap" aria-hidden="true">
        <span className="inline-flex items-center font-display font-semibold text-[13px] rounded-full px-3.5 py-1.5 bg-rd-coral text-white">
          Outreach Coach
        </span>
        <span className="inline-flex items-center font-display font-semibold text-[13px] rounded-full px-3.5 py-1.5 bg-rd-bg-soft text-rd-text-secondary">
          Comment Coach
        </span>
      </div>

      {/* Outreach Coach surfaced first — it's the action the Internship
          flow drives to. Comment Coach (still high-leverage per
          research) sits below as a discovery surface. */}
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
      <h2 className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
