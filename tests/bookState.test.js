import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayBook } from '../src/config/birthdayBook.js'
import { bookActionForKey, bookPageNumbers, dragProgress, initialBookState, isBookComplete, isValidBookPages, leafTransform, reduceBook } from '../src/components/bookState.js'

const reduce = (state, action) => reduceBook(state, action, 12)
const settle = (state) => reduce(state, { type: 'settled', id: state.motion.id })
const openBook = () => settle(reduce(initialBookState, { type: 'open' }))
const turn = (state, direction = 'next') => settle(reduce(state, { type: 'turn', direction }))

test('config supplies twelve unique numbered photo areas and a final message, without personal media', () => {
  assert.equal(isValidBookPages(birthdayBook.pages), true)
  assert.equal(birthdayBook.pages.length, 12)
  birthdayBook.pages.forEach((page, index) => {
    assert.equal(page.placeholder, `PHOTO PLACEHOLDER ${String(index + 1).padStart(2, '0')}`)
    assert.equal(page.imageSrc, '')
  })
  assert.ok(birthdayBook.pages[11].message)
  assert.equal(birthdayBook.settings.startMuted, true)
})

test('the book starts closed, and a settled opening exposes exactly pages 1–2', () => {
  assert.deepEqual(bookPageNumbers(initialBookState, 12), [])
  assert.equal(reduce(initialBookState, { type: 'turn', direction: 'next' }), initialBookState)
  const opening = reduce(initialBookState, { type: 'open' })
  assert.equal(opening.opened, false)
  assert.deepEqual(opening.visited, [])
  const opened = settle(opening)
  assert.deepEqual(bookPageNumbers(opened, 12), [1, 2])
  assert.deepEqual(opened.visited, [0])
  assert.equal(opened.completed, false)
})

test('forward and backward turns move exactly one spread and stay within page bounds', () => {
  let state = openBook()
  assert.equal(reduce(state, { type: 'turn', direction: 'previous' }), state)
  for (let index = 1; index < 6; index++) {
    state = turn(state)
    assert.deepEqual(bookPageNumbers(state, 12), [index * 2 + 1, index * 2 + 2])
  }
  assert.equal(reduce(state, { type: 'turn', direction: 'next' }), state)
  for (let index = 4; index >= 0; index--) {
    state = turn(state, 'previous')
    assert.deepEqual(bookPageNumbers(state, 12), [index * 2 + 1, index * 2 + 2])
  }
  assert.equal(reduce(state, { type: 'turn', direction: 'previous' }), state)
})

test('rapid inputs cannot start another turn, close, open, or reverse while busy', () => {
  const pending = reduce(openBook(), { type: 'turn', direction: 'next' })
  for (const action of [{ type: 'turn', direction: 'next' }, { type: 'turn', direction: 'previous' }, { type: 'close' }, { type: 'open' }, { type: 'dragStart', direction: 'next' }]) {
    assert.equal(reduce(pending, action), pending)
  }
  assert.deepEqual(bookPageNumbers(settle(pending), 12), [3, 4])
})

test('stale or duplicate animation completions cannot alter a later transaction', () => {
  const first = reduce(openBook(), { type: 'turn', direction: 'next' })
  assert.equal(reduce(first, { type: 'settled', id: first.motion.id - 1 }), first)
  const settled = settle(first)
  assert.equal(reduce(settled, { type: 'settled', id: first.motion.id }), settled)
  const second = reduce(settled, { type: 'turn', direction: 'next' })
  assert.equal(reduce(second, { type: 'settled', id: first.motion.id }), second)
})

test('dragging does not advance pages until committed and settled', () => {
  const initial = openBook()
  const dragging = reduce(initial, { type: 'dragStart', direction: 'next' })
  const moved = reduce(dragging, { type: 'dragMove', progress: 0.6 })
  assert.equal(moved.spread, 0)
  assert.deepEqual(moved.visited, [0])
  assert.equal(reduce(moved, { type: 'settled', id: moved.motion.id }), moved)
  const released = reduce(moved, { type: 'dragRelease', commit: true })
  assert.equal(released.spread, 0)
  assert.deepEqual(bookPageNumbers(settle(released), 12), [3, 4])
})

test('cancelled forward and backward drags return to their original spread without counting a visit', () => {
  for (const [state, direction] of [[openBook(), 'next'], [turn(openBook()), 'previous']]) {
    const moved = reduce(reduce(state, { type: 'dragStart', direction }), { type: 'dragMove', progress: 0.8 })
    const cancelled = settle(reduce(moved, { type: 'dragRelease', commit: false }))
    assert.equal(cancelled.spread, state.spread)
    assert.deepEqual(cancelled.visited, state.visited)
    assert.equal(cancelled.motion, null)
  }
})

test('completion unlocks only after the last spread fully settles, and survives revisiting', () => {
  let state = openBook()
  for (let index = 0; index < 4; index++) state = turn(state)
  assert.equal(isBookComplete(state, 12), false)
  const pending = reduce(state, { type: 'turn', direction: 'next' })
  assert.equal(isBookComplete(pending, 12), false)
  const cancelled = settle(reduce(reduce(state, { type: 'dragStart', direction: 'next' }), { type: 'dragRelease', commit: false }))
  assert.equal(isBookComplete(cancelled, 12), false)
  const finished = settle(pending)
  assert.equal(isBookComplete(finished, 12), true)
  assert.equal(isBookComplete(turn(finished, 'previous'), 12), true)
  assert.equal(isBookComplete({ ...finished, visited: [5] }, 12), false)
  assert.equal(isBookComplete({ ...finished, completed: false }, 12), false)
})

test('closing is available only at the first spread and does not reset earned completion', () => {
  let state = openBook()
  const closed = settle(reduce(state, { type: 'close' }))
  assert.equal(closed.opened, false)
  assert.deepEqual(bookPageNumbers(closed, 12), [])
  assert.deepEqual(bookPageNumbers(settle(reduce(closed, { type: 'open' })), 12), [1, 2])
  state = turn(state)
  assert.equal(reduce(state, { type: 'close' }), state)
  while (state.spread < 5) state = turn(state)
  while (state.spread > 0) state = turn(state, 'previous')
  assert.equal(isBookComplete(settle(reduce(state, { type: 'close' })), 12), true)
})

test('drag movement is clamped and cannot turn the wrong way', () => {
  assert.equal(dragProgress(500, 80, 300, 'next'), 1)
  assert.equal(dragProgress(100, 520, 300, 'previous'), 1)
  assert.equal(dragProgress(100, 200, 300, 'next'), 0)
  assert.equal(dragProgress(500, 400, 300, 'previous'), 0)
  assert.equal(dragProgress(500, 400, 0, 'next'), 0)
  const dragging = reduce(openBook(), { type: 'dragStart', direction: 'next' })
  assert.equal(reduce(dragging, { type: 'dragMove', progress: 5 }).motion.progress, 1)
  assert.equal(reduce(dragging, { type: 'dragMove', progress: -5 }).motion.progress, 0)
  assert.equal(reduce(dragging, { type: 'dragMove', progress: NaN }), dragging)
})

test('arrow keys honor focus-scoped navigation, modifiers, and held-key protection', () => {
  assert.deepEqual(bookActionForKey({ key: 'ArrowRight' }, false), { type: 'open' })
  assert.deepEqual(bookActionForKey({ key: 'ArrowRight' }, true), { type: 'turn', direction: 'next' })
  assert.deepEqual(bookActionForKey({ key: 'ArrowLeft' }, true), { type: 'turn', direction: 'previous' })
  assert.equal(bookActionForKey({ key: 'ArrowLeft' }, false), null)
  assert.equal(bookActionForKey({ key: 'Tab' }, true), null)
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey', 'repeat']) assert.equal(bookActionForKey({ key: 'ArrowRight', [modifier]: true }, true), null)
})

test('each sheet has matching forward/backward transform endpoints, independent of animation speed', () => {
  assert.equal(leafTransform(0), leafTransform(1, true))
  assert.equal(leafTransform(1), leafTransform(0, true))
  assert.match(leafTransform(0.5), /rotateY\(-90deg\)/)
  assert.match(leafTransform(0.5, false, true), /skewY\(0deg\)/)
})

test('invalid page counts, incomplete media configurations, and direct jump actions cannot advance', () => {
  for (const count of [0, 1, 3, undefined, 2.5]) {
    assert.equal(reduceBook(initialBookState, { type: 'open' }, count), initialBookState)
    assert.equal(isBookComplete(initialBookState, count), false)
  }
  assert.equal(reduce(openBook(), { type: 'jump', spread: 5 }).spread, 0)
  assert.equal(isValidBookPages([]), false)
  assert.equal(isValidBookPages(birthdayBook.pages.slice(0, 3)), false)
  assert.equal(isValidBookPages([birthdayBook.pages[0], birthdayBook.pages[0]]), false)
  assert.equal(isBookComplete(null, 12), false)
})
