import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdaySurprises as content } from '../src/config/birthdaySurprises.js'
import { birthdayContent } from '../src/config/birthdayContent.js'
import { birthdayBook } from '../src/config/birthdayBook.js'
import { SURPRISE_KEY, emptySurprises, reduceSurprises, loadSurprises, saveSurprises, scratchCoverage, extinguishCandle, cassetteTrack, canShowCertificate } from '../src/components/surpriseState.js'
import { createGiftRevealState, reduceGiftReveal } from '../src/components/giftRevealState.js'
import { createCassetteState, reduceCassette, isCassetteComplete } from '../src/components/cassetteState.js'

test('scratch reveal is idempotent; skipping earns nothing and never changes journey state', () => {
  const state = emptySurprises()
  assert.equal(reduceSurprises(state, 'skip'), state)
  const revealed = reduceSurprises(state, 'scratch')
  assert.equal(revealed.scratchRevealed, true)
  for (let i = 0; i < 40; i++) assert.equal(reduceSurprises(revealed, 'scratch'), revealed)
  assert.deepEqual(Object.keys(revealed).sort(), ['scratchRevealed', 'verificationSeen'])
})

test('scratch coverage counts distinct brush locations, bounds edges and ignores repeated clicks', () => {
  assert.equal(scratchCoverage(Array(1000).fill([.5, .5])), 1 / 240)
  assert.equal(scratchCoverage([[-1, 0], [2, 1]]), 0)
  assert.equal(scratchCoverage([[1, 1], [.999, .999]]), 1 / 240)
  const full = Array.from({ length: 240 }, (_, i) => [(i % 24 + .5) / 24, (Math.floor(i / 24) + .5) / 10])
  assert.equal(scratchCoverage(full), 1)
})

test('verification is seen once across revisits and only optional milestones survive refresh', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const state = reduceSurprises(emptySurprises(), 'verification')
  assert.equal(reduceSurprises(state, 'verification'), state)
  saveSurprises(storage, { ...state, timer: 100, audio: 'playing', pointerId: 1 })
  assert.deepEqual(loadSurprises(storage), state)
  assert.deepEqual(Object.keys(JSON.parse(values.get(SURPRISE_KEY))).sort(), ['scratchRevealed', 'verificationSeen', 'version'])
  saveSurprises(storage, emptySurprises())
  assert.deepEqual(loadSurprises(storage), emptySurprises())
})

test('unavailable, corrupt and unsupported surprise storage safely defaults to optional discoveries', () => {
  for (const text of ['invalid', 'null', '{"version":2,"verificationSeen":true}', '{"version":1,"verificationSeen":"true"}']) {
    assert.deepEqual(loadSurprises({ getItem: () => text }), emptySurprises())
  }
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.deepEqual(loadSurprises(blocked), emptySurprises())
  assert.doesNotThrow(() => saveSurprises(blocked, emptySurprises()))
})

test('secret notes use existing stable photo IDs and leave all twelve photos unchanged', () => {
  assert.equal(birthdayBook.pages.length, 12)
  for (const id of Object.keys(content.book.notes)) assert.ok(birthdayBook.pages.some(page => page.id === id))
  assert.equal(content.book.notes['birthday-photo-02'], undefined)
  assert.ok(Object.values(content.book.notes).every(note => note.startsWith('[')))
})

test('cassette A inherits existing media and independently configured B never changes it', () => {
  const original = { ...birthdayContent.cassette, audioSrc: '/song.wav', songTitle: 'Main track', artist: 'Main description' }
  const a = cassetteTrack(original, content.cassette, 'A'), b = cassetteTrack(original, content.cassette, 'B')
  assert.equal(a.audioSrc, '/song.wav'); assert.equal(a.songTitle, 'Main track')
  assert.equal(b.audioSrc, ''); assert.equal(b.placeholderTitle, content.cassette.sideB.title)
  assert.equal(original.audioSrc, '/song.wav')
  const edited = { ...content.cassette, sideB: { audioSrc: '/voice.wav', title: 'Voice', description: 'Optional' } }
  assert.equal(cassetteTrack(original, edited, 'B').audioSrc, '/voice.wav')
})

test('side change resets playback, preserves earned inspection and never requires Side B', () => {
  let state = createCassetteState(birthdayContent.cassette)
  state = reduceCassette(state, { type: 'inspect' })
  state = reduceCassette({ ...state, currentTime: 12, duration: 120 }, { type: 'reset', hasSource: false })
  assert.equal(state.currentTime, 0); assert.equal(state.duration, 0)
  assert.equal(state.status, 'unavailable'); assert.equal(isCassetteComplete(state), true)
})

test('certificate requires the valid, fully opened and claimed gift contract', () => {
  let state = createGiftRevealState()
  assert.equal(canShowCertificate(state), false)
  state = reduceGiftReveal(state, { type: 'open' })
  while (state.phase !== 'opened') {
    assert.equal(canShowCertificate(state), false)
    state = reduceGiftReveal(state, { type: 'settled', revision: state.revision })
  }
  assert.equal(canShowCertificate(state), false)
  assert.equal(canShowCertificate(reduceGiftReveal(state, { type: 'claim' })), true)
  assert.equal(canShowCertificate({ phase: 'claimed', revision: 0 }), false)
})

test('candles extinguish individually and repeated or invalid actions are inert', () => {
  let candles = [false, false, false]
  for (const index of [2, 0, 1]) {
    candles = extinguishCandle(candles, index)
    assert.equal(extinguishCandle(candles, index), candles)
  }
  assert.equal(candles.every(Boolean), true)
  for (const invalid of [-1, 3, NaN, '0']) assert.equal(extinguishCandle(candles, invalid), candles)
})
