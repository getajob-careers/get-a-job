// GetAJob extension popup — two-pill shell (Agent | Tracker).
// Auth/session bridge is UNCHANGED: we find the www.getajob.careers tab,
// chrome.scripting reads the Supabase session out of its localStorage, and we
// setSession() on the anon-key client so it carries the user's identity.
// The Agent tab is wired to ai-chat + the CV pipeline (analyze-job-match →
// applications insert → refine-cv), mirroring the web app's contracts
// (src/components/chat/ChatInterface.jsx, src/lib/coachActionHandlers.js,
// src/lib/scoreApplication.js).

// ───────────────────────── contract constants (mirrored) ─────────────────────
const AGENT = "career_agent"; // ai-chat assembleSystemPrompt appends card rules only for "career_agent"
const VALID_STATUSES = [
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
];
const validStatus = (s) => (VALID_STATUSES.includes(s) ? s : null);
const stripHtml = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n)));

// ───────────────────────── client + state ───────────────────────────────────
const supabase = window.supabaseLib.createClient(
  window.SUPA.url,
  window.SUPA.anon,
);

let loggedIn = false;
let currentUserId = null;
let currentApplicationId = null; // set after add-to-tracker / CV pipeline; forwarded to ai-chat
let busy = false; // true while ANY backend call (ai-chat or CV pipeline) is running
let loadingText = ""; // staged loading text shown in the typing bubble
// messages: text turns { role, content, suggestedApplicationActions?, suggestedCVGeneration? }
//           or a CV result card { type:"cv_result", role:"system", cv:{...} }
const messages = [];

// DB-backed conversation history (conversations + chat_messages, same tables +
// client-insert pattern as the web app's career_agent surface — see
// src/lib/CoachConversationContext.jsx). currentConversationId is the active
// thread; null until the first persisted turn lazily creates the row.
// conversationCreatePromise dedups concurrent lazy-creates (the CV pipeline can
// append several messages before the row exists).
let currentConversationId = null;
let conversationCreatePromise = null;

const $ = (id) => document.getElementById(id);
const sessionLine = $("sessionLine");

// Pull the real error text out of a supabase FunctionsHttpError (the .message is
// generic; the function's JSON body — e.g. "Master CV unavailable." — is on the
// Response in error.context).
async function edgeErrorMessage(error) {
  try {
    if (error?.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      if (body?.error) return body.error;
    }
  } catch {
    /* fall through */
  }
  return error?.message || "request failed";
}

// A 401 means the bridged session expired. Edge functions surface it on
// error.context.status; PostgREST (the .from().update() calls) surfaces it as a
// JWT error (code PGRST301 / "JWT expired").
function isAuthExpired(error) {
  if (error?.context?.status === 401 || error?.status === 401) return true;
  const code = error?.code || "";
  const msg = (error?.message || "").toLowerCase();
  return (
    code === "PGRST301" || (msg.includes("jwt") && msg.includes("expired"))
  );
}

// ── Signed-out / expired gate ────────────────────────────────────────────────
function showGate(title, bodyHtml) {
  $("gateTitle").textContent = title;
  $("gateBody").innerHTML = bodyHtml; // static, controlled strings only
  $("gate").classList.remove("hidden");
  $("pills").classList.add("hidden");
  $("sessionLine").classList.add("hidden");
  $("agentView").classList.add("hidden");
  $("trackerView").classList.add("hidden");
}
function showSignedOut() {
  showGate(
    "Not signed in",
    "Open and log into <strong>www.getajob.careers</strong> in this browser, then reopen this extension.",
  );
}
// Called when a function returns 401 mid-session.
function handleAuthExpired() {
  loggedIn = false;
  currentUserId = null;
  busy = false;
  loadingText = "";
  showGate(
    "Your session expired",
    "Reopen <strong>www.getajob.careers</strong> and log in again, then reopen this extension.",
  );
}

// ───────────────────────── session bridge (DO NOT TOUCH AUTH) ────────────────
function readSession() {
  const TOKEN_KEY_RE = /^sb-.*-auth-token(\.\d+)?$/;
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++)
    allKeys.push(localStorage.key(i));
  const sbKeys = allKeys.filter((k) => k && k.indexOf("sb-") === 0);

  const cookieNames = [];
  for (const part of (document.cookie || "").split(";")) {
    const name = part.split("=")[0].trim();
    if (name) cookieNames.push(name);
  }
  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i++)
    sessionKeys.push(sessionStorage.key(i));

  const debug = {
    location_href: location.href,
    all_localstorage_keys: allKeys,
    all_sessionstorage_keys: sessionKeys,
    all_cookie_names: cookieNames,
    sb_localstorage_keys: sbKeys,
  };

  const tokenKeys = allKeys.filter((k) => k && TOKEN_KEY_RE.test(k));
  const chunkIndex = (k) => {
    const m = k.match(/\.(\d+)$/);
    return m ? Number(m[1]) : -1;
  };
  tokenKeys.sort((a, b) => chunkIndex(a) - chunkIndex(b));
  let raw = tokenKeys.map((k) => localStorage.getItem(k) || "").join("");
  if (!raw) return { debug };

  if (raw.indexOf("base64-") === 0) {
    try {
      raw = atob(raw.slice("base64-".length));
    } catch {
      return { debug };
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { debug };
  }
  const session = (parsed && parsed.currentSession) || parsed;
  const access_token = session && session.access_token;
  const refresh_token = session && session.refresh_token;
  if (!access_token || !refresh_token) return { debug };
  return { access_token, refresh_token };
}

function findTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      const all = tabs || [];
      const matches = all.filter((t) =>
        (t.url || "").includes("getajob.careers"),
      );
      const getajobUrls = all
        .filter((t) => (t.url || "").includes("getajob"))
        .map((t) => t.url);
      resolve({ tab: matches[0] || null, totalTabs: all.length, getajobUrls });
    });
  });
}
function pullSession(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      { target: { tabId }, func: readSession },
      (results) =>
        resolve((results && results[0] && results[0].result) || null),
    );
  });
}

async function initSession() {
  const { tab, totalTabs, getajobUrls } = await findTab();
  if (!tab) {
    console.log(
      "[session] no getajob.careers tab — total tabs:",
      totalTabs,
      "getajob:",
      getajobUrls,
    );
    showSignedOut();
    return;
  }
  const result = await pullSession(tab.id);
  if (result && result.access_token && result.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (error || !data?.user?.id) {
      // Token present but rejected → treat as expired.
      console.log("[session] setSession rejected:", error?.message);
      handleAuthExpired();
      return;
    }
    loggedIn = true;
    currentUserId = data.user.id;
    sessionLine.textContent = "Signed in";
    $("gate").classList.add("hidden");
    refreshComposer();
    // Restore the most recent thread + populate the history picker.
    await loadMostRecentConversation();
    await refreshConversationList();
  } else {
    // A tab is open but no usable session was read from it.
    showSignedOut();
  }
}

// ───────────────────────── tab shell ────────────────────────────────────────
function switchView(view) {
  $("pillAgent").classList.toggle("active", view === "agent");
  $("pillTracker").classList.toggle("active", view === "tracker");
  $("agentView").classList.toggle("hidden", view !== "agent");
  $("trackerView").classList.toggle("hidden", view !== "tracker");
  if (view === "tracker") refreshTracker();
}
$("pillAgent").addEventListener("click", () => switchView("agent"));
$("pillTracker").addEventListener("click", () => switchView("tracker"));

// ───────────────────────── loading / composer state ─────────────────────────
// One lock for every backend call: disables the composer (textarea + both
// buttons) and shows a typing bubble. setBusy(true, text) before a call,
// setBusy(false) when it resolves or errors.
function setBusy(on, text) {
  busy = on;
  loadingText = on ? text || "Working…" : "";
  renderMessages();
  refreshComposer();
}
function refreshComposer() {
  const input = $("input");
  const empty = !input.value.trim();
  input.disabled = busy;
  $("send").disabled = busy || !loggedIn;
  $("generateCv").disabled = busy || empty || !loggedIn;
  $("addTracker").disabled = busy || empty || !loggedIn;
}

// ───────────────────────── Agent: render ────────────────────────────────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderMessages() {
  const box = $("messages");
  box.innerHTML = "";
  // Clean empty transcript — a friendly prompt instead of a blank panel.
  if (messages.length === 0 && !busy) {
    const empty = el("div", "agent-empty");
    empty.appendChild(el("div", "empty-title", "Start with a job description"));
    empty.appendChild(
      el(
        "div",
        null,
        "Paste a JD above, then Generate CV for a tailored CV + fit read, or Add to tracker. You can also just chat with your coach.",
      ),
    );
    box.appendChild(empty);
    return;
  }
  messages.forEach((m) => {
    if (m.type === "cv_result") {
      box.appendChild(cvResultCard(m.cv));
      return;
    }
    // Errors render as a coral-tinted bubble so they never pass silently.
    box.appendChild(
      el("div", m.error ? "msg error" : "msg " + m.role, m.content),
    );
    if (Array.isArray(m.suggestedApplicationActions)) {
      m.suggestedApplicationActions.forEach((a) =>
        box.appendChild(applicationCard(a)),
      );
    }
    if (m.suggestedCVGeneration) {
      box.appendChild(cvProposalCard(m.suggestedCVGeneration));
    }
  });
  if (busy) box.appendChild(el("div", "msg typing", loadingText || "…"));
  box.scrollTop = box.scrollHeight;
}

// Append a transient inline error next to a control (status / checklist), so a
// failed write is visible without a bubble. Auto-clears.
function flashInlineError(parent, text) {
  if (!parent) return;
  const prev = parent.querySelector(".inline-err");
  if (prev) prev.remove();
  const e = el("span", "inline-err", text);
  parent.appendChild(e);
  setTimeout(() => e.remove(), 3500);
}

// Add/update-application card (coachActionHandlers parity).
function applicationCard(a) {
  const card = el("div", "card");
  if (a.action === "add_application") {
    card.appendChild(el("h4", null, "Add to tracker"));
    card.appendChild(
      el(
        "div",
        "meta",
        `${a.company || "?"} — ${a.role_title || "?"} (${a.status || "interested"})`,
      ),
    );
  } else if (a.action === "update_application") {
    card.appendChild(el("h4", null, "Update application"));
    card.appendChild(
      el(
        "div",
        "meta",
        `${a.match_company || "?"} — ${a.match_role_title || "?"}` +
          (a.new_status ? ` → ${a.new_status}` : ""),
      ),
    );
  } else {
    card.appendChild(el("h4", null, a.action || "Application action"));
  }

  const btn = el("button", null, "Apply");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Applying…";
    const res = await applyApplicationAction(a);
    if (res.ok) {
      btn.textContent =
        a.action === "add_application" ? "Added ✓" : "Updated ✓";
      card.appendChild(
        el(
          "div",
          "note",
          a.action === "add_application"
            ? "Saved to tracker. Linked for follow-up turns."
            : "Updated.",
        ),
      );
    } else {
      btn.disabled = false;
      btn.textContent = "Apply";
      card.appendChild(el("div", "note", "Error: " + res.error));
    }
  });
  card.appendChild(btn);
  return card;
}

// The agent's mid-conversation CV proposal card. Its Generate button runs the
// SAME refine handler the pipeline uses (steps 2c–2d), with the card's own
// application_id + job_description.
function cvProposalCard(proposal) {
  const card = el("div", "card");
  card.appendChild(el("h4", null, "Generate tailored CV"));
  card.appendChild(el("div", "meta", "Role: " + (proposal.target_role || "?")));
  const btn = el("button", null, "Generate");
  const note = el("div", "note");
  btn.addEventListener("click", async () => {
    if (busy) return;
    const appId = proposal.application_id || currentApplicationId;
    if (!appId) {
      note.textContent =
        "No application linked yet — add it to the tracker first.";
      return;
    }
    setBusy(true, "Tailoring your CV…");
    const res = await runRefineAndRenderCV({
      applicationId: appId,
      jobDescription: proposal.job_description || "",
      roleLabel: proposal.target_role || "Role",
      companyLabel: proposal.company || "",
    });
    setBusy(false);
    if (!res.ok) {
      if (res.authExpired) {
        handleAuthExpired();
        return;
      }
      await appendMessage({
        role: "assistant",
        error: true,
        content: "CV generation error: " + res.error,
      });
    }
  });
  card.appendChild(btn);
  card.appendChild(note);
  return card;
}

// The CV RESULT card (rendered first, before any fit discussion).
function cvResultCard(cv) {
  const card = el("div", "card cv");
  card.appendChild(el("h4", null, "Tailored CV ready"));
  const where = cv.company ? `${cv.role} · ${cv.company}` : cv.role;
  card.appendChild(el("div", "meta", where));
  if (cv.cv_url) {
    const link = el("a", "cvlink", "Open CV");
    link.href = cv.cv_url;
    link.target = "_blank";
    link.rel = "noopener";
    card.appendChild(link);
  }
  if (cv.message) card.appendChild(el("div", "note", cv.message));
  return card;
}

// ───────────────────────── shared refine handler (steps 2c–2d) ──────────────
// Calls refine-cv (ops_variant v3, grounding default). Returns { ok, cv_url } |
// { error }. Caller owns busy/loading. renderCard defaults true (Agent-tab path:
// append the CV result card to the transcript); the Tracker detail passes false
// so the result stays in the detail rather than landing in a different tab.
async function runRefineAndRenderCV({
  applicationId,
  jobDescription,
  roleLabel,
  companyLabel,
  renderCard = true,
}) {
  const { data, error } = await supabase.functions.invoke("refine-cv", {
    body: {
      application_id: applicationId,
      job_description: jobDescription,
      ops_variant: "v3",
      grounding: "default",
    },
  });
  if (error)
    return {
      error: await edgeErrorMessage(error),
      authExpired: isAuthExpired(error),
    };
  if (data?.error) return { error: data.error };
  if (!data?.cv_url)
    return { error: data?.message || "refine-cv returned no cv_url" };
  if (renderCard) {
    await appendMessage({
      type: "cv_result",
      role: "system", // excluded from conversation_history (role !== "system")
      cv: {
        role: roleLabel,
        company: companyLabel,
        cv_url: data.cv_url,
        message: data.message || null,
      },
    });
  }
  return { ok: true, cv_url: data.cv_url };
}

// ───────────────────────── conversation history helper ──────────────────────
function conversationHistory() {
  return messages
    .map((m) => ({ role: m.role, content: m.content }))
    .filter((m) => m.role !== "system") // drops cv_result cards
    .slice(-20);
}

// ───────────────────────── conversation persistence ─────────────────────────
// Mirrors the web app's career_agent client-insert pattern exactly: the client
// owns BOTH the conversations row and every chat_messages row; ai-chat persists
// nothing. RLS (conversations.user_id = auth.uid(); chat_messages via the parent
// conversation owner) lets the bridged session read/write only its own rows.

// Lazily create the conversation row on the first persisted turn. A single
// in-flight promise prevents two near-simultaneous appends (e.g. the CV card and
// the fit read) from racing into two rows.
async function ensureConversation(titleHint) {
  if (currentConversationId) return currentConversationId;
  if (conversationCreatePromise) return conversationCreatePromise;
  conversationCreatePromise = (async () => {
    const title = String(titleHint || "New chat").slice(0, 60);
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: currentUserId, agent: AGENT, title })
      .select("id")
      .single();
    if (error || !data?.id) {
      console.error("create conversation failed:", error?.message);
      conversationCreatePromise = null;
      return null;
    }
    currentConversationId = data.id;
    refreshConversationList();
    return data.id;
  })();
  return conversationCreatePromise;
}

// In-memory message → chat_messages row. The CV result card has no column home,
// so it rides in suggested_cv_generation.result — the SAME column + shape the
// web app rehydrates CV cards from (ChatInterface.jsx) — no parallel store.
function messageToRow(m, conversationId) {
  if (m.type === "cv_result") {
    return {
      conversation_id: conversationId,
      role: "system",
      content: "", // content is NOT NULL; the card carries no body text
      suggested_cv_generation: {
        result: {
          cv_url: m.cv.cv_url,
          role: m.cv.role,
          company: m.cv.company,
          message: m.cv.message || null,
        },
      },
    };
  }
  return {
    conversation_id: conversationId,
    role: m.role,
    content: m.content || "",
    suggested_application_actions:
      Array.isArray(m.suggestedApplicationActions) &&
      m.suggestedApplicationActions.length > 0
        ? m.suggestedApplicationActions
        : null,
    suggested_cv_generation: m.suggestedCVGeneration || null,
  };
}

// chat_messages row → in-memory message (inverse of messageToRow).
function rowToMessage(m) {
  const g = m.suggested_cv_generation;
  if (g && g.result && g.result.cv_url) {
    return {
      type: "cv_result",
      role: "system",
      cv: {
        role: g.result.role,
        company: g.result.company,
        cv_url: g.result.cv_url,
        message: g.result.message || null,
      },
    };
  }
  return {
    role: m.role,
    content: m.content || "",
    suggestedApplicationActions:
      Array.isArray(m.suggested_application_actions) &&
      m.suggested_application_actions.length > 0
        ? m.suggested_application_actions
        : null,
    suggestedCVGeneration: m.suggested_cv_generation || null,
    error: m.is_error || false,
  };
}

// THE single append+persist path. Every transcript mutation routes through here:
// push → render → durably persist (awaited, never fire-and-forget, so closing the
// panel can't drop a committed turn). Error turns render but are NOT persisted —
// matching the web career_agent surface: the triggering user message is already
// durable, so a failed turn never pollutes reopened history.
async function appendMessage(m) {
  messages.push(m);
  renderMessages();
  if (m.error) return;
  if (!loggedIn || !currentUserId) return; // no session → in-memory only
  try {
    const convoId = await ensureConversation(
      m.role === "user" ? m.content : null,
    );
    if (!convoId) return;
    const { error } = await supabase
      .from("chat_messages")
      .insert(messageToRow(m, convoId));
    if (error) {
      console.error("persist message failed:", error.message);
      return;
    }
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convoId);
  } catch (e) {
    console.error("persist message error:", e);
  }
}

// Restore a conversation's transcript into the panel.
async function openConversation(id) {
  if (busy || !id) return;
  currentConversationId = id;
  conversationCreatePromise = null;
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("load messages failed:", error.message);
    if (isAuthExpired(error)) handleAuthExpired();
    return;
  }
  messages.length = 0;
  (data || []).forEach((row) => messages.push(rowToMessage(row)));
  renderMessages();
}

// On open: resume the most recent thread (or start fresh if there is none).
async function loadMostRecentConversation() {
  if (!currentUserId) return;
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", currentUserId)
    .eq("agent", AGENT)
    .is("application_id", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("load recent conversation failed:", error.message);
    return;
  }
  if (data && data.length > 0) await openConversation(data[0].id);
}

// Populate the reopen-past-chats dropdown.
async function refreshConversationList() {
  const sel = $("convSelect");
  if (!sel || !currentUserId) return;
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", currentUserId)
    .eq("agent", AGENT)
    .is("application_id", null)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("load conversation list failed:", error.message);
    return;
  }
  const convos = data || [];
  sel.innerHTML = "";
  if (convos.length === 0) {
    const opt = el("option", null, "No saved chats");
    opt.value = "";
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  // Placeholder doubles as "new chat": selected whenever no saved thread is
  // active, so a fresh panel never mislabels itself with a past conversation.
  const placeholder = el("option", null, "New chat");
  placeholder.value = "";
  if (!currentConversationId) placeholder.selected = true;
  sel.appendChild(placeholder);
  convos.forEach((c) => {
    const when = c.updated_at
      ? new Date(c.updated_at).toLocaleDateString()
      : "";
    const opt = el(
      "option",
      null,
      (c.title || "Untitled") + (when ? ` · ${when}` : ""),
    );
    opt.value = c.id;
    if (c.id === currentConversationId) opt.selected = true;
    sel.appendChild(opt);
  });
}

// "New chat": clear the active thread; the next persisted turn creates a fresh
// row lazily. Unlinks any in-session application so the new thread starts clean.
function startNewConversation() {
  if (busy) return;
  currentConversationId = null;
  conversationCreatePromise = null;
  currentApplicationId = null;
  messages.length = 0;
  renderMessages();
  const sel = $("convSelect");
  if (sel) sel.value = "";
  refreshConversationList();
}

// ───────────────────────── Agent: send (ai-chat) ────────────────────────────
async function sendMessage() {
  if (busy) return;
  const input = $("input");
  const text = input.value.trim();
  if (!text) return;
  if (!loggedIn) {
    sessionLine.textContent =
      "Not logged in: open www.getajob.careers, sign in, then reopen this";
    return;
  }

  input.value = "";
  await appendMessage({ role: "user", content: text });
  setBusy(true, "Thinking…");

  const body = {
    message: text,
    agent: AGENT,
    conversation_history: conversationHistory(),
    ...(currentApplicationId && { application_id: currentApplicationId }),
  };

  try {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body,
    });
    if (error) throw error;
    if (!data?.reply) throw new Error("The AI returned an empty response.");
    await appendMessage({
      role: "assistant",
      content: data.reply,
      suggestedApplicationActions:
        data.suggested_application_actions?.length > 0
          ? data.suggested_application_actions
          : null,
      suggestedCVGeneration: data.suggested_cv_generation || null,
    });
  } catch (err) {
    console.error("ai-chat error:", err);
    if (isAuthExpired(err)) {
      handleAuthExpired();
      return;
    }
    await appendMessage({
      role: "assistant",
      error: true,
      content: "Couldn't reach the AI: " + (await edgeErrorMessage(err)),
    });
  } finally {
    setBusy(false);
  }
}

// ───────────────────────── CV pipeline (step 2) ─────────────────────────────
async function generateCvFromJD(jd) {
  if (busy) return;
  if (!loggedIn) {
    sessionLine.textContent =
      "Not logged in: open www.getajob.careers, sign in, then reopen this";
    return;
  }
  if (!currentUserId) {
    await appendMessage({
      role: "assistant",
      content: "No user id on the session.",
    });
    return;
  }

  await appendMessage({
    role: "user",
    content:
      "Generate a tailored CV for this role and give me a quick read on my fit.",
  });
  setBusy(true, "Reading the role…");

  try {
    // 1. Reading the role — fast extract-jd-basics (company + role_title only),
    //    so the REAL role_title is on the row before refine-cv (which derives
    //    the CV target from app.role_title) runs.
    const { data: basics, error: basicsErr } = await supabase.functions.invoke(
      "extract-jd-basics",
      { body: { job_description: jd } },
    );
    if (basicsErr) throw basicsErr;
    const company = basics?.company || null;
    const roleTitle = basics?.role_title || null;

    // 2. Insert the application immediately (no scores yet).
    setBusy(true, "Creating the application…");
    const row = {
      user_id: currentUserId,
      company: company || "Unknown company",
      role_title: roleTitle || "Role",
      job_description: jd,
      status: "interested",
      source: "chat_agent",
    };
    const { data: inserted, error: insErr } = await supabase
      .from("applications")
      .insert(row)
      .select("id")
      .single();
    if (insErr) throw insErr;
    currentApplicationId = inserted.id;
    const appId = currentApplicationId;

    // 3. Fire refine-cv and analyze-job-match in PARALLEL — do NOT await
    //    analyze-job-match before starting refine-cv.

    // 3b. Background scoring + fit: when analyze-job-match returns, UPDATE only
    //     the three score columns (never company/role_title, so the CV target
    //     and tracker row stay consistent with what refine-cv used) and render
    //     the fit block. Does NOT hold the composer lock. Self-contained
    //     try/catch so it never rejects unhandled, before OR after the CV.
    const scoringPromise = (async () => {
      try {
        const { data: ajm, error: ajmErr } = await supabase.functions.invoke(
          "analyze-job-match",
          { body: { job_description: jd } },
        );
        if (ajmErr) throw ajmErr;
        // Column mapping mirrored from scoreApplication.js (LLM path, 226-248):
        //   qualification_score = clamp01(match_score / 100)
        //   goal_alignment_score = null if missing else clamp01(.../100)
        //   required_seniority   = required_seniority || null
        const qualification_score =
          ajm?.match_score == null
            ? null
            : clamp01(Number(ajm.match_score) / 100);
        const goal_alignment_score =
          ajm?.goal_alignment_score == null
            ? null
            : clamp01(Number(ajm.goal_alignment_score) / 100);
        const required_seniority = ajm?.required_seniority || null;
        const { error: updErr } = await supabase
          .from("applications")
          .update({
            qualification_score,
            goal_alignment_score,
            required_seniority,
          })
          .eq("id", appId);
        if (updErr) throw updErr;

        const matched = Array.isArray(ajm?.matched_requirements)
          ? ajm.matched_requirements
          : [];
        const missing = Array.isArray(ajm?.missing_requirements)
          ? ajm.missing_requirements
          : [];
        const strengths = matched
          .slice(0, 3)
          .map((mm) => "• " + (mm?.requirement || ""))
          .filter((s) => s.trim() !== "•")
          .join("\n");
        const topGap = missing[0]?.requirement || null;
        let fit = "Fit: " + (ajm?.verdict || "Analysis complete.");
        if (strengths) fit += "\n\nTop strengths:\n" + strengths;
        if (topGap) fit += "\n\nBiggest gap: " + topGap;
        await appendMessage({ role: "assistant", content: fit });
      } catch (e) {
        console.error("scoring/fit failed:", e);
        await appendMessage({
          role: "assistant",
          error: true,
          content: "Fit read failed: " + (await edgeErrorMessage(e)),
        });
      }
    })();

    // 3a. refine-cv — gates the composer. Renders the CV card first on resolve.
    setBusy(true, "Tailoring your CV…");
    const refineRes = await runRefineAndRenderCV({
      applicationId: appId,
      jobDescription: jd,
      roleLabel: roleTitle || "Role",
      companyLabel: company || "Unknown company",
    });
    if (!refineRes.ok) {
      if (refineRes.authExpired) {
        handleAuthExpired();
        return;
      }
      throw new Error(refineRes.error);
    }
    // Do not await scoringPromise — the fit block fills in whenever it returns.
    void scoringPromise;
  } catch (err) {
    console.error("CV pipeline error:", err);
    if (isAuthExpired(err)) {
      handleAuthExpired();
      return;
    }
    await appendMessage({
      role: "assistant",
      error: true,
      content: "CV generation failed: " + (await edgeErrorMessage(err)),
    });
  } finally {
    setBusy(false);
  }
}

// ───────────────────────── Add to tracker (front of the pipeline, no CV) ─────
// Same front as the CV pipeline (extract-jd-basics → insert → background
// analyze-job-match score update) but STOPS before refine-cv. The row appears
// in the Tracker tab (refreshTracker re-queries on pill select).
async function addToTracker(jd) {
  if (busy) return;
  if (!loggedIn) {
    sessionLine.textContent =
      "Not logged in: open www.getajob.careers, sign in, then reopen this";
    return;
  }
  if (!currentUserId) {
    await appendMessage({
      role: "assistant",
      content: "No user id on the session.",
    });
    return;
  }

  await appendMessage({
    role: "user",
    content: "Add this role to my tracker.",
  });
  setBusy(true, "Reading the role…");

  try {
    // 1. extract-jd-basics — company + role_title
    const { data: basics, error: basicsErr } = await supabase.functions.invoke(
      "extract-jd-basics",
      { body: { job_description: jd } },
    );
    if (basicsErr) throw basicsErr;
    const company = basics?.company || null;
    const roleTitle = basics?.role_title || null;

    // 2. Insert the application immediately (no scores yet). NO refine-cv.
    setBusy(true, "Adding to tracker…");
    const row = {
      user_id: currentUserId,
      company: company || "Unknown company",
      role_title: roleTitle || "Role",
      job_description: jd,
      status: "interested",
      source: "chat_agent",
    };
    const { data: inserted, error: insErr } = await supabase
      .from("applications")
      .insert(row)
      .select("id")
      .single();
    if (insErr) throw insErr;
    currentApplicationId = inserted.id;
    const appId = currentApplicationId;

    // Inline confirmation.
    await appendMessage({
      role: "assistant",
      content: `Added ${roleTitle || "Role"} at ${company || "Unknown company"} to your tracker.`,
    });

    // 3. Background scoring — same mapping the CV pipeline uses, three columns
    //    only. Self-contained; does not hold the composer.
    void (async () => {
      try {
        const { data: ajm, error: ajmErr } = await supabase.functions.invoke(
          "analyze-job-match",
          { body: { job_description: jd } },
        );
        if (ajmErr) throw ajmErr;
        const qualification_score =
          ajm?.match_score == null
            ? null
            : clamp01(Number(ajm.match_score) / 100);
        const goal_alignment_score =
          ajm?.goal_alignment_score == null
            ? null
            : clamp01(Number(ajm.goal_alignment_score) / 100);
        const required_seniority = ajm?.required_seniority || null;
        await supabase
          .from("applications")
          .update({
            qualification_score,
            goal_alignment_score,
            required_seniority,
          })
          .eq("id", appId);
      } catch (e) {
        console.error("tracker scoring failed:", e);
      }
    })();
  } catch (err) {
    console.error("Add to tracker error:", err);
    if (isAuthExpired(err)) {
      handleAuthExpired();
      return;
    }
    await appendMessage({
      role: "assistant",
      error: true,
      content: "Couldn't add to tracker: " + (await edgeErrorMessage(err)),
    });
  } finally {
    setBusy(false);
  }
}

// ───────────────────────── composer wiring ──────────────────────────────────
$("send").addEventListener("click", sendMessage);
$("generateCv").addEventListener("click", () => {
  const jd = $("input").value.trim();
  if (!jd) return;
  $("input").value = "";
  refreshComposer();
  generateCvFromJD(jd);
});
$("addTracker").addEventListener("click", () => {
  const jd = $("input").value.trim();
  if (!jd) return;
  $("input").value = "";
  refreshComposer();
  addToTracker(jd);
});
$("input").addEventListener("input", refreshComposer);
$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Conversation history controls. The empty option doubles as "new chat".
$("newConvo").addEventListener("click", startNewConversation);
$("convSelect").addEventListener("change", (e) => {
  if (e.target.value) openConversation(e.target.value);
  else startNewConversation();
});

// ───────────────────────── add/update application (card handler) ─────────────
async function applyApplicationAction(a) {
  if (!currentUserId) return { error: "no user id" };
  try {
    if (a.action === "add_application") {
      const status = validStatus(a.status) || "interested";
      const row = {
        user_id: currentUserId,
        company: a.company,
        role_title: a.role_title,
        status,
        source: "chat_agent",
        ...(a.url && { url: a.url }),
        ...(a.location && { location: a.location }),
        ...(a.notes && { notes: a.notes }),
        ...(a.job_description && {
          job_description: stripHtml(a.job_description) || a.job_description,
        }),
        ...(status === "applied" && { applied_date: new Date().toISOString() }),
      };
      const { data: inserted, error } = await supabase
        .from("applications")
        .insert(row)
        .select("id")
        .single();
      if (error) return { error: error.message };
      if (inserted?.id) currentApplicationId = inserted.id;
      return { ok: true };
    }
    if (a.action === "update_application") {
      const patch = {};
      const newStatus = validStatus(a.new_status);
      if (newStatus) patch.status = newStatus;
      if (a.new_notes && typeof a.new_notes === "string")
        patch.notes = a.new_notes;
      if (Object.keys(patch).length === 0)
        return { error: "nothing to update" };
      const { data: matches, error: lookupErr } = await supabase
        .from("applications")
        .select("id, applied_date")
        .eq("user_id", currentUserId)
        .ilike("company", a.match_company)
        .ilike("role_title", a.match_role_title);
      if (lookupErr) return { error: lookupErr.message };
      if (!matches || matches.length === 0) return { error: "not found" };
      if (matches.length > 1) return { error: "ambiguous match" };
      if (newStatus === "applied" && !matches[0].applied_date)
        patch.applied_date = new Date().toISOString();
      const { error } = await supabase
        .from("applications")
        .update(patch)
        .eq("id", matches[0].id);
      if (error) return { error: error.message };
      currentApplicationId = matches[0].id;
      return { ok: true };
    }
    return { error: "unsupported action" };
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

// ───────────────────────── Tracker ──────────────────────────────────────────
async function refreshTracker() {
  const list = $("trackerList");
  if (!loggedIn) {
    list.innerHTML = "";
    list.appendChild(el("div", "empty", "Not logged in."));
    return;
  }
  list.innerHTML = "";
  list.appendChild(el("div", "empty", "Loading…"));
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, company, role_title, status, created_at, qualification_score, goal_alignment_score, required_seniority, job_description, cv_url, checklist",
    )
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });
  list.innerHTML = "";
  if (error) {
    if (isAuthExpired(error)) {
      handleAuthExpired();
      return;
    }
    const errEl = el("div", "empty");
    errEl.appendChild(el("div", "empty-title", "Couldn't load your tracker"));
    errEl.appendChild(el("div", null, error.message));
    list.appendChild(errEl);
    return;
  }
  if (!data || data.length === 0) {
    const empty = el("div", "empty");
    empty.appendChild(el("div", "empty-title", "No applications yet"));
    empty.appendChild(
      el("div", null, "Generate a CV for a role and it'll show up here."),
    );
    list.appendChild(empty);
    return;
  }
  data.forEach((r) => {
    const rowEl = el("div", "trk-row");
    // Rokkitt role title, company subtext.
    rowEl.appendChild(el("div", "trk-role", r.role_title || "Role"));
    rowEl.appendChild(el("div", "trk-company", r.company || "(no company)"));

    // Footer: status control, optional match %, date.
    const foot = el("div", "trk-foot");
    foot.appendChild(statusSelect(r));
    // Match % renders only when the row carries qualification_score (0-1).
    if (typeof r.qualification_score === "number") {
      foot.appendChild(
        el(
          "span",
          "match-chip",
          Math.round(r.qualification_score * 100) + "% match",
        ),
      );
    }
    const when = r.created_at
      ? new Date(r.created_at).toLocaleDateString()
      : "";
    if (when) foot.appendChild(el("span", "trk-date", when));
    rowEl.appendChild(foot);

    // Card opens the detail view. The status <select> stops propagation so
    // changing status doesn't also navigate.
    rowEl.addEventListener("click", () => renderApplicationDetail(r));
    list.appendChild(rowEl);
  });
}

// Per-card status control. Optimistic: the <select> reflects the new value
// instantly; on a failed update we roll back to the previous value. Writes ONLY
// applications.status — never status_changes (a Postgres trigger owns that audit
// and RLS denies client writes to it).
function statusSelect(r) {
  const sel = document.createElement("select");
  sel.className = "status-select";
  // Don't let interacting with the dropdown bubble up to a clickable card.
  sel.addEventListener("click", (e) => e.stopPropagation());
  for (const s of VALID_STATUSES) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    if (s === r.status) opt.selected = true;
    sel.appendChild(opt);
  }
  let prev = r.status;
  sel.addEventListener("change", async () => {
    const next = sel.value; // optimistic — the select already shows `next`
    sel.disabled = true;
    const { error } = await supabase
      .from("applications")
      .update({ status: next })
      .eq("id", r.id);
    sel.disabled = false;
    if (error) {
      sel.value = prev; // rollback
      console.error("status update failed:", error.message);
      if (isAuthExpired(error)) handleAuthExpired();
      else flashInlineError(sel.parentElement, "Couldn't update status");
    } else {
      prev = next;
      r.status = next; // keep the row object in sync across re-renders
    }
  });
  return sel;
}

// ───────────────────────── Tracker detail view ──────────────────────────────
// Replaces the list with a single application's detail. Back returns to the
// list (a fresh refreshTracker re-query). `r` is the row object; it's mutated
// in place (r.cv_url) after a generation so a re-render reflects the new CV.
function renderApplicationDetail(r, notice) {
  const list = $("trackerList");
  list.innerHTML = "";

  const back = el("button", "detail-back", "← Back");
  back.addEventListener("click", () => refreshTracker());
  list.appendChild(back);

  const detail = el("div", "detail");

  // Header: role (Rokkitt), company, status control, match/goal chips.
  detail.appendChild(el("div", "detail-role", r.role_title || "Role"));
  detail.appendChild(el("div", "detail-company", r.company || "(no company)"));

  const chips = el("div", "detail-chips");
  chips.appendChild(statusSelect(r));
  if (typeof r.qualification_score === "number")
    chips.appendChild(
      el(
        "span",
        "match-chip",
        Math.round(r.qualification_score * 100) + "% match",
      ),
    );
  if (typeof r.goal_alignment_score === "number")
    chips.appendChild(
      el(
        "span",
        "goal-chip",
        Math.round(r.goal_alignment_score * 100) + "% goal",
      ),
    );
  if (r.required_seniority)
    chips.appendChild(el("span", "status-chip", r.required_seniority));
  detail.appendChild(chips);

  // Job description — scrollable + collapsible.
  if (r.job_description) {
    detail.appendChild(el("div", "detail-label", "Job description"));
    const jd = el("div", "jd-block", r.job_description);
    detail.appendChild(jd);
    const toggle = el("button", "detail-link", "Expand");
    toggle.addEventListener("click", () => {
      const open = jd.classList.toggle("expanded");
      toggle.textContent = open ? "Collapse" : "Expand";
    });
    detail.appendChild(toggle);
  }

  // CV section.
  detail.appendChild(el("div", "detail-label", "CV"));
  const cvSection = el("div", "detail-cv");
  if (r.cv_url) {
    const link = el("a", "cvlink", "Open CV");
    link.href = r.cv_url;
    link.target = "_blank";
    link.rel = "noopener";
    cvSection.appendChild(link);
  }
  const genBtn = el(
    "button",
    "detail-gen",
    r.cv_url ? "Regenerate CV" : "Generate CV for this role",
  );
  const genNote = el("div", "note");
  if (notice) genNote.textContent = notice;
  genBtn.addEventListener("click", async () => {
    if (busy) return;
    if (!r.job_description) {
      genNote.textContent = "No job description on this application.";
      return;
    }
    genBtn.disabled = true;
    genNote.textContent = "Tailoring your CV…"; // staged loading (in-detail)
    // Same staged loading as the Agent-tab path (global busy + refine-cv), but
    // renderCard:false keeps the result IN THE DETAIL — no card is appended to
    // the Agent transcript, so the CV stays in the tab it was triggered from.
    setBusy(true, "Tailoring your CV…");
    const res = await runRefineAndRenderCV({
      applicationId: r.id,
      jobDescription: r.job_description,
      roleLabel: r.role_title || "Role",
      companyLabel: r.company || "",
      renderCard: false,
    });
    setBusy(false);
    if (res.ok) {
      r.cv_url = res.cv_url; // reflect the new CV in the detail
      renderApplicationDetail(r, "CV updated"); // in-place update + inline note
    } else if (res.authExpired) {
      handleAuthExpired();
    } else {
      genBtn.disabled = false;
      genNote.textContent = "CV generation failed: " + res.error;
    }
  });
  cvSection.appendChild(genBtn);
  cvSection.appendChild(genNote);
  detail.appendChild(cvSection);

  // 7-step checklist.
  detail.appendChild(renderChecklist(r));

  list.appendChild(detail);
}

// ───────────────────────── 7-step checklist (mirrors ApplicationChecklist) ───
// Step labels, helper text, and phase grouping mirror the web app's
// src/components/tracker/ApplicationChecklist.jsx. Manual toggles only — no
// current-step / lock / CTA logic and no auto-derivation in this slice.
const CHECKLIST_PHASES = [
  { key: "know", label: "Know the role" },
  { key: "build", label: "Build your case" },
  { key: "apply", label: "Apply & prep" },
];
const CHECKLIST_STEPS = [
  {
    key: "qualification_confirmed",
    title: "Qualify yourself",
    helper: "Check your fit for this role before you invest more time.",
    phase: "know",
  },
  {
    key: "jd_dissected",
    title: "Dissect the job description",
    helper:
      "Know the role inside-out — responsibilities, must-have skills, seniority signals.",
    phase: "know",
  },
  {
    key: "cv_tailored",
    title: "Tailor your CV",
    helper: "Generate a CV tuned to this role's must-haves.",
    phase: "build",
  },
  {
    key: "skills_proof_mapped",
    title: "Map your skill evidence",
    helper: "Match your stories to what the role asks for.",
    phase: "build",
  },
  {
    key: "referral_attempted",
    title: "Find a referral contact",
    helper: "Find someone at {company} who can refer you in.",
    phase: "build",
  },
  {
    key: "application_submitted",
    title: "Submit your application",
    helper: "Apply on the company's careers page.",
    phase: "apply",
  },
  {
    key: "interview_prep_done",
    title: "Prep for the interview",
    helper: "Practice STAR-format answers with the Interview Coach.",
    phase: "apply",
  },
];

function renderChecklist(r) {
  const section = el("div", "checklist");
  // Shared working copy of the checklist; defaults to {} when absent.
  const cl = { ...(r.checklist || {}) };

  const done = CHECKLIST_STEPS.filter((s) => cl[s.key]).length;
  const head = el("div", "detail-label");
  head.textContent = "Steps";
  const count = el(
    "span",
    "checklist-count",
    `${done} / ${CHECKLIST_STEPS.length}`,
  );
  head.appendChild(count);
  section.appendChild(head);

  CHECKLIST_PHASES.forEach((phase, pi) => {
    section.appendChild(el("div", "phase-label", phase.label));
    CHECKLIST_STEPS.filter((s) => s.phase === phase.key).forEach((step) => {
      const stepNo = CHECKLIST_STEPS.indexOf(step) + 1;
      const row = el("div", "step-row");

      const marker = el("button", "step-marker");
      const paint = () => {
        const isDone = !!cl[step.key];
        marker.classList.toggle("done", isDone);
        marker.textContent = isDone ? "✓" : "";
      };
      paint();

      const body = el("div", "step-body");
      body.appendChild(el("div", "step-title", `${stepNo} · ${step.title}`));
      const helper = String(step.helper || "").replaceAll(
        "{company}",
        r.company || "this company",
      );
      if (helper) body.appendChild(el("div", "step-helper", helper));

      marker.addEventListener("click", async (e) => {
        e.stopPropagation();
        const prevVal = !!cl[step.key];
        cl[step.key] = !prevVal; // optimistic in-memory
        paint();
        const next = { ...cl };
        marker.disabled = true;
        const { error } = await supabase
          .from("applications")
          .update({ checklist: next })
          .eq("id", r.id);
        marker.disabled = false;
        if (error) {
          cl[step.key] = prevVal; // rollback
          paint();
          console.error("checklist update failed:", error.message);
          if (isAuthExpired(error)) handleAuthExpired();
          else flashInlineError(row, "Couldn't save");
        } else {
          // recompute the count + keep the row object in sync
          count.textContent = `${CHECKLIST_STEPS.filter((s) => cl[s.key]).length} / ${CHECKLIST_STEPS.length}`;
          r.checklist = { ...cl };
        }
      });

      row.appendChild(marker);
      row.appendChild(body);
      section.appendChild(row);
    });
  });

  return section;
}

// ───────────────────────── boot ─────────────────────────────────────────────
refreshComposer();
initSession();
