import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
// Pinned to 1.6.2 — esm.sh's @latest can silently advance and we want
// deterministic edge behaviour for the CV-parse hot path.
import { extractText, getDocumentProxy } from 'npm:unpdf@1.6.2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'

// extract-cv-text — server-side PDF text extraction.
//
// Why this exists: iOS Safari < 17.4 doesn't ship Promise.withResolvers,
// which pdfjs-dist v5 calls 26+ times. Three rounds of in-browser fixes
// (PRs #261/#262/#263) failed to fully escape the WebKit API drift, so
// parsing moved server-side where the Deno runtime has a complete modern
// JS surface.
//
// unpdf is a serverless repackage of Mozilla pdf.js with the worker
// inlined, so no separate worker file or globalThis pdfjsWorker setup
// is required.
//
// Auth model: forward the user's JWT into the Supabase client so storage
// RLS on the `resumes` bucket (owner-scoped SELECT via
// `(storage.foldername(name))[1] = auth.uid()::text`) gates the download.
// We also enforce `file_path.startsWith(${user.id}/)` as a second
// independent guard.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MAX_TEXT_CHARS = 50_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('extract-cv-text')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized', error_code: 'auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized', error_code: 'auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    m.userId = user.id

    const body = await req.json().catch(() => ({}))
    const filePath = typeof body?.file_path === 'string' ? body.file_path : ''
    if (!filePath) {
      _http = 400; _err = 'missing_file_path'
      return new Response(JSON.stringify({ error: 'file_path is required', error_code: 'missing_file_path' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Belt-and-suspenders on top of storage RLS: refuse paths that don't
    // sit under this user's prefix.
    if (!filePath.startsWith(`${user.id}/`)) {
      _http = 403; _err = 'forbidden_path'
      return new Response(JSON.stringify({ error: 'Forbidden', error_code: 'forbidden_path' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath)
    if (downloadError || !blob) {
      console.error(`[extract-cv-text] storage download failed for ${filePath}:`, downloadError?.message)
      _http = 404; _err = 'storage_download_failed'
      return new Response(JSON.stringify({ error: 'Could not read uploaded file', error_code: 'storage_download_failed' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())

    let text = ''
    let totalPages = 0
    try {
      const pdf = await getDocumentProxy(bytes)
      const result = await extractText(pdf, { mergePages: true })
      totalPages = result.totalPages
      text = result.text || ''
    } catch (err: any) {
      console.error('[extract-cv-text] pdf parse failed:', err?.message || err)
      _http = 422; _err = 'pdf_parse_failed'
      return new Response(JSON.stringify({ error: 'Could not extract text from this PDF', error_code: 'pdf_parse_failed' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!text.trim()) {
      _http = 422; _err = 'empty_text'
      return new Response(JSON.stringify({ error: 'PDF contained no extractable text', error_code: 'empty_text' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS)

    _ok = true; _http = 200
    return new Response(JSON.stringify({ text, total_pages: totalPages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[extract-cv-text] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'Unexpected error', error_code: 'unhandled' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
