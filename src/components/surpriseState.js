import { isGiftRevealComplete } from './giftRevealState.js'

export const SURPRISE_KEY = 'birthday-surprises-v1'
export const emptySurprises = () => ({ scratchRevealed: false, verificationSeen: false })
export function loadSurprises(storage) {
  try {
    const value = JSON.parse(storage.getItem(SURPRISE_KEY))
    return value?.version === 1 ? { scratchRevealed: value.scratchRevealed === true, verificationSeen: value.verificationSeen === true } : emptySurprises()
  } catch { return emptySurprises() }
}
export function saveSurprises(storage, state) {
  try {
    if (!state.scratchRevealed && !state.verificationSeen) storage.removeItem(SURPRISE_KEY)
    else storage.setItem(SURPRISE_KEY, JSON.stringify({ version: 1, scratchRevealed: state.scratchRevealed === true, verificationSeen: state.verificationSeen === true }))
  } catch { /* Optional storage. */ }
}
export function reduceSurprises(state, event) {
  const key = event === 'scratch' ? 'scratchRevealed' : event === 'verification' ? 'verificationSeen' : null
  return key && !state[key] ? { ...state, [key]: true } : state
}
export function scratchCoverage(points, columns = 24, rows = 10) {
  return new Set(points.filter(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1).map(([x, y]) => `${Math.min(columns - 1, Math.floor(x * columns))}:${Math.min(rows - 1, Math.floor(y * rows))}`)).size / (columns * rows)
}
export function extinguishCandle(state, index) {
  return Number.isInteger(index) && index >= 0 && index < 3 && !state[index] ? state.map((off, i) => off || i === index) : state
}
export function cassetteTrack(content, config, side) {
  const track = side === 'B' ? config.sideB : config.sideA
  return { ...content, audioSrc: track.audioSrc ?? content.audioSrc, songTitle: track.title ?? content.songTitle,
    artist: track.description ?? content.artist, sideLabel: side === 'B' ? config.sideBLabel : config.sideALabel,
    statusLabels: side === 'B' ? { ...content.statusLabels, unavailable: track.title } : content.statusLabels,
    placeholderTitle: side === 'B' ? track.title : content.placeholderTitle,
    placeholderMessage: side === 'B' ? track.description : content.placeholderMessage }
}
export const canShowCertificate = (gift) => isGiftRevealComplete(gift)
