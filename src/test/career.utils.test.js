import { describe, it, expect } from 'vitest';

// Replicate the role mapping logic from CareerRoadmap/Onboarding
function mapRoleToDbRow(r, userId) {
  return {
    title: r.title,
    track: r.track,
    match_score: r.readiness_score,
    readiness_score: r.readiness_score,
    matched_skills: r.matched_skills || [],
    missing_skills: r.missing_skills || [],
    skills_gap: r.missing_skills || [],
    alignment_to_goal: r.alignment_to_goal || '',
    user_id: userId,
  };
}

// Replicate the task mapping logic from Onboarding
function mapTaskToDbRow(t, userId) {
  return {
    title: t.title,
    description: t.description,
    category: t.category || 'application',
    priority: t.priority || 'medium',
    role_title: t.role_title || null,
    is_complete: false,
    user_id: userId,
  };
}

describe('mapRoleToDbRow', () => {
  it('maps AI role output to DB schema', () => {
    const role = {
      title: 'Data Analyst',
      track: 'track_1',
      readiness_score: 0.72,
      matched_skills: ['SQL', 'Python'],
      missing_skills: ['Tableau'],
      alignment_to_goal: 'Strong match',
      reasoning: 'Good background',  // AI-only field — should be excluded
      action_items: ['Learn Tableau'], // AI-only field — should be excluded
    };
    const row = mapRoleToDbRow(role, 'user-123');
    expect(row.title).toBe('Data Analyst');
    expect(row.track).toBe('track_1');
    expect(row.readiness_score).toBe(0.72);
    expect(row.matched_skills).toEqual(['SQL', 'Python']);
    expect(row.skills_gap).toEqual(['Tableau']);
    expect(row.user_id).toBe('user-123');
    expect(row).not.toHaveProperty('reasoning');
    expect(row).not.toHaveProperty('action_items');
  });

  it('defaults missing_skills and matched_skills to empty arrays', () => {
    const row = mapRoleToDbRow({ title: 'PM', track: 'track_2', readiness_score: 0.4 }, 'u1');
    expect(row.matched_skills).toEqual([]);
    expect(row.missing_skills).toEqual([]);
    expect(row.skills_gap).toEqual([]);
    expect(row.alignment_to_goal).toBe('');
  });
});

describe('mapTaskToDbRow', () => {
  it('maps AI task output to DB schema', () => {
    const task = {
      title: 'Update CV',
      description: 'Tailor CV for Data Analyst roles',
      category: 'cv',
      priority: 'high',
      role_title: 'Data Analyst',
    };
    const row = mapTaskToDbRow(task, 'user-123');
    expect(row.title).toBe('Update CV');
    expect(row.category).toBe('cv');
    expect(row.priority).toBe('high');
    expect(row.is_complete).toBe(false);
    expect(row.user_id).toBe('user-123');
  });

  it('applies defaults for missing category and priority', () => {
    const row = mapTaskToDbRow({ title: 'Apply to jobs', description: 'Apply' }, 'u1');
    expect(row.category).toBe('application');
    expect(row.priority).toBe('medium');
    expect(row.role_title).toBeNull();
  });
});
