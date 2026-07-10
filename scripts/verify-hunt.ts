// Verification harness for the manual careers hunt. Reuses the PRODUCTION fetchers
// + IL classifier so counts match the nightly refresh exactly. Reads a JSON array
// of {name, ats, slug?, api_url?} on argv[2] (a file path) and prints
// name | ats | ident | total | IL | error for each. No registry writes.
//
// Usage: npx tsx scripts/verify-hunt.ts <candidates.json>
//   comeet needs api_url (uid+token), e.g. from a fresh token capture:
//     [{"name":"Deep Instinct","ats":"comeet",
//       "api_url":"https://www.comeet.co/careers-api/2.0/company/72.00A/positions?token=<TOKEN>&details=true"}]
//   greenhouse/lever/ashby/workable/smartrecruiters need only slug:
//     [{"name":"Spacial","ats":"ashby","slug":"spacial"}]
import { readFileSync } from "node:fs";
import {
  classifyLocation,
  isJunkTitle,
  type CompanyEntry,
  type RawJob,
} from "./lib/normalize.ts";
import {
  fetchComeet,
  fetchGreenhouse,
  fetchLever,
  fetchAshby,
  fetchWorkable,
  fetchSmartRecruiters,
} from "./lib/ats-fetchers.ts";

const FETCHERS: Record<string, (c: CompanyEntry) => Promise<RawJob[]>> = {
  comeet: fetchComeet,
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  workable: fetchWorkable,
  smartrecruiters: fetchSmartRecruiters,
};

const entry = (o: any): CompanyEntry => ({
  name: o.name,
  type: "israeli_founded",
  industry: null,
  domain: null,
  careers_url: o.careers_url ?? null,
  ats: o.ats,
  slug: o.slug ?? null,
  api_url: o.api_url ?? null,
  verified: false,
  notes: null,
});

const cands = JSON.parse(readFileSync(process.argv[2], "utf8"));
console.log("name\tats\tident\ttotal\tIL\tIL_titles\terror");
for (const c of cands) {
  const ident = c.api_url
    ? (c.api_url.match(/company\/([^/]+)\//)?.[1] ?? "uid")
    : c.slug;
  const fn = FETCHERS[c.ats];
  if (!fn) {
    console.log(`${c.name}\t${c.ats}\t${ident}\t-\t-\t\tNO_FETCHER`);
    continue;
  }
  try {
    const jobs = await fn(entry(c));
    const il = jobs.filter(
      (j) =>
        !isJunkTitle(j.title) &&
        classifyLocation(j.location_raw, j.structured_country).is_il,
    );
    const ilTitles = il
      .slice(0, 4)
      .map((j) => j.title.slice(0, 34))
      .join(" ; ");
    console.log(
      `${c.name}\t${c.ats}\t${ident}\t${jobs.length}\t${il.length}\t${ilTitles}\t`,
    );
  } catch (e) {
    console.log(
      `${c.name}\t${c.ats}\t${ident}\t-\t-\t\t${(e as Error).message?.slice(0, 60)}`,
    );
  }
}
