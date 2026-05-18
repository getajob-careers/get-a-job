import { describe, it, expect } from 'vitest';
import { normalizeJobTitle, isJunkTitle } from '../../scripts/lib/normalize.ts';

describe('normalizeJobTitle', () => {
  it('returns empty string for null / undefined / blank', () => {
    expect(normalizeJobTitle(null)).toBe('');
    expect(normalizeJobTitle(undefined)).toBe('');
    expect(normalizeJobTitle('')).toBe('');
    expect(normalizeJobTitle('   ')).toBe('');
  });

  it('passes through clean titles untouched', () => {
    expect(normalizeJobTitle('Senior Product Manager')).toBe('Senior Product Manager');
    expect(normalizeJobTitle('Bookkeeper')).toBe('Bookkeeper');
  });

  it('strips Teva-style location parenthetical', () => {
    expect(normalizeJobTitle('Director of Infrastructure Security (Tel Aviv, Israel, 0000000)'))
      .toBe('Director of Infrastructure Security');
    expect(normalizeJobTitle('Associate Director Corporate FP&A (Tel Aviv, Israel, 6944020)'))
      .toBe('Associate Director Corporate FP&A');
  });

  it('strips ICL-style short IL location parenthetical', () => {
    expect(normalizeJobTitle('Electrical Technician (Offshore Israel, IL)'))
      .toBe('Electrical Technician');
    expect(normalizeJobTitle('System Tester (Petach-. Tikva, IL)'))
      .toBe('System Tester');
  });

  it('strips Elbit-style job ID prefix', () => {
    expect(normalizeJobTitle('22232 - IT Security Operations Team Lead (Petach-. Tikva, IL)'))
      .toBe('IT Security Operations Team Lead');
    expect(normalizeJobTitle('17694 - Junior System QA Tester (Petach-. Tikva, IL)'))
      .toBe('Junior System QA Tester');
  });

  it('strips maternity-leave suffix', () => {
    expect(normalizeJobTitle('Revenue Enablement Manager - Maternity leave replacement'))
      .toBe('Revenue Enablement Manager');
    expect(normalizeJobTitle('Workplace Operations Team Lead (Maternity leave replacement)'))
      .toBe('Workplace Operations Team Lead');
    expect(normalizeJobTitle('Office & Employee Experience (Maternity Leave Cover, Starting July)'))
      .toBe('Office & Employee Experience');
  });

  it('preserves meaningful short qualifiers like (UX/UI)', () => {
    // Short alpha-only paren — keep
    expect(normalizeJobTitle('Product Designer (UX/UI)'))
      .toBe('Product Designer (UX/UI)');
  });

  it('strips trailing city-only paren', () => {
    expect(normalizeJobTitle('Senior React Developer (Herzliya)'))
      .toBe('Senior React Developer');
  });

  it('is idempotent', () => {
    const t = 'Director of Infrastructure Security (Tel Aviv, Israel, 0000000)';
    expect(normalizeJobTitle(normalizeJobTitle(t)))
      .toBe(normalizeJobTitle(t));
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeJobTitle('Senior   Product    Manager'))
      .toBe('Senior Product Manager');
  });
});

describe('isJunkTitle', () => {
  it('flags blank / null titles', () => {
    expect(isJunkTitle(null)).toBe(true);
    expect(isJunkTitle(undefined)).toBe(true);
    expect(isJunkTitle('')).toBe(true);
    expect(isJunkTitle('  ')).toBe(true);
    expect(isJunkTitle('-')).toBe(true);
  });

  it('flags talent-network placeholders', () => {
    expect(isJunkTitle('Future Opportunities: Channel Sales Experience')).toBe(true);
    expect(isJunkTitle('Future Opportunities- Israel _AKT')).toBe(true);
    expect(isJunkTitle('General Application - Job Fairs Israel')).toBe(true);
    expect(isJunkTitle('General Application (Israel)')).toBe(true);
    expect(isJunkTitle('WorldQuant Technology Talent Network')).toBe(true);
  });

  it('flags promo "join us" titles', () => {
    expect(isJunkTitle('Join our Team')).toBe(true);
    expect(isJunkTitle('Career at Cynet')).toBe(true);
    expect(isJunkTitle('Hailo has amazing openings!')).toBe(true);
    expect(isJunkTitle('Would LOVE to join Cross River!!')).toBe(true);
  });

  it('flags placeholder prompts', () => {
    expect(isJunkTitle("Didn't find what you were looking for?")).toBe(true);
    expect(isJunkTitle("Didn't find your dream position ?!")).toBe(true);
    expect(isJunkTitle('Explore New Opportunities')).toBe(true);
    expect(isJunkTitle('Looking for Something Else? Let\'s Keep in Touch!')).toBe(true);
    expect(isJunkTitle('The Role You Are Perfect For')).toBe(true);
  });

  it('flags template markers', () => {
    expect(isJunkTitle('[TEMPLATE] Default Template')).toBe(true);
    expect(isJunkTitle('TEMPLATE Job')).toBe(true);
  });

  it('does NOT flag real job titles', () => {
    expect(isJunkTitle('Senior Product Manager')).toBe(false);
    expect(isJunkTitle('Bookkeeper')).toBe(false);
    expect(isJunkTitle('Legal Counsel')).toBe(false);
    expect(isJunkTitle('Customer Success Manager')).toBe(false);
    expect(isJunkTitle('DevOps Engineer')).toBe(false);
  });
});
