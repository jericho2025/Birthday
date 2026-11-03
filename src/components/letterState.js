export const initialLetterState = { phase: 'closed', opened: false, displayed: false, progress: 0, replay: false, revision: 0 }

const nextPhase = { opening: 'rising', rising: 'offered', lifting: 'presenting', presenting: 'reading', returning: 'tucking', tucking: 'lowering', lowering: 'sealing', canceling: 'offered' }

export function isLetterBusy(state) {
  return !['closed', 'offered', 'reading', 'dragging'].includes(state.phase)
}

export function isLetterComplete(state) {
  return state?.opened === true && state?.displayed === true
}

function transition(state, phase, extra = {}) {
  return { ...state, phase, revision: state.revision + 1, ...extra }
}

export function reduceLetter(state, action) {
  if (action.type === 'settled') {
    if (action.id !== state.revision || !isLetterBusy(state)) return state
    if (state.phase === 'sealing') return transition(state, state.replay ? 'opening' : 'closed', { replay: false, progress: 0 })
    const phase = nextPhase[state.phase]
    if (!phase) return state
    return transition(state, phase, {
      opened: state.opened || state.phase === 'opening',
      displayed: state.displayed || state.phase === 'presenting',
      progress: 0,
    })
  }
  if (action.type === 'dragMove') {
    if (state.phase !== 'dragging' || !Number.isFinite(action.progress)) return state
    return { ...state, progress: Math.max(0, Math.min(1, action.progress)) }
  }
  if (action.type === 'dragRelease') {
    if (state.phase !== 'dragging') return state
    return transition(state, action.commit === true ? 'lifting' : 'canceling')
  }
  if (isLetterBusy(state) || state.phase === 'dragging') return state
  if (action.type === 'open' && state.phase === 'closed') return transition(state, 'opening')
  if (action.type === 'pull' && state.phase === 'offered') return transition(state, 'lifting')
  if (action.type === 'dragStart' && state.phase === 'offered') return transition(state, 'dragging', { progress: 0 })
  if (['close', 'replay'].includes(action.type) && ['reading', 'offered'].includes(state.phase)) {
    return transition(state, state.phase === 'reading' ? 'returning' : 'lowering', { replay: action.type === 'replay' })
  }
  return state
}

export function letterDragProgress(startY, currentY, distance) {
  if (![startY, currentY, distance].every(Number.isFinite) || distance <= 0) return 0
  return Math.max(0, Math.min(1, (startY - currentY) / distance))
}
