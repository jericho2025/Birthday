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

PIN, puzzle, quiz, book, and cassette regression checks: `node --test tests/*.test.js`.

## Phases 1–6

- Full-screen pastel welcome with CSS balloons, sparkles, confetti, and an envelope illustration.
- **Open Your Surprise** starts the Secret PIN Challenge. Use the clickable keypad or physical number keys; Backspace/Delete removes a digit and Escape clears the attempt. Four digits automatically validate.
- Incorrect attempts show a friendly message and shake; type to retry or delete to edit. A correct attempt animates an unlock and opens the tile puzzle. **Back to the beginning** returns to the welcome screen and resets the challenge.
- Reusable experience shell, journey progress, animation pause/resume, keyboard focus handling, and reduced-motion support.
- The configured birthday PIN is `1120`, answering “When is your birthday? (MMDD)”. Edit `pinChallenge` in the content config to customize the question, four-digit string PIN, hint, and feedback. This client-side mechanic provides no actual security.
- Nine numbered pastel tiles start shuffled and unsolved. Drag a tile onto another or click two tiles to swap; keyboard users can Tab between tiles and use Enter/Space to select. Select a tile again to cancel. Arrange 1–9 left to right, top to bottom to finish.
- **Restart Puzzle** reshuffles and resets the move counter and selection. Completion freezes the board, shows confetti, and enables **Continue** to open the birthday quiz.
- The quiz presents exactly five clearly labeled placeholder questions with four choices each. Click an answer, use Tab and Enter/Space, or press 1–4 while focus is inside the quiz. Wrong answers show friendly feedback and stay retryable without revealing the right answer. Correct answers are highlighted and locked; **Next Question** enables only after a correct choice.
- **Finish Quiz** after the fifth correct answer shows a celebration. **Continue** then opens the closed hardcover Birthday Photo Book.
- Click the cover or **Open Book** to reveal a two-page spread. Twelve inside pages each have their own large numbered photo placeholder, optional caption, and an editable birthday-message placeholder on page 12.
- Use **Next Page**, **Previous Page**, Left/Right arrows while the book is focused, or drag an outer page edge/corner. Short drags return to the original spread; Escape or pointer cancellation also returns the sheet. A click on an edge turns a page. Return to pages 1–2 to use **Close Book**, then reopen at any time.
- Page controls lock during opening, closing, a drag, and settling. A cancelled turn does not count as viewing a new spread. The Music Cassette **Continue** appears only after all spreads have been visited and the turn to pages 11–12 has finished. Completion stays earned when revisiting earlier pages; Continue is disabled while a page is moving.
- Paper-flip audio starts muted. **Enable page sounds** opts into a quiet, locally synthesized paper rustle on subsequent user-initiated turns. **Mute page sounds** stops playback. A local recording can replace the generated sound. Paused animations and reduced-motion preferences settle turns immediately; neither blocks navigation or completion.
- The cassette has native-audio-backed Play/Pause, Restart, Mute/Unmute, volume, a seek slider, and elapsed/duration displays. Its reels spin only after the native `playing` event, stop during buffering/pause/end/error, and honor the global animation pause and reduced-motion preference. No song is bundled and playback never autostarts.
- With no configured audio, **Add your song here** is shown and playback controls are disabled. **Inspect Cassette** opens an editable note and unlocks Continue, keeping the journey completable during development. With audio present, an intentional Play that reaches actual playback also unlocks Continue; listening to the whole track is unnecessary. Loading errors offer Retry audio and leave inspection available.
- Progress dots remain noninteractive. The puzzle requires a successful PIN; the quiz requires puzzle completion and Continue; the album requires all five correct quiz answers and Continue; the cassette requires book completion and Continue; the Birthday Letter placeholder requires cassette inspection or successful intentional playback and Continue. No later chapter or final gift is implemented. Reload or **Back to the beginning** starts the journey again.

## Customization and structure

Edit `src/config/birthdayContent.js` for the recipient placeholder, date label, screen copy, planned journey, and quiz questions. Empty media fields are reserved for later phases. `[Your name]` is intentionally a placeholder.

`src/components/` contains the welcome screen, next-stage placeholder, shared shell, and decorative backdrop, with adjacent CSS. `src/index.css` holds base typography and tokens; `src/App.css` holds the application background. `src/App.jsx` owns the current flow state. The flow resets on reload.

`TilePuzzle.jsx` renders the puzzle; `puzzleState.js` holds shared click/drag swap rules, shuffle, restart, and completion detection. Configure tile colors and copy under `puzzle` in `birthdayContent.js`. To use a photo later, put an approved local square image in `public/`, set `puzzle.media.mode` to `'photo'`, set `photoSrc` to its local path (for example `/puzzle-photo.jpg`), and supply `photoDescription`. The same nine pieces crop the image into a 3×3 arrangement without changing the game logic. `showNumbers` controls the photo's visible number badges; color mode always shows numbers. No photo is currently loaded or required.

`BirthdayQuiz.jsx` renders one question at a time with focus management and question-entry animations; `quizState.js` handles validation, retries, question advancement, and completion. Customize `quizQuestions` in the content config: keep exactly five objects, each with a unique nonempty `id`, nonempty `prompt`, four distinct nonempty `options` strings, and a zero-based `correctIndex` (0–3). The current options and answer keys are arbitrary preview content, not personal facts. Customize labels and feedback under `quiz`. Invalid question data leaves the quiz locked with a preparation message. Completion revalidates every recorded answer before opening the album. Paused animations and reduced-motion settings do not block progress.

## Photo book customization and implementation

`src/config/birthdayBook.js` is imported by `birthdayContent.js` as `book`. Edit `coverTitle`, `coverName`, `coverSubtitle`, and `spineTitle` there. The twelve `pages` have separate `imageSrc`, `imageAlt`, `caption`, `message`, and numbered `placeholder` fields. Empty captions/messages are omitted. Keep messages short to preserve the large photo area. Page 12 includes the birthday-message placeholder in addition to its photo.

Put approved image files in `public/images/birthday-book/`, then use paths such as `/images/birthday-book/01.jpg`. Photos use `object-fit: contain`, preserving the complete image. Empty or failed sources retain the numbered placeholder. No personal image is included or fetched by default. Keep an even number of pages (at least two), with unique IDs; all twelve initial pages are public-safe placeholders.

Book `settings` configure turn and cover durations in milliseconds, the drag completion threshold (0–1), initial mute, sound volume (0–1), and an optional local `flipSoundSrc`. With an empty sound source the app generates the rustle using Web Audio only after an unmuted user interaction; it does not contact an audio service. Use a local recorded paper sound for a more natural recording. Audio playback failures are handled without blocking the book.

No page-flip library or new dependency was added. `BirthdayFlipbook.jsx` renders real front/back sheet surfaces around one CSS 3D spine, with a hardcover, underlying pages, and fixed sheet identities throughout each turn. CSS perspective, slight sheet skew, edge highlights, and moving shadows approximate paper curvature. The first photograph is mounted inside the front cover and the twelfth inside the back cover; each intervening leaf carries two different photographs. `BookPhotoPage.jsx` renders photos/captions and image-error fallbacks. `BirthdayFlipbook.css` provides cloth, paper texture, thickness, and viewport-based sizing.

`bookState.js` is the shared transaction model for buttons, arrows, and pointer drags. Turns commit only when settling finishes; transaction IDs reject stale completions and all new navigation is ignored while busy. `useReducedMotion.js` responds to the browser preference; `useBookSound.js` owns opt-in audio and cleans up on leaving the album. Book tests cover bounds, rapid input, forward/reverse/cancelled drags, closure/reopening, stale events, and final-page unlocking. Animation completion has a timer fallback so missing animation events cannot strand the book.

## Cassette personalization and audio

Edit `birthdayContent.cassette` in `src/config/birthdayContent.js`:

- `audioSrc`: empty by default. Put an authorized audio file in `public/audio/`, then set a path such as `/audio/birthday-song.mp3`. Use a browser-supported format such as MP3, WAV, or Ogg. No external audio service is involved.
- `songTitle`, `artist`, `tapeLabel`, and `message`: public-safe placeholders for the label and inspection note. All screen labels and feedback are customizable in the same object.
- `initialVolume`: 0–1 (default 0.65). `startMuted`: initial mute state. Neither setting triggers playback.

Use Tab and Enter/Space for buttons and the native arrow-key behavior of the range sliders. **Restart** pauses and rewinds to zero; it does not autoplay. Mute preserves the selected volume. Global **Pause animations** stops reel animation without pausing the song; use the player's Pause button to pause audio. Unknown duration is displayed as `--:--` and seeking remains disabled until a finite duration is available. A failed or unsupported source shows a friendly error; **Retry audio** reloads without automatically playing. Browser autoplay rejection offers a new intentional Play attempt, while inspection remains available.

`CassettePlayer.jsx` and its adjacent CSS render the tape, transparent window, reels, screws, controls, note, and guarded Continue action. `cassetteState.js` owns playback display state, time formatting, and the intentional-interaction guard. `cassetteAudio.js` is a testable adapter around a native HTML audio element: it subscribes to media events, handles play-promise errors and rapid play/pause races, synchronizes volume/mute/position, and removes listeners, pauses audio, clears its source, and releases loading on unmount. No background audio remains after leaving the cassette. No new dependency is required.

Cassette tests use a fake media element to cover absent audio, real-event-driven display state, retries, bounds, play rejection, progression, stale promises, and cleanup. Desktop browser checks can use a temporary generated test tone; no test song or tone is bundled in the site.

The remaining journey follows `AGENTS.md`: envelope letter, gift machine, present opening, and closing celebration. Implement these one phase at a time; the progress dots are indicators, not links to unfinished screens.

This repository is public. Do not commit private photos, audio, personal messages, PINs, or gift details without explicit direction. The client-side PIN is a game mechanic, not security.
