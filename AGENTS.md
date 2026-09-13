# securelens-extension — agent notes

Chrome MV3 extension (Vite 6 + React 18 + TS + Tailwind 3 + three.js/@react-three/fiber).
Sibling of `../securelens`; keep finding shapes and score deductions in sync with
`../securelens/backend/app/scanners/*` and `services/scoring.py`.

## Commands

- `npm run build` — `tsc --noEmit && vite build` → `dist/` (load unpacked in Chrome)
- `npm test` — vitest, `src/**/*.test.ts` (config in `vitest.config.ts`, NOT vite.config.ts —
  vitest 2 ships its own Vite 5 and the plugin types clash)
- `npx vite` then `http://localhost:5173/popup.html?demo=strong|weak|http` — popup in a tab
  with a fake `chrome` (`src/popup/devMock.ts`); headless screenshot works with
  `google-chrome --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`

## Conventions

- Three build entries in `vite.config.ts`: `popup.html`, `options.html`, `src/background/index.ts`
  (emitted as fixed `background.js`, referenced from `public/manifest.json`).
- Colours: default style guide — black/white/gray + `#22C55E` highlight (text/border only,
  never background); status colours text-only. Character keeps its own palette.
- `webRequest` listener callbacks must `return undefined` explicitly (@types/chrome).
- Animation states: add to `CompanionState` in `src/shared/types.ts`, a `case` in
  `computePose` (`src/companion/poses.ts`), and a duration in `REACTION_DURATION` if it is a
  tap reaction.
