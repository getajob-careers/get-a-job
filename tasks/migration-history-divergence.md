# Migration-history divergence: local date-named files vs remote timestamp versions

**Status:** flagged, NOT scheduled. Dedicated migration-hygiene item — explicitly out of scope for feature batches; no repair attempt without a deliberate plan.

**Observed (2026-06-12):** remote `supabase_migrations.schema_migrations` has **73** entries using 14-digit timestamp versions (e.g. `20260318215721`), while `supabase/migrations/` has **90** local files using 8-digit date names (e.g. `20260531_outreach_propose_internship_goal.sql`). Because the version formats don't match, `supabase migration list` treats most local files as "unapplied" even when their SQL is live on remote (verified: the propose_internship CHECK is applied + 12 rows use it, yet `20260531…` is not in remote history).

**Risk:** a fresh `supabase db reset` / `db push` from the local files would not reconcile cleanly; reconciliation needs `supabase migration repair` mapping each local file to its remote version, which is delicate and easy to get wrong.

**Do NOT:** attempt a blanket repair inside an unrelated PR. Treat as its own focused task with a verification pass against the live schema first.
