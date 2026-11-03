export const MACHINE_SPINS = 3
export const MACHINE_SESSION_KEY = 'birthday-gift-machine-v1'
const kinds = ['gift', 'heart', 'cake', 'star', 'bow']
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && Array.from(a).every((value, index) => value === b[index])
const triple = (items) => Array.isArray(items) && items.length === 3 && Array.from(items).every((item) => typeof item === 'string')

export function isValidMachineConfig(config) {
  if (!config || !Array.isArray(config.symbols) || config.symbols.length < 3 || !Array.isArray(config.outcomes) || config.outcomes.length !== MACHINE_SPINS) return false
  const ids = config.symbols.map((symbol) => symbol?.id)
  if (new Set(ids).size !== ids.length || !config.symbols.every((symbol) => symbol && typeof symbol.id === 'string' && symbol.id && typeof symbol.label === 'string' && kinds.includes(symbol.kind))) return false
  if (config.symbols.find((symbol) => symbol.id === config.winningSymbol)?.kind !== 'gift') return false
  if (!triple(config.initialSymbols) || !config.initialSymbols.every((id) => ids.includes(id))) return false
  if (!Array.from(config.outcomes).every((outcome) => outcome && triple(outcome.symbols) && outcome.symbols.every((id) => ids.includes(id)))) return false
  if (!config.outcomes.slice(0, 2).every((outcome) => new Set(outcome.symbols).size === 2)) return false
  if (same(config.outcomes[0].symbols, config.outcomes[1].symbols) || !config.outcomes[2].symbols.every((id) => id === config.winningSymbol)) return false
  const settings = config.settings
  return Boolean(settings && Array.isArray(settings.reelStopMs) && settings.reelStopMs.length === 3 &&
    Array.from(settings.reelStopMs).every((time, index, times) => Number.isFinite(time) && time > 0 && (!index || time > times[index - 1])) &&
    Number.isFinite(settings.finalSpinDelayMs) && settings.finalSpinDelayMs >= 0 &&
    Number.isFinite(settings.celebrationMs) && settings.celebrationMs > 0 &&
    Number.isInteger(settings.reelCycles) && settings.reelCycles >= 2 && settings.reelCycles <= 12)
}

export function createMachineState(config) {
  return { phase: isValidMachineConfig(config) ? 'ready' : 'error', finishedSpins: 0, history: [], reels: [...(config?.initialSymbols || [])], stopped: [true, true, true], transaction: 0 }
}

export function isValidMachineState(state, config) {
  if (!isValidMachineConfig(config) || !state || !['ready', 'spinning', 'celebrating', 'complete'].includes(state.phase)) return false
  const count = state.finishedSpins
  if (!Number.isInteger(count) || count < 0 || count > MACHINE_SPINS || !Array.isArray(state.history) || state.history.length !== count) return false
  if (!Array.from(state.history).every((result, index) => same(result, config.outcomes[index].symbols))) return false
  if (!triple(state.reels) || !Array.isArray(state.stopped) || state.stopped.length !== 3 || !Array.from(state.stopped).every((value) => typeof value === 'boolean')) return false
  const previous = count ? config.outcomes[count - 1].symbols : config.initialSymbols
  if (state.phase === 'spinning') {
    if (count >= MACHINE_SPINS || state.transaction !== count + 1 || state.stopped.every(Boolean)) return false
    return state.stopped.every((value, index) => (!value || state.stopped.slice(0, index).every(Boolean)) && state.reels[index] === (value ? config.outcomes[count].symbols[index] : previous[index]))
  }
  if (state.transaction !== count || !state.stopped.every(Boolean) || !same(state.reels, previous)) return false
  return state.phase === 'ready' ? count < MACHINE_SPINS : count === MACHINE_SPINS
}

export function isGiftMachineComplete(state, config) {
  return isValidMachineState(state, config) && state.phase === 'complete' && state.finishedSpins === MACHINE_SPINS
}

export function machineNextStage(currentStage, state, config) {
  return currentStage === 'machine' && isGiftMachineComplete(state, config) ? 'reveal' : currentStage
}

export function reduceGiftMachine(state, action, config) {
  if (!isValidMachineState(state, config)) return state
  if (action.type === 'spin') {
    if (state.phase !== 'ready' || state.finishedSpins >= MACHINE_SPINS) return state
    return { ...state, phase: 'spinning', transaction: state.transaction + 1, stopped: [false, false, false] }
  }
  if (action.transaction !== state.transaction) return state
  if (action.type === 'celebrationFinished') return state.phase === 'celebrating' ? { ...state, phase: 'complete' } : state
  if (action.type !== 'reelStopped' || state.phase !== 'spinning') return state
  const index = action.reelIndex
  if (!Number.isInteger(index) || index < 0 || index > 2 || state.stopped[index] || !state.stopped.slice(0, index).every(Boolean)) return state
  const reels = [...state.reels]
  const stopped = [...state.stopped]
  reels[index] = config.outcomes[state.finishedSpins].symbols[index]
  stopped[index] = true
  if (!stopped.every(Boolean)) return { ...state, reels, stopped }
  const finishedSpins = state.finishedSpins + 1
  return { ...state, reels, stopped, finishedSpins, history: [...state.history, [...reels]], phase: finishedSpins === MACHINE_SPINS ? 'celebrating' : 'ready' }
}

function scriptSignature(config) {
  return JSON.stringify([config.scriptVersion, config.initialSymbols, config.outcomes.map((outcome) => outcome.symbols), config.symbols.map((symbol) => [symbol.id, symbol.kind])])
}

export function loadMachineState(storage, config) {
  const initial = createMachineState(config)
  if (!isValidMachineConfig(config)) return initial
  try {
    const saved = JSON.parse(storage?.getItem(MACHINE_SESSION_KEY) || 'null')
    return saved?.script === scriptSignature(config) && isValidMachineState(saved.state, config) ? stableMachineState(saved.state, config) : initial
  } catch { return initial }
}

// Refresh retries an interrupted spin from its previous settled result. Neither
// partial reels nor an unfinished jackpot celebration can grant completion.
export function stableMachineState(state, config) {
  if (!isValidMachineState(state, config)) return createMachineState(config)
  const count = state.phase === 'celebrating' ? MACHINE_SPINS - 1 : state.finishedSpins
  return { phase: state.phase === 'complete' ? 'complete' : 'ready', finishedSpins: count,
    history: state.history.slice(0, count).map((result) => [...result]),
    reels: [...(count ? config.outcomes[count - 1].symbols : config.initialSymbols)], stopped: [true, true, true], transaction: count }
}

export function saveMachineState(storage, state, config) {
  if (!isValidMachineState(state, config)) return
  const stable = stableMachineState(state, config)
  try {
    if (stable.finishedSpins === 0) storage?.removeItem(MACHINE_SESSION_KEY)
    else storage?.setItem(MACHINE_SESSION_KEY, JSON.stringify({ script: scriptSignature(config), state: stable }))
  } catch { /* Memory state remains functional when storage is unavailable. */ }
}

export function makeReelTrack(config, from, target, index) {
  return [from, ...Array.from({ length: config.settings.reelCycles * config.symbols.length }, (_, step) => config.symbols[(step + index) % config.symbols.length].id), target]
}

export function isMachineSpinKey(event) {
  return !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && event.key?.toLowerCase() === 's'
}
