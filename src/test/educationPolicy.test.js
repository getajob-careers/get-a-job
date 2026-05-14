/**
 * educationPolicy.test.js
 *
 * Unit tests for the shared education-policy helper used by the CV
 * extraction mapping and the StepEducation / AddInformation forms.
 *
 * WHY THESE TESTS MATTER:
 * normalizeEducationLevel collapses LLM-returned variants down to the
 * 7 canonical strings. If it returns the wrong canonical value (or fails
 * to recognize a common variant), the Education-Level dropdown in
 * StepEducation has nothing to select against and renders blank — the
 * exact bug we shipped a fix for in PR #26.
 *
 * dropdownValueForDegreeType powers the "Other" branch of the degree
 * dropdown: an unrecognized stored value must surface "other" so the
 * free-text field shows for editing.
 */

import { describe, it, expect } from 'vitest';
import {
  EDUCATION_LEVELS,
  DEGREE_TYPE_OPTIONS,
  DEGREE_TYPE_VALUES,
  normalizeEducationLevel,
  dropdownValueForDegreeType,
  pickPrimaryEducation,
  isCurrentlyStudent,
} from '../lib/educationPolicy.js';

describe('educationPolicy — constants', () => {
  it('EDUCATION_LEVELS contains the 7 canonical values', () => {
    expect(EDUCATION_LEVELS).toEqual([
      'high_school', 'associate', 'bachelors', 'masters', 'phd', 'bootcamp', 'self_taught',
    ]);
  });

  it('DEGREE_TYPE_OPTIONS terminates with the "other" sentinel', () => {
    expect(DEGREE_TYPE_OPTIONS[DEGREE_TYPE_OPTIONS.length - 1]).toEqual({
      value: 'other',
      label: 'Other (specify)',
    });
  });

  it('DEGREE_TYPE_OPTIONS includes the agreed-upon credentials', () => {
    const values = DEGREE_TYPE_OPTIONS.map((o) => o.value);
    for (const expected of [
      'B.A.', 'B.Sc.', 'M.A.', 'M.Sc.', 'MBA', 'Ph.D.', 'J.D.', 'M.D.',
      'LL.B.', 'Practical Engineer', 'other',
    ]) {
      expect(values).toContain(expected);
    }
  });

  it('DEGREE_TYPE_VALUES excludes the "other" sentinel', () => {
    expect(DEGREE_TYPE_VALUES.has('other')).toBe(false);
    expect(DEGREE_TYPE_VALUES.has('B.A.')).toBe(true);
  });
});

describe('normalizeEducationLevel', () => {
  it('returns canonical values verbatim', () => {
    for (const level of EDUCATION_LEVELS) {
      expect(normalizeEducationLevel(level)).toBe(level);
    }
  });

  it('handles null / undefined / empty string', () => {
    expect(normalizeEducationLevel(null)).toBe('');
    expect(normalizeEducationLevel(undefined)).toBe('');
    expect(normalizeEducationLevel('')).toBe('');
    expect(normalizeEducationLevel('   ')).toBe('');
  });

  it.each([
    ['Bachelor', 'bachelors'],
    ['Bachelors', 'bachelors'],
    ["Bachelor's", 'bachelors'],
    ["Bachelor's Degree", 'bachelors'],
    ['BA', 'bachelors'],
    ['B.A.', 'bachelors'],
    ['BSc', 'bachelors'],
    ['B.Sc.', 'bachelors'],
    ['BS', 'bachelors'],
    ['LLB', 'bachelors'],
    ['Undergraduate', 'bachelors'],
    ['Undergrad', 'bachelors'],
  ])('maps "%s" → bachelors', (input, expected) => {
    expect(normalizeEducationLevel(input)).toBe(expected);
  });

  it.each([
    ['Master', 'masters'],
    ['Masters', 'masters'],
    ["Master's", 'masters'],
    ["Master's Degree", 'masters'],
    ['MA', 'masters'],
    ['M.A.', 'masters'],
    ['MSc', 'masters'],
    ['M.Sc.', 'masters'],
    ['MBA', 'masters'],
    ['M.B.A.', 'masters'],
    ['JD', 'masters'],
    ['J.D.', 'masters'],
    ['MD', 'masters'],
    ['M.D.', 'masters'],
    ['LLM', 'masters'],
  ])('maps "%s" → masters', (input, expected) => {
    expect(normalizeEducationLevel(input)).toBe(expected);
  });

  it.each([
    ['PhD', 'phd'],
    ['Ph.D.', 'phd'],
    ['Ph.D', 'phd'],
    ['Doctorate', 'phd'],
    ['Doctoral', 'phd'],
  ])('maps "%s" → phd', (input, expected) => {
    expect(normalizeEducationLevel(input)).toBe(expected);
  });

  it.each([
    ['High School', 'high_school'],
    ['highschool', 'high_school'],
    ['Secondary School', 'high_school'],
    ['Secondary Education', 'high_school'],
  ])('maps "%s" → high_school', (input, expected) => {
    expect(normalizeEducationLevel(input)).toBe(expected);
  });

  it.each([
    ['Self-Taught', 'self_taught'],
    ['Self Taught', 'self_taught'],
    ['Autodidact', 'self_taught'],
    ['Bootcamp', 'bootcamp'],
    ['Boot Camp', 'bootcamp'],
    ['Coding Bootcamp', 'bootcamp'],
    ['Associate', 'associate'],
    ['Associates', 'associate'],
    ['Associate Degree', 'associate'],
  ])('maps "%s" correctly', (input, expected) => {
    expect(normalizeEducationLevel(input)).toBe(expected);
  });

  it('returns "" for unknown variants (no silent mismapping)', () => {
    expect(normalizeEducationLevel('Some Weird Certificate')).toBe('');
    expect(normalizeEducationLevel('CFA Charterholder')).toBe('');
    expect(normalizeEducationLevel('xyz')).toBe('');
  });

  it('is whitespace-insensitive', () => {
    expect(normalizeEducationLevel('  Bachelors  ')).toBe('bachelors');
  });
});

describe('dropdownValueForDegreeType', () => {
  it('returns canonical option value when stored matches a preset', () => {
    expect(dropdownValueForDegreeType('B.A.')).toBe('B.A.');
    expect(dropdownValueForDegreeType('MBA')).toBe('MBA');
    expect(dropdownValueForDegreeType('Practical Engineer')).toBe('Practical Engineer');
  });

  it('returns "other" for stored values that don\'t match a preset', () => {
    expect(dropdownValueForDegreeType("Bachelor's Degree")).toBe('other');
    expect(dropdownValueForDegreeType('Custom Title')).toBe('other');
  });

  it('returns empty string for empty / null input', () => {
    expect(dropdownValueForDegreeType('')).toBe('');
    expect(dropdownValueForDegreeType(null)).toBe('');
    expect(dropdownValueForDegreeType(undefined)).toBe('');
  });
});

describe('pickPrimaryEducation', () => {
  it('returns null for empty / non-array input', () => {
    expect(pickPrimaryEducation([])).toBeNull();
    expect(pickPrimaryEducation(null)).toBeNull();
    expect(pickPrimaryEducation(undefined)).toBeNull();
  });

  it('returns the only row when array has length 1', () => {
    const row = { id: 'a', education_level: 'bachelors', is_current: true };
    expect(pickPrimaryEducation([row])).toBe(row);
  });

  it('prefers current rows over completed rows', () => {
    const completed = { id: 'a', education_level: 'phd', is_current: false };
    const current = { id: 'b', education_level: 'bachelors', is_current: true };
    expect(pickPrimaryEducation([completed, current])).toBe(current);
  });

  it('picks the highest education level among current rows', () => {
    const bachelors = { id: 'a', education_level: 'bachelors', is_current: true };
    const masters = { id: 'b', education_level: 'masters', is_current: true };
    expect(pickPrimaryEducation([bachelors, masters])).toBe(masters);
  });

  it('picks the highest education level when no rows are current', () => {
    const highSchool = { id: 'a', education_level: 'high_school', is_current: false };
    const bachelors = { id: 'b', education_level: 'bachelors', is_current: false };
    expect(pickPrimaryEducation([highSchool, bachelors])).toBe(bachelors);
  });

  it('uses display_order as tiebreaker for dual-degree students (same institution, same level)', () => {
    const second = { id: 'b', education_level: 'bachelors', is_current: true, display_order: 1, institution: 'Reichman University' };
    const first = { id: 'a', education_level: 'bachelors', is_current: true, display_order: 0, institution: 'Reichman University' };
    // The display_order = 0 row wins
    expect(pickPrimaryEducation([second, first])).toBe(first);
  });

  it('is stable for two rows with no display_order set', () => {
    const a = { id: 'aaa', education_level: 'bachelors', is_current: true };
    const b = { id: 'bbb', education_level: 'bachelors', is_current: true };
    // Falls back to id-ascending — deterministic regardless of input order
    expect(pickPrimaryEducation([b, a])).toBe(a);
    expect(pickPrimaryEducation([a, b])).toBe(a);
  });

  it('handles unknown education_level values by ranking them lowest', () => {
    const known = { id: 'a', education_level: 'bachelors', is_current: false };
    const unknown = { id: 'b', education_level: 'some_other_level', is_current: false };
    expect(pickPrimaryEducation([unknown, known])).toBe(known);
  });
});

describe('isCurrentlyStudent', () => {
  it('returns false for empty / non-array input', () => {
    expect(isCurrentlyStudent([])).toBe(false);
    expect(isCurrentlyStudent(null)).toBe(false);
    expect(isCurrentlyStudent(undefined)).toBe(false);
  });

  it('returns true for a bachelors-in-progress user', () => {
    expect(isCurrentlyStudent([{ education_level: 'bachelors', is_current: true }])).toBe(true);
  });

  it('returns true for a masters-in-progress user', () => {
    expect(isCurrentlyStudent([{ education_level: 'masters', is_current: true }])).toBe(true);
  });

  it('returns true for a phd-in-progress user', () => {
    expect(isCurrentlyStudent([{ education_level: 'phd', is_current: true }])).toBe(true);
  });

  it('returns true for a dual-degree user (two current bachelors)', () => {
    expect(isCurrentlyStudent([
      { education_level: 'bachelors', is_current: true, institution: 'A' },
      { education_level: 'bachelors', is_current: true, institution: 'A' },
    ])).toBe(true);
  });

  it('returns false when only completed degrees exist', () => {
    expect(isCurrentlyStudent([{ education_level: 'bachelors', is_current: false }])).toBe(false);
  });

  it('returns false for a current high school entry only', () => {
    expect(isCurrentlyStudent([{ education_level: 'high_school', is_current: true }])).toBe(false);
  });

  it('returns false for a current bootcamp / self_taught only', () => {
    expect(isCurrentlyStudent([{ education_level: 'bootcamp', is_current: true }])).toBe(false);
    expect(isCurrentlyStudent([{ education_level: 'self_taught', is_current: true }])).toBe(false);
  });
});
