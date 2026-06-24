---
title: Auth
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - src/lib/AuthContext.jsx
  - src/pages/Login.jsx
---

> Carried over from the previous docs/ layout. Content is broadly accurate; a line-by-line review against current code is still pending (see the freshness note at the bottom).

# Auth Flow

Authentication is handled entirely by Supabase Auth. No custom auth logic exists outside of `AuthContext.jsx`.

---

## Overview

```
User visits app
    ↓
App.jsx checks isAuthenticated (from AuthContext)
    ├── Not authenticated → redirect to /login
    └── Authenticated
            ↓
        Home.jsx queries the profiles table
            ├── Query errored (network failure)
            │       → stay on Home, show error banner if applicable
            │         (do NOT redirect to Onboarding — error ≠ missing profile)
            ├── profiles array is empty (new user, no row yet)
            │       → redirect to /Onboarding
            ├── Profile exists but onboarding_complete = false
            │       → redirect to /Onboarding
            └── Profile exists and onboarding_complete = true
                    → render Home dashboard
```

---

## Key Files

| File | Role |
|------|------|
| `src/lib/AuthContext.jsx` | Provides `user`, `isAuthenticated`, `isLoadingAuth`, `signOut` via `useAuth()` hook |
| `src/pages/Login.jsx` | Email/password login and sign-up form |
| `src/pages/Onboarding.jsx` | Multi-step profile setup wizard (8 steps) |
| `src/App.jsx` | Route guard — redirects unauthenticated users to `/login` |

---

## AuthContext

Wrap any component that needs auth state with `useAuth()`:

```js
import { useAuth } from '@/lib/AuthContext';

const { user, isAuthenticated, isLoadingAuth, signOut } = useAuth();
```

- `user` — Supabase `User` object (`user.id`, `user.email`, etc.)
- `isAuthenticated` — boolean
- `isLoadingAuth` — true while Supabase is checking the session on mount
- `signOut` — calls `supabase.auth.signOut()`

`AuthContext` listens to `supabase.auth.onAuthStateChange` and keeps state in sync automatically across tabs.

---

## Session Persistence

Supabase stores the session in `localStorage` by default. Sessions are refreshed automatically by the Supabase JS client. No manual token management is needed.

---

## Onboarding Guard

`Home.jsx` runs a `React.useEffect` that checks the profile state after queries have settled. The guard uses `isFetched` (not `isLoading`) and also checks `isError`:

```js
React.useEffect(() => {
  if (!user || !profileFetched) return;
  if (profileError) return; // network error is not the same as "no profile"
  if (profiles?.length === 0) navigate('/Onboarding');
  else if (profile && !profile.onboarding_complete) navigate('/Onboarding');
}, [user, profileFetched, profileError, profile, profiles, navigate]);
```

The `profileError` guard is critical. Without it, a network failure (which returns `data = []`) would incorrectly redirect a legitimate authenticated user to Onboarding. The guard ensures a failed query never triggers a redirect — the user stays on their current page and sees an error state instead.

---

## Onboarding Completion

`Onboarding.jsx` `handleFinalise` sets `onboarding_complete: true` on the profile row as its final step. If this update fails, the user sees an error with a retry button. This prevents the following loop:

1. `handleFinalise` fails silently and navigates to Home
2. `onboarding_complete` is still `false`
3. Home's guard immediately redirects back to Onboarding
4. Loop repeats

On successful completion, `queryClient.removeQueries()` wipes the entire React Query cache before navigation so the Home dashboard fetches fresh data.

---

## Onboarding Resume (Partial Progress)

When the user navigates to `/Onboarding` and a partial profile already exists, `Onboarding.jsx` reads the stored `onboarding_step` and resumes from that step. If `onboarding_complete` is already `true`, it redirects to Home immediately.

---

## Reset Onboarding

The "Reset Onboarding" button on `Home.jsx`:

1. Deletes all rows from `career_roles`, `tasks`, `experiences`, `projects`, `certifications` for the user
2. Updates the profile: `onboarding_complete: false`, `onboarding_step: 0`, clears AI-generated fields
3. Invalidates the profile query cache
4. Redirects to `/Onboarding`

---

## Protected Routes

All routes except `/login` are protected by the `AuthenticatedApp` component in `App.jsx`, which renders a redirect to `/login` if `isAuthenticated` is false.

---

## Login Methods

Currently only **email + password** is configured. Supabase supports OAuth providers (Google, GitHub, etc.) but these have not been enabled — they would require enabling providers in the Supabase dashboard. The "Connect with LinkedIn" button in `StepResumeUpload` is intentionally non-functional; the UI is preserved for a future LinkedIn OAuth integration.

---

## Edge Function Auth Pattern

Every deployed Edge Function authenticates the caller using the same pattern:

```ts
// User-scoped client — all DB reads/writes go through RLS
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY'),
  { global: { headers: { Authorization: req.headers.get('Authorization') } } }
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) return 401;

// Service client — only for rate limiting RPC, error logging, Storage uploads
const serviceClient = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);
```

The user-scoped client is used for all database reads and writes so that Row Level Security policies are enforced. The service client is used only for operations that explicitly need to bypass RLS: the `check_rate_limit` RPC, the `log_error` RPC, and Storage uploads.
