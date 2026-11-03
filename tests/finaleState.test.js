import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayContent } from '../src/config/birthdayContent.js'
import { birthdayFinale as content } from '../src/config/birthdayFinale.js'
import { createMachineState, reduceGiftMachine } from '../src/components/giftMachineState.js'
import { createGiftRevealState, giftRevealNextStage, reduceGiftReveal } from '../src/components/giftRevealState.js'
import { canAccessFinale, canRestartAdventure, createFinaleState, finaleBackStage, finaleStepDelay, isValidFinaleState, reduceFinale, scheduleFinaleStep } from '../src/components/finaleState.js'

const config = birthdayContent.machine
const settle = (state) => reduceFinale(state, { type: 'settled', revision: state.revision })
const finished = () => settle(settle(settle(createFinaleState())))
function completedJourney() {
  let machine = createMachineState(config)
  for (let spin = 0; spin < 3; spin++) {
    machine = reduceGiftMachine(machine, { type: 'spin' }, config)
    for (let reelIndex = 0; reelIndex < 3; reelIndex++) machine = reduceGiftMachine(machine, { type: 'reelStopped', reelIndex, transaction: machine.transaction }, config)
  }
  machine = reduceGiftMachine(machine, { type: 'celebrationFinished', transaction: machine.transaction }, config)
  let gift = reduceGiftReveal(createGiftRevealState(), { type: 'open' })
  for (let step = 0; step < 3; step++) gift = reduceGiftReveal(gift, { type: 'settled', revision: gift.revision })
  return { machine, opened: gift, gift: reduceGiftReveal(gift, { type: 'claim' }) }
}

test('finale unlock requires a complete three-spin jackpot and an opened, claimed gift', () => {
  const { machine, gift, opened } = completedJourney()
  assert.equal(canAccessFinale(machine, gift, config), true)
  for (const invalidGift of [null, {}, createGiftRevealState(), opened, { phase: 'claimed', revision: 0 }]) assert.equal(canAccessFinale(machine, invalidGift, config), false)
  for (const invalidMachine of [null, {}, createMachineState(config), { ...machine, phase: 'celebrating' }, { ...machine, history: [] }]) assert.equal(canAccessFinale(invalidMachine, gift, config), false)
  assert.equal(giftRevealNextStage('reveal', opened, true), 'reveal')
  assert.equal(giftRevealNextStage('reveal', gift, true), 'closing')
})

test('finale back navigation returns only to the earned gift and leaves completion untouched', () => {
  const { machine, gift } = completedJourney()
  const snapshot = JSON.stringify({ machine, gift })
  assert.equal(finaleBackStage('closing', machine, gift, config), 'reveal')
  for (const stage of ['welcome', 'pin', 'puzzle', 'quiz', 'album', 'cassette', 'letter', 'machine', 'reveal']) assert.equal(finaleBackStage(stage, machine, gift, config), stage)
  assert.equal(finaleBackStage('closing', machine, createGiftRevealState(), config), 'closing')
  assert.equal(JSON.stringify({ machine, gift }), snapshot)
})

test('entrance settles each beat in order and ignores stale, future, or duplicate callbacks', () => {
  let state = createFinaleState()
  for (const phase of ['greeting', 'cake', 'message']) {
    assert.equal(state.phase, phase)
    for (const revision of [undefined, -1, state.revision + 1, String(state.revision)]) assert.equal(reduceFinale(state, { type: 'settled', revision }), state)
    const previous = state
    state = settle(state)
    assert.equal(reduceFinale(state, { type: 'settled', revision: previous.revision }), state)
  }
  assert.equal(state.phase, 'settled')
  assert.equal(settle(state), state)
})

test('replay restarts only the finale once, locks during animation and preserves the earned journey', () => {
  const journey = completedJourney(), snapshot = JSON.stringify(journey)
  const initial = createFinaleState()
  assert.equal(reduceFinale(initial, { type: 'replay' }), initial)
  let replay = reduceFinale(finished(), { type: 'replay' })
  assert.equal(replay.run, 1)
  assert.equal(replay.phase, 'greeting')
  for (let i = 0; i < 100; i++) assert.equal(reduceFinale(replay, { type: 'replay' }), replay)
  assert.equal(reduceFinale(replay, { type: 'settled', revision: 0 }), replay)
  replay = reduceFinale(settle(settle(settle(replay))), { type: 'replay' })
  assert.equal(replay.run, 2)
  assert.equal(isValidFinaleState(replay), true)
  assert.equal(JSON.stringify(journey), snapshot)
  assert.equal(canAccessFinale(journey.machine, journey.gift, config), true)
})

test('restart requires explicit confirmation; requesting, cancelling and Escape-equivalent cancel preserve the adventure', () => {
  const { machine, gift } = completedJourney()
  const idle = finished()
  assert.equal(reduceFinale(idle, { type: 'confirmRestart' }), idle)
  assert.equal(canRestartAdventure('closing', idle, machine, gift, config), false)
  const confirming = reduceFinale(idle, { type: 'requestRestart' })
  assert.equal(canRestartAdventure('closing', confirming, machine, gift, config), false)
  assert.equal(reduceFinale(confirming, { type: 'replay' }), confirming)
  assert.equal(reduceFinale(confirming, { type: 'requestRestart' }), confirming)
  assert.deepEqual(reduceFinale(confirming, { type: 'cancelRestart' }), idle)
  const confirmed = reduceFinale(confirming, { type: 'confirmRestart' })
  assert.equal(canRestartAdventure('closing', confirmed, machine, gift, config), true)
  for (const type of ['confirmRestart', 'requestRestart', 'cancelRestart', 'replay', 'settled']) assert.equal(reduceFinale(confirmed, { type, revision: confirmed.revision }), confirmed)
  assert.equal(canRestartAdventure('reveal', confirmed, machine, gift, config), false)
  assert.equal(canRestartAdventure('closing', confirmed, machine, createGiftRevealState(), config), false)
})

test('reduced or paused motion settles every beat asynchronously and leaves replay usable', () => {
  for (const [reduced, paused] of [[true, false], [false, true], [true, true]]) {
    let state = createFinaleState()
    while (state.phase !== 'settled') {
      assert.equal(finaleStepDelay(state, content.settings, reduced, paused), 0)
      state = settle(state)
    }
    assert.equal(finaleStepDelay(state, content.settings, reduced, paused), null)
    assert.equal(reduceFinale(state, { type: 'replay' }).run, 1)
  }
  assert.equal(finaleStepDelay(createFinaleState(), content.settings, false, false), content.settings.durations.greeting)
})

test('timer cleanup blocks late callbacks after unmount, replay, or a motion change', () => {
  let job, cleared = 0, calls = 0
  const clock = { setTimeout(fn, ms) { job = { fn, ms }; return 7 }, clearTimeout(id) { assert.equal(id, 7); cleared++ } }
  const cancel = scheduleFinaleStep(0, 1150, () => calls++, clock)
  assert.equal(job.ms, 1150)
  cancel(); job.fn()
  assert.equal(calls, 0)
  assert.equal(cleared, 1)
  let action
  const cancelReduced = scheduleFinaleStep(4, 0, (value) => { action = value }, clock)
  assert.equal(job.ms, 0)
  assert.equal(action, undefined)
  job.fn()
  assert.deepEqual(action, { type: 'settled', revision: 4 })
  cancelReduced()
  scheduleFinaleStep(7, null, () => calls++, clock)()
  assert.equal(calls, 0)
})

test('malformed finale state cannot replay, confirm a reset or advance', () => {
  for (const state of [null, {}, { ...finished(), revision: 0 }, { ...finished(), run: -1 }, { ...finished(), restart: 'yes' }]) {
    assert.equal(isValidFinaleState(state), false)
    assert.equal(finaleStepDelay(state, content.settings, false, false), null)
    assert.equal(reduceFinale(state, { type: 'confirmRestart' }), state)
    assert.equal(reduceFinale(state, { type: 'replay' }), state)
  }
})

test('finale copy is centralized, clearly labeled sample content and preserves the specified greeting', () => {
  assert.equal(birthdayContent.finale, content)
  assert.equal(`${content.title} ${content.recipient}`, 'Happy Birthday, My Love!')
  assert.match(content.card.label, /PLACEHOLDER/)
  assert.match(content.card.signature, /^\[/)
  assert.equal(birthdayContent.welcome.recipient, 'My Love')
  assert.equal(birthdayContent.pinChallenge.pin, '1120')
  assert.equal(birthdayContent.gift.photo.src, '')
  assert.ok(Object.values(content.settings.durations).every((ms) => Number.isFinite(ms) && ms > 0))
})
