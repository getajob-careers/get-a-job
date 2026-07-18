// cv-master.ts - single source of truth for the DETERMINISTIC master cv_data
// build. Ported from src/lib/cvDataAdapter.js (buildMasterCvData) so the client
// studio AND the Deno engines (generate-tailored-cv master mode) share ONE
// builder, instead of the LLM re-authoring structured fields it can drop.
//
// Pure, framework-free, no imports: works under both Vite (client, via the
// @shared alias) and Deno (engine, via a relative ../_shared import).
//
// Scope: experience and education are sourced faithfully from the structured
// profile / experiences / education rows. Education always carries
// field_of_study. Skills stay as a flat domain list (the source profile.skills
// is a single uncategorized array); bucketing into technical/tools is out of
// scope because there is no categorized source to preserve.

// deno-lint-ignore-file no-explicit-any

import { EXPERIENCE_BUCKETS, MASTER_ORG_KEY } from "./cv-schema.ts";
import { categorizeSkills } from "./cv-skills.ts";
import { formatDateRange } from "./date-format.ts";

const str = (v: any): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);
const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);

// ── Deterministic, idempotent, content-preserving bullet voice/caps normalizer ──
// Applied to every bullet at master-build time (in expBullets) so EVERY CV path
// that goes through buildMasterCvData inherits consistent, capitalized,
// implied-first-person bullets WITHOUT rewriting content. It does exactly two
// things and nothing else:
//   (a) capitalizes the first alphabetic character, and
//   (b) strips a LEADING first-person subject at position 0 only, so
//       "I am comparing Claude..." -> "Comparing Claude...",
//       "I've led..." -> "Led...", "We built..." -> "Built...".
// It NEVER edits numbers, tools, claims, or any mid-sentence word; NEVER drops a
// bullet (empty-after-strip falls back to the original); and is IDEMPOTENT
// (running it a second time is a no-op). Guards the traps: "IT"/"I/O" (needs a
// whole word "I"), proper nouns ("We Work Labs" - next word must be lowercase),
// and possessive+noun ("My role", "Our team" - bare subject is stripped only when
// the following word looks like a verb).

// "I am / I'm / I've / I have" + a lowercase word: after the auxiliary the next
// word is a verb/participle/adjective, so stripping is safe.
const LEAD_AUX_RE = /^\s*I(?:['’]m|['’]ve|\s+am|\s+have)\s+(?=[a-z])/;
// Bare first-person subject + a lowercase word; only stripped when that word
// looksLikeVerb (guards "My role", "Our team", "IT", "I/O", proper nouns).
const LEAD_SUBJECT_RE = /^\s*(?:I|We|My|Our)\s+(?=[a-z])/;

const COMMON_VERBS = new Set([
  // irregular / common past tense
  "led",
  "built",
  "rebuilt",
  "ran",
  "made",
  "took",
  "set",
  "won",
  "drove",
  "grew",
  "held",
  "gave",
  "brought",
  "taught",
  "sold",
  "spent",
  "met",
  "kept",
  "wrote",
  "oversaw",
  "drew",
  "chose",
  "began",
  "found",
  "sent",
  // common CV present tense
  "manage",
  "lead",
  "build",
  "run",
  "own",
  "drive",
  "design",
  "develop",
  "support",
  "coordinate",
  "analyze",
  "analyse",
  "deliver",
  "launch",
  "create",
  "improve",
  "ship",
  "oversee",
  "mentor",
  "handle",
  "maintain",
]);

function looksLikeVerb(word: string): boolean {
  const w = word.toLowerCase();
  if (COMMON_VERBS.has(w)) return true;
  // regular past tense / gerund (analyzed, designed, coordinating, ...)
  return /^[a-z]{3,}(ed|ing)$/.test(w);
}

function capitalizeFirst(s: string): string {
  const i = s.search(/[A-Za-z]/);
  if (i < 0) return s;
  return s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1);
}

export function normalizeBulletVoice(input: any): string {
  const orig = str(input);
  let t = orig;
  if (LEAD_AUX_RE.test(t)) {
    t = t.replace(LEAD_AUX_RE, "");
  } else {
    const m = t.match(LEAD_SUBJECT_RE);
    if (m) {
      const rest = t.slice(m[0].length);
      const wm = rest.match(/^([A-Za-z'’-]+)/);
      if (wm && looksLikeVerb(wm[1])) t = rest;
    }
  }
  t = capitalizeFirst(t);
  // never drop content: an empty result (nothing but the stripped subject) keeps
  // the original bullet whole.
  return t.trim() ? t : orig;
}

// Convenience: normalize a plain bullets[] array. Used by the normalize-on-write
// paths (profile bullet edits) so the STORED experiences.bullets stay clean, with
// the render chokepoint as the safety net rather than the only defense. Idempotent.
export function normalizeBullets(bullets: any): string[] {
  return asArray(bullets).map(normalizeBulletVoice);
}

// Apply normalizeBulletVoice to every experience bullet in a whole cv_data object
// (the four *_experiences buckets). IDEMPOTENT: a cv_data already built through
// buildMasterCvData comes back deep-equal (each bullet maps to itself). Returns a
// new object; never mutates the input. Used by the render chokepoint (render-cv)
// as the LAST line of defense for any cv_data that reached render without going
// through the deterministic builder (e.g. a studio inline edit, or an older
// persisted CV built before the polish layer existed).
export function normalizeCvDataBullets(cvData: any): any {
  if (!cvData || typeof cvData !== "object") return cvData;
  const out: any = { ...cvData };
  for (const b of EXPERIENCE_BUCKETS) {
    const list = (cvData as any)[b.cvKey];
    if (!Array.isArray(list)) continue;
    out[b.cvKey] = list.map((entry: any) =>
      entry && Array.isArray(entry.bullets)
        ? { ...entry, bullets: entry.bullets.map(normalizeBulletVoice) }
        : entry,
    );
  }
  return out;
}


// Bucket an experience row into professional / military / volunteering /
// leadership from its type tag plus keyword fallback.
function bucketOf(exp: any): string {
  const company = str(exp?.company).toLowerCase();
  const title = str(exp?.title).toLowerCase();
  const type = str(exp?.type).toLowerCase();
  const military =
    /\b(idf|israel\s?defense\s?forces|nahal|golani|givati|paratroopers?|sayeret|unit\s?8200|8200|army|navy|air\s?force|brigade|platoon|battalion|regiment|commander|sergeant|corporal|lieutenant|captain|reservist|conscript|military\s?service|military\s?role)\b/;
  const volunteer = /\b(volunteer(ed|ing)?|voluntary|pro\s?bono)\b/;
  const ngo = /\b(ngo|non[-\s]?profit|charity|foundation)\b/;
  const leadership =
    /\b(president of|editor of|captain of|head of student|club president|society president|student council)\b/;
  const looksMilitary =
    military.test(company) || military.test(title) || type === "military";
  if (looksMilitary && volunteer.test(title)) return "volunteering";
  if (looksMilitary) return "military";
  if (
    volunteer.test(title) ||
    volunteer.test(company) ||
    ngo.test(company) ||
    type === "volunteering" ||
    type === "volunteer"
  )
    return "volunteering";
  if (type === "leadership" || leadership.test(title)) return "leadership";
  return "professional";
}

// Prefer the curated bullets; else fall back to the responsibilities text,
// split on the user's own line/bullet breaks (no sentence-level re-splitting,
// to keep wording verbatim).
function expBullets(exp: any): string[] {
  const curated = asArray(exp?.bullets)
    .map(str)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeBulletVoice);
  if (curated.length) return curated;
  const resp = str(exp?.responsibilities);
  if (!resp) return [];
  return resp
    .split(/\r?\n|[•·▪‣]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .map(normalizeBulletVoice);
}

// Build the master cv_data deterministically from the user's structured rows.
// experience_id is stamped from the experiences row id so the per-job reframe
// step (refine-cv) can address bullets for rewording; an experience with no id
// still carries through (refine-cv keeps it verbatim).
// `extras` carries the separate profile tables the deterministic builder cannot
// reach through profile/experiences/education alone (projects, certifications).
// It is OPTIONAL: callers that do not pass it get no projects/certifications keys
// (byte-identical for those callers). education already carries honors /
// coursework / academic_projects, so those need no extra source.
export function buildMasterCvData(
  profile: any,
  experiences: any,
  education: any,
  userEmail?: string,
  extras?: { projects?: any[]; certifications?: any[] },
): any {
  const p = profile || {};
  const buckets: Record<string, any[]> = Object.fromEntries(
    EXPERIENCE_BUCKETS.map((b) => [b.bucket, [] as any[]]),
  );
  for (const e of asArray(experiences)) {
    const bucket = bucketOf(e);
    buckets[bucket].push({
      title: str(e?.title),
      [MASTER_ORG_KEY[bucket]]: str(e?.company),
      dates: formatDateRange(e?.start_date, e?.end_date, e?.is_current),
      bullets: expBullets(e),
      ...(e?.id ? { experience_id: str(e.id) } : {}),
    });
  }
  const languages = asArray(p.languages)
    .map((l: any) => (typeof l === "string" ? l : str(l?.language || l?.name)))
    .filter(Boolean);

  // Skills: categorize the UNION of profile.skills (curated, lead first) and every
  // experience's skills[] (where SQL / Python / tools actually live) into the
  // canonical {domain, technical, tools} shape. Deterministic, no LLM.
  const skillUnion = [
    ...asArray(p.skills).map(str),
    ...asArray(experiences).flatMap((e: any) => asArray(e?.skills).map(str)),
  ].filter(Boolean);
  const skills = categorizeSkills(skillUnion);

  // Education entries keep the rich fields the builder used to drop (coursework,
  // academic projects), added only when present so entries stay lean otherwise.
  const educationEntries = asArray(education).map((ed: any) => {
    const coursework = asArray(ed?.relevant_coursework)
      .map(str)
      .filter(Boolean);
    const academic = asArray(ed?.academic_projects).map(str).filter(Boolean);
    return {
      institution: str(ed?.institution),
      degree: str(ed?.degree_type),
      field_of_study: str(ed?.field_of_study),
      dates: formatDateRange(ed?.start_date, ed?.end_date, ed?.is_current),
      // Stamp education_id from the source row so a Studio edit to an education
      // field can attribute back to its `education` row (the write-through
      // contract), mirroring experience_id above. An entry with no id still
      // carries through; the Studio surfaces "can't attribute" rather than
      // silently dropping such an edit.
      ...(ed?.id ? { education_id: str(ed.id) } : {}),
      ...(coursework.length ? { relevant_coursework: coursework } : {}),
      ...(academic.length ? { academic_projects: academic } : {}),
    };
  });

  // Honors & awards: DETERMINISTIC aggregation from stored STRUCTURED sources
  // ONLY - education[].honors (academic) + experiences[].awards (military /
  // role awards). NEVER LLM-composed: the generation path used to let the model
  // author this section, which fabricated unearned awards (e.g. "Dean's List")
  // and surfaced items with no stored provenance. Every entry here now traces to
  // a stored field. Deduped case-insensitively.
  const honorsSeen = new Set<string>();
  const honors: string[] = [];
  const pushHonor = (raw: any) => {
    const hs = str(raw).trim();
    const key = hs.toLowerCase();
    if (hs && !honorsSeen.has(key)) {
      honorsSeen.add(key);
      honors.push(hs);
    }
  };
  for (const ed of asArray(education)) {
    for (const h of asArray(ed?.honors)) pushHonor(h);
  }
  for (const e of asArray(experiences)) {
    for (const a of asArray(e?.awards)) pushHonor(a);
  }

  // Projects / certifications from the separate tables, when the caller passes
  // them. Shapes match the renderer (name/url/description; name/issuer/date_earned).
  const projects = asArray(extras?.projects)
    .map((pr: any) => ({
      name: str(pr?.name),
      ...(str(pr?.url) ? { url: str(pr.url) } : {}),
      ...(str(pr?.description) ? { description: str(pr.description) } : {}),
    }))
    .filter((pr) => pr.name);
  const certifications = asArray(extras?.certifications)
    .map((c: any) => ({
      name: str(c?.name),
      ...(str(c?.issuer) ? { issuer: str(c.issuer) } : {}),
      ...(str(c?.date_earned || c?.date)
        ? { date_earned: str(c?.date_earned || c?.date) }
        : {}),
    }))
    .filter((c) => c.name);

  return {
    header: {
      name: str(p.full_name),
      subtitle: str(p.headline),
      email: str(p.email || userEmail),
      phone: str(p.phone_number),
      location: str(p.location),
      linkedin: str(p.linkedin_url),
    },
    summary: str(p.summary),
    // Canonical bucket keys (professional_experiences, ...) come from the shared
    // EXPERIENCE_BUCKETS, in render order, so they cannot drift from the adapter.
    ...Object.fromEntries(
      EXPERIENCE_BUCKETS.map((b) => [b.cvKey, buckets[b.bucket]]),
    ),
    education: educationEntries,
    skills,
    languages,
    // Optional sections, emitted only when present so absent data adds no keys.
    ...(honors.length ? { honors_and_awards: honors } : {}),
    ...(certifications.length ? { certifications } : {}),
    ...(projects.length ? { projects } : {}),
  };
}
