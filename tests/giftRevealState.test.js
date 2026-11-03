import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayGift } from '../src/config/birthdayGift.js'
import { createGiftRevealState, giftRevealNextStage, isGiftOpened, isGiftRevealComplete, isValidGiftRevealState, reduceGiftReveal } from '../src/components/giftRevealState.js'

const settle = (state) => reduceGiftReveal(state, { type: 'settled', revision: state.revision })
const open = () => reduceGiftReveal(createGiftRevealState(), { type: 'open' })
const opened = () => settle(settle(settle(open())))
const claimed = () => reduceGiftReveal(opened(), { type: 'claim' })

test('opening requires an intentional action followed by all three timed steps', () => {
  const sealed = createGiftRevealState()
  assert.equal(settle(sealed), sealed)
  let state = open()
  for (const phase of ['untying', 'lifting', 'illuminating']) {
    assert.equal(state.phase, phase)
    assert.equal(isGiftOpened(state), false)
    assert.equal(isGiftRevealComplete(state), false)
    state = settle(state)
  }
  assert.equal(state.phase, 'opened')
  assert.equal(isGiftOpened(state), true)
  assert.equal(isGiftRevealComplete(state), false)
})

test('rapid open and claim clicks cannot skip steps or create duplicate claims', () => {
  let state = open()
  for (let i = 0; i < 100; i++) {
    assert.equal(reduceGiftReveal(state, { type: 'open' }), state)
    assert.equal(reduceGiftReveal(state, { type: 'claim' }), state)
  }
  state = claimed()
  for (const type of ['open', 'claim', 'settled', 'skip', 'reset']) assert.equal(reduceGiftReveal(state, { type, revision: state.revision }), state)
  assert.equal(isGiftRevealComplete(state), true)
})

test('stale, duplicate, missing and future timer revisions cannot advance an opening', () => {
  const first = open()
  const second = settle(first)
  for (const revision of [undefined, null, 0, 1, 3, '2']) assert.equal(reduceGiftReveal(second, { type: 'settled', revision }), second)
  assert.equal(settle(second).phase, 'illuminating')
})

test('app-owned state can be revisited or interrupted at every step without resetting progress', () => {
  let state = createGiftRevealState()
  for (let step = 0; step < 6; step++) {
    const remounted = JSON.parse(JSON.stringify(state))
    assert.equal(isValidGiftRevealState(remounted), true)
    assert.equal(isGiftOpened(remounted), step >= 4)
    assert.equal(isGiftRevealComplete(remounted), step === 5)
    state = step === 0 ? reduceGiftReveal(state, { type: 'open' }) : step < 4 ? settle(remounted) : reduceGiftReveal(remounted, { type: 'claim' })
  }
})

test('final chapter requires the real machine guard and an opened, claimed gift', () => {
  for (const state of [createGiftRevealState(), open(), opened()]) assert.equal(giftRevealNextStage('reveal', state, true), 'reveal')
  assert.equal(giftRevealNextStage('reveal', claimed(), false), 'reveal')
  assert.equal(giftRevealNextStage('reveal', claimed(), true), 'closing')
  for (const stage of ['welcome', 'pin', 'puzzle', 'quiz', 'album', 'cassette', 'letter', 'machine', 'closing']) assert.equal(giftRevealNextStage(stage, claimed(), true), stage)
})

test('inconsistent or malformed reveal states fail closed', () => {
  for (const fake of [null, {}, { phase: 'claimed', revision: 0 }, { phase: 'opened', revision: '4' }, { phase: 'unknown', revision: -1 }]) {
    assert.equal(isValidGiftRevealState(fake), false)
    assert.equal(isGiftOpened(fake), false)
    assert.equal(isGiftRevealComplete(fake), false)
    assert.equal(reduceGiftReveal(fake, { type: 'open' }), fake)
  }
})

test('gift content has an honest empty photo placeholder and positive phase durations', () => {
  assert.equal(birthdayGift.photo.src, '')
  assert.match(birthdayGift.photo.placeholder, /photo goes here/)
  assert.match(birthdayGift.giftName, /wristwatch/)
  assert.ok(Object.values(birthdayGift.settings.durations).every((value) => Number.isFinite(value) && value > 0))
})
