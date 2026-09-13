# SecureLens Companion — Chrome extension

**Open it on any site and see how strong that site's security is — narrated by a 3D robot-cat.**

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

> The design is a Doraemon-inspired robot cat. Doraemon is a trademarked character
> (Fujiko-Pro / Shogakukan) — fine for personal use, but change the look before publishing
> to the Chrome Web Store.

## Install (unpacked)

```bash
npm install
npm run build          # tsc --noEmit + vite build → dist/
```

Chrome → `chrome://extensions` → enable *Developer mode* → *Load unpacked* → pick `dist/`.

Deep scans need a running SecureLens backend (default `http://localhost:8000`); change it in
the extension's Settings page. "Open full report" links to the SecureLens web app
(`/scanner/<scan_id>`, default `http://localhost:5173`).

## Develop

```bash
npm run dev            # vite build --watch → reload the unpacked extension in Chrome
npm test               # vitest (analyzer + scoring)
npx vite               # dev server: open http://localhost:5173/popup.html?demo=strong|weak|http
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
