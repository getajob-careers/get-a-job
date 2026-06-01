// types.ts — typed shapes for the Outreach Conversation Coach (PR #35).
//
// The conversation-coach feature is multi-turn: the user picks a goal,
// describes the target person, and the AI coaches each DM turn (opening
// message, follow-ups when there's silence, next-response suggestions
// based on the recipient's reply).
//
// One row per (user, goal, target_person) combination in the
// linkedin_outreach_conversations table. The thread + status update on
// each turn; the goal is editable mid-thread per design decision 1A.

// 9 outreach goals locked in the migration CHECK constraint. Adding a
// goal later requires DROP/ADD CONSTRAINT in a new migration.
//   propose_internship (PR13): student proposing themselves for an
//   unposted internship in a target function — deep-linked from
//   /Internship cards. Gated by profiles.practicum_path IS NOT NULL
//   for the "program-backed" credibility lever in the opener.
export type OutreachGoal =
  | 'message_recruiter'
  | 'message_hiring_manager'
  | 'message_alumni'
  | 'request_informational_interview'
  | 'thank_you_follow_up'
  | 'reconnect_dormant'
  | 'ask_for_referral'
  | 'ask_for_recommendation'
  | 'propose_internship'

// Grouped goal picker per design decision 6C. The frontend renders this
// grouping; the LLM doesn't see it.
//   internship (PR13): own group for the propose_internship goal —
//   first-class motion since the matcher feature exists to drive it.
export type GoalGroup = 'job_search' | 'network' | 'closing_the_loop' | 'internship'

export interface TargetPerson {
  // Required — the person's actual name (the AI uses it in the opener).
  name: string
  // Their role/title — "Senior Recruiter", "VP Engineering", "Founder"
  role?: string
  // Their company / org / institution (name string, free-text).
  company?: string
  // Optional companies.id reference. When present, the edge function
  // resolves target_company by id (cheapest, exact). When absent, falls
  // back to fuzzy name/ats_slug/domain match on target_person.company.
  // Populated by callers that already have the row (e.g. Internship
  // Pipeline cards passing target_company_id).
  company_id?: string
  // Free-text relationship description — "alumni from Reichman 2024",
  // "former colleague at Wix", "met at Tel Aviv hackathon", "cold —
  // found via LinkedIn search". This is what tells the AI the warmth
  // temperature for the message.
  relationship?: string
  // Anything specific that grounds the message — a shared event, a
  // mutual connection, a class they taught, a comment thread you both
  // engaged with. Critical for warm openers.
  mutual_context?: string
}

// One message in the thread. AI suggestions are NOT persisted as
// messages — they're transient between turns. The user marks the
// suggestion as sent (after editing if they want), which is what
// appends a 'user' role message.
export interface ThreadMessage {
  // 'user' = what the user actually sent (after editing the AI suggestion)
  // 'them' = the recipient's reply
  role: 'user' | 'them'
  text: string
  // ISO timestamp — frontend uses for the bubble timestamp display
  ts: string
}

// Edge function input — supports two modes:
//   1. New conversation: no conversation_id, requires goal + target_person.
//      The AI generates the opening message based on goal + target.
//   2. Continuing conversation: conversation_id provided, the AI loads
//      the row, reads goal + target + message_thread, and generates the
//      next AI suggestion based on thread state.
//
// In both modes, the response is a transient AI suggestion the user
// can edit / accept / regenerate.
export interface OutreachRequest {
  // Conversation row id when continuing an existing thread. Omit for
  // a new conversation.
  conversation_id?: string
  // Required for new conversations. Optional when continuing — if
  // provided AND different from the stored goal, the row is updated
  // (decision 1A: goal editable mid-thread).
  goal?: OutreachGoal
  // Required for new conversations. Optional when continuing — if
  // provided AND different, the row is updated.
  target_person?: TargetPerson
  // Used when the user adds a new 'them' message to the thread. The
  // edge function appends it before generating the next AI suggestion.
  // Empty string is valid and triggers follow-up coaching for silence
  // (design decision 2A).
  new_them_reply?: string
  // Used when the user wants to mark a previous AI suggestion as sent
  // (after possibly editing it). Appends a 'user' message to the thread.
  // Mutually exclusive with new_them_reply within a single request.
  mark_as_sent?: string
}

// AI suggestion for the next turn. Not persisted to message_thread
// until the user accepts it (mark_as_sent on the next request).
export interface OutreachSuggestion {
  // The suggested message text. For openers, 50-150 words. For
  // connection-request notes, ≤200 chars (the LinkedIn limit).
  // For follow-ups, 30-100 words.
  suggested_text: string
  // What the AI is doing on this turn — 'opener', 'follow_up_after_silence',
  // 'next_response', 'connection_request_note'. Drives UI hint.
  turn_type: 'opener' | 'follow_up_after_silence' | 'next_response' | 'connection_request_note'
  // 1-sentence label of the angle the AI took — "warm opener referencing
  // shared course", "soft follow-up acknowledging silence", "ask matched
  // to the established rapport". Surfaced in the UI so the user can
  // judge the suggestion vs alternatives.
  angle: string
  // CRITICAL for multi-step goals like ask_for_referral: when the AI
  // judges that asking now would be premature given thread state, this
  // field explains why and what to do first ("Don't ask for the referral
  // yet — your last message was the first contact. Build one more turn
  // of rapport first; this opener is just warming up the connection").
  // Empty string when no warm-up advice is needed.
  warm_up_advice: string
  // The AI's read of where the conversation is. Surfaced in the UI as
  // a status indicator. 'goal_complete' = good wrap-up point per
  // decision 4A — UI nudges user toward marking the conversation done.
  conversation_state:
    | 'cold_open'
    | 'warming_up'
    | 'rapport_built'
    | 'making_the_ask'
    | 'awaiting_reply'
    | 'goal_complete'
  // Caveats / coaching notes the user should consider — e.g. "Don't
  // send before Tuesday morning Israeli time", "Connection request
  // notes have a 200-char limit; this fits".
  warnings: string[]
  generated_at: string
}

// Edge function response. When continuing a conversation, the edge
// function returns both the suggestion AND the (possibly updated)
// conversation state for the frontend to update its local copy.
export interface OutreachResponse {
  conversation_id: string
  suggestion: OutreachSuggestion
  // The current persisted thread (after any new_them_reply or
  // mark_as_sent appends). The AI suggestion is NOT in here.
  message_thread: ThreadMessage[]
  goal: OutreachGoal
  target_person: TargetPerson
  status: 'active' | 'completed' | 'archived'
}
