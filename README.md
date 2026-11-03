# A Little Birthday Magic

A desktop-first birthday surprise for November 20, built with React, Vite, and modular CSS. Frontend only; no backend, database, tracking, or external media requests.

## Local development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Production checks and preview:

```sh
npm run lint
npm run build
npm run preview
```

## Phase 1

- Full-screen pastel welcome with CSS balloons, sparkles, confetti, and an envelope illustration.
- **Open Your Surprise** transitions to a clearly labeled PIN challenge placeholder. **Back to the beginning** returns to the welcome screen.
- Reusable experience shell, journey progress, animation pause/resume, keyboard focus handling, and reduced-motion support.
- No PIN logic, private content, or final gift is included.

## Customization and structure

Edit `src/config/birthdayContent.js` for the recipient placeholder, date label, screen copy, and planned journey. Empty media and quiz fields are reserved for later phases. `[Your name]` is intentionally a placeholder.

`src/components/` contains the welcome screen, next-stage placeholder, shared shell, and decorative backdrop, with adjacent CSS. `src/index.css` holds base typography and tokens; `src/App.css` holds the application background. `src/App.jsx` owns the current flow state. The flow resets on reload.

The remaining journey follows `AGENTS.md`: PIN, photo puzzle, personal quiz, two-page photo flipbook, cassette player, envelope letter, gift machine, present opening, and closing celebration. Implement these one phase at a time; the progress dots are indicators, not links to unfinished screens.

This repository is public. Do not commit private photos, audio, personal messages, PINs, or gift details without explicit direction. A future client-side PIN is a game mechanic, not security.
