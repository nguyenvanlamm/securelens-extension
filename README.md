# SecureLens Companion — Chrome extension

**Open it on any site and see how strong that site's security is — narrated by a 3D robot puppy.**

Companion to [SecureLens](../securelens). The popup grades the active tab instantly from
what the browser already knows (HTTPS, security headers, HSTS/CSP quality, cookie flags,
version disclosure, mixed content, insecure forms), then optionally runs a full 11-module
**deep scan** through the SecureLens API.

Every grade has its own animation; tapping a finding triggers a short reaction.

| Grade / event | Animation |
|---|---|
| Checking… / deep scan running | `scanning` — looks around, lens raised |
| A · Excellent (≥ 90) | `excellent` — jumping, arms up, stars |
| B · Good (≥ 75) | `good` — thumbs up, nodding |
| C · Needs improvement (≥ 50) | `fair` — scratches head, sweat drop |
| D · Poor (≥ 25) | `poor` — shivering, hugging itself |
| F · Critical | `critical` — crying, flailing |
| Unsupported page / error | `offline` — asleep, zzz |
| Tap a *pass* finding | `cheer` |
| Tap HTTPS / mixed content / insecure form | `coverEyes` |
| Tap a cookie finding | `startled` (!) |
| Tap CSP / HSTS finding | `facepalm` |
| Tap info-disclosure / script finding | `peek` |
| Tap any other finding | `shrug` (?) |

The character is built procedurally from three.js primitives (`src/companion/Companion.tsx`);
poses are pure functions of `(state, time)` in `src/companion/poses.ts` and are blended
with critically-damped interpolation, so state switches never snap.

The popup opens on the puppy alone: drag left/right (or press ←/→) to turn it around, tap
it to make it cheer. **What does this mean?** shows a legend of every state (the current
one is highlighted), **Details** the score and finding list, and **Deep scan** hands the
page to SecureLens.

## Install in Chrome (unpacked, for development / testing)

1. Build the extension:

   ```bash
   npm install
   npm run build          # tsc --noEmit + vite build → dist/
   ```

2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `dist/` folder of this project.
5. The puppy icon appears in the toolbar (pin it via the puzzle-piece menu if hidden).
   Open any site and click the icon to see its grade.

After changing code, run `npm run build` (or keep `npm run dev` running) and press the
**reload** (↻) button on the extension card in `chrome://extensions`.

## Publish to the Chrome Web Store

1. Bump the version in **both** `package.json` and `public/manifest.json` (the store rejects
   an upload whose `manifest.json` version is not higher than the published one).
2. Build and package:

   ```bash
   npm run zip            # builds, then zips dist/ → securelens-extension.zip
   ```

   The zip must contain `manifest.json` at its root (the script does this by zipping the
   *contents* of `dist/`, not the folder itself).
3. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   and sign in. First time only: accept the developer agreement and pay the one-time
   registration fee.
4. Click **New Item** → upload `securelens-extension.zip`.
5. Fill in the listing:
   - **Store listing**: description, category (Productivity / Developer Tools), at least one
     1280×800 or 640×400 screenshot, 128×128 icon (already in `public/icons`).
   - **Privacy**: single purpose description, justification for each permission
     (`webRequest`, `cookies`, `scripting`, `activeTab`, `storage`, host permissions), and a
     data-usage disclosure. Note that nothing leaves the browser except the page URL sent to
     the SecureLens API on an explicit **Deep scan** (see below).
   - **Distribution**: visibility (Public / Unlisted / Private) and regions.
6. Click **Submit for review**. Review typically takes from a few hours to a few days; you
   get an email when it is published or if changes are requested.
7. To ship an update, repeat steps 1–2, open the item in the dashboard → **Package** →
   **Upload new package**, then **Submit for review** again.

Deep scans call the SecureLens backend (default `https://securelens-yz6r.onrender.com`); change it in
the extension's Settings page. "Open full report" links to the SecureLens web app
(`/scanner/<scan_id>`, default `https://securelen.lamnv.com`). For local development point both at
`http://localhost:8000` / `http://localhost:5173` in Settings.

## Develop

```bash
npm run dev            # vite build --watch → reload the unpacked extension in Chrome
npm test               # vitest (analyzer + scoring)
npx vite --port 5199   # dev server: open http://localhost:5199/popup.html?demo=strong|weak|http
```

`?demo=` uses a fake `chrome` object (`src/popup/devMock.ts`, DEV-only, tree-shaken from
the build) so the popup and the 3D character can be iterated in a normal tab.

## How the quick check works

| Source | What is read | Permission |
|---|---|---|
| `webRequest.onHeadersReceived` (background) | main-frame response headers, per tab, in `storage.session`; `Set-Cookie` and auth headers are dropped | `webRequest`, host permissions |
| `fetch(url, {credentials:'omit'})` (fallback) | headers when the page loaded before the extension did | host permissions |
| `chrome.cookies.getAll` | cookie **flags** only (Secure/HttpOnly/SameSite), never values | `cookies` |
| `chrome.scripting.executeScript` | `http://` subresources, form actions, third-party `<script>` integrity | `scripting`, `activeTab` |

Scoring mirrors the backend (`backend/app/services/scoring.py`): 100 minus per-finding
deductions, same grade bands. Deductions per check live in `src/shared/analyzer.ts` and
follow `backend/app/scanners/*`.

Nothing leaves the browser unless you press **Deep scan**, which sends only the page URL to
the configured API.

## Layout

```
public/manifest.json      MV3 manifest (popup, options, module service worker)
src/background/index.ts   header capture per tab
src/shared/               analyzer, scoring, deep-scan client, settings, types (+ tests)
src/popup/                popup UI, data hook, chrome collectors, dev mock
src/options/              settings page
src/companion/            3D character + pose/animation table
```

## Limitations

- No TLS certificate / DNS / CORS / redirect analysis locally — that's what Deep scan is for.
- Header capture only covers navigations that happened after the extension was loaded; the
  fetch fallback re-requests the page without cookies, so logged-in-only headers may differ.
- The popup is ~384×560 px; findings scroll.
