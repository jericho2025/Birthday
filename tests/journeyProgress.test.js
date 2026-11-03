import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayContent as content } from '../src/config/birthdayContent.js'
import { clearBirthdayProgress, initialJourneyProgress, JOURNEY_SESSION_KEY, JOURNEY_STAGES, journeyRules, loadJourneyProgress, saveJourneyProgress, stableGiftState } from '../src/components/journeyProgress.js'
import { createMachineState, loadMachineState, MACHINE_SESSION_KEY, reduceGiftMachine, saveMachineState } from '../src/components/giftMachineState.js'

function storage() {
  const data = new Map()
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
}
function machineResults(count = 3, complete = true) {
  let state = createMachineState(content.machine)
  for (let i = 0; i < count; i++) {
    state = reduceGiftMachine(state, { type: 'spin' }, content.machine)
    for (let reelIndex = 0; reelIndex < 3; reelIndex++) state = reduceGiftMachine(state, { type: 'reelStopped', reelIndex, transaction: state.transaction }, content.machine)
  }
  return complete ? reduceGiftMachine(state, { type: 'celebrationFinished', transaction: state.transaction }, content.machine) : state
}

test('all ten chapters restore their reached checkpoint, with independent gift/machine guards', () => {
  const machine = machineResults()
  for (const [index, stage] of JOURNEY_STAGES.entries()) {
    const store = storage(), gift = index === 9 ? { phase: 'claimed', revision: 5 } : initialJourneyProgress().gift
    saveMachineState(store, machine, content.machine)
    saveJourneyProgress(store, { stage, unlockedThrough: index, gift, motionPaused: true }, content, machine)
    const loaded = loadJourneyProgress(store, content)
    assert.equal(loaded.stage, stage)
    assert.equal(loaded.unlockedThrough, index)
    assert.equal(loaded.motionPaused, true)
  }
})

test('an interrupted gift opens sealed on refresh; opened and claimed gifts stay earned', () => {
  const store = storage(), machine = machineResults()
  saveMachineState(store, machine, content.machine)
  for (const [phase, revision] of [['sealed', 0], ['untying', 1], ['lifting', 2], ['illuminating', 3], ['opened', 4], ['claimed', 5]]) {
    saveJourneyProgress(store, { stage: 'reveal', unlockedThrough: 8, gift: { phase, revision }, motionPaused: false }, content, machine)
    assert.equal(loadJourneyProgress(store, content).gift.phase, revision < 4 ? 'sealed' : phase)
    const raw = JSON.parse(store.getItem(JOURNEY_SESSION_KEY))
    assert.ok(['sealed', 'opened', 'claimed'].includes(raw.gift.phase))
  }
})

test('restoration cannot skip the machine or claiming due to incomplete or inconsistent records', () => {
  const store = storage(), machine = machineResults()
  saveMachineState(store, machine, content.machine)
  saveJourneyProgress(store, { stage: 'closing', unlockedThrough: 9, gift: { phase: 'opened', revision: 4 }, motionPaused: false }, content, machine)
  assert.equal(loadJourneyProgress(store, content).stage, 'reveal')
  saveJourneyProgress(store, { stage: 'closing', unlockedThrough: 9, gift: { phase: 'claimed', revision: 5 }, motionPaused: false }, content, machine)
  store.removeItem(MACHINE_SESSION_KEY)
  const downgraded = loadJourneyProgress(store, content)
  assert.equal(downgraded.stage, 'machine')
  assert.equal(downgraded.gift.phase, 'sealed')
  assert.equal(downgraded.unlockedThrough, 7)
})

test('unknown, corrupted, stale and out-of-order checkpoints fail closed', () => {
  const store = storage()
  const valid = { version: 1, rules: journeyRules(content), stage: 'album', unlockedThrough: 4, gift: { phase: 'sealed', revision: 0 }, motionPaused: false }
  const invalid = [null, {}, { ...valid, version: 9 }, { ...valid, stage: 'checkout' }, { ...valid, stage: 'closing' }, { ...valid, unlockedThrough: 100 }, { ...valid, rules: 'old' }, { ...valid, motionPaused: 'true' }, { ...valid, gift: { phase: 'lifting', revision: 2 } }]
  for (const record of invalid) {
    store.setItem(JOURNEY_SESSION_KEY, JSON.stringify(record))
    assert.deepEqual(loadJourneyProgress(store, content), initialJourneyProgress())
  }
  store.setItem(JOURNEY_SESSION_KEY, '{bad json')
  assert.deepEqual(loadJourneyProgress(store, content), initialJourneyProgress())
  assert.notEqual(journeyRules(content), journeyRules({ ...content, pinChallenge: { ...content.pinChallenge, pin: '0000' } }))
})

test('serialization whitelists stable progress and never stores personal content, audio, timers or dialog state', () => {
  const store = storage(), machine = machineResults()
  saveMachineState(store, machine, content.machine)
  saveJourneyProgress(store, { stage: 'closing', unlockedThrough: 9, gift: { phase: 'claimed', revision: 5, timer: 88 }, motionPaused: false, audio: { playing: true }, restart: 'confirmed', timer: 3 }, content, machine)
  const raw = store.getItem(JOURNEY_SESSION_KEY)
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['gift', 'motionPaused', 'rules', 'stage', 'unlockedThrough', 'version'])
  assert.doesNotMatch(raw, /playing|audio|timer|confirmed|1120|My Love|imageSrc/)
  assert.deepEqual(stableGiftState({ phase: 'claimed', revision: 5, timer: 88 }), { phase: 'claimed', revision: 5 })
})

test('refresh never saves active reels or an unfinished jackpot, while normal remounts retain memory state', () => {
  const store = storage()
  const second = reduceGiftMachine(machineResults(1), { type: 'spin' }, content.machine)
  const partial = reduceGiftMachine(second, { type: 'reelStopped', reelIndex: 0, transaction: second.transaction }, content.machine)
  saveMachineState(store, partial, content.machine)
  assert.equal(loadMachineState(store, content.machine).finishedSpins, 1)
  assert.equal(loadMachineState(store, content.machine).phase, 'ready')
  assert.equal(partial.phase, 'spinning')
  saveMachineState(store, machineResults(3, false), content.machine)
  assert.equal(loadMachineState(store, content.machine).finishedSpins, 2)
  assert.doesNotMatch(store.getItem(MACHINE_SESSION_KEY), /spinning|celebrating|false/)
})

test('confirmed restart removes only birthday keys and an empty adventure does not recreate saved progress', () => {
  const store = storage(), machine = machineResults()
  store.setItem('unrelated', 'keep')
  saveMachineState(store, machine, content.machine)
  saveJourneyProgress(store, { stage: 'closing', unlockedThrough: 9, gift: { phase: 'claimed', revision: 5 }, motionPaused: false }, content, machine)
  clearBirthdayProgress(store)
  saveMachineState(store, createMachineState(content.machine), content.machine)
  saveJourneyProgress(store, initialJourneyProgress(), content, createMachineState(content.machine))
  assert.equal(store.getItem(JOURNEY_SESSION_KEY), null)
  assert.equal(store.getItem(MACHINE_SESSION_KEY), null)
  assert.equal(store.getItem('unrelated'), 'keep')
  assert.deepEqual(loadJourneyProgress(store, content), initialJourneyProgress())
})

test('blocked or full session storage never interrupts in-memory progression or restart', () => {
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') }, removeItem() { throw Error('blocked') } }
  assert.deepEqual(loadJourneyProgress(blocked, content), initialJourneyProgress())
  assert.doesNotThrow(() => saveJourneyProgress(blocked, { ...initialJourneyProgress(), stage: 'pin', unlockedThrough: 1 }, content, createMachineState(content.machine)))
  assert.doesNotThrow(() => clearBirthdayProgress(blocked))
})
