import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayContent } from '../src/config/birthdayContent.js'
import { initialLetterState, isLetterBusy, isLetterComplete, letterDragProgress, reduceLetter } from '../src/components/letterState.js'

const settle = (state) => reduceLetter(state, { type: 'settled', id: state.revision })
const offered = () => settle(settle(reduceLetter(initialLetterState, { type: 'open' })))
const reading = () => settle(settle(reduceLetter(offered(), { type: 'pull' })))
function finishMotion(state) {
  for (let count = 0; count < 12 && isLetterBusy(state); count++) state = settle(state)
  assert.equal(isLetterBusy(state), false)
  return state
}

test('central letter content contains only editable placeholder personal text', () => {
  const content = birthdayContent.letter
  for (const field of ['heading', 'greeting', 'closing', 'signature', 'recipient']) assert.match(content[field], /^\[.*\]$/)
  assert.ok(content.paragraphs.length > 0)
  assert.ok(content.paragraphs.every((paragraph) => /^\[.*\]$/.test(paragraph)))
  for (const duration of Object.values(content.settings.durations)) assert.ok(duration > 0)
})

test('the letter starts sealed, incomplete, and cannot be pulled or closed prematurely', () => {
  assert.equal(initialLetterState.phase, 'closed')
  assert.equal(isLetterComplete(initialLetterState), false)
  for (const type of ['pull', 'dragStart', 'close', 'replay', 'skip', 'reading']) assert.equal(reduceLetter(initialLetterState, { type }), initialLetterState)
})

test('opening rotates the flap before offering the raised paper and does not grant completion', () => {
  const opening = reduceLetter(initialLetterState, { type: 'open' })
  assert.equal(opening.phase, 'opening')
  assert.equal(opening.opened, false)
  const rising = settle(opening)
  assert.equal(rising.phase, 'rising')
  assert.equal(rising.opened, true)
  assert.equal(isLetterComplete(rising), false)
  const paper = settle(rising)
  assert.equal(paper.phase, 'offered')
  assert.equal(paper.displayed, false)
  assert.equal(isLetterComplete(paper), false)
})

test('a deliberate pull lifts and presents the stationery before unlocking the next chapter', () => {
  const lifting = reduceLetter(offered(), { type: 'pull' })
  assert.equal(lifting.phase, 'lifting')
  assert.equal(isLetterComplete(lifting), false)
  const presenting = settle(lifting)
  assert.equal(presenting.phase, 'presenting')
  assert.equal(isLetterComplete(presenting), false)
  const displayed = settle(presenting)
  assert.equal(displayed.phase, 'reading')
  assert.equal(isLetterComplete(displayed), true)
})

test('dragging cannot complete the letter until the user commits and the paper finishes settling', () => {
  const drag = reduceLetter(offered(), { type: 'dragStart' })
  const moved = reduceLetter(drag, { type: 'dragMove', progress: 0.8 })
  assert.equal(moved.phase, 'dragging')
  assert.equal(isLetterComplete(moved), false)
  assert.equal(settle(moved), moved)
  const released = reduceLetter(moved, { type: 'dragRelease', commit: true })
  assert.equal(isLetterComplete(released), false)
  assert.equal(finishMotion(released).phase, 'reading')
  assert.equal(isLetterComplete(finishMotion(released)), true)
})

test('short or cancelled drags return to offered paper without displaying or completing it', () => {
  const drag = reduceLetter(reduceLetter(offered(), { type: 'dragStart' }), { type: 'dragMove', progress: 0.8 })
  const returning = reduceLetter(drag, { type: 'dragRelease', commit: false })
  assert.equal(returning.phase, 'canceling')
  const cancelled = settle(returning)
  assert.equal(cancelled.phase, 'offered')
  assert.equal(cancelled.progress, 0)
  assert.equal(isLetterComplete(cancelled), false)
})

test('rapid input cannot reverse or skip a pending envelope animation', () => {
  const pending = reduceLetter(initialLetterState, { type: 'open' })
  for (const type of ['open', 'pull', 'close', 'replay', 'dragStart']) assert.equal(reduceLetter(pending, { type }), pending)
  const drag = reduceLetter(offered(), { type: 'dragStart' })
  for (const type of ['open', 'pull', 'close', 'replay']) assert.equal(reduceLetter(drag, { type }), drag)
})

test('stale and duplicate animation callbacks do not advance a later phase', () => {
  const opening = reduceLetter(initialLetterState, { type: 'open' })
  assert.equal(reduceLetter(opening, { type: 'settled', id: opening.revision - 1 }), opening)
  const rising = settle(opening)
  assert.equal(reduceLetter(rising, { type: 'settled', id: opening.revision }), rising)
  const paper = settle(rising)
  assert.equal(settle(paper), paper)
})

test('closing an unread envelope lowers the paper before sealing and never unlocks Continue', () => {
  const lowering = reduceLetter(offered(), { type: 'close' })
  assert.equal(lowering.phase, 'lowering')
  assert.equal(settle(lowering).phase, 'sealing')
  const closed = finishMotion(lowering)
  assert.equal(closed.phase, 'closed')
  assert.equal(isLetterComplete(closed), false)
})

test('closing a displayed letter returns, tucks, lowers, and seals while retaining earned progress', () => {
  let state = reduceLetter(reading(), { type: 'close' })
  for (const phase of ['returning', 'tucking', 'lowering', 'sealing']) {
    assert.equal(state.phase, phase)
    assert.equal(isLetterComplete(state), true)
    state = settle(state)
  }
  assert.equal(state.phase, 'closed')
  assert.equal(isLetterComplete(state), true)
})

test('Replay closes and reopens to the paper edge, with another intentional pull available', () => {
  const replayed = finishMotion(reduceLetter(reading(), { type: 'replay' }))
  assert.equal(replayed.phase, 'offered')
  assert.equal(replayed.replay, false)
  assert.equal(isLetterComplete(replayed), true)
  assert.equal(finishMotion(reduceLetter(replayed, { type: 'pull' })).phase, 'reading')
  const unreadReplay = finishMotion(reduceLetter(offered(), { type: 'replay' }))
  assert.equal(unreadReplay.phase, 'offered')
  assert.equal(isLetterComplete(unreadReplay), false)
})

test('pointer movement clamps upward progress and rejects invalid input', () => {
  assert.equal(letterDragProgress(300, 235, 130), 0.5)
  assert.equal(letterDragProgress(300, 100, 130), 1)
  assert.equal(letterDragProgress(300, 350, 130), 0)
  assert.equal(letterDragProgress(300, 200, 0), 0)
  assert.equal(letterDragProgress(NaN, 200, 130), 0)
  const drag = reduceLetter(offered(), { type: 'dragStart' })
  assert.equal(reduceLetter(drag, { type: 'dragMove', progress: 2 }).progress, 1)
  assert.equal(reduceLetter(drag, { type: 'dragMove', progress: -1 }).progress, 0)
  assert.equal(reduceLetter(drag, { type: 'dragMove', progress: NaN }), drag)
})

test('completion guard requires both genuine envelope opening and displayed stationery', () => {
  for (const state of [null, {}, { opened: true }, { displayed: true }, { opened: false, displayed: true }]) assert.equal(isLetterComplete(state), false)
  assert.equal(isLetterComplete(reading()), true)
})
