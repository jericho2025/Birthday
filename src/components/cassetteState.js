export function boundedVolume(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.65
}

export function createCassetteState({ audioSrc, initialVolume, startMuted }) {
  return {
    status: audioSrc ? 'loading' : 'unavailable', currentTime: 0, duration: 0,
    volume: boundedVolume(initialVolume), muted: Boolean(startMuted),
    inspectionOpen: false, interaction: null,
  }
}

export function isCassetteComplete(state) {
  return state?.interaction === 'inspected' || state?.interaction === 'played'
}

export function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function reduceCassette(state, action) {
  if (action.type === 'inspect') return { ...state, inspectionOpen: !state.inspectionOpen, interaction: state.interaction || 'inspected' }
  if (action.type === 'reset') return { ...state, status: action.hasSource ? 'loading' : 'unavailable', currentTime: 0, duration: 0 }
  if (action.type === 'requestPlay' && state.status !== 'unavailable') return { ...state, status: 'starting' }
  if (action.type === 'playFailure') return { ...state, status: action.blocked ? 'blocked' : 'error' }
  if (action.type !== 'media') return state
  const snapshot = action.snapshot
  let status = state.status
  if (action.event === 'playing' && !snapshot.paused && !snapshot.ended) status = 'playing'
  if (action.event === 'pause' && !['error', 'blocked', 'unavailable', 'loading'].includes(status)) status = 'paused'
  if (['waiting', 'stalled'].includes(action.event) && action.requested) status = 'buffering'
  if (action.event === 'ended') status = 'ended'
  if (action.event === 'error') status = 'error'
  if (action.event === 'emptied') status = action.hasSource ? 'loading' : 'unavailable'
  if (['loadedmetadata', 'canplay'].includes(action.event) && status === 'loading') status = 'ready'
  return {
    ...state, status,
    currentTime: Number.isFinite(snapshot.currentTime) ? Math.max(0, snapshot.currentTime) : 0,
    duration: Number.isFinite(snapshot.duration) && snapshot.duration > 0 ? snapshot.duration : 0,
    volume: boundedVolume(snapshot.volume), muted: Boolean(snapshot.muted),
    interaction: state.interaction || (action.event === 'playing' && status === 'playing' && action.requested ? 'played' : null),
  }
}
