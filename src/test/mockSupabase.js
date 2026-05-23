import { vi } from 'vitest';

/**
 * Creates a chainable Supabase query builder mock that resolves with `response`.
 *
 * Every method in the chain returns the chain itself so that any sequence of
 * .select().eq().order() etc. is valid. The chain is also thenable, so
 * `await supabase.from('x').select('*').eq('id', id)` resolves with `response`.
 */
export function createChain(response = { data: [], error: null }) {
  const pending = Promise.resolve(response);
  const chain = {};

  Object.assign(chain, {
    select: vi.fn().mockReturnValue(chain),
    eq:     vi.fn().mockReturnValue(chain),
    neq:    vi.fn().mockReturnValue(chain),
    in:     vi.fn().mockReturnValue(chain),
    order:  vi.fn().mockReturnValue(chain),
    limit:  vi.fn().mockReturnValue(chain),
    single: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
    upsert: vi.fn().mockReturnValue(chain),
    // Make the chain awaitable
    then:    pending.then.bind(pending),
    catch:   pending.catch.bind(pending),
    finally: pending.finally.bind(pending),
  });

  return chain;
}

/**
 * Builds a mock supabase client.
 *
 * @param {Record<string, {data: any, error: any}>} tableMap
 *   Keys are table names. The value is the resolved response for that table.
 *   Any table not in the map resolves with { data: [], error: null }.
 */
export function createSupabaseMock(tableMap = {}) {
  return {
    from: vi.fn().mockImplementation((table) => {
      const response = tableMap[table] ?? { data: [], error: null };
      return createChain(response);
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/test.pdf' },
          error: null,
        }),
      }),
    },
  };
}

/** A complete profile row that passes the onboarding_complete guard. */
export const MOCK_USER = { id: 'test-user-id', email: 'test@example.com' };

export const MOCK_PROFILE_COMPLETE = {
  id: 'test-user-id',
  full_name: 'Isaac Test',
  onboarding_complete: true,
  onboarding_step: 8,
  skills: ['React', 'SQL'],
  skill_gaps: ['Docker'],
  qualification_level: 'Junior',
  overall_assessment: 'Strong candidate with good fundamentals.',
  five_year_role: 'Senior Engineer',
  last_reality_check_date: '2026-03-22T12:00:00.000Z',
};

export const MOCK_PROFILE_INCOMPLETE = {
  ...MOCK_PROFILE_COMPLETE,
  onboarding_complete: false,
  onboarding_step: 3,
};

export const MOCK_ROLES = [
  {
    id: 'role-1',
    user_id: 'test-user-id',
    title: 'Junior Data Analyst',
    track: 'track_1',
    readiness_score: 0.72,
    matched_skills: ['SQL', 'Excel'],
    missing_skills: ['Tableau'],
    alignment_to_goal: 'Strong match for near-term goal.',
  },
  {
    id: 'role-2',
    user_id: 'test-user-id',
    title: 'Business Intelligence Analyst',
    track: 'track_2',
    readiness_score: 0.45,
    matched_skills: ['SQL'],
    missing_skills: ['Power BI', 'Tableau'],
    alignment_to_goal: 'Achievable with 3 months upskilling.',
  },
  {
    id: 'role-3',
    user_id: 'test-user-id',
    title: 'Data Engineer',
    track: 'track_3',
    readiness_score: 0.2,
    matched_skills: [],
    missing_skills: ['Spark', 'Kafka', 'Airflow'],
    alignment_to_goal: 'Long-term stretch goal.',
  },
];

export const MOCK_TASKS = [
  {
    id: 'task-1',
    user_id: 'test-user-id',
    title: 'Update CV for Data Analyst roles',
    description: 'Tailor CV based on skill gaps.',
    category: 'cv',
    priority: 'high',
    is_complete: false,
  },
  {
    id: 'task-2',
    user_id: 'test-user-id',
    title: 'Complete SQL practice problems',
    description: 'Use LeetCode or HackerRank.',
    category: 'skill',
    priority: 'medium',
    is_complete: true,
  },
];
