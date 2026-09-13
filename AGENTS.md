# securelens-extension — agent notes

Chrome MV3 extension (Vite 6 + React 18 + TS + Tailwind 3 + three.js/@react-three/fiber).
Sibling of `../securelens`; keep finding shapes and score deductions in sync with
`../securelens/backend/app/scanners/*` and `services/scoring.py`.

## Commands

- `npm run build` — `tsc --noEmit && vite build` → `dist/` (load unpacked in Chrome)
- `npm test` — vitest, `src/**/*.test.ts` (config in `vitest.config.ts`, NOT vite.config.ts —
  vitest 2 ships its own Vite 5 and the plugin types clash)
- `npx vite --port 5199` then `http://localhost:5199/popup.html?demo=strong|weak|http` — popup in
  a tab with a fake `chrome` (`src/popup/devMock.ts`); add `&view=details` or `&states=1` to open
  a sub-screen directly (dev only). Port 5173 is usually taken by `../securelens`'s frontend.
  Headless screenshot works with
  `google-chrome --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=8000`
  (first shot right after an HMR reload can come out blank — retake).

## Conventions

- Three build entries in `vite.config.ts`: `popup.html`, `options.html`, `src/background/index.ts`
  (emitted as fixed `background.js`, referenced from `public/manifest.json`).
- Colours: default style guide — black/white/gray + `#22C55E` highlight (text/border only,
  never background); status colours text-only. Character keeps its own palette.
- `webRequest` listener callbacks must `return undefined` explicitly (@types/chrome).
- Animation states: add to `CompanionState` in `src/shared/types.ts`, a `case` in
  `computePose` (`src/companion/poses.ts`), an entry in `STATE_GROUPS`
  (`src/companion/states.ts`, feeds the "What does this mean?" sheet), and a duration in
  `REACTION_DURATION` if it is a tap reaction.
- Popup layout: `Popup.tsx` = header + Home (big puppy, Deep scan, States/Details buttons);
  `Details.tsx` = score/findings list; `StatesSheet.tsx` = overlay legend highlighting the
  current state. The companion is a procedural robot puppy (`src/companion/Companion.tsx`)
  with `earDroop`/`tail` pose channels on top of the shared body/head/arm/eye/mouth ones.
