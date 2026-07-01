// cv-skills.ts - deterministic skill categorization for the master CV builder.
//
// The deterministic buildMasterCvData used to drop every skill into `domain`
// (technical / tools always empty), so SQL / Python / React never surfaced in
// their own category and the skills section looked flat. This module restores the
// three-group split WITHOUT an LLM (so no staleness, no added latency): it takes
// the user's skills, classifies each via a curated inline dictionary, safe-defaults
// anything unknown to `domain`, dedups case-insensitively (keeping a canonical
// display for known terms), and caps each group.
//
// Pure, framework-free, no imports: runs under both Deno and Vite, like cv-master.

// deno-lint-ignore-file no-explicit-any

const str = (v: any): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);

// Normalized comparison key: lowercase, drop parentheticals ("Figma (basic)" ->
// "figma"), keep the few chars that distinguish tech tokens (+ # . /), collapse
// whitespace. Used both to look terms up in the dictionary and to dedup.
function normKey(raw: any): string {
  return str(raw)
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9+#./ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Dictionary definitions. Each row is [canonicalDisplay, ...aliases]. The first
// entry is the display name; every entry (normalized) maps to it. Unknown skills
// are NOT here and fall through to `domain`, which is the safe default.
const TECHNICAL_DEFS: string[][] = [
  ["SQL"],
  ["Python"],
  ["JavaScript", "js"],
  ["TypeScript", "ts"],
  ["React"],
  ["React Native"],
  ["Node.js", "node", "nodejs"],
  ["Java"],
  ["C++"],
  ["C#"],
  ["Go", "golang"],
  ["Rust"],
  ["Ruby"],
  ["Ruby on Rails", "rails"],
  ["PHP"],
  ["HTML"],
  ["CSS"],
  ["Sass"],
  ["Tailwind CSS", "tailwind"],
  ["Bootstrap"],
  ["Redux"],
  ["Next.js", "nextjs"],
  ["Vue.js", "vue"],
  ["Angular"],
  ["Svelte"],
  ["Django"],
  ["Flask"],
  ["FastAPI"],
  ["Spring Boot", "spring"],
  [".NET", "dotnet"],
  ["PostgreSQL", "postgres"],
  ["MySQL"],
  ["MongoDB"],
  ["Redis"],
  ["SQLite"],
  ["DynamoDB"],
  ["Elasticsearch"],
  ["Snowflake"],
  ["BigQuery"],
  ["GraphQL"],
  ["REST APIs", "rest api", "rest apis", "rest", "apis"],
  ["gRPC"],
  ["AWS"],
  ["Azure"],
  ["GCP", "google cloud"],
  ["Docker"],
  ["Kubernetes", "k8s"],
  ["Terraform"],
  ["Ansible"],
  ["Jenkins"],
  ["CI/CD"],
  ["Git"],
  ["Linux"],
  ["Nginx"],
  ["Supabase"],
  ["Firebase"],
  ["Vercel"],
  ["Netlify"],
  ["MCP"],
  ["Pandas"],
  ["NumPy"],
  ["SciPy"],
  ["TensorFlow"],
  ["PyTorch"],
  ["Keras"],
  ["scikit-learn", "sklearn"],
  ["Spark"],
  ["Hadoop"],
  ["Kafka"],
  ["Airflow"],
  ["dbt"],
  ["Machine Learning", "ml"],
  ["Deep Learning"],
  ["NLP"],
  ["Computer Vision"],
  ["Data Engineering"],
  ["ETL"],
  ["Full Stack Development", "full stack", "full-stack", "fullstack"],
  ["Backend Development", "backend"],
  ["Frontend Development", "frontend"],
  ["Web Development"],
  ["iOS"],
  ["Android"],
  ["Flutter"],
  ["R"],
  ["MATLAB"],
  ["Bash"],
  ["Scala"],
  ["Kotlin"],
  ["Swift"],
  ["Programming"],
];

const TOOLS_DEFS: string[][] = [
  ["Cursor"],
  ["Claude", "claude code", "claude / claude code"],
  ["OpenAI"],
  ["ChatGPT"],
  ["Gemini"],
  ["GitHub Copilot", "copilot"],
  ["Langfuse"],
  ["ElevenLabs"],
  ["Retell"],
  ["Base44"],
  ["Retool"],
  ["Bubble"],
  ["Zapier"],
  ["Make", "make.com"],
  ["n8n"],
  ["Notion"],
  ["Linear"],
  ["Jira"],
  ["Confluence"],
  ["Asana"],
  ["Trello"],
  ["Monday.com", "monday"],
  ["ClickUp"],
  ["Airtable"],
  ["Basecamp"],
  ["Slack"],
  ["Loom"],
  ["Zoom"],
  ["Microsoft Teams", "teams"],
  ["Discord"],
  ["Intercom"],
  ["HubSpot"],
  ["Salesforce"],
  ["Zendesk"],
  ["Freshdesk"],
  ["Pipedrive"],
  ["Gainsight"],
  ["Totango"],
  ["Figma"],
  ["Sketch"],
  ["Adobe XD"],
  ["Framer"],
  ["Canva"],
  ["Miro"],
  ["Mural"],
  ["InVision"],
  ["Photoshop"],
  ["Illustrator"],
  ["Adobe Creative Suite", "adobe"],
  ["Excel", "microsoft excel"],
  ["Google Sheets", "sheets"],
  ["PowerPoint"],
  ["Word"],
  ["Google Docs"],
  ["Microsoft Office", "ms office", "office"],
  ["Google Workspace", "g suite"],
  ["Outlook"],
  ["Tableau"],
  ["Power BI", "powerbi"],
  ["Looker"],
  ["Mode"],
  ["Metabase"],
  ["Google Analytics", "ga4", "ga"],
  ["Mixpanel"],
  ["Amplitude"],
  ["Segment"],
  ["Hotjar"],
  ["Heap"],
  ["Google Ads"],
  ["Meta Ads", "facebook ads"],
  ["LinkedIn Ads"],
  ["Semrush"],
  ["Ahrefs"],
  ["Mailchimp"],
  ["Marketo"],
  ["Klaviyo"],
  ["Hootsuite"],
  ["Buffer"],
  ["Napoleon Cat", "napoleoncat"],
  ["Stripe"],
  ["Shopify"],
  ["WordPress"],
  ["Webflow"],
  ["Postman"],
  ["VS Code", "vscode"],
  ["GitHub"],
  ["GitLab"],
  ["Bitbucket"],
  ["Datadog"],
  ["Sentry"],
  ["Grafana"],
  ["PagerDuty"],
];

type SkillGroup = "domain" | "technical" | "tools";

// normKey -> { group, display }. Built once at module load.
const DICT = new Map<string, { group: SkillGroup; display: string }>();
for (const [group, defs] of [
  ["technical", TECHNICAL_DEFS],
  ["tools", TOOLS_DEFS],
] as [SkillGroup, string[][]][]) {
  for (const row of defs) {
    const display = row[0];
    for (const term of row) DICT.set(normKey(term), { group, display });
  }
}

function classifySkill(raw: string): { group: SkillGroup; display: string } {
  const key = normKey(raw);
  // exact, then the base token before a "/" ("Claude / Claude Code" -> "claude")
  const hit = DICT.get(key) || DICT.get(key.split("/")[0].trim());
  if (hit) return hit;
  return { group: "domain", display: raw.trim() };
}

// Per-group display caps. Domain is the widest (curated capabilities lead);
// technical/tools stay tight so the section reads as a scannable list.
const CAPS: Record<SkillGroup, number> = {
  domain: 16,
  technical: 10,
  tools: 12,
};

// Categorize an ORDERED list of skill strings into {domain, technical, tools}.
// Order matters: pass profile.skills FIRST, then experience skills, so the user's
// curated skills lead and win dedup. Dedup is case-insensitive (by canonical
// display for known terms, by normalized text for domain). Unknowns -> domain.
export function categorizeSkills(orderedSkills: any[]): {
  domain: string[];
  technical: string[];
  tools: string[];
} {
  const out = {
    domain: [] as string[],
    technical: [] as string[],
    tools: [] as string[],
  };
  const seen = new Set<string>();
  for (const raw of Array.isArray(orderedSkills) ? orderedSkills : []) {
    const s = str(raw).trim();
    if (!s) continue;
    const { group, display } = classifySkill(s);
    // dedup key: canonical display for dictionary hits (collapses "typescript"
    // and "TypeScript"), normalized text for domain (keeps distinct capabilities).
    const dedupKey =
      group === "domain" ? `d:${normKey(s)}` : `${group}:${normKey(display)}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out[group].push(display);
  }
  out.domain = out.domain.slice(0, CAPS.domain);
  out.technical = out.technical.slice(0, CAPS.technical);
  out.tools = out.tools.slice(0, CAPS.tools);
  return out;
}
