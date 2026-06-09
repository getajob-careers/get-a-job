import { describe, it, expect } from 'vitest';
import {
  buildResumeExtractionPrompt,
  EXPERIENCE_SKILLS_DIRECTIVE,
} from '../lib/resumeExtractionPrompt.js';
import { parseExtractedJson } from '../components/onboarding/StepResumeUpload.jsx';

// Legacy regex-based parser, kept here as the comparison for the old
// behaviour the hardened parser replaces. The new tests use
// parseExtractedJson imported from the production module.
function extractJson(replyText) {
  const jsonMatch = replyText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let extracted = null;

  // Attempt 1: direct parse
  try { extracted = JSON.parse(jsonMatch[0]); } catch {}

  // Attempt 2: only unescape if JSON looks double-escaped
  if (!extracted && /\{\s*\\"/.test(jsonMatch[0])) {
    try {
      const unescaped = jsonMatch[0]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
      extracted = JSON.parse(unescaped);
    } catch {}
  }

  return extracted;
}

describe('extractJson', () => {
  it('parses clean JSON response', () => {
    const reply = 'Here is the data: {"full_name": "Isaac", "skills": ["React"]}';
    const result = extractJson(reply);
    expect(result).toEqual({ full_name: 'Isaac', skills: ['React'] });
  });

  it('returns null if no JSON found', () => {
    expect(extractJson('Sorry, I could not extract the data.')).toBeNull();
  });

  it('does not attempt unescape on clean JSON with backslashes', () => {
    // A valid JSON with a backslash in a string should not be corrupted
    const reply = '{"full_name": "Isaac", "path": "C:\\\\Users\\\\Isaac"}';
    const result = extractJson(reply);
    expect(result?.full_name).toBe('Isaac');
  });

  it('handles double-escaped JSON (unescape path)', () => {
    // Simulate LLM returning double-escaped JSON
    const doubleEscaped = '{\\"full_name\\": \\"Isaac\\", \\"skills\\": []}';
    const reply = `Here is the data: ${doubleEscaped}`;
    const result = extractJson(reply);
    expect(result?.full_name).toBe('Isaac');
  });
});

// Snapshot-lock the EXPERIENCE.skills directive. The investigation that
// added this test found per-experience skills were ~44% empty on pilot
// users because the previous directive said "Leave [] if none are
// explicitly tied to the role" — the model dutifully left arrays empty
// whenever a resume put skills in a global Skills section instead of
// per-role bullets. Locking the new directive prevents that regression.
describe('buildResumeExtractionPrompt — EXPERIENCE.skills directive', () => {
  it('embeds the directive verbatim in the built prompt', () => {
    const prompt = buildResumeExtractionPrompt('sample resume text');
    expect(prompt).toContain(EXPERIENCE_SKILLS_DIRECTIVE);
  });

  it('matches the locked directive text exactly', () => {
    expect(EXPERIENCE_SKILLS_DIRECTIVE).toBe(
      `EXPERIENCE.skills — for EACH role, return 3-8 skills the role demonstrated. Sources of evidence (use ALL together):
- Title (e.g. "Data Analyst" → SQL, Excel, data analysis)
- Company / sector (e.g. consulting firm → research, presentations)
- Responsibilities bullets — the most direct source
- The resume's global Skills / Tools section — include any entry that plausibly applied to this role
Skills repeating across multiple roles is EXPECTED and CORRECT — the same Excel skill used in 3 jobs should appear in all 3.

HARD anti-hallucination rule: EVERY skill you return MUST appear somewhere in the resume text — in this role's bullets, in another role, in the Skills section, in the Tools section, in projects, anywhere. If you cannot point to the skill verbatim somewhere in the resume, NEVER invent it.

Return [] ONLY when the role has empty responsibilities AND no skill from anywhere in the resume plausibly applies — rare; most real roles will hit the 3-8 range.`
    );
  });

  it('caps fileText at 15000 characters to bound prompt size', () => {
    const big = 'x'.repeat(20000);
    const prompt = buildResumeExtractionPrompt(big);
    const tail = prompt.split('Here is the resume:')[1];
    expect(tail.replace(/^\s*/, '').length).toBe(15000);
  });
});

// Hardened parser tests. The legacy regex parser dropped 4 of 19 pilot
// users because gpt-4o-mini wrapped JSON in prose and the greedy match
// produced unparseable spans. parseExtractedJson tightens the chain.
describe('parseExtractedJson — hardened resume-extractor parser', () => {
  it('parses clean JSON object directly (json_object mode response)', () => {
    const r = parseExtractedJson('{"full_name":"Nevo","skills":["React","SQL"]}');
    expect(r?.full_name).toBe('Nevo');
    expect(r?.skills).toEqual(['React', 'SQL']);
  });

  it('strips a ```json fence wrapper', () => {
    const r = parseExtractedJson('```json\n{"full_name":"Agam","skills":[]}\n```');
    expect(r?.full_name).toBe('Agam');
  });

  it('strips a bare ``` fence wrapper', () => {
    const r = parseExtractedJson('```\n{"full_name":"Ella"}\n```');
    expect(r?.full_name).toBe('Ella');
  });

  it('balanced-brace match recovers JSON wrapped in prose', () => {
    // Reproduces the exact production failure: gpt-4o-mini emits a prefix,
    // the JSON, then a closing remark. Legacy greedy regex spans both
    // braces and produces invalid JSON. parseExtractedJson stops at the
    // matched closing brace.
    const reply =
      'Here is the structured resume data:\n' +
      '{"full_name":"Yonah","experiences":[{"title":"Analyst","company":"Acme"}]}\n' +
      'Let me know if you need anything else { "note": "trailing" }';
    const r = parseExtractedJson(reply);
    expect(r?.full_name).toBe('Yonah');
    expect(r?.experiences?.[0]?.company).toBe('Acme');
  });

  it('balanced-brace match handles nested braces in string values', () => {
    const reply = '{"full_name":"X","summary":"Worked on } interesting { problems"}';
    const r = parseExtractedJson(reply);
    expect(r?.full_name).toBe('X');
    expect(r?.summary).toContain('interesting');
  });

  it('balanced-brace match handles escaped quotes inside strings', () => {
    const reply = '{"name":"He said \\"hi\\"","level":"bachelors"}';
    const r = parseExtractedJson(reply);
    expect(r?.name).toBe('He said "hi"');
    expect(r?.level).toBe('bachelors');
  });

  it('falls back to double-escape unescape for legacy responses', () => {
    const reply = 'Here: {\\"full_name\\": \\"Daniella\\", \\"skills\\": []}';
    const r = parseExtractedJson(reply);
    expect(r?.full_name).toBe('Daniella');
  });

  it('returns null on total failure (no JSON anywhere)', () => {
    expect(parseExtractedJson("Sorry, I couldn't extract the data.")).toBeNull();
    expect(parseExtractedJson("")).toBeNull();
    expect(parseExtractedJson(null)).toBeNull();
  });

  it('returns null when JSON is corrupted past recovery', () => {
    // Truncated JSON with no closing brace — balanced-brace walk finds no end.
    expect(parseExtractedJson('{"full_name":"X","skills":["a","b"')).toBeNull();
  });
});
