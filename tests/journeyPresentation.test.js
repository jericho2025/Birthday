import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayContent as content } from '../src/config/birthdayContent.js'
import { createMachineState, reduceGiftMachine, saveMachineState } from '../src/components/giftMachineState.js'
import { initialJourneyProgress, JOURNEY_STAGES, clearBirthdayProgress, loadJourneyProgress, saveJourneyProgress, JOURNEY_SESSION_KEY } from '../src/components/journeyProgress.js'
import { changeJourneyStage, journeyPresentation, revisitChapter } from '../src/components/journeyPresentation.js'

const config = content.machine
const sealed = { phase: 'sealed', revision: 0 }, claimed = { phase: 'claimed', revision: 5 }
const view = (journey, machine = createMachineState(config), gift = sealed) => journeyPresentation(journey, machine, gift, config)
function completedMachine() {
  let state = createMachineState(config)
  for (let i = 0; i < 3; i++) {
    state = reduceGiftMachine(state, { type: 'spin' }, config)
    for (let reelIndex = 0; reelIndex < 3; reelIndex++) state = reduceGiftMachine(state, { type: 'reelStopped', reelIndex, transaction: state.transaction }, config)
  }
  return reduceGiftMachine(state, { type: 'celebrationFinished', transaction: state.transaction }, config)
}
const storage = () => {
  const data = new Map()
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
}

test('tracker projects the existing ten-stage order into completed, active and locked states', () => {
  for (let frontier = 0; frontier <= 7; frontier++) {
    const result = view({ stage: JOURNEY_STAGES[frontier], unlockedThrough: frontier })
    assert.deepEqual(result.steps.map((s) => s.id), JOURNEY_STAGES)
    assert.deepEqual(result.steps.map((s) => s.id), content.journey.map((s) => s.id))
    assert.equal(result.completed, frontier)
    assert.equal(result.total, 10)
    assert.equal(result.steps[frontier].status, 'active')
    assert.equal(result.steps.filter((s) => s.status === 'completed').length, frontier)
    assert.equal(result.steps.filter((s) => s.status === 'locked').length, 9 - frontier)
    assert.ok(result.steps.slice(frontier).every((s) => !s.canVisit))
  }
})

test('heart acknowledges settled machine/claim milestones without unlocking future checkpoints', () => {
  const machine = completedMachine()
  const won = view({ stage: 'machine', unlockedThrough: 7 }, machine)
  assert.equal(won.completed, 8)
  assert.equal(won.steps[8].status, 'locked')
  const revealed = view({ stage: 'reveal', unlockedThrough: 8 }, machine, { phase: 'opened', revision: 4 })
  assert.equal(revealed.completed, 8)
  const giftDone = view({ stage: 'reveal', unlockedThrough: 8 }, machine, claimed)
  assert.equal(giftDone.completed, 9)
  assert.equal(giftDone.steps[9].status, 'locked')
  assert.equal(view({ stage: 'closing', unlockedThrough: 9 }, machine, claimed).completed, 10)
})

test('heart stays illuminated on revisits and labels earned machine/gift checkpoints consistently', () => {
  const machine = completedMachine()
  const final = view({ stage: 'album', unlockedThrough: 9 }, machine, claimed)
  assert.equal(final.completed, 10)
  assert.equal(final.steps[4].status, 'active')
  assert.equal(final.steps[9].status, 'completed')
  assert.equal(view({ stage: 'album', unlockedThrough: 7 }, machine).steps[7].status, 'completed')
  assert.equal(view({ stage: 'album', unlockedThrough: 8 }, machine, claimed).steps[8].status, 'completed')
})

test('an unfinished reached chapter remains available to resume after an earlier revisit', () => {
  const result = view({ stage: 'puzzle', unlockedThrough: 5 })
  assert.equal(result.completed, 5)
  assert.equal(result.steps[2].status, 'active')
  assert.equal(result.steps[5].status, 'available')
  assert.equal(result.steps[5].canVisit, true)
  assert.equal(result.steps[6].canVisit, false)
})

test('revisit guards reject unknown/locked chapters, current chapters and unearned later prerequisites', () => {
  const initial = { stage: 'welcome', unlockedThrough: 0 }, machine = completedMachine()
  for (const target of ['welcome', ...JOURNEY_STAGES.slice(1), 'unknown']) assert.equal(revisitChapter(initial, target, machine, claimed, config), initial)
  const fake = { stage: 'machine', unlockedThrough: 9 }
  assert.equal(revisitChapter(fake, 'reveal', createMachineState(config), sealed, config), fake)
  assert.equal(revisitChapter(fake, 'closing', machine, sealed, config), fake)
  const late = { stage: 'closing', unlockedThrough: 9 }
  assert.deepEqual(revisitChapter(late, 'album', machine, claimed, config), { stage: 'album', unlockedThrough: 9 })
})

test('state transitions preserve frontier, reject accidental chapter jumps and ignore rapid revisit repeats', () => {
  let state = { stage: 'welcome', unlockedThrough: 0 }
  assert.equal(changeJourneyStage(state, 'closing'), state)
  state = changeJourneyStage(state, 'pin')
  assert.deepEqual(state, { stage: 'pin', unlockedThrough: 1 })
  assert.equal(changeJourneyStage(state, 'unknown'), state)
  state = changeJourneyStage(state, (current) => current === 'pin' ? 'puzzle' : current)
  const back = revisitChapter(state, 'welcome', createMachineState(config), sealed, config)
  assert.equal(back.unlockedThrough, 2)
  for (let i = 0; i < 100; i++) assert.equal(revisitChapter(back, 'welcome', createMachineState(config), sealed, config), back)
  assert.equal(changeJourneyStage(back, 'pin').unlockedThrough, 2)
})

test('malformed frontiers do not grant access and late checkpoints still require independent completion', () => {
  for (const unlockedThrough of [undefined, -1, 10, 999, NaN, '9']) assert.equal(view({ stage: 'welcome', unlockedThrough }, completedMachine(), claimed).frontier, 0)
  assert.equal(view({ stage: 'machine', unlockedThrough: 9 }).frontier, 7)
  assert.equal(view({ stage: 'reveal', unlockedThrough: 9 }, completedMachine()).frontier, 8)
})

test('refresh restores the same heart/tracker frontier after revisiting, with no independent progress store', () => {
  const store = storage(), machine = completedMachine()
  saveMachineState(store, machine, config)
  const journey = revisitChapter({ stage: 'closing', unlockedThrough: 9 }, 'album', machine, claimed, config)
  saveJourneyProgress(store, { ...journey, gift: claimed, motionPaused: true }, content, machine)
  const loaded = loadJourneyProgress(store, content)
  assert.equal(loaded.stage, 'album')
  assert.equal(loaded.motionPaused, true)
  assert.deepEqual(view(loaded, machine, loaded.gift), view(journey, machine, claimed))
  assert.equal(JSON.parse(store.getItem(JOURNEY_SESSION_KEY)).unlockedThrough, 9)
})

test('confirmed restart clears stored progression and returns heart/tracker to the initial state', () => {
  const store = storage(), machine = completedMachine()
  saveMachineState(store, machine, config)
  saveJourneyProgress(store, { stage: 'closing', unlockedThrough: 9, gift: claimed, motionPaused: false }, content, machine)
  clearBirthdayProgress(store)
  const restored = loadJourneyProgress(store, content)
  assert.deepEqual(restored, initialJourneyProgress())
  assert.equal(view(restored).completed, 0)
  assert.equal(view(restored).steps.filter((s) => s.status === 'locked').length, 9)
})
