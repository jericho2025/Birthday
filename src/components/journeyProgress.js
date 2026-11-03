import { createGiftRevealState, isGiftRevealComplete, isValidGiftRevealState } from './giftRevealState.js'
import { isGiftMachineComplete, loadMachineState, MACHINE_SESSION_KEY } from './giftMachineState.js'

export const JOURNEY_SESSION_KEY = 'birthday-journey-v1'
export const JOURNEY_STAGES = ['welcome', 'pin', 'puzzle', 'quiz', 'album', 'cassette', 'letter', 'machine', 'reveal', 'closing']

// A compatibility fingerprint, not a credential. No PIN, personal copy, media,
// answers, playback position or animation transactions are written to storage.
export function journeyRules(content) {
  const rules = JSON.stringify([content.pinChallenge.pin, content.quizQuestions, content.book.pages.map((page) => page.id),
    content.machine.scriptVersion, content.machine.initialSymbols, content.machine.outcomes.map((outcome) => outcome.symbols)])
  let hash = 2166136261
  for (let i = 0; i < rules.length; i++) hash = Math.imul(hash ^ rules.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}

export function initialJourneyProgress() {
  return { stage: 'welcome', unlockedThrough: 0, gift: createGiftRevealState(), motionPaused: false }
}

export function stableGiftState(gift) {
  if (!isValidGiftRevealState(gift) || !['opened', 'claimed'].includes(gift.phase)) return createGiftRevealState()
  return { phase: gift.phase, revision: gift.revision }
}

function validateCheckpoint(saved, content, machine) {
  const initial = initialJourneyProgress()
  if (!saved || saved.version !== 1 || saved.rules !== journeyRules(content) ||
    !JOURNEY_STAGES.includes(saved.stage) || !Number.isInteger(saved.unlockedThrough) || saved.unlockedThrough < 0 || saved.unlockedThrough >= JOURNEY_STAGES.length ||
    JOURNEY_STAGES.indexOf(saved.stage) > saved.unlockedThrough || typeof saved.motionPaused !== 'boolean' ||
    !['sealed', 'opened', 'claimed'].includes(saved.gift?.phase) || !isValidGiftRevealState(saved.gift)) return initial
  // Cross-check the later chapters against the independent scripted machine.
  const machineComplete = isGiftMachineComplete(machine, content.machine)
  const gift = machineComplete && saved.unlockedThrough >= 8 ? stableGiftState(saved.gift) : createGiftRevealState()
  const ceiling = !machineComplete ? 7 : !isGiftRevealComplete(gift) ? 8 : 9
  const unlockedThrough = Math.min(saved.unlockedThrough, ceiling)
  const stage = JOURNEY_STAGES[Math.min(JOURNEY_STAGES.indexOf(saved.stage), unlockedThrough)]
  return { stage, unlockedThrough, gift, motionPaused: saved.motionPaused }
}

export function loadJourneyProgress(storage, content) {
  try {
    const saved = JSON.parse(storage?.getItem(JOURNEY_SESSION_KEY) || 'null')
    return validateCheckpoint(saved, content, loadMachineState(storage, content.machine))
  } catch { return initialJourneyProgress() }
}

export function saveJourneyProgress(storage, progress, content, machine) {
  const saved = { version: 1, rules: journeyRules(content), stage: progress.stage, unlockedThrough: progress.unlockedThrough,
    gift: stableGiftState(progress.gift), motionPaused: progress.motionPaused }
  const safe = validateCheckpoint(saved, content, machine)
  try {
    if (safe.stage === 'welcome' && safe.unlockedThrough === 0 && !safe.motionPaused) storage?.removeItem(JOURNEY_SESSION_KEY)
    else storage?.setItem(JOURNEY_SESSION_KEY, JSON.stringify({ ...saved, ...safe }))
  } catch { /* Progress remains usable in memory when session storage is blocked. */ }
}

export function clearBirthdayProgress(storage) {
  for (const key of [JOURNEY_SESSION_KEY, MACHINE_SESSION_KEY]) {
    try { storage?.removeItem(key) } catch { /* Resetting in memory still works. */ }
  }
}
