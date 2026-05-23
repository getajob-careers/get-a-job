import { describe, it, expect } from 'vitest';
import { matchTier, sortCareerRolesForMatching } from '@/lib/trackMatching';

const roles = [
  { title: 'Product Manager', track: 'track_3', readiness_score: 0.34 },
  { title: 'Associate Product Manager', track: 'track_1', readiness_score: 0.72 },
  { title: 'Product Operations Manager', track: 'track_1', readiness_score: 0.66 },
  { title: 'Customer Success Manager', track: 'track_1', readiness_score: 0.44 },
  { title: 'Customer Support Specialist', track: 'track_2', readiness_score: 0.80 },
];

const sorted = sortCareerRolesForMatching(roles);

describe('matchTier', () => {
  it('returns null when title is missing', () => {
    expect(matchTier('', sorted)).toBeNull();
    expect(matchTier(null, sorted)).toBeNull();
    expect(matchTier(undefined, sorted)).toBeNull();
  });

  it('returns null when careerRoles is empty/missing', () => {
    expect(matchTier('Product Manager', [])).toBeNull();
    expect(matchTier('Product Manager', null)).toBeNull();
    expect(matchTier('Product Manager', undefined)).toBeNull();
  });

  it('returns the track on exact (case-insensitive, whitespace-collapsed) match', () => {
    expect(matchTier('Product Manager', sorted)).toBe('track_3');
    expect(matchTier('product manager', sorted)).toBe('track_3');
    expect(matchTier('  Product   Manager  ', sorted)).toBe('track_3');
  });

  it('matches with a seniority modifier in the input — track from the highest-ranked match wins', () => {
    // "Senior Product Manager" → after stopword removal → [product, manager]
    // That's a subset of "Associate Product Manager"'s [product, manager] tokens (after stopwords)
    // and also a subset of "Product Manager" itself. Sorted-by-track means
    // Associate Product Manager (track_1) wins over Product Manager (track_3).
    expect(matchTier('Senior Product Manager', sorted)).toBe('track_1');
  });

  it('matches when the input is a superset of a career role', () => {
    expect(matchTier('Customer Support Specialist Track 2', sorted)).toBe('track_2');
  });

  it('returns null when only a generic single token matches', () => {
    // "Manager" alone has length-1 token set → bails out before fuzzy pass.
    expect(matchTier('Manager', sorted)).toBeNull();
  });

  it('returns null for a role with no overlapping non-stopword tokens', () => {
    expect(matchTier('Software Engineer', sorted)).toBeNull();
    expect(matchTier('Data Scientist', sorted)).toBeNull();
  });

  it('matches when the input is a subset of a role (tokens fully contained)', () => {
    // [customer, specialist] IS a subset of [customer, support, specialist]
    // — that's the desired permissive behaviour. User types a shorter title,
    // we widen up to the matching career_role.
    expect(matchTier('Customer Specialist', sorted)).toBe('track_2');
  });

  it('returns null when neither set is a subset of the other', () => {
    // [marketing, strategist] vs every career_role's tokens — no role has
    // both "marketing" and "strategist", and no role's full token set is
    // contained within [marketing, strategist] (every role has tokens like
    // "product", "customer", or "manager" not present in the input).
    expect(matchTier('Marketing Strategist', sorted)).toBeNull();
    expect(matchTier('Designer Researcher', sorted)).toBeNull();
  });

  it('skips entries with null/missing title or track rather than crashing', () => {
    const messy = [
      { title: null, track: 'track_1' },
      { title: 'Product Manager', track: null },
      { title: 'Customer Support Specialist', track: 'track_2', readiness_score: 0.8 },
    ];
    expect(matchTier('Customer Support Specialist', messy)).toBe('track_2');
  });

  it('exact match wins over fuzzy match even when they would yield different tiers', () => {
    // "Product Manager" exact-matches the track_3 row in roles (Pass 1) and never
    // falls through to Pass 2 where it would otherwise match track_1 candidates.
    expect(matchTier('Product Manager', sorted)).toBe('track_3');
  });
});

describe('sortCareerRolesForMatching', () => {
  it('puts track_1 before track_2 before track_3', () => {
    const out = sortCareerRolesForMatching(roles);
    const tiers = out.map((r) => r.track);
    // First three are track_1 (Associate, Product Ops, Customer Success Manager),
    // then track_2 (Customer Support Specialist), then track_3 (Product Manager).
    expect(tiers[0]).toBe('track_1');
    expect(tiers[3]).toBe('track_2');
    expect(tiers[4]).toBe('track_3');
  });

  it('within a track, higher readiness_score wins', () => {
    const out = sortCareerRolesForMatching(roles);
    const t1 = out.filter((r) => r.track === 'track_1');
    expect(t1.map((r) => r.readiness_score)).toEqual([0.72, 0.66, 0.44]);
  });

  it('does not mutate the input array', () => {
    const input = [...roles];
    const original = JSON.stringify(input);
    sortCareerRolesForMatching(input);
    expect(JSON.stringify(input)).toBe(original);
  });

  it('handles null/undefined input', () => {
    expect(sortCareerRolesForMatching(null)).toEqual([]);
    expect(sortCareerRolesForMatching(undefined)).toEqual([]);
  });
});
