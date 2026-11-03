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

PIN, puzzle, and quiz regression checks: `node --test tests/*.test.js`.

## Phases 1–4

- Full-screen pastel welcome with CSS balloons, sparkles, confetti, and an envelope illustration.
- **Open Your Surprise** starts the Secret PIN Challenge. Use the clickable keypad or physical number keys; Backspace/Delete removes a digit and Escape clears the attempt. Four digits automatically validate.
- Incorrect attempts show a friendly message and shake; type to retry or delete to edit. A correct attempt animates an unlock and opens the tile puzzle. **Back to the beginning** returns to the welcome screen and resets the challenge.
- Reusable experience shell, journey progress, animation pause/resume, keyboard focus handling, and reduced-motion support.
- The configured birthday PIN is `1120`, answering “When is your birthday? (MMDD)”. Edit `pinChallenge` in the content config to customize the question, four-digit string PIN, hint, and feedback. This client-side mechanic provides no actual security.
- Nine numbered pastel tiles start shuffled and unsolved. Drag a tile onto another or click two tiles to swap; keyboard users can Tab between tiles and use Enter/Space to select. Select a tile again to cancel. Arrange 1–9 left to right, top to bottom to finish.
- **Restart Puzzle** reshuffles and resets the move counter and selection. Completion freezes the board, shows confetti, and enables **Continue** to open the birthday quiz.
- The quiz presents exactly five clearly labeled placeholder questions with four choices each. Click an answer, use Tab and Enter/Space, or press 1–4 while focus is inside the quiz. Wrong answers show friendly feedback and stay retryable without revealing the right answer. Correct answers are highlighted and locked; **Next Question** enables only after a correct choice.
- **Finish Quiz** after the fifth correct answer shows a celebration. **Continue** then opens the 3D Photo Flipbook placeholder. No actual album, later challenge, or final gift is implemented.
- Progress dots remain noninteractive. The puzzle requires a successful PIN; the quiz requires puzzle completion and Continue; the album placeholder requires all five correct quiz answers and Continue. No question can be skipped using normal controls. Reload or **Back to the beginning** starts the journey again.

## Customization and structure

Edit `src/config/birthdayContent.js` for the recipient placeholder, date label, screen copy, planned journey, and quiz questions. Empty media fields are reserved for later phases. `[Your name]` is intentionally a placeholder.

`src/components/` contains the welcome screen, next-stage placeholder, shared shell, and decorative backdrop, with adjacent CSS. `src/index.css` holds base typography and tokens; `src/App.css` holds the application background. `src/App.jsx` owns the current flow state. The flow resets on reload.

`TilePuzzle.jsx` renders the puzzle; `puzzleState.js` holds shared click/drag swap rules, shuffle, restart, and completion detection. Configure tile colors and copy under `puzzle` in `birthdayContent.js`. To use a photo later, put an approved local square image in `public/`, set `puzzle.media.mode` to `'photo'`, set `photoSrc` to its local path (for example `/puzzle-photo.jpg`), and supply `photoDescription`. The same nine pieces crop the image into a 3×3 arrangement without changing the game logic. `showNumbers` controls the photo's visible number badges; color mode always shows numbers. No photo is currently loaded or required.

`BirthdayQuiz.jsx` renders one question at a time with focus management and question-entry animations; `quizState.js` handles validation, retries, question advancement, and completion. Customize `quizQuestions` in the content config: keep exactly five objects, each with a unique nonempty `id`, nonempty `prompt`, four distinct nonempty `options` strings, and a zero-based `correctIndex` (0–3). The current options and answer keys are arbitrary preview content, not personal facts. Customize labels and feedback under `quiz`. Invalid question data leaves the quiz locked with a preparation message. Completion revalidates every recorded answer before opening the album placeholder. Paused animations and reduced-motion settings do not block progress.

The remaining journey follows `AGENTS.md`: two-page photo flipbook, cassette player, envelope letter, gift machine, present opening, and closing celebration. Implement these one phase at a time; the progress dots are indicators, not links to unfinished screens.

This repository is public. Do not commit private photos, audio, personal messages, PINs, or gift details without explicit direction. The client-side PIN is a game mechanic, not security.
