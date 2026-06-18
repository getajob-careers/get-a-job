-- Master-CV record (Phase 1a). Additive only.
--
-- A "master CV" is one rich, JD-agnostic structured CV per user — the reservoir
-- a future per-job refine selects from. It is stored as an application_cvs row
-- with application_id = NULL (the table was built nullable for exactly this) and
-- is_master = true. The partial unique index enforces ONE master per user, so a
-- regen UPDATEs the existing master row in place rather than inserting a second.
ALTER TABLE public.application_cvs
  ADD COLUMN is_master boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_application_cvs_one_master_per_user
  ON public.application_cvs (user_id)
  WHERE is_master;
