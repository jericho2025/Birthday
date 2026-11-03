import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayMachine as config } from '../src/config/birthdayMachine.js'
import { birthdayContent } from '../src/config/birthdayContent.js'
import { createMachineState, isGiftMachineComplete, isMachineSpinKey, isValidMachineConfig, isValidMachineState, loadMachineState, machineNextStage, makeReelTrack, MACHINE_SESSION_KEY, reduceGiftMachine, saveMachineState } from '../src/components/giftMachineState.js'
import { animateMachineReel } from '../src/components/machineReelAnimation.js'
import { createMachineSound } from '../src/components/machineSound.js'

const reduce = (state, action) => reduceGiftMachine(state, action, config)
const start = (state = createMachineState(config)) => reduce(state, { type: 'spin' })
const stop = (state, reelIndex) => reduce(state, { type: 'reelStopped', reelIndex, transaction: state.transaction })
const finishReels = (state) => [0, 1, 2].reduce(stop, state)
const nextResult = (state = createMachineState(config)) => finishReels(start(state))
function jackpot() { return nextResult(nextResult(nextResult())) }
function completed() { const state = jackpot(); return reduce(state, { type: 'celebrationFinished', transaction: state.transaction }) }
function storage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) }
}

test('initial state has three spins, fixed symbols, and no completed result', () => {
  assert.equal(isValidMachineConfig(config), true)
  const state = createMachineState(config)
  assert.equal(state.phase, 'ready')
  assert.equal(state.finishedSpins, 0)
  assert.deepEqual(state.history, [])
  assert.deepEqual(state.reels, config.initialSymbols)
  assert.equal(isGiftMachineComplete(state, config), false)
})

test('the first two outcomes are distinct near misses and the third is three gifts', () => {
  const first = nextResult()
  assert.equal(first.finishedSpins, 1)
  assert.deepEqual(first.reels, ['heart', 'heart', 'star'])
  assert.equal(new Set(first.reels).size, 2)
  const second = nextResult(first)
  assert.deepEqual(second.reels, ['cake', 'bow', 'cake'])
  assert.equal(new Set(second.reels).size, 2)
  assert.equal(second.finishedSpins, 2)
  const third = nextResult(second)
  assert.equal(third.finishedSpins, 3)
  assert.deepEqual(third.reels, ['gift', 'gift', 'gift'])
  assert.deepEqual(third.history, config.outcomes.map((outcome) => outcome.symbols))
})

test('exactly three spins finish and no fourth spin is available during or after celebration', () => {
  const third = jackpot()
  assert.equal(third.phase, 'celebrating')
  assert.equal(start(third), third)
  const done = completed()
  assert.equal(done.phase, 'complete')
  assert.equal(start(done), done)
  assert.equal(done.finishedSpins, 3)
})

test('button spam cannot spend extra spins or mutate an in-flight result', () => {
  const spinning = start()
  let spammed = spinning
  for (let count = 0; count < 100; count++) spammed = start(spammed)
  assert.equal(spammed, spinning)
  assert.equal(spinning.finishedSpins, 0)
  assert.equal(spinning.transaction, 1)
  assert.equal(finishReels(spammed).finishedSpins, 1)
})

test('reels stop independently and a finished spin requires all three ordered stops', () => {
  const spinning = start()
  assert.equal(stop(spinning, 2), spinning)
  const left = stop(spinning, 0)
  assert.deepEqual(left.stopped, [true, false, false])
  assert.equal(left.finishedSpins, 0)
  const middle = stop(left, 1)
  assert.equal(middle.finishedSpins, 0)
  assert.equal(stop(middle, 2).finishedSpins, 1)
  assert.deepEqual(spinning.reels, config.initialSymbols)
})

test('duplicate, invalid, and stale reel callbacks cannot finish or skip a spin', () => {
  const spinning = start()
  assert.equal(reduce(spinning, { type: 'reelStopped', reelIndex: 0, transaction: 0 }), spinning)
  const left = stop(spinning, 0)
  assert.equal(stop(left, 0), left)
  for (const index of [-1, 3, null, '1']) assert.equal(stop(left, index), left)
  const second = start(finishReels(left))
  assert.equal(reduce(second, { type: 'reelStopped', reelIndex: 0, transaction: 1 }), second)
})

test('Continue stays locked before the final reel settles and until jackpot animation ends', () => {
  const second = nextResult(nextResult())
  let third = start(second)
  assert.equal(isGiftMachineComplete(third, config), false)
  third = stop(stop(third, 0), 1)
  assert.equal(isGiftMachineComplete(third, config), false)
  third = stop(third, 2)
  assert.equal(third.finishedSpins, 3)
  assert.equal(isGiftMachineComplete(third, config), false)
  assert.equal(reduce(third, { type: 'celebrationFinished', transaction: 2 }), third)
  const done = reduce(third, { type: 'celebrationFinished', transaction: 3 })
  assert.equal(isGiftMachineComplete(done, config), true)
})

test('fake completion, skipped histories, and celebration events during a spin are rejected', () => {
  const state = start()
  assert.equal(reduce(state, { type: 'celebrationFinished', transaction: 1 }), state)
  for (const fake of [null, {}, { ...completed(), history: [] }, { ...completed(), finishedSpins: 2 }, { ...completed(), reels: ['heart', 'heart', 'heart'] }]) assert.equal(isGiftMachineComplete(fake, config), false)
  assert.equal(reduce(createMachineState(config), { type: 'skip' }).finishedSpins, 0)
})

test('journey integration preserves PIN and letter completion, and gates only the mystery placeholder', () => {
  assert.equal(birthdayContent.pinChallenge.pin, '1120')
  assert.equal(birthdayContent.quizQuestions.length, 5)
  assert.equal(birthdayContent.book.pages.length, 12)
  assert.ok(birthdayContent.letter.paragraphs.length)
  assert.match(birthdayContent.mysteryGiftPlaceholder.label, /Coming in Phase 9/)
  assert.equal(machineNextStage('machine', jackpot(), config), 'machine')
  assert.equal(machineNextStage('machine', completed(), config), 'reveal')
  for (const stage of ['welcome', 'pin', 'puzzle', 'quiz', 'album', 'cassette', 'letter']) assert.equal(machineNextStage(stage, completed(), config), stage)
})

test('a remount restores finished results and cannot grant extra spins after completion', () => {
  const store = storage()
  const partial = nextResult(nextResult())
  saveMachineState(store, partial, config)
  assert.deepEqual(loadMachineState(store, config), partial)
  saveMachineState(store, completed(), config)
  const restored = loadMachineState(store, config)
  assert.equal(isGiftMachineComplete(restored, config), true)
  assert.equal(start(restored), restored)
})

test('an interrupted spin resumes the same transaction and preserves already stopped reels', () => {
  const store = storage()
  const partial = stop(start(nextResult()), 0)
  saveMachineState(store, partial, config)
  const restored = loadMachineState(store, config)
  assert.deepEqual(restored, partial)
  assert.equal(start(restored), restored)
  assert.equal(stop(stop(restored, 1), 2).finishedSpins, 2)
})

test('restoring a jackpot in progress does not unlock Continue before celebration settles', () => {
  const store = storage()
  saveMachineState(store, jackpot(), config)
  const restored = loadMachineState(store, config)
  assert.equal(isGiftMachineComplete(restored, config), false)
  assert.equal(isGiftMachineComplete(reduce(restored, { type: 'celebrationFinished', transaction: restored.transaction }), config), true)
})

test('malformed or stale storage is ignored, and blocked storage does not break memory state', () => {
  const store = storage()
  store.setItem(MACHINE_SESSION_KEY, '{bad json')
  assert.deepEqual(loadMachineState(store, config), createMachineState(config))
  saveMachineState(store, nextResult(), config)
  const changed = { ...config, scriptVersion: 2 }
  assert.deepEqual(loadMachineState(store, changed), createMachineState(changed))
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('quota') } }
  assert.doesNotThrow(() => saveMachineState(blocked, completed(), config))
  assert.deepEqual(loadMachineState(blocked, config), createMachineState(config))
})

test('invalid scripts fail closed and cannot change the three-spin rules', () => {
  for (const invalid of [null, { ...config, outcomes: [] }, { ...config, outcomes: [...config.outcomes, config.outcomes[2]] }, { ...config, outcomes: [config.outcomes[2], config.outcomes[1], config.outcomes[2]] }, { ...config, settings: { ...config.settings, reelStopMs: [300, 200, 100] } }]) {
    assert.equal(isValidMachineConfig(invalid), false)
    const state = createMachineState(invalid)
    assert.equal(state.phase, 'error')
    assert.equal(reduceGiftMachine(state, { type: 'spin' }, invalid), state)
  }
  assert.equal(isValidMachineState({ ...start(), stopped: [false, true, false] }, config), false)
})

test('reel tracks start at the visible symbol and end aligned on the scripted symbol without blank rows', () => {
  for (const index of [0, 1, 2]) {
    const track = makeReelTrack(config, 'heart', 'gift', index)
    assert.equal(track[0], 'heart')
    assert.equal(track.at(-1), 'gift')
    assert.ok(track.length > 20)
    assert.ok(track.every((id) => config.symbols.some((symbol) => symbol.id === id)))
  }
})

function fakeClock() {
  const jobs = new Map()
  let next = 0
  return { jobs, setTimeout(fn, ms) { const id = ++next; jobs.set(id, { fn, ms }); return id }, clearTimeout(id) { jobs.delete(id) } }
}

test('reduced or paused motion settles a reel asynchronously without starting an animation', () => {
  const clock = fakeClock()
  let animations = 0, finished = 0
  const dispose = animateMachineReel({ animate() { animations++ } }, { rows: 31, cellHeight: 94, duration: 1800, reduced: true }, () => finished++, clock)
  assert.equal(animations, 0)
  assert.equal(finished, 0)
  const job = [...clock.jobs.values()][0]
  assert.equal(job.ms, 0)
  job.fn()
  assert.equal(finished, 1)
  dispose()
})

test('reel cleanup cancels animation and timers and ignores a late completion callback', () => {
  const clock = fakeClock()
  let cancelled = 0, finished = 0
  const element = { animate() { return { cancel() { cancelled++ } } } }
  const dispose = animateMachineReel(element, { rows: 31, cellHeight: 94, duration: 1800, reduced: false }, () => finished++, clock)
  const callback = [...clock.jobs.values()][0].fn
  dispose()
  assert.equal(cancelled, 1)
  assert.equal(clock.jobs.size, 0)
  callback()
  assert.equal(finished, 0)
})

test('keyboard shortcut ignores held keys and platform shortcuts', () => {
  assert.equal(isMachineSpinKey({ key: 's' }), true)
  assert.equal(isMachineSpinKey({ key: 'S' }), true)
  for (const key of ['Enter', ' ', 'Tab', 'x']) assert.equal(isMachineSpinKey({ key }), false)
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'repeat']) assert.equal(isMachineSpinKey({ key: 's', [modifier]: true }), false)
})

class FakeAudioContext {
  state = 'suspended'
  currentTime = 0
  destination = {}
  sources = []
  closeCalls = 0
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { this.state = 'closed'; this.closeCalls++; return Promise.resolve() }
  createOscillator() { const source = { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this }, disconnect() {}, start() {}, stops: 0, stop() { this.stops++ } }; this.sources.push(source); return source }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this }, disconnect() {} } }
}

test('synthesized audio cleanup stops voices, closes context, and ignores pending resume work', async () => {
  let context
  class Context extends FakeAudioContext { constructor() { super(); context = this } }
  const sound = createMachineSound(Context, 0.04)
  sound.begin(3)
  await Promise.resolve()
  sound.stopCue(0); sound.winCue()
  assert.ok(context.sources.length > 0)
  sound.dispose()
  assert.equal(context.closeCalls, 1)
  assert.ok(context.sources.every((source) => source.stops >= 2))
  const late = createMachineSound(Context, 0.04)
  late.begin(3); late.dispose()
  await Promise.resolve()
  assert.equal(context.sources.length, 0)
})

test('muting cancels pending or active audio without affecting game results', async () => {
  let context
  class Context extends FakeAudioContext { constructor() { super(); context = this } }
  const sound = createMachineSound(Context, 0.04)
  sound.begin(3); sound.setMuted(true)
  await Promise.resolve()
  assert.equal(context.sources.length, 0)
  sound.setMuted(false); sound.begin(3)
  await Promise.resolve()
  sound.setMuted(true)
  assert.ok(context.sources.every((source) => source.stops >= 2))
  sound.dispose()
})
