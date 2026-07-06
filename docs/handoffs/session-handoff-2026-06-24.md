Manual Cookie-Wall Capture Pass — Handoff
Purpose
The browser agent cannot accept cookie consent banners, so for ~10-15 high-value IL companies the ATS embed iframe stays blocked and the slug/token isn't visible. You'll manually visit each one with cookies accepted, inspect the iframe, capture the missing credentials, and paste the data back. The captured data feeds a registry-add PR.
Expected time: ~30-45 minutes for ~10-15 companies. Expected yield: ~50-100 IL jobs added to platform.
What you'll capture per company
For each careers page, you need ONE of these depending on the ATS:

Greenhouse: the slug from boards-api.greenhouse.io/v1/boards/<slug>/jobs or boards.greenhouse.io/<slug>
Lever: the slug from jobs.lever.co/<slug>/<uuid>
Ashby: the slug from jobs.ashbyhq.com/<slug>/<id>
Workable: the company slug from apply.workable.com/<slug>/ or the widget embed JS
Comeet: the uid (e.g., C4.00C) AND the token (long hex string) — both appear in the comeetvar JavaScript object on the page, OR in an inline comeetInit({uid: '...', token: '...'}) call

How to inspect a page (uniform method)

Open the careers URL in a browser tab
Accept cookies when the banner appears (click "Accept all" or equivalent)
Wait 5-10 seconds for the embed/iframe to load
Right-click anywhere on the page → "Inspect" (or Cmd+Option+I)
In DevTools, go to the Elements tab
Search for these markers (Cmd+F inside the Elements panel):

greenhouse.io — slug usually appears in iframe src or <a href> attributes
lever.co — same pattern
ashbyhq.com — same pattern
workable.com — slug in iframe src or widget config
comeetvar or comeetInit — for Comeet, copy the uid and token from the object/function call


Copy the slug/uid/token verbatim — case-sensitive
Bonus: if the page shows live job listings, note the IL job count and 2-3 sample (title, location) pairs

If the embed doesn't load even after accepting cookies, check the Network tab in DevTools and look for any request to greenhouse.io, lever.co, ashbyhq.com, workable.com, or comeet.co — the URL itself contains the slug.
Target queue (sub-batches 1 + 2)
Highest priority — partial credentials, just need token:
#CompanyWhat we haveWhat you need to findCareers URL1Backslash SecurityComeet uid 98.004 (per sub-batch 2 partial)Comeet tokenhttps://www.backslash.security/careers2CynetComeet uid 33.00D (token blocked)Comeet tokenhttps://www.cynet.com/careers/3NayaxComeet uid 33.00D (note: same uid as Cynet — verify on inspection, may be different)Comeet tokenhttps://www.nayax.com/careers/4IncredibuildComeet uid 66.00FComeet tokenhttps://www.incredibuild.com/careers5Port.ioComeet uid 59.004Comeet tokenhttps://www.getport.io/careers6TipaltiGreenhouse slug tipaltisolutions (per sub-batch 2 extract)Verify slug works: open https://boards-api.greenhouse.io/v1/boards/tipaltisolutions/jobs directly in browser — if it returns JSON with jobs, slug is goodhttps://tipalti.com/company/jobs/
High priority — need full ATS detection (suspected cookie-walled):
#CompanySuspected ATSCareers URL7SeemplicityUnknown (page also has domain redirect to seemplicity.ai which is blocked)https://www.seemplicity.ai/careers (try with cookies accepted)8Deep InstinctUnknown (sub-batch 2 said "Custom self-hosted" but Greenhouse footer markers were present in sub-batch 1)https://www.deepinstinct.com/careers9Cato NetworksGreenhouse slug catonetworks (sub-batch 2 confirmed)Verify: open https://boards-api.greenhouse.io/v1/boards/catonetworks/jobs — should return jobs10AxoniusGreenhouse slug axoniusinc (sub-batch 2 confirmed)Verify: open https://boards-api.greenhouse.io/v1/boards/axoniusinc/jobs — should return jobs11ElectreonSuspected Greenhousehttps://www.electreon.com/about-us/careers/12DoubleVerifyUnknownhttps://doubleverify.com/company/careers13NetafimUnknownhttps://www.netafim.com/en/career/14Mesh PaymentsUnknown (was blocked on meshverify.com)https://www.mesh.id/careers15HiBobConfirmed: uses their own platform hibob-fa0ad69d0cb34a.careers.hibob.com — NOT a supported ATS. Defer/skip unless you want to build a custom HiBob-platform fetcher.https://www.hibob.com/careers/
Note on #15 (HiBob): they use their own HR product as an ATS. This is a one-off and unlikely to scale to more tenants. Skip unless you specifically want HiBob's jobs.
Note on SolarEdge: blocked by Cloudflare bot detection, not a cookie wall. Skip via this method — would need a different approach.
Verification while you're there
For any company where you find live IL jobs on the page (not just the slug), note:

Total job count visible
IL job count (filter by location if the page supports it)
2-3 sample titles + locations

This is the same evidence we use in the registry-add PR descriptions, so capturing it during your manual pass saves us from re-doing the live-curl verification later.
Output format
When you're done, paste the results back to me in this shape:
Manual cookie-wall capture results:

1. Backslash Security
   - ATS: Comeet
   - uid: 98.004
   - token: <captured>
   - IL jobs visible: <count>
   - Sample: <title> (<location>), ...
   - HQ: Tel Aviv

2. Cynet
   - ATS: Comeet
   - uid: 33.00D
   - token: <captured>
   - IL jobs visible: <count>
   ...

[etc]

Skipped or failed:
- HiBob: confirmed custom platform, deferred
- SolarEdge: Cloudflare bot block, different problem
- <any others that didn't work>
I'll then triage and draft a registry-add PR prompt for whichever entries had usable data.
What you should NOT do

Don't sign up for accounts or click "Apply now" — passive observation only
Don't capture personal info that might appear on the page (recruiter emails, etc.)
Don't worry if 2-3 of the 15 still fail even with cookies accepted — some sites have additional walls (bot detection, geofencing, etc.)
Don't spend more than ~3-4 minutes per company. If a site is fighting back, skip and note it.

When to do this pass
Best timing: after sub-batch 3 (and any further sub-batches) returns from the agent, so the full queue is consolidated. Sub-batch 3 may add more cookie-walled entries to the list, and combining them into one manual pass is more efficient than two passes.
Alternative timing: do it now while sub-batch 3 is running on the agent. The pass is independent.
Why this matters
Each successful capture is ~5-20 IL jobs added to the platform. 10 successful captures = ~50-200 jobs of IL inventory unlocked. That's substantial uplift relative to the time investment.
The cookie-wall blocker is the single largest gap between "companies the agent found" and "companies producing real listings." Solving it manually for the high-value tail is one of the highest-leverage moves available.