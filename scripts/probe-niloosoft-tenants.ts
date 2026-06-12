// scripts/probe-niloosoft-tenants.ts
//
// PR-N1 Step 1: reachability probe of the 84 customers Niloosoft lists on
// niloosoft.com/portfolio-grid/. One GET per careers_url + one GET for
// robots.txt at the base domain. Classify into:
//
//   clean          — 2xx HTML, no Cloudflare/Akamai challenge markers, no captcha
//   waf_blocked    — 403, or HTML body shows challenge / captcha / akamai_bm
//   http_404       — 404
//   redirected     — non-2xx, non-3xx but final_url differs from candidate
//   url_unknown    — candidate URL not known (reported, not probed)
//   fetch_fail     — transport failure (timeout, DNS, TLS)
//
// Constraints (per Eli's PR-N1 spec):
//   - Concurrency ≤4, gentle 500ms gap between probes per worker.
//   - Real-browser User-Agent header IS allowed (AdamTotal precedent).
//   - Anything classified as `waf_blocked` joins deferred-pending-legal.
//   - Historical-hold tenants (Phoenix/Clal/Mizrahi-Tefahot/Cellcom/BDO) are
//     probed anyway, classified normally, and flagged separately so Eli sees
//     if any have moved to `clean` (decision is his).
//   - No anti-bot bypass. UA only. No cookie jar, no JS execution.
//
// Output: scripts/probe-niloosoft-tenants-draft.json + console summary.
//
// Usage: npx tsx scripts/probe-niloosoft-tenants.ts

import { writeFileSync } from "node:fs";

// ───── Constants ───────────────────────────────────────────────────────

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const POLITE_GAP_MS = 500;
const OUTPUT_PATH = "scripts/probe-niloosoft-tenants-draft.json";

// ───── Tenant inventory ────────────────────────────────────────────────
//
// 84 names sourced from niloosoft.com/portfolio-grid/ (probed 2026-06-12).
// careers_url is my best-guess. `null` means the careers page URL is not
// confidently known — we report it as `url_unknown` for Eli to triage.

type Category =
  | "finance" | "insurance" | "retail" | "telecom" | "big4"
  | "public" | "academia" | "defense" | "transport" | "consumer"
  | "tech" | "agency" | "healthcare" | "energy" | "other";

interface Tenant {
  name: string;
  hebrew_name?: string;
  category: Category;
  careers_url: string | null;
  base_domain: string | null;
  historical_hold?: true;
  registry_status?: "already_registered" | "different_ats_keep";
  notes?: string;
}

const TENANTS: Tenant[] = [
  // ── Finance ────────────────────────────────────────────────────────
  { name: "Mizrahi-Tefahot", hebrew_name: "מזרחי טפחות", category: "finance",
    careers_url: "https://www.mizrahi-tefahot.co.il/career/",
    base_domain: "mizrahi-tefahot.co.il", historical_hold: true },
  { name: "Visa Cal", hebrew_name: "ויזה כאל", category: "finance",
    careers_url: "https://www.cal-online.co.il/career",
    base_domain: "cal-online.co.il" },
  { name: "Psagot", hebrew_name: "פסגות", category: "finance",
    careers_url: "https://www.psagot.co.il/career/",
    base_domain: "psagot.co.il" },
  { name: "Helman-Aldubi", hebrew_name: "הלמן אלדובי", category: "finance",
    careers_url: "https://www.ha-invest.co.il/career",
    base_domain: "ha-invest.co.il" },
  { name: "Mavtach Simon", hebrew_name: "מבטח סימון", category: "finance",
    careers_url: "https://www.mivtach-simon.co.il/career/",
    base_domain: "mivtach-simon.co.il" },

  // ── Insurance ──────────────────────────────────────────────────────
  { name: "Phoenix Insurance", hebrew_name: "הפניקס", category: "insurance",
    careers_url: "https://www.fnx.co.il/Career",
    base_domain: "fnx.co.il", historical_hold: true },
  { name: "Clal Insurance", hebrew_name: "כלל ביטוח", category: "insurance",
    careers_url: "https://www.clal-insurance.co.il/career",
    base_domain: "clal-insurance.co.il", historical_hold: true },
  { name: "Bituach Yashir (Direct Insurance)", hebrew_name: "ביטוח ישיר",
    category: "insurance",
    careers_url: "https://www.direct-i.co.il/career",
    base_domain: "direct-i.co.il" },

  // ── Telecom ────────────────────────────────────────────────────────
  { name: "Cellcom", hebrew_name: "סלקום", category: "telecom",
    careers_url: "https://www.cellcom.co.il/career/",
    base_domain: "cellcom.co.il", historical_hold: true },
  { name: "HOT", category: "telecom",
    careers_url: "https://www.hot.net.il/heb/hr/career/",
    base_domain: "hot.net.il" },
  { name: "yes", category: "telecom",
    careers_url: "https://www.yes.co.il/content/career",
    base_domain: "yes.co.il" },
  { name: "019 Mobile", category: "telecom",
    careers_url: "https://www.019mobile.co.il/career",
    base_domain: "019mobile.co.il" },

  // ── Big-4 / professional services ──────────────────────────────────
  { name: "BDO", category: "big4",
    careers_url: "https://www.bdo.co.il/he-il/careers",
    base_domain: "bdo.co.il", historical_hold: true,
    notes: "Historically nonce-gated" },

  // ── Retail / Consumer ──────────────────────────────────────────────
  { name: "Super-Pharm", hebrew_name: "סופר-פארם", category: "retail",
    careers_url: "https://www.super-pharm.co.il/career",
    base_domain: "super-pharm.co.il" },
  { name: "IKEA Israel", category: "retail",
    careers_url: "https://www.ikea.co.il/career/",
    base_domain: "ikea.co.il" },
  { name: "Decathlon Israel", category: "retail",
    careers_url: "https://www.decathlon.co.il/career",
    base_domain: "decathlon.co.il" },
  { name: "Castro", category: "retail",
    careers_url: "https://www.castro.co.il/careers",
    base_domain: "castro.co.il",
    registry_status: "already_registered" },
  { name: "Hoodies", category: "retail",
    careers_url: "https://www.hoodies.co.il/career",
    base_domain: "hoodies.co.il" },
  { name: "Tambour", hebrew_name: "טמבור", category: "retail",
    careers_url: "https://www.tambour.co.il/career",
    base_domain: "tambour.co.il" },
  { name: "Carolina Lemke", category: "retail",
    careers_url: "https://www.carolinalemke.com/careers",
    base_domain: "carolinalemke.com" },
  { name: "Rav Bariach", hebrew_name: "רב בריח", category: "retail",
    careers_url: "https://www.rav-bariach.co.il/career",
    base_domain: "rav-bariach.co.il" },
  { name: "Sabon", category: "retail",
    careers_url: "https://sabon.teamtailor.com/",
    base_domain: "sabon.teamtailor.com",
    registry_status: "different_ats_keep",
    notes: "On TeamTailor — keep existing registry entry, skip Niloosoft path" },
  { name: "Mishloha", hebrew_name: "משלוחה", category: "retail",
    careers_url: "https://www.mishloha.co.il/career",
    base_domain: "mishloha.co.il" },
  { name: "Delta", hebrew_name: "דלתא", category: "retail",
    careers_url: "https://www.delta-il.com/career",
    base_domain: "delta-il.com" },
  { name: "Cinema City", hebrew_name: "סינמה סיטי", category: "consumer",
    careers_url: "https://www.cinema-city.co.il/career/",
    base_domain: "cinema-city.co.il" },
  { name: "Yad2", category: "consumer",
    careers_url: "https://www.yad2.co.il/info/careers",
    base_domain: "yad2.co.il" },
  { name: "Keshet Te'amim", hebrew_name: "קשת טעמים", category: "retail",
    careers_url: "https://www.keshet-teamim.co.il/career",
    base_domain: "keshet-teamim.co.il" },
  { name: "Zoglovek", hebrew_name: "זוגלובק", category: "retail",
    careers_url: "https://www.zoglovek.co.il/career",
    base_domain: "zoglovek.co.il" },
  { name: "Tzabar Medical", hebrew_name: "צבר רפואה", category: "healthcare",
    careers_url: "https://www.tzabar-rfua.co.il/career",
    base_domain: "tzabar-rfua.co.il" },
  { name: "Tzemel Medical", hebrew_name: "צמל מדיקל", category: "healthcare",
    careers_url: "https://www.tzemel.co.il/career",
    base_domain: "tzemel.co.il" },

  // ── Public sector / municipalities / institutions ──────────────────
  { name: "Tel Aviv Municipality", hebrew_name: "עיריית תל-אביב",
    category: "public",
    careers_url: "https://www.tel-aviv.gov.il/Heb/Forms/Career.aspx",
    base_domain: "tel-aviv.gov.il" },
  { name: "Council for Higher Education", hebrew_name: "המועצה להשכלה גבוהה",
    category: "public",
    careers_url: "https://che.org.il/career",
    base_domain: "che.org.il" },
  { name: "President's Residence", hebrew_name: "בית הנשיא",
    category: "public",
    careers_url: "https://www.president.gov.il/career",
    base_domain: "president.gov.il" },
  { name: "Yad Vashem", hebrew_name: "יד ושם", category: "public",
    careers_url: "https://www.yadvashem.org/career",
    base_domain: "yadvashem.org" },
  { name: "Masa Israeli", hebrew_name: "מסע ישראלי", category: "public",
    careers_url: "https://www.masa-israel.org.il/career",
    base_domain: "masa-israel.org.il" },
  { name: "Masa", category: "public",
    careers_url: "https://www.masaisrael.org/careers",
    base_domain: "masaisrael.org" },

  // ── Academia ───────────────────────────────────────────────────────
  { name: "Tel Aviv University", hebrew_name: "אוניברסיטת תל אביב",
    category: "academia",
    careers_url: "https://www.tau.ac.il/career",
    base_domain: "tau.ac.il" },
  { name: "Hebrew University", hebrew_name: "האוניברסיטה העברית",
    category: "academia",
    careers_url: "https://www.huji.ac.il/career",
    base_domain: "huji.ac.il" },
  { name: "Technion", hebrew_name: "הטכניון", category: "academia",
    careers_url: "https://www.technion.ac.il/career",
    base_domain: "technion.ac.il" },
  { name: "IDC / Reichman University", category: "academia",
    careers_url: "https://www.runi.ac.il/career",
    base_domain: "runi.ac.il" },
  { name: "College of Management", hebrew_name: "המכללה למנהל",
    category: "academia",
    careers_url: "https://www.colman.ac.il/career",
    base_domain: "colman.ac.il" },

  // ── Defense / aerospace ────────────────────────────────────────────
  { name: "Elbit Systems", hebrew_name: "אלביט מערכות", category: "defense",
    careers_url: "https://elbitsystems.com/careers/",
    base_domain: "elbitsystems.com" },
  { name: "IAI (Israel Aerospace Industries)",
    hebrew_name: "התעשייה האווירית לישראל", category: "defense",
    careers_url: "https://jobs.iai.co.il/",
    base_domain: "iai.co.il",
    registry_status: "different_ats_keep",
    notes: "Already in registry with custom 'iai' fetcher — skip" },
  { name: "IMI Systems (Israel Military Industries)",
    hebrew_name: "התעשייה הצבאית לישראל", category: "defense",
    careers_url: "https://elbitsystems.com/careers/",
    base_domain: "elbitsystems.com",
    notes: "Acquired by Elbit 2018; may share Elbit's pipeline" },

  // ── Transport / logistics ──────────────────────────────────────────
  { name: "Egged", hebrew_name: "אגד", category: "transport",
    careers_url: "https://www.egged.co.il/career/",
    base_domain: "egged.co.il",
    registry_status: "already_registered" },
  { name: "Egged Hasayim", hebrew_name: "אגד הסעים", category: "transport",
    careers_url: "https://www.egged-hasayim.co.il/career",
    base_domain: "egged-hasayim.co.il" },
  { name: "Dan", hebrew_name: "דן", category: "transport",
    careers_url: "https://www.dan.co.il/career",
    base_domain: "dan.co.il" },
  { name: "Afikim", hebrew_name: "אפיקים", category: "transport",
    careers_url: "https://www.afikim.co.il/career",
    base_domain: "afikim.co.il" },
  { name: "Avis Israel", category: "transport",
    careers_url: "https://www.avis.co.il/career",
    base_domain: "avis.co.il" },
  { name: "Lubinski", hebrew_name: "לובינסקי", category: "transport",
    careers_url: "https://www.lubinski.co.il/career",
    base_domain: "lubinski.co.il" },
  { name: "Shagrir", hebrew_name: "שגריר", category: "transport",
    careers_url: "https://www.shagrir.co.il/career",
    base_domain: "shagrir.co.il" },

  // ── Tech distribution / integration / hardware ─────────────────────
  { name: "Bynet", hebrew_name: "בינת", category: "tech",
    careers_url: "https://www.bynet.co.il/career/",
    base_domain: "bynet.co.il" },
  { name: "Matrix", category: "tech",
    careers_url: "https://www.matrix.co.il/career/",
    base_domain: "matrix.co.il" },
  { name: "Motorola Solutions Israel", category: "tech",
    careers_url: "https://www.motorolasolutions.com/en_xu/about/careers.html",
    base_domain: "motorolasolutions.com" },
  { name: "AVNET", category: "tech",
    careers_url: "https://www.avnet.com/wps/portal/us/about-avnet/careers/",
    base_domain: "avnet.com" },
  { name: "Flex", category: "tech",
    careers_url: "https://flextronics.wd1.myworkdayjobs.com/Careers",
    base_domain: "flex.com",
    registry_status: "different_ats_keep",
    notes: "Already in registry on Workday — skip" },
  { name: "EMET Systems", category: "tech",
    careers_url: "https://www.emet-il.com/career",
    base_domain: "emet-il.com" },
  { name: "TechBuddy", category: "tech",
    careers_url: "https://www.techbuddy.co.il/career",
    base_domain: "techbuddy.co.il" },
  { name: "ARAD", category: "tech",
    careers_url: "https://www.arad.co.il/career",
    base_domain: "arad.co.il" },
  { name: "Hazera", category: "tech",
    careers_url: "https://www.hazera.com/careers/",
    base_domain: "hazera.com" },

  // ── Energy ─────────────────────────────────────────────────────────
  { name: "Paz", hebrew_name: "פז", category: "energy",
    careers_url: "https://www.pazoil.co.il/career/",
    base_domain: "pazoil.co.il" },

  // ── Healthcare / services ──────────────────────────────────────────
  { name: "Femi Connecting Healthcare", hebrew_name: "פמי",
    category: "healthcare",
    careers_url: "https://www.femi.co.il/career",
    base_domain: "femi.co.il" },
  { name: "Danel", hebrew_name: "דנאל", category: "healthcare",
    careers_url: "https://www.danel.co.il/career",
    base_domain: "danel.co.il" },

  // ── Travel / hospitality ───────────────────────────────────────────
  { name: "Eshet Tours", hebrew_name: "אשת טורס", category: "consumer",
    careers_url: "https://www.eshet.com/career",
    base_domain: "eshet.com" },

  // ── Agencies / staffing / unknowns (probed but lower priority) ─────
  { name: "Hever Human Capital", hebrew_name: "חבר הון אנושי",
    category: "agency",
    careers_url: "https://www.hever.co.il/career",
    base_domain: "hever.co.il" },
  { name: "Magyeset", hebrew_name: "מגייסת", category: "agency",
    careers_url: "https://www.magyeset.co.il/", base_domain: "magyeset.co.il" },
  { name: "Maagrei Enosh", hebrew_name: "מאגרי אנוש", category: "agency",
    careers_url: "https://www.maagrei-enosh.co.il/", base_domain: "maagrei-enosh.co.il" },
  { name: "Jobuzz", category: "agency",
    careers_url: "https://www.jobuzz.co.il/", base_domain: "jobuzz.co.il" },
  { name: "RecruitX", category: "agency",
    careers_url: null, base_domain: null },
  { name: "Veracity", category: "agency",
    careers_url: null, base_domain: null },
  { name: "SVT", category: "agency",
    careers_url: null, base_domain: null },
  { name: "TOYGA", category: "other",
    careers_url: null, base_domain: null },
  { name: "EMG SOFT", category: "tech",
    careers_url: null, base_domain: null },
  { name: "HFD", category: "agency",
    careers_url: null, base_domain: null },
  { name: "2 Match", category: "agency",
    careers_url: null, base_domain: null },
  { name: "intouch", category: "agency",
    careers_url: null, base_domain: null },
  { name: "HRR", category: "agency",
    careers_url: null, base_domain: null },
  { name: "SHEMESH", category: "agency",
    careers_url: null, base_domain: null },
  { name: "Pitronot", hebrew_name: "פתרונות", category: "agency",
    careers_url: null, base_domain: null },
  { name: "UMAN", category: "agency",
    careers_url: null, base_domain: null },
  { name: "R2M", category: "agency",
    careers_url: null, base_domain: null },
  { name: "nisha", category: "agency",
    careers_url: null, base_domain: null },
  { name: "Tomer", category: "other",
    careers_url: null, base_domain: null },
  { name: "Sany", hebrew_name: "סאני", category: "consumer",
    careers_url: "https://www.sany.co.il/career", base_domain: "sany.co.il" },
  { name: "Bookkeepers' Bureau Israel",
    hebrew_name: "לשכת מנהלי החשבונות בישראל", category: "public",
    careers_url: null, base_domain: null },
];

// ───── Probe ──────────────────────────────────────────────────────────

interface ProbeResult {
  name: string;
  hebrew_name?: string;
  category: Category;
  careers_url: string | null;
  base_domain: string | null;
  historical_hold?: true;
  registry_status?: Tenant["registry_status"];
  notes?: string;
  // Filled in by the probe:
  status?: number;
  final_url?: string;
  body_len?: number;
  content_type?: string;
  has_cloudflare_challenge?: boolean;
  has_akamai_bm?: boolean;
  has_captcha?: boolean;
  has_niloosoft_hint?: boolean;
  classification: ClassificationLabel;
  error?: string;
  robots_status?: number | string;
  robots_disallows_career?: boolean;
}

type ClassificationLabel =
  | "clean" | "waf_blocked" | "http_404" | "redirected"
  | "url_unknown" | "fetch_fail" | "http_other";

async function getWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function probeRobots(base_domain: string): Promise<Pick<ProbeResult, "robots_status" | "robots_disallows_career">> {
  try {
    const res = await getWithTimeout(`https://${base_domain}/robots.txt`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": REAL_BROWSER_UA, Accept: "text/plain,*/*" },
    });
    if (!res.ok) return { robots_status: res.status };
    const txt = await res.text();
    return {
      robots_status: res.status,
      robots_disallows_career: /Disallow:\s*\/(career|careers|jobs)/i.test(txt),
    };
  } catch (e: any) {
    return { robots_status: `fetch_fail:${e?.name ?? "unknown"}` };
  }
}

async function probeTenant(t: Tenant): Promise<ProbeResult> {
  const base: ProbeResult = {
    name: t.name,
    hebrew_name: t.hebrew_name,
    category: t.category,
    careers_url: t.careers_url,
    base_domain: t.base_domain,
    historical_hold: t.historical_hold,
    registry_status: t.registry_status,
    notes: t.notes,
    classification: "url_unknown",
  };

  if (!t.careers_url || !t.base_domain) {
    return base;
  }

  // Always-skip registry duplicates (Flex Workday, SABON TeamTailor, IAI custom):
  // probe HTTP for diagnostic completeness but don't include in the 15.
  // No special-case logic needed — registry_status already carries this signal.

  let resp: Response;
  try {
    resp = await getWithTimeout(t.careers_url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": REAL_BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.7,he;q=0.3",
      },
    });
  } catch (e: any) {
    base.classification = "fetch_fail";
    base.error = String(e?.message ?? e);
    Object.assign(base, await probeRobots(t.base_domain));
    return base;
  }

  base.status = resp.status;
  base.final_url = resp.url;
  base.content_type = resp.headers.get("content-type") ?? undefined;

  if (resp.status === 403) {
    // Pull body — sometimes 403 is just a polite block page, sometimes
    // a Cloudflare challenge. We want to distinguish.
    try {
      const html = await resp.text();
      base.body_len = html.length;
      base.has_cloudflare_challenge = /(cf-challenge|cf_chl|challenge-platform|Just a moment|attention required)/i.test(html);
    } catch { /* ignore */ }
    base.classification = "waf_blocked";
  } else if (resp.status === 404) {
    base.classification = "http_404";
  } else if (!resp.ok) {
    base.classification = "http_other";
  } else {
    const ct = (resp.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("html") && !ct.includes("xml") && ct !== "") {
      base.classification = "http_other";
    } else {
      let html = "";
      try { html = await resp.text(); } catch { /* ignore */ }
      base.body_len = html.length;
      base.has_cloudflare_challenge = /(cf-challenge|cf_chl|challenge-platform|Just a moment|attention required)/i.test(html);
      base.has_akamai_bm = /_abck|bm-verify|akamai-bot-manager/i.test(html);
      base.has_captcha = /g-recaptcha|hcaptcha|"captcha"\s*:/i.test(html);
      base.has_niloosoft_hint = /niloo|hunterhrms|hunter-?next|actions-[a-z0-9_-]+-career/i.test(html);

      if (base.has_cloudflare_challenge || base.has_akamai_bm || base.has_captcha) {
        base.classification = "waf_blocked";
      } else {
        // Distinguish clean from "redirected to a different host" (e.g.,
        // a 302 chain that landed somewhere unrelated). final_url already
        // accounts for follow; only flag if same host changed completely.
        try {
          const reqHost = new URL(t.careers_url).hostname;
          const finalHost = new URL(resp.url).hostname;
          if (reqHost !== finalHost && !finalHost.endsWith(`.${reqHost.replace(/^www\./, "")}`)) {
            base.classification = "redirected";
          } else {
            base.classification = "clean";
          }
        } catch {
          base.classification = "clean";
        }
      }
    }
  }

  Object.assign(base, await probeRobots(t.base_domain));
  return base;
}

// ───── Orchestrator ───────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  console.log(`Probing ${TENANTS.length} Niloosoft portfolio tenants`);
  console.log(`Concurrency: ${CONCURRENCY}, gap: ${POLITE_GAP_MS}ms, timeout: ${TIMEOUT_MS}ms`);
  console.log(`UA: ${REAL_BROWSER_UA}\n`);

  const results: ProbeResult[] = new Array(TENANTS.length);
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async (_, workerId) => {
    while (true) {
      const idx = cursor++;
      if (idx >= TENANTS.length) return;
      const t = TENANTS[idx];
      const r = await probeTenant(t);
      results[idx] = r;
      const pad = String(idx + 1).padStart(3, " ");
      const flag = t.historical_hold ? " ⚠HOLD" : "";
      console.log(`  [w${workerId}] ${pad}/${TENANTS.length}  ${r.classification.padEnd(11)} ${t.name}${flag}`);
      await new Promise((res) => setTimeout(res, POLITE_GAP_MS));
    }
  });
  await Promise.all(workers);

  // Aggregate
  const tally: Record<string, number> = {};
  for (const r of results) tally[r.classification] = (tally[r.classification] ?? 0) + 1;

  const wallS = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = {
    generated_at: new Date().toISOString(),
    ua: REAL_BROWSER_UA,
    tenants_probed: results.length,
    wall_seconds: Number(wallS),
    classification_tally: tally,
    results,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2));

  console.log("\n=== CLASSIFICATION TALLY ===");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(3)}  ${k}`);
  }
  console.log(`\nWall time: ${wallS}s`);
  console.log(`Draft → ${OUTPUT_PATH}`);
  console.log(`\nFor the report table: parse ${OUTPUT_PATH}.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
