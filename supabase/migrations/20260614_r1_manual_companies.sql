-- R1 net-new manual companies (2026-06-14, Track A).
--
-- Inserts 90 manually-found first-party careers pages into public.companies as
-- source='manual', verified=false, origin='r1_manual_2026-06'. These are custom
-- / unsupported-ATS careers pages: refresh-jobs NEVER fetches them (it reads
-- companies_il.json and filters on verified && api_url), so NO jobs auto-flow —
-- they populate the company directory / internship matching only. The 4
-- supported-ATS net-new companies (PayBox, Plus500, One Zero, Contentsquare)
-- land separately in companies_il.json (Track B) so refresh-jobs fetches them.
--
-- Dedup applied: dropped Pepper/Leumi (== existing Bank Leumi, leumi.co.il),
-- Arnon-Tadmor Levy (== existing Arnon, Tadmor-Levy, arnontl.com), and the
-- intra-list dup Shlomo Insurance (same careers page as Shlomo Group).
-- `ats` is tagged informationally where a platform was detected but is
-- unsupported/unharvestable (topmatch, oracle, adamtotal/comeet/workday/
-- successfactors with no working api_url) — refresh-jobs still won't fetch
-- them (api_url is NULL and they're not in companies_il.json).
--
-- ROLLBACK (single statement):
--   DELETE FROM public.companies WHERE source='manual' AND origin='r1_manual_2026-06';

INSERT INTO public.companies (name, domain, careers_url, industry, ats, source, verified, origin) VALUES
  ('Auto Center', 'autocenter.co.il', 'https://autocenter.co.il/career', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Avis', 'avis.co.il', 'https://avis.co.il/דרושים', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Carasso (freesbe)', 'freesbe.com', 'https://careers.freesbe.com/jobs', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Champion Motors', 'championmotors.co.il', 'https://championmotors.co.il/careers', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Colmobil', 'colmobil.co.il', 'https://colmobil.co.il/career-in-colmobil/jobs', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Delek Motors', 'delek-motors.co.il', 'https://delek-motors.co.il/קריירה', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Eldan', 'eldan.co.il', 'https://eldan.co.il/career', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Hertz', NULL, 'https://career.adamtotal.co.il', 'automotive', 'adamtotal', 'manual', false, 'r1_manual_2026-06'),
  ('Kia Israel', 'kia.com', 'https://kia.com/eu/about-kia/career', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Lubinski', 'lubinski.co.il', 'https://lubinski.co.il/job', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Shlomo Group', 'shlomo-bit.co.il', 'https://shlomo-bit.co.il/career', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('UMI', 'umigroup.co.il', 'https://umigroup.co.il/careers', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Union Motors', 'unioncareer.co.il', 'https://unioncareer.co.il', 'automotive', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Albar', 'albar.co.il', 'https://albar.co.il/מודעות-דרושים', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Cal', 'cal-online.co.il', 'https://cal-online.co.il/about/jobs', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Bank Yahav', 'bank-yahav.co.il', 'https://bank-yahav.co.il/about/jobs', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Masad Bank', 'bankmassad.co.il', 'https://bankmassad.co.il', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Mercantile', 'mercantile.co.il', 'https://mercantile.co.il/private/about-mercantile/career', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Altshuler Shaham', 'as-invest.co.il', 'https://as-invest.co.il/about/קריירה', 'finance', 'topmatch', 'manual', false, 'r1_manual_2026-06'),
  ('BTB', 'btbisrael.co.il', 'https://btbisrael.co.il/en/careers-en', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Cardcom', 'cardcom.solutions', 'https://cardcom.solutions/careers', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Excellence', 'xnes.co.il', 'https://xnes.co.il/jobs', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Hyp', 'caspit.co.il', 'https://caspit.co.il/work-with-us', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('IBI', 'ibi.co.il', 'https://ibi.co.il/career', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Isracard', 'isracard.co.il', 'https://marketing.isracard.co.il/careershome/jobs', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('MAX', 'max.co.il', 'https://max.co.il/jobs/lobby', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Magma', 'magmagroup.co.il', 'https://magmagroup.co.il/jobs', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Meitav', NULL, 'https://careers.topmatch.co.il/Meitav', 'finance', 'topmatch', 'manual', false, 'r1_manual_2026-06'),
  ('Mimun Yashir', '5555.co.il', 'https://5555.co.il/דרושים', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Mor', NULL, 'https://careers.topmatch.co.il/MoreInvest', 'finance', 'topmatch', 'manual', false, 'r1_manual_2026-06'),
  ('Psagot', 'psagot.co.il', 'https://psagot.co.il/en/careers', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Tarya', 'tarya.co.il', 'https://tarya.co.il/en/join-us', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Tranzila', 'tranzila.com', 'https://tranzila.com/careers.html', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Yelin Lapidot', 'yl-invest.co.il', 'https://yl-invest.co.il/wanted', 'finance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('AIG', 'aig.co.il', 'https://aig.co.il/jobs', 'insurance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Ayalon', 'ayalon-ins.co.il', 'https://ayalon-ins.co.il/career', 'insurance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Bituach Yashir', '555.co.il', 'https://555.co.il/about/career', 'insurance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Libra', 'lbr.co.il', 'https://lbr.co.il/קריירה-בליברה', 'insurance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('PassportCard', 'passportcard.co.il', 'https://passportcard.co.il/career', 'insurance', 'comeet', 'manual', false, 'r1_manual_2026-06'),
  ('Wesure', 'wesuregroup.com', 'https://wesuregroup.com/employment', 'insurance', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Holmes Place', 'holmesplace.co.il', 'https://holmesplace.co.il/jobs', 'consumer', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Space Fitness', 'spaceclub.co.il', 'https://spaceclub.co.il', 'consumer', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('ALYN', 'alyn.org', 'https://alyn.org/Were-hiring', 'healthcare', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Aman', 'aman.co.il', 'https://aman.co.il/careers', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Elad Systems', 'eladsoft.com', 'https://careers.eladsoft.com', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Malam Team', 'malamteam.com', 'https://malamteam.com/לובי-חיפוש-קריירה', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Matrix', 'matrix.co.il', 'https://matrix.co.il/jobs', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Ness Technologies', 'ness-tech.co.il', 'https://ness-tech.co.il/careers', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('One Technologies', 'one1.global', 'https://one1.global/careers', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('SQLink', 'sqlink.com', 'https://sqlink.com/career', 'it_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Yael Group', 'yaelgroup.com', 'https://yaelgroup.com/jobs', 'it_services', 'successfactors', 'manual', false, 'r1_manual_2026-06'),
  ('Amit', 'amit.co.il', 'https://amit.co.il/en/jobs-opportunities', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Chita', 'chitadelivery.co.il', 'https://chitadelivery.co.il/en/jobs-career-in-cheetah', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('DHL', 'dhl.com', 'https://careers.dhl.com/global/he', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('FedEx', 'fedex.com', 'https://fedex.com/en-il/about/careers', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Fritz', 'fritz.co.il', 'https://fritz.co.il/en/open-positions-page', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('HFD', 'hfd.co.il', 'https://hfd.co.il/דרושים', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Kuehne+Nagel', 'kuehne-nagel.com', 'https://jobs.kuehne-nagel.com', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('MSC', 'msc.com', 'https://msc.com/en/careers', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Maersk', 'maersk.com', 'https://maersk.com/careers', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('UTi', 'uti.co.il', 'https://uti.co.il/jobs', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Afikim', 'electra-afikim.co.il', 'https://electra-afikim.co.il/דרושים', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Fridenson', 'fridenson.co.il', 'https://fridenson.co.il/en/careers', 'logistics', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Agmon', 'agmon-law.co.il', 'https://agmon-law.co.il/en/join-us', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('APM', 'apm.law', 'https://apm.law/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Baker Tilly', NULL, 'https://bakertilly.wd5.myworkdayjobs.com/BTCareers', 'prof_services', 'workday', 'manual', false, 'r1_manual_2026-06'),
  ('Barnea', 'barlaw.co.il', 'https://barlaw.co.il/join-us', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Crowe', 'crowe.com', 'https://careers.crowe.com', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Erdinast', 'ebnlaw.co.il', 'https://ebnlaw.co.il/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Fahn Kanne Grant Thornton', 'grantthornton.co.il', 'https://grantthornton.co.il/en/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Fischer FBC', 'fbclawyers.com', 'https://fbclawyers.com/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Giza Singer Even', 'gse.co.il', 'https://lp.gse.co.il', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Gornitzky', 'gornitzky.com', 'https://gornitzky.com/career-qualified-lawyers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Gross Orad Schlimoff', 'goslaw.co.il', 'https://goslaw.co.il/recruiting', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Lipa Meir', 'lipa.co.il', 'https://lipa.co.il/en/career', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Naschitz Brandes', 'nblaw.com', 'https://nblaw.com/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Pearl Cohen', 'pearlcohen.com', 'https://pearlcohen.com/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Prometheus', 'global-pfa.com', 'https://global-pfa.com', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('RSM', 'rsm.global', 'https://rsm.global/israel/en/node/164', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('S. Friedman Abramson', 'sfa.law', 'https://sfa.law/en/career', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('S. Horowitz', 's-horowitz.com', 'https://s-horowitz.com/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Shibolet', 'shibolet.com', 'https://shibolet.com/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('TASC', 'tasc-consulting.com', 'https://tasc-consulting.com/careers', 'prof_services', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Granot', 'granot.co.il', 'https://hr.granot.co.il', 'agriculture', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Hishtil', 'hishtil.co.il', 'https://hishtil.co.il/לעבוד-בחישתיל', 'agriculture', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('888/Evoke', 'evokeplc.com', 'https://evokeplc.com/careers', 'tech', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Fundbox', 'fundbox.com', 'https://fundbox.com/careers', 'tech', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('SolarEdge', 'corporate.solaredge.com', 'https://corporate.solaredge.com/en/careers/open-positions', 'tech', NULL, 'manual', false, 'r1_manual_2026-06'),
  ('Verint', 'verint.com', 'https://verint.com/company/careers', 'tech', 'oracle', 'manual', false, 'r1_manual_2026-06'),
  ('Yango', 'yango.com', 'https://yango.com/career/vacancy', 'tech', NULL, 'manual', false, 'r1_manual_2026-06');
