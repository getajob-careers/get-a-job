# CV authoring bake-off — Phase 0 (Sonnet swap pre-flight)

Generated: 2026-06-10T19:42:52.287Z
Target role: "Customer Success Specialist"
Profiles run: 21

## Production prompt snapshot

- File: `/tmp/cv-bakeoff-raw/production-prompt-snapshot.txt`
- SHA-256: `dbfa73402fc76e5578fbae52eaa70911a4d52b84f4490e0efb58a4ba7565f790`
- Generated: 2026-06-10T19:34:11.098Z
- Included blocks (fired for this scenario): `ONE_PAGE_RULE`, `TRUTHFULNESS_RULES`, `CV_VOICE_RULES`, `STRUCTURE_RULES (with SPARSE ABOUT_ME inlined)`, `TAILORING_RULES`, `LIBRARY_CONTEXT (CS Specialist matched)`, `REMINDER`
- Excluded blocks (did not fire): `STRUCTURED_REQUIREMENTS_RULE (no application_id)`, `KEYWORD_INJECTION_BLOCK (no JD)`, `ABOUT_ME GROUNDED branch (no JD overlap)`
- Validator haystack excludes story sources (metrics/result/action/skills_demonstrated/tools_used) — all pilot-cohort profiles have zero stories as of 2026-06-10; re-add before any run against story-bearing profiles.

## Per-cell summary

| Cell | Profiles run | Index validity | Total unsourced | Range flags | Numbers carried | p50 latency (ms) | Cost ($) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `gpt-4o (prod-snap)` | 21/21 | 13/21 (62%) | 1 | 5 | 30/35 (86%) | 3430 | $0.6238 |
| `gpt-4o (Option A)` | 21/21 | 13/21 (62%) | 1 | 5 | 31/35 (89%) | 4433 | $0.2783 |
| `sonnet (Option A)` | 21/21 | 21/21 (100%) | 6 | 6 | 35/35 (100%) | 3203 | $0.4645 |

---

## Adar Cohen — adar123cohen@gmail.com
Source: 5 experiences, 0 projects, 10 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 15 | ✓ | 0 | 0 | — | 6020ms | $0.0357 | ok |
| `gpt-4o (Option A)` | 16 | ✓ | 0 | 0 | — | 7770ms | $0.0191 | ok |
| `sonnet (Option A)` | 18 | ✓ | 0 | 0 | — | 2135ms | $0.0282 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 6/6 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 8/8 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 8/8 hit source haystack.**

---

## Agam Faragi — agamf123@gmail.com
Source: 5 experiences, 0 projects, 5 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 6 | ✗ professional_experiences=[1,3]; military_experiences=[4] | 0 | 2 | — | 2959ms | $0.0267 | ok |
| `gpt-4o (Option A)` | 6 | ✗ professional_experiences=[1,3]; military_experiences=[4] | 0 | 2 | — | 2854ms | $0.0099 | ok |
| `sonnet (Option A)` | 9 | ✓ | 1 | 2 | — | 3668ms | $0.0178 | ok |

### gpt-4o (prod-snap) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`6–8` — "Led a group of children aged 6–8, fostering a supportive and educational environment."
- [professional_experiences] matched=`4–7` — "Guided groups of children aged 4–7, teaching dance classes and delivering engaging educational content."

**Numeric tokens: 5/5 hit source haystack.**

### gpt-4o (Option A) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`6–8` — "Led a group of children aged 6–8, ensuring a safe and engaging environment."
- [professional_experiences] matched=`4–7` — "Guided groups of children aged 4–7, promoting teamwork and creativity."

**Numeric tokens: 5/5 hit source haystack.**

### sonnet (Option A) — detail

**Unsourced bullets:**
- [professional_experiences] tokens=[ISCAR] — "Executed warehouse operations at ISCAR Ltd., maintaining accuracy and efficiency in a structured logistics environment."

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`6–8` — "Led a group of children aged 6–8 through structured daily programming in an informal camp setting."
- [professional_experiences] matched=`4–7` — "Guided groups of children aged 4–7, building rapport and maintaining a safe, structured group environment."

**Numeric tokens: 5/6 hit source haystack.**
Misses: `ISCAR` (professional_experiences)

---

## AMITAI SCHAPIRO — amischapiro@gmail.com
Source: 2 experiences, 0 projects, 7 proof_signals, 1 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 6 | ✓ | 0 | 0 | — | 3144ms | $0.0280 | ok |
| `gpt-4o (Option A)` | 4 | ✓ | 0 | 0 | — | 2702ms | $0.0104 | ok |
| `sonnet (Option A)` | 8 | ✓ | 2 | 0 | — | 4297ms | $0.0177 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 3/3 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 2/2 hit source haystack.**

### sonnet (Option A) — detail

**Unsourced bullets:**
- [professional_experiences] tokens=[SAP] — "Shadowed a Product Manager and joined planning and review ceremonies within a SAFe Agile Release Train at SAP."
- [professional_experiences] tokens=[SAP] — "Contributed to enterprise software development at SAP using Python, JavaScript, React, and Node.js."

**Numeric tokens: 4/6 hit source haystack.**
Misses: `SAP` (professional_experiences), `SAP` (professional_experiences)

---

## Ayal Kariv — ayalkariv@gmail.com
Source: 4 experiences, 0 projects, 0 proof_signals, 1 education entries.

**Source numbers detected (target for carry-through):**
- idx_0: $7 m
- idx_1: $1 m

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 11 | ✗ military_experiences=[3]; volunteering_experiences=[2] | 0 | 0 | 2/2 | 3454ms | $0.0268 | ok |
| `gpt-4o (Option A)` | 13 | ✗ military_experiences=[3] | 0 | 0 | 2/2 | 5244ms | $0.0117 | ok |
| `sonnet (Option A)` | 14 | ✓ | 0 | 0 | 2/2 | 3203ms | $0.0187 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 4/4 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 4/4 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 4/4 hit source haystack.**

---

## Adiburshan — burshanadi62@gmail.com
Source: 2 experiences, 0 projects, 7 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 5 | ✓ | 0 | 0 | — | 3346ms | $0.0276 | ok |
| `gpt-4o (Option A)` | 6 | ✓ | 0 | 0 | — | 2811ms | $0.0108 | ok |
| `sonnet (Option A)` | 10 | ✓ | 0 | 0 | — | 2836ms | $0.0185 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 1/1 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 1/1 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 2/2 hit source haystack.**

---

## Dan Sonnenblick  — dan.sonnenblick@gmail.com
Source: 1 experiences, 0 projects, 0 proof_signals, 1 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 2 | ✓ | 0 | 0 | — | 2300ms | $0.0232 | ok |
| `gpt-4o (Option A)` | 1 | ✓ | 0 | 0 | — | 2033ms | $0.0053 | ok |
| `sonnet (Option A)` | 7 | ✓ | 0 | 0 | — | 4960ms | $0.0115 | ok |

### gpt-4o (Option A) — detail

**Numeric tokens: 1/1 hit source haystack.**

---

## Daniella Fine — danzfine@gmail.com
Source: 3 experiences, 0 projects, 7 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 8 | ✓ | 0 | 0 | — | 2757ms | $0.0276 | ok |
| `gpt-4o (Option A)` | 10 | ✓ | 0 | 0 | — | 10069ms | $0.0117 | ok |
| `sonnet (Option A)` | 10 | ✓ | 0 | 0 | — | 1772ms | $0.0184 | ok |

---

## David Lifschitz — david.p.lifschitz@gmail.com
Source: 2 experiences, 1 projects, 10 proof_signals, 1 education entries.

**Source numbers detected (target for carry-through):**
- idx_0: 50% · 96% · 62% · 100%

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 7 | ✓ | 0 | 2 | 4/4 | 3462ms | $0.0314 | ok |
| `gpt-4o (Option A)` | 9 | ✓ | 0 | 2 | 4/4 | 4669ms | $0.0160 | ok |
| `sonnet (Option A)` | 10 | ✓ | 0 | 2 | 4/4 | 6415ms | $0.0240 | ok |

### gpt-4o (prod-snap) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`50% to 96` — "Designed and deployed an agentic intelligent search solution, improving accuracy and relevance of results from 50% to 96% and 62% to 100%."
- [professional_experiences] matched=`62% to 100` — "Designed and deployed an agentic intelligent search solution, improving accuracy and relevance of results from 50% to 96% and 62% to 100%."

**Numeric tokens: 7/7 hit source haystack.**

### gpt-4o (Option A) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`50% to 96` — "Designed and deployed an intelligent search solution, improving result accuracy and relevance from 50% to 96% and 62% to 100%."
- [professional_experiences] matched=`62% to 100` — "Designed and deployed an intelligent search solution, improving result accuracy and relevance from 50% to 96% and 62% to 100%."

**Numeric tokens: 8/8 hit source haystack.**

### sonnet (Option A) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`50% to 96` — "Designed and deployed an agentic intelligent search solution, raising result accuracy from 50% to 96% and relevance from 62% to 100%."
- [professional_experiences] matched=`62% to 100` — "Designed and deployed an agentic intelligent search solution, raising result accuracy from 50% to 96% and relevance from 62% to 100%."

**Numeric tokens: 7/7 hit source haystack.**

---

## Gabriel Book — gavibook@gmail.com
Source: 5 experiences, 0 projects, 10 proof_signals, 1 education entries.

**Source numbers detected (target for carry-through):**
- idx_0: $18M
- idx_1: 59% · 99% · 19% · $1M · 40%
- idx_2: $1B
- idx_3: $156M · $65M · $370M · $2.7M

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 14 | ✓ | 0 | 0 | 7/11 | 4460ms | $0.0335 | ok |
| `gpt-4o (Option A)` | 13 | ✓ | 0 | 0 | 7/11 | 5931ms | $0.0185 | ok |
| `sonnet (Option A)` | 21 | ✓ | 0 | 1 | 11/11 | 5957ms | $0.0321 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 9/9 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 7/7 hit source haystack.**

### sonnet (Option A) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`35–40` — "Identified $1M+ in revenue leakage and ~35–40% in outstanding balances through forensic analysis and KPI-driven pipeline optimization."

**Numeric tokens: 20/20 hit source haystack.**

---

## Jenna Grob — jenna.grob22@gmail.com
Source: 4 experiences, 0 projects, 10 proof_signals, 1 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 13 | ✓ | 0 | 0 | — | 4447ms | $0.0324 | ok |
| `gpt-4o (Option A)` | 16 | ✓ | 0 | 0 | — | 5167ms | $0.0160 | ok |
| `sonnet (Option A)` | 14 | ✓ | 0 | 0 | — | 5031ms | $0.0250 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 1/1 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 1/1 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 1/1 hit source haystack.**

---

## Matthew Jordan Borlak — matiborlak@gmail.com
Source: 3 experiences, 2 projects, 9 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 9 | ✗ military_experiences=[2] | 0 | 0 | — | 3156ms | $0.0292 | ok |
| `gpt-4o (Option A)` | 8 | ✗ military_experiences=[2] | 0 | 0 | — | 4909ms | $0.0140 | ok |
| `sonnet (Option A)` | 12 | ✓ | 0 | 0 | — | 3240ms | $0.0218 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 3/3 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 3/3 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 4/4 hit source haystack.**

---

## Michael S. Sobol — michael@sobol.cc
Source: 5 experiences, 0 projects, 10 proof_signals, 2 education entries.

**Source numbers detected (target for carry-through):**
- idx_0: 30% · 50% · $30 · $50m
- idx_2: 35%

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 14 | ✓ | 0 | 1 | 5/5 | 3723ms | $0.0328 | ok |
| `gpt-4o (Option A)` | 16 | ✓ | 0 | 1 | 5/5 | 5883ms | $0.0187 | ok |
| `sonnet (Option A)` | 22 | ✓ | 1 | 1 | 5/5 | 1932ms | $0.0326 | ok |

### gpt-4o (prod-snap) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`30%-50` — "Accelerated 7 GenAI/Agentic AI initiatives, achieving 30%-50% productivity gains and $30-$50mm annual benefits."

**Numeric tokens: 7/7 hit source haystack.**

### gpt-4o (Option A) — detail

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`30%-50` — "Led GenAI/Agentic AI initiatives, boosting productivity by 30%-50% and generating $30-$50mm in annual benefits."

**Numeric tokens: 6/6 hit source haystack.**

### sonnet (Option A) — detail

**Unsourced bullets:**
- [professional_experiences] tokens=[14] — "Supported client-facing businesses through platform modernization and process improvement initiatives over 14 years."

**Range tokens (manual-review flag, not a failure):**
- [professional_experiences] matched=`30%–50` — "Coordinated GenAI and Agentic AI use case roadmaps across 7 initiatives, yielding 30%–50% productivity gains and $30–$50M in annual benefits."

**Numeric tokens: 9/10 hit source haystack.**
Misses: `14` (professional_experiences)

---

## Nevo Liani — nevo.liani@gmail.com
Source: 6 experiences, 0 projects, 9 proof_signals, 2 education entries.

**Source numbers detected (target for carry-through):**
- idx_1: 12%
- idx_2: 15%

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 9 | ✗ military_experiences=[4,5] | 0 | 0 | 2/2 | 3430ms | $0.0296 | ok |
| `gpt-4o (Option A)` | 8 | ✗ military_experiences=[4] | 0 | 0 | 2/2 | 4331ms | $0.0124 | ok |
| `sonnet (Option A)` | 15 | ✓ | 0 | 0 | 2/2 | 3044ms | $0.0221 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 5/5 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 5/5 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 5/5 hit source haystack.**

---

## Ofri Raichelson — ofriraichel@gmail.com
Source: 5 experiences, 0 projects, 6 proof_signals, 1 education entries.

**Source numbers detected (target for carry-through):**
- idx_0: 8M · 60%
- idx_2: 95%
- idx_4: 100 students

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 10 | ✓ | 0 | 0 | 4/4 | 3385ms | $0.0290 | ok |
| `gpt-4o (Option A)` | 5 | ✓ | 0 | 0 | 4/4 | 2786ms | $0.0113 | ok |
| `sonnet (Option A)` | 11 | ✓ | 1 | 0 | 4/4 | 5588ms | $0.0202 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 8/8 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 8/8 hit source haystack.**

### sonnet (Option A) — detail

**Unsourced bullets:**
- [professional_experiences] tokens=[1,200] — "Mapped 1,200 Israeli B2C startups, identifying behavioral and market trends through quantitative research to support investment focus."

**Numeric tokens: 8/9 hit source haystack.**
Misses: `1,200` (professional_experiences)

---

## Ella Galer — redheadeg@gmail.com
Source: 0 experiences, 0 projects, 7 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 4 | ✓ | 0 | 0 | — | 2666ms | $0.0266 | ok |
| `gpt-4o (Option A)` | 0 | ✓ | 0 | 0 | — | 1665ms | $0.0078 | ok |
| `sonnet (Option A)` | 7 | ✓ | 0 | 0 | — | 3568ms | $0.0157 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 2/2 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 2/2 hit source haystack.**

---

## Penelope L. Galitzer — rhinepenelope@gmail.com
Source: 4 experiences, 0 projects, 9 proof_signals, 2 education entries.

**Source numbers detected (target for carry-through):**
- idx_0: 20% · 5% · 23% · 500K · 1M
- idx_1: 20%
- idx_2: 500%

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 14 | ✗ volunteering_experiences=[3] | 0 | 0 | 6/7 | 3845ms | $0.0314 | ok |
| `gpt-4o (Option A)` | 17 | ✗ volunteering_experiences=[3] | 0 | 0 | 7/7 | 4438ms | $0.0153 | ok |
| `sonnet (Option A)` | 18 | ✓ | 0 | 0 | 7/7 | 1968ms | $0.0259 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 11/11 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 17/17 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 19/19 hit source haystack.**

---

## Raphael Press — rpress13@gmail.com
Source: 5 experiences, 0 projects, 9 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 13 | ✓ | 0 | 0 | — | 3479ms | $0.0302 | ok |
| `gpt-4o (Option A)` | 18 | ✓ | 0 | 0 | — | 4433ms | $0.0150 | ok |
| `sonnet (Option A)` | 18 | ✓ | 0 | 0 | — | 3424ms | $0.0240 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 1/1 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 1/1 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 1/1 hit source haystack.**

---

## GIDON WERNER — werner.gidon@gmail.com
Source: 3 experiences, 0 projects, 10 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 9 | ✗ military_experiences=[2] | 0 | 0 | — | 4007ms | $0.0314 | ok |
| `gpt-4o (Option A)` | 9 | ✗ military_experiences=[2] | 1 | 0 | — | 4410ms | $0.0149 | ok |
| `sonnet (Option A)` | 10 | ✓ | 0 | 0 | — | 3137ms | $0.0224 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 1/1 hit source haystack.**

### gpt-4o (Option A) — detail

**Unsourced bullets:**
- [projects] tokens=[MBA] — "Conducted a comprehensive risk assessment project as part of the MBA program at Bar Ilan University, focusing on identifying and mitigating potential business risks."

**Numeric tokens: 1/2 hit source haystack.**
Misses: `MBA` (projects)

### sonnet (Option A) — detail

**Numeric tokens: 4/4 hit source haystack.**

---

## Yonah Bar-Shain — ybarshain@gmail.com
Source: 0 experiences, 0 projects, 12 proof_signals, 0 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 3 | ✓ | 0 | 0 | — | 2735ms | $0.0287 | ok |
| `gpt-4o (Option A)` | 8 | ✓ | 0 | 0 | — | 4394ms | $0.0128 | ok |
| `sonnet (Option A)` | 12 | ✓ | 0 | 0 | — | 2928ms | $0.0230 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 1/1 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 3/3 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 7/7 hit source haystack.**

---

## Yacova (Mayberg) Margolis — ymayberg@gmail.com
Source: 5 experiences, 0 projects, 8 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 11 | ✗ military_experiences=[4] | 1 | 0 | — | 3232ms | $0.0300 | ok |
| `gpt-4o (Option A)` | 10 | ✗ military_experiences=[4] | 0 | 0 | — | 10390ms | $0.0129 | ok |
| `sonnet (Option A)` | 11 | ✓ | 1 | 0 | — | 2427ms | $0.0220 | ok |

### gpt-4o (prod-snap) — detail

**Unsourced bullets:**
- [military_experiences] tokens=[727] — "Received 'Lone Soldier Certificate' and 'Excellence' award for personal fitness performance in Unit 727."

**Numeric tokens: 2/3 hit source haystack.**
Misses: `727` (military_experiences)

### gpt-4o (Option A) — detail

**Numeric tokens: 2/2 hit source haystack.**

### sonnet (Option A) — detail

**Unsourced bullets:**
- [professional_experiences] tokens=[727] — "Received an excellence award for personal fitness performance results during service with Unit 727."

**Numeric tokens: 2/3 hit source haystack.**
Misses: `727` (professional_experiences)

---

## Zachary Brown — zaczbrown@gmail.com
Source: 7 experiences, 0 projects, 8 proof_signals, 2 education entries.

| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `gpt-4o (prod-snap)` | 17 | ✗ military_experiences=[6] | 0 | 0 | — | 5194ms | $0.0321 | ok |
| `gpt-4o (Option A)` | 12 | ✗ military_experiences=[6] | 0 | 0 | — | 4187ms | $0.0139 | ok |
| `sonnet (Option A)` | 13 | ✓ | 0 | 0 | — | 2095ms | $0.0229 | ok |

### gpt-4o (prod-snap) — detail

**Numeric tokens: 5/5 hit source haystack.**

### gpt-4o (Option A) — detail

**Numeric tokens: 4/4 hit source haystack.**

### sonnet (Option A) — detail

**Numeric tokens: 4/4 hit source haystack.**
