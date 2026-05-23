import { describe, it, expect } from 'vitest';
import { trackFromScore, trackFromScores } from '@/lib/scoreApplication';

// Pure-fit thresholds (FIT_ONLY): 0.55 / 0.40 / 0.25.
// Used when the user has no 5-year goal so the LLM can't return alignment.
describe('trackFromScore (fit-only)', () => {
  it('lands track_1 at and above 0.55', () => {
    expect(trackFromScore(0.55)).toBe('track_1');
    expect(trackFromScore(0.80)).toBe('track_1');
    expect(trackFromScore(1.00)).toBe('track_1');
  });

  it('lands track_2 in [0.40, 0.55)', () => {
    expect(trackFromScore(0.40)).toBe('track_2');
    expect(trackFromScore(0.49)).toBe('track_2');
    expect(trackFromScore(0.5499)).toBe('track_2');
  });

  it('lands track_3 in [0.25, 0.40) and below 0.25 (floor)', () => {
    expect(trackFromScore(0.25)).toBe('track_3');
    expect(trackFromScore(0.30)).toBe('track_3');
    expect(trackFromScore(0.10)).toBe('track_3');
    expect(trackFromScore(0.00)).toBe('track_3');
  });
});

// Goal-aware track helper. Combines fit + alignment + role seniority + user
// stage. Thresholds are stricter than generate-career-analysis because LLM
// alignment is noisier than the deterministic skill_transfer matrix.
describe('trackFromScores (goal-aware)', () => {
  describe('alignment fallback', () => {
    it('falls back to trackFromScore when alignment is null', () => {
      expect(trackFromScores(0.75, null)).toBe('track_1');
      expect(trackFromScores(0.30, null)).toBe('track_3');
    });

    it('falls back to trackFromScore when alignment is undefined', () => {
      expect(trackFromScores(0.75, undefined)).toBe('track_1');
    });

    it('falls back when alignment is NaN', () => {
      expect(trackFromScores(0.75, NaN)).toBe('track_1');
    });
  });

  describe('goal-aware bands without seniority cap', () => {
    it('SDR for PM target — high fit + low alignment lands track_2 (the original SDR-track-scoring bug)', () => {
      // fit=0.65, alignment=0.10 — exactly the case from the SDR
      // calibration session. Pre-fix this was track_1 because we used
      // FIT_ONLY thresholds; goal-aware logic correctly identifies it
      // as off-path.
      expect(trackFromScores(0.65, 0.10)).toBe('track_2');
    });

    it('CSM for CS user → PM target — fit=0.65, alignment=0.65 lands track_1', () => {
      expect(trackFromScores(0.65, 0.65)).toBe('track_2');
      expect(trackFromScores(0.65, 0.70)).toBe('track_1');
    });

    it('APM for PM target — stretch fit + very strong alignment still lands track_1', () => {
      // The alt T1 path: fit ≥ 0.40 AND alignment ≥ 0.80
      expect(trackFromScores(0.42, 0.85)).toBe('track_1');
      expect(trackFromScores(0.40, 0.80)).toBe('track_1');
      // Just below the alt path → track_2 (fit ≥ 0.50 fallback fails too)
      expect(trackFromScores(0.40, 0.79)).toBe('track_3');
    });

    it('Aspirational on-path role — low fit + strong alignment lands track_3', () => {
      expect(trackFromScores(0.30, 0.80)).toBe('track_3');
      expect(trackFromScores(0.20, 0.60)).toBe('track_3');
    });

    it('Off-path low-fit role — both signals weak lands track_3 via fallback', () => {
      expect(trackFromScores(0.20, 0.10)).toBe('track_3');
    });
  });

  describe('seniority ceiling cap (the Guardio Mid-PA bug)', () => {
    it('student + Mid Product Analyst (4+ years required) capped at track_3', () => {
      // The Guardio case: fit=0.65, alignment=0.70, Mid role, early-career
      // user. Without the cap this would be track_1; with cap it's track_3.
      expect(trackFromScores(0.65, 0.70, { userStage: 'early', roleSeniority: 'Mid' })).toBe('track_3');
    });

    it('student + Senior PM capped at track_3 even with strong fit', () => {
      expect(trackFromScores(0.85, 0.85, { userStage: 'early', roleSeniority: 'Senior' })).toBe('track_3');
    });

    it('student + Entry_Mid APM (legitimate track_1) — at ceiling, allowed through', () => {
      expect(trackFromScores(0.55, 0.80, { userStage: 'early', roleSeniority: 'Entry_Mid' })).toBe('track_1');
    });

    it('student + Entry SDR (in-stage, off-path) lands track_2 not capped', () => {
      expect(trackFromScores(0.65, 0.30, { userStage: 'early', roleSeniority: 'Entry' })).toBe('track_2');
    });

    it('mid-career + Senior PM — within their ceiling, allowed through', () => {
      expect(trackFromScores(0.65, 0.85, { userStage: 'mid', roleSeniority: 'Senior' })).toBe('track_1');
    });

    it('mid-career + Lead PM — above their ceiling, capped at track_3', () => {
      expect(trackFromScores(0.50, 0.85, { userStage: 'mid', roleSeniority: 'Lead' })).toBe('track_3');
    });

    it('senior-career has no effective ceiling', () => {
      expect(trackFromScores(0.60, 0.80, { userStage: 'senior', roleSeniority: 'Director' })).toBe('track_1');
      expect(trackFromScores(0.60, 0.80, { userStage: 'senior', roleSeniority: 'VP' })).toBe('track_1');
    });
  });

  describe('safe defaults', () => {
    it('no roleSeniority → no cap applied (uses goal-aware logic only)', () => {
      expect(trackFromScores(0.65, 0.75, { userStage: 'early', roleSeniority: null })).toBe('track_1');
    });

    it('no userStage → no cap applied', () => {
      expect(trackFromScores(0.65, 0.30, { userStage: null, roleSeniority: 'Senior' })).toBe('track_2');
    });

    it('unknown roleSeniority value (LLM emits unexpected string) → no cap applied', () => {
      expect(trackFromScores(0.65, 0.75, { userStage: 'early', roleSeniority: 'Junior' })).toBe('track_1');
    });

    it('options missing entirely → no cap applied', () => {
      expect(trackFromScores(0.65, 0.75)).toBe('track_1');
    });
  });
});
