// FIX 2b: promote studio-edited bullets to the PROFILE (the source of truth).
//
// After FIX 2 the master is a pure derivative, rebuilt deterministically from the
// profile on every tailor. So a bullet the user edits or adds directly on the
// master in the studio is EPHEMERAL: the next rebuild would overwrite it. To keep
// one source of truth, a studio edit is promoted to the PROFILE (the experiences
// rows), not written to the master. buildMasterCvData stamps each experience with
// experience_id, so we can map the edited master bullets back to their source row.
//
// This never invents rows: it only updates the bullets of experiences that already
// exist and are addressable by experience_id. Returns { updated, skipped }.

const EXPERIENCE_KEYS = [
  "professional_experiences",
  "military_experiences",
  "volunteering_experiences",
  "leadership_experiences",
];

export async function promoteBulletsToProfile({ supabase, user, cvData }) {
  if (!user?.id || !cvData) return { updated: 0, skipped: 0 };

  const byId = new Map();
  for (const key of EXPERIENCE_KEYS) {
    const list = Array.isArray(cvData[key]) ? cvData[key] : [];
    for (const exp of list) {
      const id = exp?.experience_id ? String(exp.experience_id) : null;
      if (!id || !Array.isArray(exp.bullets)) continue;
      byId.set(
        id,
        exp.bullets.map((b) => String(b || "").trim()).filter(Boolean),
      );
    }
  }
  if (byId.size === 0) return { updated: 0, skipped: 0 };

  let updated = 0;
  let skipped = 0;
  for (const [id, bullets] of byId) {
    const { error } = await supabase
      .from("experiences")
      .update({ bullets })
      .eq("id", id)
      .eq("user_id", user.id); // scope to the owner (RLS belt-and-suspenders)
    if (error) skipped++;
    else updated++;
  }
  return { updated, skipped };
}

// FIX (F2): promote the studio-edited MASTER summary to the PROFILE. The master
// CV's summary IS profiles.summary (the deterministic master build sources it),
// so a studio edit must persist to the profile or it silently reverts on the
// next tailor - the exact "new summary wouldn't save" bug (there was NO code
// path writing profiles.summary from the studio). Only writes a non-empty
// summary (never wipes the profile with a blank). Returns { ok, error }.
export async function promoteSummaryToProfile({ supabase, user, summary }) {
  const s = String(summary || "").trim();
  if (!user?.id || !s) return { ok: false, error: null };
  const { error } = await supabase
    .from("profiles")
    .update({ summary: s })
    .eq("id", user.id);
  return { ok: !error, error: error || null };
}
