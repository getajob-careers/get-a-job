# Match-quality eval - AI pre-labeling DRAFT (for Eli's override)

**This is an AI first pass, not ground truth.** Eli reviews and overrides; his overrides are the ground truth. Once he is done, compute the **AI-vs-Eli disagreement rate** (per label and per profile) and report it.

- **Labeler:** Claude Opus, 4 independent passes (4 profiles each). **Opus is NOT part of the scoring pipeline** (ranking = deterministic `scoreJobFit`; product LLMs are gpt-4o / gpt-5.4-mini / sonnet), so the judge shares no model with what it evaluates.
- **Rubric:** GOOD = right to show in top picks (role + level + domain fit). STRETCH = fair as a growth/aspirational suggestion (adjacent role, a level up, partial fit). BAD = should not be near the top (wrong role family, wrong level, or the match rests on generic/noise skills).
- **Source:** `docs/eval/match-eval-labels.md` (the frozen live top-10 per profile). rank/fit%/title/company are verbatim; LABEL + rationale are the AI's.
- **How to use:** skim each row, change the LABEL where you disagree, tweak notes. Diff this against your finished `match-eval-labels.md` to get the disagreement rate.

---

## P01 - Data (jr->mid)

| rank | fit% | title                            | company       | LABEL   | rationale                                                                                         |
| ---- | ---- | -------------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------- |
| 1    | 90%  | Business Operations Analyst      | NICE Systems  | GOOD    | data_analysis/bi/dashboarding bizops-analyst role at Mid, squarely on the Business Analyst target |
| 2    | 84%  | Senior Operations Manager        | Mixtiles      | BAD     | ops-manager role, Senior level-up, whole match rests on lone generic analytical_thinking          |
| 3    | 80%  | Business Operations Manager      | Kaltura       | STRETCH | bizops manager is adjacent but finance-forecasting flavored, not a data-analyst seat              |
| 4    | 79%  | Senior DevOps Consultant         | Elsight       | BAD     | wrong role family (DevOps), 10+y senior, single generic mentoring match                           |
| 5    | 78%  | AI Operations Assistant          | DriveNets     | STRETCH | python/sql/data skills match core well, but "assistant" ops title sits below a mid analyst        |
| 6    | 78%  | Business Applications Specialist | NoTraffic     | STRETCH | business_analysis is on-target but a lone match and this is really a CRM/systems seat             |
| 7    | 70%  | Business Operations Manager      | Zafran        | BAD     | ops-manager role, match is one generic stakeholder_management, no data content                    |
| 8    | 70%  | Business Applications Specialist | Eitan Medical | BAD     | zero matched skills, systems-admin role rather than data/business analyst                         |
| 9    | 65%  | Credit Risk Analyst              | Cross River   | BAD     | credit-risk finance role, match is only generic comms/presentation noise                          |
| 10   | 61%  | Operations and QA Manager        | SuperPlay     | BAD     | ops/QA-manager role, core is attention_to_detail/organization, sql match is incidental            |

## P02 - Data (senior)

| rank | fit% | title                       | company               | LABEL   | rationale                                                                   |
| ---- | ---- | --------------------------- | --------------------- | ------- | --------------------------------------------------------------------------- |
| 1    | 95%  | Data Analyst                | Rapyd                 | GOOD    | exact target role, sql/python/analytical core, senior level match           |
| 2    | 95%  | Senior Data Analyst         | One Zero Digital Bank | GOOD    | on-target senior data-analyst role, sql/data_analysis/agile all aligned     |
| 3    | 95%  | Senior Data Analyst         | Holisto               | GOOD    | exact target, sql/data_modeling/python core met at senior level             |
| 4    | 93%  | Senior Data Analyst         | Melio                 | GOOD    | title and level are the target dead-on; thin core (sql) but right role      |
| 5    | 92%  | Senior Data Analyst         | Viber                 | GOOD    | on-target senior role, strong data_analysis/storytelling/viz overlap        |
| 6    | 91%  | Senior Data Analyst         | 365Scores             | GOOD    | on-target role, bi/data_analysis match, right family                        |
| 7    | 91%  | Business Analytics Engineer | Guidde                | GOOD    | data-analytics role, bi/dashboarding/sql/data_analysis all match            |
| 8    | 89%  | Data Analyst                | Autofleet             | GOOD    | exact target role at senior, python/data_analysis core met                  |
| 9    | 88%  | Business Analyst            | Unity                 | STRETCH | adjacent BA role but pitched Entry_Mid, a level down for a senior candidate |
| 10   | 87%  | Business Analyst            | Gett                  | STRETCH | BA is adjacent, Entry_Mid/masters framing is under-leveled for senior       |

## P03 - HR/Talent (mid)

| rank | fit% | title                            | company         | LABEL   | rationale                                                                             |
| ---- | ---- | -------------------------------- | --------------- | ------- | ------------------------------------------------------------------------------------- |
| 1    | 95%  | Operations PMO                   | Jeen.ai         | STRETCH | bizops-adjacent, but 95% rests on jira/automation tooling, not people-ops fit         |
| 2    | 78%  | Store Manager                    | Wolt            | STRETCH | genuine talent_acquisition/lifecycle skill match, but retail store role, wrong domain |
| 3    | 77%  | Strategic Program Manager        | Fullpath        | BAD     | senior program-management level-up, match is only automation tooling                  |
| 4    | 70%  | Business Operations Manager      | Zafran          | STRETCH | bizops target family but a single generic stakeholder_management match                |
| 5    | 70%  | Office & Operations Manager      | Liquidity Group | STRETCH | office/ops adjacent to bizops, but EA/executive-support flavored                      |
| 6    | 70%  | Business Operations Analyst      | NICE Systems    | STRETCH | bizops-analyst adjacent, leans data_analysis rather than people-ops                   |
| 7    | 70%  | Business Applications Specialist | Eitan Medical   | BAD     | zero matched skills, systems-admin role off the people/bizops target                  |
| 8    | 65%  | Business Operations              | CommIT          | STRETCH | bizops target family, but match is only workflow/scripting automation                 |
| 9    | 64%  | Office & Operations Manager      | Qodo            | STRETCH | office-ops adjacent, ml_fundamentals match is noise                                   |
| 10   | 63%  | Business Operations Manager      | Kaltura         | STRETCH | finance-forecasting bizops, partial generic overlap, not people-ops                   |

## P04 - HR (senior)

| rank | fit% | title                                    | company            | LABEL   | rationale                                                                                 |
| ---- | ---- | ---------------------------------------- | ------------------ | ------- | ----------------------------------------------------------------------------------------- |
| 1    | 70%  | Senior FP&A Analyst                      | Atera              | STRETCH | finance-adjacent and senior, but FP&A is not the Comp&Benefits/People-Analytics target    |
| 2    | 61%  | Assistant Controller                     | OurCrowd           | BAD     | zero matched skills, accounting/controller role at Entry_Mid, below senior and off-target |
| 3    | 56%  | Senior FP&A Analyst                      | Silverfort         | STRETCH | finance-adjacent modeling/excel match, but FP&A function not C&B                          |
| 4    | 54%  | FP&A Business Partner, Finance           | Medison Pharma     | STRETCH | finance partner, senior level fits, but wrong HR function                                 |
| 5    | 53%  | Senior FP&A Business Partner             | Payoneer           | STRETCH | finance-adjacent, single financial_modeling match, not comp/people                        |
| 6    | 50%  | Senior FP&A Analyst                      | Pixellot           | STRETCH | FP&A finance role, match rests on lone non-core dashboarding                              |
| 7    | 49%  | FP&A Business Partner                    | AppsFlyer          | STRETCH | finance-adjacent but thin single generic presentation match                               |
| 8    | 70%  | QA Specialist                            | Eitan Medical      | BAD     | quality-assurance role, wrong family, match is generic excel/presentation                 |
| 9    | 64%  | Senior Compensation &Benefits Consultant | EY (Ernst & Young) | GOOD    | exact target role (Comp&Benefits) at senior; on-function despite empty skill row          |
| 10   | 62%  | Tax Manager                              | Deloitte           | BAD     | tax/accounting function, Mid not senior, zero matched skills, off-target                  |

## P05 - Sales/CS (entry)

| rank | fit% | title                                 | company     | LABEL   | rationale                                                                                                 |
| ---- | ---- | ------------------------------------- | ----------- | ------- | --------------------------------------------------------------------------------------------------------- |
| 1    | 70%  | Senior Revenue & Growth Analyst       | Nift        | STRETCH | good analyst-role fit on data/sql skills, but 5-7y Senior is well above a junior/entry candidate          |
| 2    | 64%  | BI Analyst                            | Insightec   | STRETCH | solid skill overlap (bi_tools/dashboarding) but 5+y Senior gates out an entry candidate                   |
| 3    | 51%  | Sales Operations Manager              | Surecomp    | STRETCH | Ops-Manager target aligns, but match rests on generic analytics skills; misses core salesforce/CRM/revops |
| 4    | 87%  | Marketing Manager                     | KPMG Israel | BAD     | 87% rests on a single generic skill (project_management); Marketing Manager is off-target and 3-4y Mid    |
| 5    | 85%  | Product Manager                       | Skai        | BAD     | 85% on one skill (excel_advanced_finance); role is 5-6y Senior, far above entry despite PM target         |
| 6    | 77%  | Technical Product Manager             | Walkme      | BAD     | inflated by lone analytical_thinking; Senior technical PM, wrong level and depth for entry                |
| 7    | 76%  | Technical Product Manager             | Jeen.ai     | STRETCH | PM target + real product skills matched, but RAG/ML core and 3+y Mid make it aspirational                 |
| 8    | 74%  | Product Manager                       | Fetcherr    | STRETCH | on-target PM with genuine product_strategy/discovery match, but 5+y Senior is a big level jump            |
| 9    | 72%  | Content Marketing Manager - Temporary | Kaltura     | BAD     | single generic skill (cross_functional_collaboration); off-target marketing role                          |
| 10   | 70%  | Product Manager                       | AU10TIX     | STRETCH | closest PM fit (2-3y Entry_Mid, real product+analytical match) though slightly above entry                |

## P06 - BD/Partnerships (jr)

| rank | fit% | title                           | company              | LABEL   | rationale                                                                                         |
| ---- | ---- | ------------------------------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| 1    | 80%  | Project Manager                 | TailorMed            | STRETCH | both matched skills fit BD comms, but PM is an adjacent role and "any sen" hides seniority        |
| 2    | 66%  | Project Manager                 | Enercon Technologies | STRETCH | comms/presentation fit, entry-mid level ok, but PM is off-axis from BD/partnerships               |
| 3    | 55%  | Internal Audit Associate (CPA)  | Deloitte             | BAD     | match is one generic skill (problem_solving); CPA audit is wrong role family                      |
| 4    | 51%  | Technical Operations Specialist | Sunflower            | BAD     | tech-ops role, match on automation skills unrelated to BD/partnerships                            |
| 5    | 49%  | R&D Project Manager             | CYE                  | BAD     | zero matched skills; R&D PM unrelated to a junior BD profile                                      |
| 6    | 75%  | Merchant Finance Associate      | Wolt                 | STRETCH | strong 5-skill overlap and entry-mid level; finance-adjacent but plausible commercial role        |
| 7    | 70%  | Support & Enablement Specialist | OneStep              | STRETCH | no matched skills, but entry-mid customer-facing enablement is a reasonable adjacent landing spot |
| 8    | 62%  | Employee Experience Specialist  | Tenable              | BAD     | no matched skills; HR/EX role off-target for BD                                                   |
| 9    | 62%  | Sales Associate                 | Waterfall Security   | GOOD    | entry-mid commercial sales role directly on the BD/partnerships axis for a junior                 |
| 10   | 62%  | Talent Acquisition Associate    | Moon Active          | BAD     | no matched skills; recruiting role wrong family for BD                                            |

## P07 - Customer Success (jr)

| rank | fit% | title                              | company              | LABEL   | rationale                                                                                            |
| ---- | ---- | ---------------------------------- | -------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| 1    | 95%  | CRM Project Manager                | Abra R&D             | STRETCH | strong 3-skill match on CS-relevant comms/stakeholder, but PM role and 3+y Mid sit above a junior CS |
| 2    | 82%  | QA Specialist                      | Eitan Medical        | BAD     | match rests on excel/presentation; QA is wrong role family for customer success                      |
| 3    | 80%  | Import-Export Coordinator          | BIRD Aerosystems     | BAD     | 80% on one generic skill (cross_functional_collaboration); logistics role off-target                 |
| 4    | 80%  | Project Manager                    | TailorMed            | STRETCH | customer_communication/presentation fit CS, but PM is adjacent not core CS                           |
| 5    | 81%  | Project Manager                    | Enercon Technologies | STRETCH | comms+PM match, entry-mid; adjacent coordination role, reasonable growth pick                        |
| 6    | 75%  | Project Manager                    | Global-e             | STRETCH | coaching/leadership overlap fits CS, but PM role at 3-5y Mid is above a junior                       |
| 7    | 70%  | RMA Specialist                     | Elmo Motion Control  | BAD     | no matched skills; returns/hardware support is wrong family for SaaS CS                              |
| 8    | 70%  | Data Center Project Manager        | Amazon               | BAD     | infra PM with technical core; wrong role and domain for junior CS                                    |
| 9    | 68%  | Project Manager                    | inManage             | STRETCH | emotional_intelligence/stakeholder overlap fits CS soft-skills; entry-mid PM, adjacent               |
| 10   | 68%  | Client and Collections Coordinator | Deloitte             | STRETCH | client-facing entry-mid role touches CS comms, though collections is finance-leaning                 |

## P08 - Product (mid)

| rank | fit% | title                     | company       | LABEL   | rationale                                                                                       |
| ---- | ---- | ------------------------- | ------------- | ------- | ----------------------------------------------------------------------------------------------- |
| 1    | 95%  | Technical Product Manager | Rounds        | GOOD    | on-target TPM, all four cloud/product core skills matched, senior level fits the set            |
| 2    | 89%  | Technical Product Manager | Jeen.ai       | GOOD    | strong TPM fit with product+ML skills matched; 3+y Mid aligns cleanly                           |
| 3    | 88%  | Product Operation Manager | Port          | STRETCH | 88% on a single generic skill (cross_functional_collaboration); product-adjacent but thin match |
| 4    | 87%  | Product Manager           | Skai          | BAD     | 87% rests on one skill (excel_advanced_finance); no product_strategy/discovery evidence         |
| 5    | 83%  | Senior Product Manager    | Checkmarx     | GOOD    | core PM skills (strategy/stakeholder/comms) matched, senior level fits                          |
| 6    | 82%  | Product Manager           | Upwind        | GOOD    | cloud/technical-leadership PM match on-target; cybersecurity core is a learnable domain gap     |
| 7    | 82%  | Product Manager           | Fetcherr      | GOOD    | genuine product_strategy/discovery/stakeholder match, on-target PM                              |
| 8    | 79%  | Senior Product Manager    | Aqua Security | GOOD    | five relevant skills incl api/cloud matched; strong senior PM fit despite 7+y bar               |
| 9    | 78%  | Senior Product Manager    | Riverside.fm  | GOOD    | core data/user-behavior match aligns with product discovery; solid senior PM fit                |
| 10   | 78%  | Senior Product Manager    | Rounds        | GOOD    | product_strategy/discovery/stakeholder all matched; on-target and level-appropriate             |

## P09 - Product (senior)

| rank | fit% | title                                  | company      | LABEL   | rationale                                                                                          |
| ---- | ---- | -------------------------------------- | ------------ | ------- | -------------------------------------------------------------------------------------------------- |
| 1    | 95%  | Product Growth Manager                 | Guardio      | STRETCH | Relevant growth-PM area but Mid level, a step down from a senior aiming VP/Head                    |
| 2    | 95%  | Senior Product Manager                 | Checkmarx    | GOOD    | Senior PM with all four core PM skills (strategy/roadmap/stakeholder) matched                      |
| 3    | 95%  | Product Manager                        | Fetcherr     | GOOD    | Senior-level PM, strong product_strategy/discovery core fit                                        |
| 4    | 93%  | Monetization Manager                   | Play Perfect | BAD     | 93% rests on lone generic analytical_thinking; Mid gaming-monetization, off-core and under-leveled |
| 5    | 90%  | Group Product Manager - Product Growth | Unframe      | GOOD    | Lead_Manager group-PM role directly on the leadership target, strong PM core                       |
| 6    | 90%  | Product Manager, Product-Led Growth    | Kaltura      | STRETCH | Strong PM/PLG skill overlap but Mid level, below the director-track target                         |
| 7    | 90%  | Data Platform Product Group Lead       | Navina       | GOOD    | Product leadership (group lead) role fits VP/Head target; level-appropriate                        |
| 8    | 89%  | Product Manager                        | Teads        | STRETCH | Solid PM core match but Mid level for a senior candidate                                           |
| 9    | 89%  | Product Lead                           | Loora        | GOOD    | Senior product lead, strong product_strategy/discovery fit                                         |
| 10   | 88%  | Product Operation Manager              | Port         | BAD     | 88% on one generic cross_functional skill; Entry_Mid product-ops, wrong level and adjacent role    |

## P10 - Finance (mid)

| rank | fit% | title                             | company    | LABEL   | rationale                                                                                                    |
| ---- | ---- | --------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | 95%  | Senior FP&A Analyst               | Wonderful  | GOOD    | All four finance cores (modeling/budget/forecasting) matched, senior-titled FP&A                             |
| 2    | 85%  | Senior Finance Manager            | 365Scores  | GOOD    | Senior finance-manager role maps to the reporting/accounting-manager target with financial_reporting matched |
| 3    | 76%  | Senior Financial Business Analyst | Cellebrite | STRETCH | Good finance skills but Mid, BI-flavored analyst rather than the manager-level target                        |
| 4    | 72%  | Senior FP&A Analyst               | Pixellot   | GOOD    | Senior FP&A, budget/forecasting/resource cores matched                                                       |
| 5    | 72%  | FP&A Analyst                      | Kaltura    | STRETCH | Mid FP&A on largely generic cores (excel/communication/attention)                                            |
| 6    | 71%  | FP&A Business Partner             | Orca AI    | STRETCH | Strong skill overlap but Entry_Mid (1-2y), well below a senior candidate                                     |
| 7    | 70%  | Senior FP&A Analyst               | Atera      | GOOD    | Senior FP&A, financial_modeling/excel matched (sql/saas gaps aside)                                          |
| 8    | 70%  | Senior FP&A Analyst               | Silverfort | GOOD    | Strong forecasting/modeling core match, senior-titled FP&A                                                   |
| 9    | 65%  | Financial & Business Analyst      | Panaya     | STRETCH | Full skill overlap but Mid, BI/analyst role below the target level                                           |
| 10   | 64%  | Senior FP&A Analyst               | Melio      | STRETCH | Senior FP&A but match rests on generic excel + communication                                                 |

## P11 - Marketing (mid)

| rank | fit% | title                              | company         | LABEL   | rationale                                                                                                   |
| ---- | ---- | ---------------------------------- | --------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | 85%  | Product Marketing Manager          | KLA             | BAD     | 85% on lone market_research; Senior PMM, wrong level and off the content/social target                      |
| 2    | 82%  | Brand & Marketing Design Team Lead | Connecteam      | STRETCH | Design/brand relevant to content-designer target but a Lead_Manager step up from Mid                        |
| 3    | 80%  | Product Marketing Manager - IL     | ScaleOps        | STRETCH | Mid PMM, thin single-core (go_to_market); adjacent sub-discipline, not content/social                       |
| 4    | 74%  | Product Marketing Manager          | Empathy         | STRETCH | Mid PMM with GTM/campaign overlap but off the content/social target family                                  |
| 5    | 72%  | Marketing Manager                  | Teads           | GOOD    | Mid marketing-manager with content_strategy core and five matched skills incl copywriting/data_storytelling |
| 6    | 70%  | Brand Marketing Manager            | Guardio         | STRETCH | Brand marketing is adjacent but 70% has zero matched skills to support it                                   |
| 7    | 69%  | Product Marketing Manager          | Appcharge       | STRETCH | Senior PMM; copywriting overlap but level up and off-target sub-discipline                                  |
| 8    | 69%  | Product Marketing Manager          | Sisense         | STRETCH | Mid PMM with content_strategy core; adjacent to content marketing                                           |
| 9    | 65%  | Senior Content Marketing Manager   | Clover Security | STRETCH | Exact content-marketing target family but Senior level and no matched skills                                |
| 10   | 62%  | Product Marketing Manager          | Lema Labs       | STRETCH | Entry-Mid PMM, GTM/campaign overlap but not the content/social target                                       |

## P12 - Marketing (entry)

| rank | fit% | title                        | company                      | LABEL   | rationale                                                                                           |
| ---- | ---- | ---------------------------- | ---------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| 1    | 95%  | Product Marketing            | Cognyte                      | BAD     | 95% on lone market_research; Senior (6+y) role for a junior candidate                               |
| 2    | 87%  | Marketing Manager            | KPMG Israel (Somekh Chaikin) | STRETCH | project_management aligns with PM target at a consulting firm, but Mid, a level up from junior      |
| 3    | 80%  | Content Marketing Director   | Global-e                     | BAD     | Director_Head (7+y) role served to a junior - wildly over-leveled                                   |
| 4    | 77%  | Marketing Manager            | Teads                        | STRETCH | Strong marketing skill overlap but Mid level and off the consulting/PM target                       |
| 5    | 74%  | VP Marketing                 | Grain Finance                | BAD     | VP_Executive role for a junior candidate - extreme level mismatch                                   |
| 6    | 70%  | Head of Marketing            | Dualbird                     | BAD     | Senior head-of role, 8+y, no matched skills, for a junior                                           |
| 7    | 69%  | Growth Marketing Lead        | Directeam                    | BAD     | Senior lead (5-7y) far above a junior's level                                                       |
| 8    | 66%  | Field Marketing Manager      | Waterfall Security           | BAD     | Senior (5+y) manager role; PM overlap can't offset the level gap for a junior                       |
| 9    | 66%  | Senior Marketing Analyst     | Primis                       | STRETCH | Entry_Mid level actually fits a junior; analyst work is adjacent to the consulting/associate target |
| 10   | 65%  | Director / Head of Marketing | Regulus                      | BAD     | Director_Head (7+y) leadership role for a junior - wrong level                                      |

## P13 - Engineering (jr pivot)

| rank | fit% | title                                 | company                      | LABEL   | rationale                                                                       |
| ---- | ---- | ------------------------------------- | ---------------------------- | ------- | ------------------------------------------------------------------------------- |
| 1    | 75%  | IT Audit Consultant                   | KPMG Israel (Somekh Chaikin) | BAD     | audit/compliance role, none of Data/SWE/Sales; match rests on lone excel skill  |
| 2    | 60%  | Financial Consultant                  | Deloitte                     | BAD     | finance consulting, wrong role family; excel+ML noise match                     |
| 3    | 59%  | SAC consultant                        | Deloitte                     | STRETCH | analytics-cloud consulting is data-adjacent with real python/frontend overlap   |
| 4    | 54%  | Junior System Reliability Engineer    | Silk                         | STRETCH | engineering-adjacent junior role; python matched but core is linux/ops he lacks |
| 5    | 49%  | Junior NPI & Product Support Engineer | Audiocodes                   | BAD     | hardware support engineer off-target; single technical_documentation match      |
| 6    | 48%  | SOX Consultant                        | KPMG Israel (Somekh Chaikin) | BAD     | Lead_Manager seniority vs junior, zero skill match, wrong family                |
| 7    | 79%  | Junior QA                             | Quality AI                   | STRETCH | entry tech foothold but QA is off the stated targets; only jira matched         |
| 8    | 60%  | QA Engineer                           | SentryCS                     | BAD     | no matched skills and QA is off-target for this card                            |
| 9    | 45%  | Junior Software Engineer              | Nexar                        | GOOD    | bullseye on SWE target + junior level, right role to surface for a pivot        |
| 10   | 68%  | Senior DevOps Consultant              | Elsight                      | BAD     | 10+y Senior vs junior card; match is only mentoring                             |

## P14 - Engineering (senior)

| rank | fit% | title                    | company                | LABEL   | rationale                                                           |
| ---- | ---- | ------------------------ | ---------------------- | ------- | ------------------------------------------------------------------- |
| 1    | 93%  | Software Engineer        | SolarEdge Technologies | STRETCH | strong stack match but 2+y Mid sits below a senior->staff/EM target |
| 2    | 90%  | Software Engineer        | Sweet Security         | GOOD    | senior-level IC SWE, strong backend/cloud/api overlap               |
| 3    | 88%  | Senior Software Engineer | Sensi.AI               | GOOD    | senior SWE, core backend/python/api all matched                     |
| 4    | 83%  | Software Engineer        | Coralogix              | STRETCH | strong domain fit but Mid level is a step below target              |
| 5    | 82%  | DevOps Engineer          | Audiocodes             | STRETCH | DevOps is adjacent to SWE and Mid level; not the leadership target  |
| 6    | 81%  | Software Engineer        | Sett                   | GOOD    | senior (8+y) SWE with full python/backend match                     |
| 7    | 81%  | Software Engineer        | Shopic                 | STRETCH | strong skills but Mid level below senior card                       |
| 8    | 81%  | Senior Software Engineer | Unframe                | GOOD    | senior SWE, api/db/observability core matched                       |
| 9    | 81%  | DevOps Engineer          | Natural Intelligence   | STRETCH | DevOps family + Mid level, adjacent not on-target                   |
| 10   | 79%  | Senior Software Engineer | Dualbird               | GOOD    | senior SWE, aws/backend/python match on-target                      |

## P15 - Operations (pivot)

| rank | fit% | title                     | company           | LABEL   | rationale                                                                |
| ---- | ---- | ------------------------- | ----------------- | ------- | ------------------------------------------------------------------------ |
| 1    | 62%  | Systems Analyst           | Flex              | BAD     | not PM/FS/Frontend and zero matched skills backing the fit               |
| 2    | 83%  | Ad Operations - CTV       | Bulls Media       | BAD     | ad-ops role unrelated to targets; 83% rests on one troubleshooting skill |
| 3    | 72%  | AI Operations Assistant   | DriveNets         | STRETCH | ops role but python/sql overlap gives a dev-pivot toehold                |
| 4    | 57%  | Product Operations        | CommIT            | STRETCH | product-adjacent with strategy/discovery matched, feeds the PM target    |
| 5    | 55%  | Technical Project Manager | Jeen.ai           | STRETCH | TPM is PM-adjacent; PM/stakeholder skills matched                        |
| 6    | 55%  | AI Operations Engineer    | droxi             | STRETCH | dev role with frontend+api+python stack matching FS/Frontend targets     |
| 7    | 54%  | Systems Analyst           | ForSight Robotics | STRETCH | off-target title but strong data/python/sql overlap                      |
| 8    | 53%  | Technical Project Manager | Notch             | STRETCH | PM-adjacent TPM, api/stakeholder matched                                 |
| 9    | 52%  | Product Operations        | Ox Security       | STRETCH | product-ops in cyber domain, PM-adjacent pivot                           |
| 10   | 47%  | Technical Project Manager | AllCloud          | BAD     | 5+y Senior vs junior card; thin lone project_management match            |

## ELI - Eli (own account)

| rank | fit% | title                               | company   | LABEL   | rationale                                                             |
| ---- | ---- | ----------------------------------- | --------- | ------- | --------------------------------------------------------------------- |
| 1    | 87%  | Product Manager                     | Helfy     | GOOD    | direct PM target, entry-mid level, strong product-core skill match    |
| 2    | 69%  | Product Manager                     | AU10TIX   | GOOD    | on-target PM role at entry-mid with strategy/analytical match         |
| 3    | 57%  | Pentest Product Associate           | Wiz       | BAD     | pentest/security role, PM in name only; match is generic dev skills   |
| 4    | 52%  | Technical Associate Product Manager | Wiz       | STRETCH | APM title/level fits PM but core reqs are linux/windows admin         |
| 5    | 87%  | Sales Development Representative    | CommBox   | BAD     | SDR is sales, not PM; inflated 87% on sales-only skills               |
| 6    | 87%  | Customer Experience Specialist      | Guidde    | BAD     | CX role off-target; 87% rests on a single generic communication skill |
| 7    | 87%  | Marketing Manager                   | Ori       | BAD     | marketing/support role, not PM; two generic skills matched            |
| 8    | 87%  | Marketing Analyst                   | Sunflower | BAD     | marketing-analyst family, not PM, despite analytical overlap          |
| 9    | 87%  | Influencer Marketing Manager        | ZyG       | BAD     | influencer marketing far off PM; only two automation skills matched   |
| 10   | 87%  | Customer Success Manager            | Classiq   | BAD     | CSM family not PM; strong match but all on CS-specific skills         |

---

_AI pre-labels by Claude Opus (independent of the scoring pipeline). Eli overrides = ground truth. Compute AI-vs-Eli disagreement rate after his pass._
