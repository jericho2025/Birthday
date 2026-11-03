export const TILE_COUNT = 9
const orderedTiles = Array.from({ length: TILE_COUNT }, (_, index) => index + 1)

function isPermutation(tiles) {
  return Array.isArray(tiles) && tiles.length === TILE_COUNT && orderedTiles.every((id) => tiles.includes(id))
}

export function isPuzzleSolved(tiles) {
  return Array.isArray(tiles) && tiles.length === TILE_COUNT && tiles.every((id, index) => id === index + 1)
}

export function shuffleTiles(random = Math.random) {
  const tiles = [...orderedTiles]
  for (let index = tiles.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[tiles[index], tiles[other]] = [tiles[other], tiles[index]]
  }
  // Even a random source that produces the identity permutation must start unsolved.
  if (isPuzzleSolved(tiles)) [tiles[0], tiles[1]] = [tiles[1], tiles[0]]
  return tiles
}

export function createPuzzleState() {
  return { tiles: shuffleTiles(), selected: null, moves: 0 }
}

export function reducePuzzle(state, action) {
  if (action.type === 'restart') {
    if (!isPermutation(action.tiles) || isPuzzleSolved(action.tiles)) return state
    return { tiles: [...action.tiles], selected: null, moves: 0 }
  }
  if (isPuzzleSolved(state.tiles)) return state
  if (action.type === 'clearSelection') return { ...state, selected: null }
  if (action.type === 'select') {
    if (!state.tiles.includes(action.id)) return state
    if (state.selected === action.id) return { ...state, selected: null }
    if (state.selected === null) return { ...state, selected: action.id }
    return reducePuzzle(state, { type: 'swap', first: state.selected, second: action.id })
  }
  if (action.type !== 'swap') return state
  const firstIndex = state.tiles.indexOf(action.first)
  const secondIndex = state.tiles.indexOf(action.second)
  if (firstIndex === -1 || secondIndex === -1 || firstIndex === secondIndex) return state
  const tiles = [...state.tiles]
  ;[tiles[firstIndex], tiles[secondIndex]] = [tiles[secondIndex], tiles[firstIndex]]
  return { tiles, selected: null, moves: state.moves + 1 }
}
