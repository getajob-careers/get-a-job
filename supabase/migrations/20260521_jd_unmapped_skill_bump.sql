-- jd_unmapped_skill_bump RPC
--
-- Atomic upsert+increment for the unmapped-skill frequency table. Called by
-- the extract-job-requirements edge function each time it encounters a free-
-- text skill phrase that doesn't resolve to a canonical skill_library ID.
--
-- On conflict we increment the job_count and bump last_seen but DO NOT
-- overwrite example_job_id (the first job that surfaced the phrase stays as
-- the example — easier for spot-checking).

CREATE OR REPLACE FUNCTION jd_unmapped_skill_bump(p_phrase TEXT, p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO jd_unmapped_skill_counts (skill_phrase, job_count, example_job_id, first_seen, last_seen)
  VALUES (p_phrase, 1, p_job_id, now(), now())
  ON CONFLICT (skill_phrase) DO UPDATE
    SET job_count = jd_unmapped_skill_counts.job_count + 1,
        last_seen = now();
END;
$$;

REVOKE ALL ON FUNCTION jd_unmapped_skill_bump(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jd_unmapped_skill_bump(TEXT, UUID) TO service_role;
