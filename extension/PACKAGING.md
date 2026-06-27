# Packaging the GetAJob extension

The distribution zip must be **self-contained**. Two required files are
**gitignored** and therefore absent from a fresh clone — they must be
regenerated before zipping.

## Files that MUST be in the distribution zip

```
manifest.json
background.js                   ← MV3 service worker (manifest "background.service_worker")
popup.html
popup.js
config.js                      ← gitignored, regenerate (see below)
vendor/supabase.js             ← gitignored, regenerate (see below)
fonts/rokkitt-latin.woff2
fonts/rokkitt-latin-ext.woff2
icons/icon-16.png
icons/icon-32.png
icons/icon-48.png
icons/icon-128.png
```

`.gitignore` and `PACKAGING.md` do **not** need to go in the zip.

## Regenerate the two gitignored files

**`config.js`** — public client config (Supabase URL + anon key). Both are public
client values, safe to ship. Generated from the web app's `.env.local`:

```js
// extension/config.js
window.SUPA = {
  url: "<VITE_SUPABASE_URL>",
  anon: "<VITE_SUPABASE_ANON_KEY>",
};
```

**`vendor/supabase.js`** — bundled `@supabase/supabase-js` (exposes
`window.supabaseLib.createClient`). Rebuild from the repo root:

```sh
mkdir -p extension/vendor extension/build
cat > extension/build/entry.js <<'EOF'
import { createClient } from "@supabase/supabase-js";
window.supabaseLib = { createClient };
EOF
node_modules/.bin/esbuild extension/build/entry.js \
  --bundle --format=iife --platform=browser --target=es2020 \
  --outfile=extension/vendor/supabase.js --minify
```

## Zip it

From `extension/`, after both files exist:

```sh
zip -r ../getajob-extension.zip \
  manifest.json background.js popup.html popup.js config.js \
  vendor fonts icons
```

## Verify the zip (MANDATORY before upload)

Run the packaging guard against the zip you just produced. It parses the
`manifest.json` inside the zip and asserts every file the manifest references
(service worker, all icons, action fields, side panel, web-accessible resources)
is present at the exact path and casing. If anything is missing it prints the
missing path and exits non-zero. **Do not upload a zip that fails this check.**

From the repo root (defaults to `../getajob-extension.zip`, the path the zip
step writes):

```sh
npm run package:verify
```

Or pass an explicit zip path:

```sh
npm run package:verify -- /path/to/some.zip
# equivalently: node extension/verify-package.mjs /path/to/some.zip
```

Expected last line on success:

```
[verify-package] PASS: every manifest-referenced file is present in the zip.
```

The guard is pure Node (no dependency on the system `unzip`). It is the check
that would have caught the v0.1.2 rejection ("Could not load background script"),
where the zip omitted `background.js`. `verify-package.mjs` does not itself go in
the zip.

## Icons & brand

`icons/icon-{16,32,48,128}.png` are the real **Get A Job sprout mark**, rendered
from `brand/getajob-mark.svg` onto a solid cream (#FAF6F0) rounded square (with
padding so the dark stem stays legible on light and dark toolbars). To
regenerate after a mark change, re-run the rasterizer that produced them
(`/tmp/genmark.py` during the hardening pass) against `brand/getajob-mark.svg`,
overwriting the four PNGs in place.

`brand/` holds the source SVGs:

- `getajob-mark.svg` — the sprout mark (source for the icon PNGs).
- `getajob-logo.svg` — the full lockup (mark + "Get A Job" wordmark) for the
  Chrome Web Store **listing** (uploaded to the store separately — it does not
  need to go in the extension zip).
