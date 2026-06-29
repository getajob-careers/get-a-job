// render-cv — re-render an already-structured cv_data to a PDF. NO LLM.
//
// Powers the CV Studio's "Download" / "Update PDF": the studio edits
// application_cvs.cv_data in the browser (structured, instant), and when the
// user wants a file we send the current cv_data here, render it via the shared
// pdf-lib template (buildCvPdf — the same renderer generate-tailored-cv uses),
// upload to the `cvs` bucket, and hand back a signed URL. Optionally writes the
// url back onto the application_cvs row (cv_id) and the applications pointer
// (application_id).
//
// This is deliberately separate from generate-tailored-cv / refine-cv: those
// AUTHOR cv_data with an LLM; this only RENDERS a cv_data the caller already
// owns. No OpenAI/OpenRouter calls, no JD, no anti-fab gates needed — the text
// is the user's own edited content.
//
// Direct-invoke shape (authenticated AS the owning user):
//   POST /functions/v1/render-cv
//   { "cv_data": { ...structured CV... },
//     "cv_id": "<application_cvs row id>"?,        // write cv_url back to it
//     "application_id": "<applications row id>"?,  // also update its pointer
//     "target_role": "<role for sector theme>"?,
//     "template_style": "ats-optimized" | "polished"? }

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCvPdf } from "../_shared/cv-templates/build-pdf.ts";
import { resolveSectorTheme } from "../_shared/cv-templates/sector-mapping.ts";
import { normalizeTemplate } from "../_shared/cv-templates/template-ids.ts";
import type {
  TemplateStyle,
  SectionKey,
} from "../_shared/cv-templates/types.ts";
import { roleLibrary } from "../_shared/libraries/00_role_library.ts";

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

// Section order mirrors generate-tailored-cv: 2+ professional experiences →
// experience-first; otherwise education-first (students lead with education).
function resolveSectionOrder(cvData: Record<string, unknown>): SectionKey[] {
  const proCount = Array.isArray(cvData.professional_experiences)
    ? cvData.professional_experiences.length
    : 0;
  return proCount >= 2
    ? [
        "about",
        "professional_experience",
        "military_service",
        "volunteering",
        "leadership",
        "education",
        "skills",
        "languages",
        "honors",
        "certifications",
        "projects",
      ]
    : [
        "about",
        "education",
        "professional_experience",
        "military_service",
        "volunteering",
        "leadership",
        "skills",
        "languages",
        "honors",
        "certifications",
        "projects",
      ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    if (JSON.stringify(body).length > 100_000) {
      return json({ error: "Request payload too large." }, 413);
    }

    const {
      cv_data,
      cv_id = null,
      application_id = null,
      target_role = "",
      template_style,
      template,
    } = body ?? {};
    // STEP A: validate the studio template id to one of the five known ids
    // (missing/unknown -> "modern") and pass it through to buildCvPdf. The
    // renderer accepts it but does not yet render per template.
    const templateId = normalizeTemplate(template);
    if (!cv_data || typeof cv_data !== "object" || Array.isArray(cv_data)) {
      return json({ error: "cv_data (object) is required." }, 400);
    }
    if (cv_id !== null && typeof cv_id !== "string")
      return json({ error: "Invalid cv_id." }, 400);
    if (application_id !== null && typeof application_id !== "string")
      return json({ error: "Invalid application_id." }, 400);

    // Cheap call (no LLM) — generous cap, mostly to stop accidental loops.
    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "render-cv",
      p_max_calls: 120,
      p_window_seconds: 3600,
    });
    if (!allowed)
      return json({ error: "Rate limit exceeded. Try again in an hour." }, 429);

    // Profile is only a fallback source for the header (name/contact) — the
    // edited cv_data.header takes precedence inside buildCvPdf. Also feeds the
    // sector-theme resolver.
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const userContext = {
      full_name: profile?.full_name ?? user.email ?? "",
      phone_number: profile?.phone_number ?? "",
      email: profile?.email ?? user.email ?? "",
      location: profile?.location ?? "",
      linkedin_url: profile?.linkedin_url ?? "",
    };

    const safeTemplateStyle: TemplateStyle =
      template_style === "polished" ? "polished" : "ats-optimized";
    const theme = resolveSectorTheme(
      String(target_role ?? "").slice(0, 200),
      roleLibrary as any,
      profile as any,
    ).theme;
    const sectionOrder = resolveSectionOrder(
      cv_data as Record<string, unknown>,
    );

    const { bytes: cvBytes, fit } = await buildCvPdf(
      cv_data as any,
      userContext as any,
      {
        style: safeTemplateStyle,
        theme,
        sectionOrder,
        template: templateId,
        photo: null,
      },
    );

    const fileName = `${user.id}/render_${Date.now()}.pdf`;
    const { error: uploadError } = await serviceClient.storage
      .from("cvs")
      .upload(fileName, cvBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError)
      return json({ error: `CV upload failed: ${uploadError.message}` }, 500);

    const { data: signed, error: signedError } = await serviceClient.storage
      .from("cvs")
      .createSignedUrl(fileName, 315360000);
    if (signedError || !signed)
      return json({ error: "Failed to sign CV URL." }, 500);
    const cv_url = signed.signedUrl;

    // Best-effort pointer writes. RLS scopes both updates to the owning user;
    // a failure here must NOT block returning the freshly rendered URL.
    if (cv_id) {
      await supabase
        .from("application_cvs")
        .update({ cv_url })
        .eq("id", cv_id)
        .eq("user_id", user.id);
    }
    if (application_id) {
      await supabase
        .from("applications")
        .update({ cv_url, cv_status: "ready" })
        .eq("id", application_id)
        .eq("user_id", user.id);
    }

    // `fit` reports HOW the CV fit one page (tier + scale + a `dense` flag). The
    // renderer always fits everything and never cuts; `fit.dense` only lets the
    // studio offer an optional calm "this CV is dense" hint. No error, ever.
    return json({ cv_url, fit });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "render-cv failed" },
      500,
    );
  }
});
