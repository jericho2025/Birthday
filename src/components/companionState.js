export const COMPANION_SESSION_KEY = 'birthday-little-love-v1'
const policies = {
  pinWrong: { stage: 'pin', priority: 1, failure: 'pin' },
  pinEncourage: { stage: 'pin', priority: 1 },
  pinCorrect: { stage: 'pin', priority: 2 },
  puzzleComplete: { stage: 'puzzle', priority: 3 },
  quizWrong: { stage: 'quiz', priority: 1, failure: 'quiz' },
  quizEncourage: { stage: 'quiz', priority: 1 },
  quizCorrect: { stage: 'quiz', priority: 2 },
  quizComplete: { stage: 'quiz', priority: 3 },
  nearMiss: { stage: 'machine', priority: 2 },
  jackpot: { stage: 'machine', priority: 4 },
}

export function createCompanionState(stage, preferences = {}) {
  return { stage, muted: preferences.muted === true, dismissed: preferences.dismissed === true,
    seen: preferences.seen || [], failures: preferences.failures || { pin: 0, quiz: 0 }, active: null, serial: 0, lastAt: null }
}

export function reduceCompanion(state, action, config) {
  if (action.type === 'stage') return action.stage === state.stage ? state : { ...state, stage: action.stage, active: null }
  if (action.type === 'mute') return { ...state, muted: !state.muted, active: null }
  if (action.type === 'dismiss') return { ...state, dismissed: true, active: null }
  if (action.type === 'restore') return { ...state, dismissed: false, active: null }
  if (action.type === 'expire') return state.active?.id === action.id ? { ...state, active: null } : state
  if (action.type !== 'reaction' || !Number.isFinite(action.now)) return state
  let kind = action.kind
  const policy = policies[kind]
  if (!policy || policy.stage !== state.stage || action.stage !== state.stage) return state
  let failures = state.failures
  if (policy.failure) {
    const group = policy.failure
    const count = Math.min(3, failures[group] + 1)
    if (count !== failures[group]) failures = { ...failures, [group]: count }
    if (count === 2) return { ...state, failures }
    if (count >= 3) kind = `${group}Encourage`
  }
  if (state.seen.includes(kind) || !config.reactions[kind]) return failures === state.failures ? state : { ...state, failures }
  const next = { ...state, failures, seen: [...state.seen, kind] }
  // Suppressed events are remembered, never queued for a later sentimental scene.
  if (state.muted || state.dismissed || config.quietStages.includes(state.stage)) return next
  const priority = policies[kind].priority
  if (state.lastAt !== null && action.now - state.lastAt < config.settings.cooldownMs && priority <= (state.active?.priority || 1)) return next
  return { ...next, serial: state.serial + 1, lastAt: action.now,
    active: { ...config.reactions[kind], kind, priority, stage: state.stage, id: state.serial + 1 } }
}

export function loadCompanionSession(storage, stage, fresh = false) {
  try {
    const saved = JSON.parse(storage?.getItem(COMPANION_SESSION_KEY) || 'null')
    if (!saved || saved.version !== 1 || typeof saved.muted !== 'boolean' || typeof saved.dismissed !== 'boolean' ||
      !Array.isArray(saved.seen) || saved.seen.length > Object.keys(policies).length || new Set(saved.seen).size !== saved.seen.length ||
      !saved.seen.every((kind) => Object.hasOwn(policies, kind)) ||
      !['pin', 'quiz'].every((group) => Number.isInteger(saved.failures?.[group]) && saved.failures[group] >= 0 && saved.failures[group] <= 3)) return createCompanionState(stage)
    return createCompanionState(stage, { ...saved, ...(fresh ? { seen: [], failures: { pin: 0, quiz: 0 } } : {}) })
  } catch { return createCompanionState(stage) }
}

export function saveCompanionSession(storage, state) {
  try { storage?.setItem(COMPANION_SESSION_KEY, JSON.stringify({ version: 1, muted: state.muted, dismissed: state.dismissed, seen: state.seen, failures: state.failures })) } catch { /* Optional, like the journey checkpoint. */ }
}

export function scheduleCompanionDismiss(active, duration, dispatch, clock = globalThis) {
  if (!active) return () => {}
  let disposed = false
  const timer = clock.setTimeout(() => { if (!disposed) dispatch({ type: 'expire', id: active.id }) }, duration)
  return () => { disposed = true; clock.clearTimeout(timer) }
}
