import test from 'node:test'
import assert from 'node:assert/strict'
import { createPuzzleState, isPuzzleSolved, reducePuzzle, shuffleTiles } from '../src/components/puzzleState.js'

const ordered = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const unsolved = [2, 1, 3, 4, 5, 6, 7, 8, 9]
const initial = () => ({ tiles: [...unsolved], selected: null, moves: 0 })

test('shuffle includes all nine tiles and never begins solved, including identity RNG output', () => {
  let seed = 1120
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const arrangements = new Set()
  for (let attempt = 0; attempt < 500; attempt++) {
    const tiles = shuffleTiles(random)
    assert.deepEqual([...tiles].sort((a, b) => a - b), ordered)
    assert.equal(isPuzzleSolved(tiles), false)
    arrangements.add(tiles.join(','))
  }
  assert.ok(arrangements.size > 450)
  assert.equal(isPuzzleSolved(shuffleTiles(() => 0.999999)), false)
  assert.equal(isPuzzleSolved(shuffleTiles(() => 0)), false)
  const state = createPuzzleState()
  assert.equal(isPuzzleSolved(state.tiles), false)
  assert.equal(state.moves, 0)
  assert.equal(state.selected, null)
})

test('click selection supports cancellation and click-to-swap completion', () => {
  const state = initial()
  const selected = reducePuzzle(state, { type: 'select', id: 2 })
  assert.equal(selected.selected, 2)
  assert.equal(selected.moves, 0)
  assert.equal(reducePuzzle(selected, { type: 'select', id: 2 }).selected, null)
  const result = reducePuzzle(selected, { type: 'select', id: 1 })
  assert.deepEqual(result.tiles, ordered)
  assert.equal(result.selected, null)
  assert.equal(result.moves, 1)
  assert.equal(isPuzzleSolved(result.tiles), true)
  assert.deepEqual(state, initial())
})

test('drag swapping uses the same result as click swapping and clears previous selection', () => {
  const state = { ...initial(), selected: 9 }
  const dropped = reducePuzzle(state, { type: 'swap', first: 2, second: 1 })
  const clicked = reducePuzzle(reducePuzzle(initial(), { type: 'select', id: 2 }), { type: 'select', id: 1 })
  assert.deepEqual(dropped, clicked)
  assert.equal(reducePuzzle(state, { type: 'clearSelection' }).selected, null)
})

test('invalid and same-tile swaps do not change tiles or count moves', () => {
  const state = initial()
  for (const action of [
    { type: 'swap', first: 1, second: 1 },
    { type: 'swap', first: 0, second: 1 },
    { type: 'swap', first: 1, second: 10 },
    { type: 'select', id: 10 },
  ]) assert.equal(reducePuzzle(state, action), state)
})

test('completion freezes tiles; restart reopens an unsolved board and resets selection/moves', () => {
  const complete = reducePuzzle(initial(), { type: 'swap', first: 2, second: 1 })
  assert.equal(reducePuzzle(complete, { type: 'swap', first: 2, second: 1 }), complete)
  assert.equal(reducePuzzle(complete, { type: 'select', id: 1 }), complete)
  const tiles = shuffleTiles(() => 0)
  const restarted = reducePuzzle(complete, { type: 'restart', tiles })
  assert.deepEqual(restarted, { tiles, selected: null, moves: 0 })
  assert.notEqual(restarted.tiles, tiles)
  assert.equal(isPuzzleSolved(restarted.tiles), false)
  const selected = reducePuzzle(initial(), { type: 'select', id: 1 })
  assert.equal(reducePuzzle(selected, { type: 'restart', tiles }).selected, null)
})

test('completion and restart reject incomplete, duplicate, or incorrectly ordered boards', () => {
  const state = initial()
  for (const tiles of [null, [], [1, 2, 3], [1, 2, 3, 4, 5, 6, 7, 8, 8], unsolved, ordered.map(String)]) {
    assert.equal(isPuzzleSolved(tiles), false)
  }
  for (const tiles of [null, [], [1, 2, 3, 4, 5, 6, 7, 8, 8], ordered]) {
    assert.equal(reducePuzzle(state, { type: 'restart', tiles }), state)
  }
})

test('every shuffled arrangement can be solved by ordinary swaps', () => {
  let state = { tiles: shuffleTiles(() => 0.3), selected: null, moves: 0 }
  for (let position = 0; position < 9; position++) {
    if (state.tiles[position] !== position + 1) {
      state = reducePuzzle(state, { type: 'swap', first: state.tiles[position], second: position + 1 })
    }
  }
  assert.equal(isPuzzleSolved(state.tiles), true)
  assert.ok(state.moves > 0)
})
