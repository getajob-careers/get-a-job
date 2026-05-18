import { describe, it, expect } from 'vitest';
import { parseSuccessFactorsRss } from '../../scripts/lib/ats-fetchers.ts';

// Minimal RSS 2.0 + Google Jobs namespace fixture mimicking real SF output
// (sampled from careers.teva and careers.icl-group.com sitemal.xml).
const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Teva Careers</title>
    <ttl>720</ttl>
    <item>
      <title>Senior Data Engineer (Tel Aviv, IL)</title>
      <description><![CDATA[<div><p>Lead the data platform.</p></div>]]></description>
      <link>https://careers.teva/job/Tel-Aviv-Senior-Data-Engineer/1234567/</link>
      <guid>1234567</guid>
      <g:id>1234567</g:id>
      <g:location>Tel Aviv, Israel, 6944020</g:location>
      <g:employer>Teva Pharmaceutical Industries</g:employer>
      <g:expiration_date>2026-06-17</g:expiration_date>
      <g:job_function>Engineering</g:job_function>
    </item>
    <item>
      <title>מהנדס/ת מכונות (Dimona, IL)</title>
      <description><![CDATA[<div>Hebrew job description.</div>]]></description>
      <link>https://careers.icl-group.com/job/Dimona-/9876543/</link>
      <guid>9876543</guid>
      <g:id>9876543</g:id>
      <g:location>Dimona, IL</g:location>
      <g:employer>ICL</g:employer>
    </item>
    <item>
      <title>US-only role</title>
      <description><![CDATA[Some US job]]></description>
      <link>https://careers.teva/job/us-only/1111111/</link>
      <guid>1111111</guid>
      <g:id>1111111</g:id>
      <g:location>Tampa, Florida, 33601</g:location>
    </item>
  </channel>
</rss>`;

describe('parseSuccessFactorsRss', () => {
  it('parses a 3-item feed into a flat array', () => {
    const items = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(items).toHaveLength(3);
  });

  it('extracts external_id from g:id', () => {
    const [tev, icl, us] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(tev.external_id).toBe('1234567');
    expect(icl.external_id).toBe('9876543');
    expect(us.external_id).toBe('1111111');
  });

  it('extracts title, link, location_raw from the g: namespace', () => {
    const [tev] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(tev.title).toBe('Senior Data Engineer (Tel Aviv, IL)');
    expect(tev.apply_url).toBe('https://careers.teva/job/Tel-Aviv-Senior-Data-Engineer/1234567/');
    expect(tev.location_raw).toBe('Tel Aviv, Israel, 6944020');
  });

  it('preserves Hebrew characters in title and description', () => {
    const [, icl] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(icl.title).toContain('מהנדס/ת');
    expect(icl.description_html).toContain('Hebrew job description');
  });

  it('preserves CDATA HTML in description_html', () => {
    const [tev] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(tev.description_html).toContain('<div>');
    expect(tev.description_html).toContain('Lead the data platform');
  });

  it('falls back from pubDate to g:expiration_date for date_posted', () => {
    // First item has expiration_date but no pubDate — should use expiration_date.
    const [tev] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(tev.date_posted).toBe('2026-06-17');
  });

  it('returns null date_posted when neither pubDate nor expiration_date is present', () => {
    const [, icl] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(icl.date_posted).toBeNull();
  });

  it('captures g:job_function when present', () => {
    const [tev] = parseSuccessFactorsRss(SAMPLE_RSS);
    expect(tev.job_function).toBe('Engineering');
  });

  it('returns empty array when channel is missing', () => {
    expect(parseSuccessFactorsRss('<rss version="2.0"></rss>')).toEqual([]);
  });

  it('handles single-item feed (XML lib quirk — non-array)', () => {
    const single = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <item>
      <title>Only Job</title>
      <link>https://example.com/job/1</link>
      <g:id>42</g:id>
      <g:location>Tel Aviv, IL</g:location>
    </item>
  </channel>
</rss>`;
    const items = parseSuccessFactorsRss(single);
    expect(items).toHaveLength(1);
    expect(items[0].external_id).toBe('42');
  });

  it('handles zero-item feed gracefully', () => {
    const empty = `<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title></channel></rss>`;
    expect(parseSuccessFactorsRss(empty)).toEqual([]);
  });
});
