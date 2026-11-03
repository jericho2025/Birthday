export const initialBookState = {
  opened: false, spread: 0, motion: null, visited: [], completed: false, revision: 0,
}

export function isValidBookPages(pages) {
  return Array.isArray(pages) && pages.length >= 2 && pages.length % 2 === 0 &&
    new Set(pages.map((page) => page?.id)).size === pages.length &&
    pages.every((page) => page && typeof page.id === 'string' && page.id.trim() &&
      typeof page.placeholder === 'string' && page.placeholder.trim() && typeof page.imageSrc === 'string')
}

export function bookPageNumbers(state, pageCount) {
  if (!state.opened || !Number.isInteger(pageCount) || state.spread < 0 || state.spread >= pageCount / 2) return []
  return [state.spread * 2 + 1, state.spread * 2 + 2]
}

export function isBookComplete(state, pageCount) {
  return Number.isInteger(pageCount) && pageCount >= 2 && pageCount % 2 === 0 &&
    state?.completed === true && Array.isArray(state.visited) &&
    Array.from({ length: pageCount / 2 }, (_, index) => index).every((index) => state.visited.includes(index))
}

function startMotion(state, kind, direction = null, phase = 'settling') {
  const id = state.revision + 1
  return { ...state, revision: id, motion: { id, kind, direction, phase, progress: 0, target: 1 } }
}

export function reduceBook(state, action, pageCount) {
  if (!Number.isInteger(pageCount) || pageCount < 2 || pageCount % 2 !== 0) return state
  const lastSpread = pageCount / 2 - 1
  if (action.type === 'settled') {
    const motion = state.motion
    if (!motion || motion.id !== action.id || motion.phase !== 'settling') return state
    if (motion.target === 0) return { ...state, motion: null }
    if (motion.kind === 'close') return { ...state, opened: false, motion: null }
    const spread = motion.kind === 'open' ? 0 : state.spread + (motion.direction === 'next' ? 1 : -1)
    const visited = state.visited.includes(spread) ? state.visited : [...state.visited, spread]
    return { ...state, opened: true, spread, motion: null, visited, completed: state.completed || (spread === lastSpread && visited.length === lastSpread + 1) }
  }
  if (action.type === 'dragMove') {
    if (state.motion?.phase !== 'dragging' || !Number.isFinite(action.progress)) return state
    return { ...state, motion: { ...state.motion, progress: Math.max(0, Math.min(1, action.progress)) } }
  }
  if (action.type === 'dragRelease') {
    if (state.motion?.phase !== 'dragging') return state
    return { ...state, motion: { ...state.motion, phase: 'settling', target: action.commit === true ? 1 : 0 } }
  }
  // Input is locked during a turn, including during pointer capture and cancel-return.
  if (state.motion) return state
  if (action.type === 'open' && !state.opened) return startMotion(state, 'open')
  if (action.type === 'close' && state.opened && state.spread === 0) return startMotion(state, 'close')
  if (!state.opened || !['turn', 'dragStart'].includes(action.type)) return state
  if (!['next', 'previous'].includes(action.direction)) return state
  if ((action.direction === 'next' && state.spread >= lastSpread) || (action.direction === 'previous' && state.spread <= 0)) return state
  return startMotion(state, 'turn', action.direction, action.type === 'dragStart' ? 'dragging' : 'settling')
}

export function bookActionForKey(event, opened) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return null
  if (event.key === 'ArrowRight') return opened ? { type: 'turn', direction: 'next' } : { type: 'open' }
  if (event.key === 'ArrowLeft' && opened) return { type: 'turn', direction: 'previous' }
  return null
}

export function dragProgress(startX, currentX, pageWidth, direction) {
  if (![startX, currentX, pageWidth].every(Number.isFinite) || pageWidth <= 0) return 0
  const distance = direction === 'next' ? startX - currentX : currentX - startX
  return Math.max(0, Math.min(1, distance / (pageWidth * 1.4)))
}

export function leafTransform(progress, backwards = false, hardcover = false) {
  const position = backwards ? 1 - progress : progress
  const bend = hardcover ? 0 : Math.sin(position * Math.PI) * 2
  return `rotateY(${-180 * position}deg) skewY(${bend}deg)`
}
