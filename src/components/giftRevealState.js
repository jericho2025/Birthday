const phases = ['sealed', 'untying', 'lifting', 'illuminating', 'opened', 'claimed']

export const createGiftRevealState = () => ({ phase: 'sealed', revision: 0 })

export function isValidGiftRevealState(state) {
  return Boolean(state && phases.indexOf(state.phase) >= 0 && state.revision === phases.indexOf(state.phase))
}

export function isGiftOpened(state) {
  return isValidGiftRevealState(state) && ['opened', 'claimed'].includes(state.phase)
}

export function isGiftRevealComplete(state) {
  return isValidGiftRevealState(state) && state.phase === 'claimed'
}

export function giftRevealNextStage(current, state, machineComplete) {
  return current === 'reveal' && machineComplete && isGiftRevealComplete(state) ? 'closing' : current
}

// Revisions bind every timer to one phase, rejecting duplicate and late callbacks.
export function reduceGiftReveal(state, action) {
  if (!isValidGiftRevealState(state)) return state
  const advance = () => ({ phase: phases[state.revision + 1], revision: state.revision + 1 })
  if (action.type === 'open' && state.phase === 'sealed') return advance()
  if (action.type === 'settled' && action.revision === state.revision && ['untying', 'lifting', 'illuminating'].includes(state.phase)) return advance()
  if (action.type === 'claim' && state.phase === 'opened') return advance()
  return state
}
