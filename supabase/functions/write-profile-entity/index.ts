// write-profile-entity — the SERVER-SIDE entry point of the CV Studio Option-A
// write-through (#592 Requirement 2). It is the twin of the client wrapper
// src/lib/writeProfileEntity.js: both delegate EVERY decision (routing, audit
// shape, concurrency, destructive classification) to the ONE shared algorithm in
// _shared/write-mediation.ts. The only things this path owns are its environment
// specifics: a service-role DB client (RLS bypassed, ownership enforced by an
// explicit user_id filter) and - the deliberate asymmetry - the anti-fabrication
// gate on content-bearing fields, which the human client path does NOT run (a
// user editing their OWN profile is the author, not a fabricator).
//
// This is the path the COACH's future write tools will call (S3). No consumer
// exists yet - it is built + deployed now so the equivalence is locked and the
// entry point is ready. Auth: the write is scoped to the TOKEN's user, never a
// body-supplied id.
//
// Direct-invoke shape (authenticated AS the acting user):
//   POST /functions/v1/write-profile-entity
//   { "field": "summary", "entityId": null, "newValue": "...",
//     "baseVersion": "<updated_at>"?, "confirmed": false?, "source": "coach"? }

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  runMediatedWrite,
  routeFor,
  type FieldRoute,
  type WriteDb,
  type EntityType,
} from "../_shared/write-mediation.ts";
import {
  summaryTokensClean,
  tokensTraceToMaster,
} from "../_shared/cv-antifab.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
const str = (v: any): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);

// Build the lowercased corpus of the user's OWN stored content that a content
// write's tokens must trace to. Same provenance principle as the CV-gen anti-fab
// gates: numbers / brand names the user never wrote are fabrication. Sourced from
// the structured rows the master itself derives from (profile + experiences +
// education), so "traces to source" means "traces to the user's real data".
async function buildSourceHaystackLower(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  userId: string,
): Promise<string> {
  const [prof, exps, edus] = await Promise.all([
    serviceClient
      .from("profiles")
      .select("summary, skills, languages, headline, full_name, location")
      .eq("id", userId)
      .maybeSingle(),
    serviceClient
      .from("experiences")
      .select("title, company, bullets, awards, responsibilities, skills")
      .eq("user_id", userId),
    serviceClient
      .from("education")
      .select("institution, degree_type, field_of_study, honors, relevant_coursework")
      .eq("user_id", userId),
  ]);
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(push);
    else if (v != null) parts.push(str(v));
  };
  if (prof?.data) Object.values(prof.data).forEach(push);
  for (const e of exps?.data ?? []) Object.values(e).forEach(push);
  for (const e of edus?.data ?? []) Object.values(e).forEach(push);
  return parts.join(" \n ").toLowerCase();
}

// The anti-fab gate injected ONLY on this (LLM/coach) path. Content fields:
// summary (string), exp_bullets / exp_awards / edu_honors (string[]). A value
// whose numeric / proper-noun tokens don't trace to the user's stored source is
// REJECTED (never silently rewritten to empty) - the coach surfaces the reason.
function makeGate(haystackLower: string) {
  return (field: string, value: unknown, _route: FieldRoute) => {
    if (field === "summary") {
      const ok = summaryTokensClean(str(value), haystackLower, "");
      return Promise.resolve(
        ok
          ? { value, rejected: false }
          : {
              value,
              rejected: true,
              reason:
                "That summary includes details that aren't in your saved profile. Edit it to only use facts you've already recorded.",
            },
      );
    }
    // array content fields: every element must trace
    const items = Array.isArray(value) ? value.map(str) : [str(value)];
    const bad = items.find((t) => t.trim() && !tokensTraceToMaster(t, haystackLower));
    return Promise.resolve(
      bad == null
        ? { value, rejected: false }
        : {
            value,
            rejected: true,
            reason: `"${bad.slice(0, 80)}" includes details that aren't in your saved profile.`,
          },
    );
  };
}

// Service-role WriteDb. RLS is bypassed, so ownership is enforced HERE: profile
// rows are keyed by id = the acting user (write-mediation passes userId as the
// row id for profile-scoped fields); experience/education rows additionally
// filter user_id = the acting user, so a body-supplied entityId belonging to
// someone else simply doesn't match (found:false), never writes.
function makeServiceDb(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  userId: string,
  gate: WriteDb["gateContent"],
): WriteDb {
  // deno-lint-ignore no-explicit-any
  const ownership = (q: any, entity: EntityType) =>
    entity === "profile" ? q : q.eq("user_id", userId);
  return {
    async readRow(table, rowId, _uid, entity, column) {
      let q = serviceClient
        .from(table)
        .select(`${column}, updated_at`)
        .eq("id", rowId);
      q = ownership(q, entity);
      const { data, error } = await q.maybeSingle();
      if (error) return { found: false, error: error.message };
      if (!data) return { found: false };
      return { found: true, value: data[column], version: data.updated_at ?? null };
    },
    async writeRow(table, rowId, _uid, entity, column, value) {
      let q = serviceClient
        .from(table)
        .update({ [column]: value })
        .eq("id", rowId);
      q = ownership(q, entity);
      const { error } = await q;
      return { error: error?.message };
    },
    async insertAudit(row) {
      const { error } = await serviceClient.from("profile_edits").insert(row);
      return { error: error?.message };
    },
    gateContent: gate,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await authed.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object")
      return json({ error: "JSON body required." }, 400);
    if (JSON.stringify(body).length > 100_000)
      return json({ error: "Request payload too large." }, 413);

    const field = str(body.field);
    const route = routeFor(field);
    if (!route)
      return json(
        {
          ok: false,
          error: `"${field}" has no write route (loud exception like dates/email, or unknown) - route it to its stated resolution, do not drop it.`,
        },
        400,
      );

    // The gate only needs the (expensive) source corpus for content fields.
    const gate = route.content
      ? makeGate(await buildSourceHaystackLower(serviceClient, user.id))
      : undefined;

    const result = await runMediatedWrite(
      makeServiceDb(serviceClient, user.id, gate),
      {
        userId: user.id, // TOKEN's user, never body-supplied
        field,
        entityId: body.entityId ?? null,
        newValue: body.newValue,
        baseVersion: body.baseVersion ?? null,
        source: body.source === "studio" ? "studio" : "coach",
        confirmed: !!body.confirmed,
      },
    );

    // Rule 6: an LLM write with a failed audit is not a durable write. Surface
    // it (the write already committed, but audit_ok:false tells the coach to
    // report it, never silently). Conflicts/needs-confirm return 200 with their
    // flags so the caller can act; hard errors return 400.
    if (!result.ok && !result.conflict && !result.needsConfirm)
      return json(result, 400);
    return json(result, 200);
  } catch (e) {
    return json({ ok: false, error: `write-profile-entity failed: ${e}` }, 500);
  }
});
