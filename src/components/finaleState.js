import { isGiftMachineComplete } from './giftMachineState.js'
import { isGiftRevealComplete } from './giftRevealState.js'

const phases = ['greeting', 'cake', 'message', 'settled']

export function canAccessFinale(machine, gift, config) {
  return isGiftMachineComplete(machine, config) && isGiftRevealComplete(gift)
}

export function finaleBackStage(current, machine, gift, config) {
  return current === 'closing' && canAccessFinale(machine, gift, config) ? 'reveal' : current
}

export const createFinaleState = () => ({ phase: 'greeting', run: 0, revision: 0, restart: 'idle' })

export function isValidFinaleState(state) {
  return Boolean(state && phases.includes(state.phase) && Number.isSafeInteger(state.run) && state.run >= 0 &&
    state.revision === state.run * phases.length + phases.indexOf(state.phase) && ['idle', 'confirming', 'confirmed'].includes(state.restart))
}

export function canRestartAdventure(current, state, machine, gift, config) {
  return current === 'closing' && canAccessFinale(machine, gift, config) && isValidFinaleState(state) && state.restart === 'confirmed'
}

export function finaleStepDelay(state, settings, reducedMotion, motionPaused) {
  if (!isValidFinaleState(state) || state.phase === 'settled' || state.restart === 'confirmed') return null
  return reducedMotion || motionPaused ? 0 : settings.durations[state.phase]
}

// Independent of CSS events; cancelled timers cannot update a departed screen.
export function scheduleFinaleStep(revision, delay, dispatch, clock = globalThis) {
  if (delay === null) return () => {}
  let disposed = false
  const timer = clock.setTimeout(() => {
    if (!disposed) dispatch({ type: 'settled', revision })
  }, delay)
  return () => { disposed = true; clock.clearTimeout(timer) }
}

export function reduceFinale(state, action) {
  if (!isValidFinaleState(state) || state.restart === 'confirmed') return state
  if (action.type === 'settled' && action.revision === state.revision && state.phase !== 'settled') {
    return { ...state, phase: phases[phases.indexOf(state.phase) + 1], revision: state.revision + 1 }
  }
  if (action.type === 'replay' && state.phase === 'settled' && state.restart === 'idle') {
    return { ...state, phase: 'greeting', run: state.run + 1, revision: state.revision + 1 }
  }
  if (action.type === 'requestRestart' && state.restart === 'idle') return { ...state, restart: 'confirming' }
  if (action.type === 'cancelRestart' && state.restart === 'confirming') return { ...state, restart: 'idle' }
  if (action.type === 'confirmRestart' && state.restart === 'confirming') return { ...state, restart: 'confirmed' }
  return state
}
