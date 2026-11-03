# Codex project instructions

## Product
Build a polished desktop-first, personal birthday surprise website for November 20. The experience should feel like a playful, romantic interactive gift, **not** an e-commerce store and **not** the prior "Our Story" website.

## Scope and constraints
- Use React + Vite, JavaScript/JSX, and clean modular CSS (or minimal CSS libraries only where useful).
- Frontend only: no database, API backend, authentication service, payment flow, cart, user accounts, admin pages, or tracking.
- Design for desktop/laptop first, including mouse hover, click, and drag. Do not spend effort on mobile until asked.
- Use gentle pastel lavender, pink, cream, crisp typography and polished motion; keep it elegant and not crowded.
- Build functional interactions, not static mockups. Every visible button must work.
- Use local static assets and clearly labeled placeholders; do not fabricate personal photos, real names, memories, dates, messages, or gift photos.
- The repo is currently public. Do not commit personal details, surprise spoilers, secret PIN values, or private assets without explicit direction.
- Avoid overengineering: no complex state-management package or extra infrastructure without a concrete need.
- A client-only PIN is a game mechanic, **not** actual security.

## Planned journey (can be refined)
1. Welcome screen with personalized placeholders and a start action.
2. Four-digit PIN challenge.
3. Photo puzzle with meaningful interaction.
4. Personal quiz with customizable questions.
5. Realistic 3D flipbook photo album. **Each individual page has a photograph** and optional short caption. Two-page open-book layout, page-turn animation, Next/Previous controls, mouse drag/swipe; do not substitute a simple card carousel. The older implementation is not in this repo; request source files if exact recreation is needed.
6. Retro cassette player for a chosen song or recording, with sound controls.
7. Interactive animated birthday letter in envelope.
8. Gift slot machine: three spins, deliberate suspense, final guaranteed win (not paid gambling or random prizes).
9. Interactive present opening and final reveal.
10. Celebration/closing screen.

## Iterative implementation
- **First coding task**: scaffold a working Vite + React app. Create elegant functional welcome screen, desktop layout styles, reusable navigation shell / flow state, and clearly labeled placeholders for future sections. Provide `npm install`, `npm run dev`, `npm run build` scripts and verify the build.
- Later tasks add features one by one and test each interaction.
- Use descriptive component names, e.g. `WelcomeScreen`, `PinChallenge`, `PhotoPuzzle`, `BirthdayFlipbook`, `CassettePlayer`, `BirthdayLetter`, `GiftMachine`, `GiftReveal`.
- Keep photos, voice/audio, captions, quiz questions, and personal names editable via centralized config or content files.
- For media playback, respect browser autoplay restrictions (only start after user action), provide mute control.
- Preserve any previously implemented working feature when extending another stage.
- Run `npm run build` after code changes and fix build errors before reporting done.
