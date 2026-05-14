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
