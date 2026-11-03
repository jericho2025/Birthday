import { useEffect, useReducer, useRef, useState } from 'react'
import { createPuzzleState, isPuzzleSolved, reducePuzzle, shuffleTiles } from './puzzleState'
import './Screens.css'
import './TilePuzzle.css'

const tileIds = Array.from({ length: 9 }, (_, index) => index + 1)
const confetti = Array.from({ length: 30 }, (_, index) => ({
  left: `${(index * 37 + 3) % 100}%`,
  delay: `${(index % 5) * 0.07}s`,
  drift: `${((index * 29) % 160) - 80}px`,
  rotation: `${index * 47}deg`,
}))

export function TilePuzzle({ content, headingRef, onComplete, onBack, onReaction }) {
  const [puzzle, dispatch] = useReducer(reducePuzzle, undefined, createPuzzleState)
  const [draggedId, setDraggedId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const dragSource = useRef(null)
  const lastDragEnd = useRef(-Infinity)
  const solved = isPuzzleSolved(puzzle.tiles)
  const previousSolved = useRef(false)
  const placed = puzzle.tiles.filter((id, index) => id === index + 1).length
  const photoMode = content.media.mode === 'photo' && Boolean(content.media.photoSrc)
  const message = solved ? content.successMessage : puzzle.selected === null ? content.idleMessage : `${content.tileLabel} ${puzzle.selected}. ${content.selectedMessage}`

  useEffect(() => {
    if (solved && !previousSolved.current) onReaction?.('puzzleComplete')
    previousSolved.current = solved
  }, [solved, onReaction])

  function endDrag(event) {
    dragSource.current = null
    lastDragEnd.current = event.timeStamp
    setDraggedId(null)
    setDropTarget(null)
  }

  function restart(event) {
    endDrag(event)
    dispatch({ type: 'restart', tiles: shuffleTiles() })
  }

  return (
    <section className={`screen puzzle-screen${solved ? ' puzzle-complete' : ''}`} aria-labelledby="puzzle-title">
      <div className="puzzle-intro">
        <span className="puzzle-flower" aria-hidden="true">✳</span>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="puzzle-title" ref={headingRef} tabIndex={-1}>{content.title}<em>{content.titleAccent}</em></h1>
        <p className="screen-description">{content.description}</p>
        <p className="puzzle-instructions" id="puzzle-instructions">{content.instructions}</p>
        <button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button>
      </div>
      <div className="puzzle-play-area">
        <div className="puzzle-stats"><span>{content.movesLabel} <b>{puzzle.moves}</b></span><span>{content.placedLabel} <b>{placed} / 9</b></span></div>
        <div className="puzzle-board-wrap">
          <div className="puzzle-board" role="group" aria-label={content.boardLabel} aria-describedby="puzzle-instructions">
            {tileIds.map((id) => {
              const position = puzzle.tiles.indexOf(id)
              const selected = puzzle.selected === id
              return (
                <button
                  key={id}
                  className={`puzzle-tile${selected ? ' is-selected' : ''}${draggedId === id ? ' is-dragging' : ''}${dropTarget === id && draggedId !== id ? ' is-drop-target' : ''}`}
                  style={{ '--column': position % 3, '--row': Math.floor(position / 3), '--tile-color': content.colors[id - 1] }}
                  aria-label={`${content.tileLabel} ${id}, ${content.positionLabel} ${position + 1}`}
                  aria-pressed={selected}
                  aria-disabled={solved}
                  draggable={!solved}
                  onClick={(event) => {
                    // Native drag/drop can emit a trailing mouse click. Keyboard clicks remain available.
                    if (event.detail > 0 && event.timeStamp - lastDragEnd.current < 200) return
                    dispatch({ type: 'select', id })
                  }}
                  onDragStart={(event) => {
                    if (solved) { event.preventDefault(); return }
                    dragSource.current = id
                    setDraggedId(id)
                    dispatch({ type: 'clearSelection' })
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(id))
                  }}
                  onDragOver={(event) => {
                    if (dragSource.current === null || solved) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDropTarget(id)
                  }}
                  onDragLeave={() => setDropTarget((current) => current === id ? null : current)}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragSource.current !== null && !solved) dispatch({ type: 'swap', first: dragSource.current, second: id })
                    endDrag(event)
                  }}
                  onDragEnd={endDrag}
                >
                  <span className={`puzzle-tile-face${photoMode ? ' has-photo' : ''}`} style={photoMode ? {
                    backgroundImage: `url(${JSON.stringify(content.media.photoSrc)})`,
                    backgroundSize: '300% 300%',
                    backgroundPosition: `${((id - 1) % 3) * 50}% ${Math.floor((id - 1) / 3) * 50}%`,
                  } : undefined}>
                    {(!photoMode || content.media.showNumbers) && <span className="tile-number" aria-hidden="true">{id}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {solved && <div className="puzzle-confetti" aria-hidden="true">{confetti.map((piece, index) => <i key={index} style={{ left: piece.left, '--delay': piece.delay, '--drift': piece.drift, '--rotation': piece.rotation, background: content.colors[index % 9] }} />)}</div>}
        </div>
        {photoMode && <p className="sr-only">{content.media.photoDescription}</p>}
        <p className="puzzle-feedback" role="status" aria-live="polite" aria-atomic="true">{message}</p>
        <div className="puzzle-actions">
          <button className="puzzle-restart" onClick={restart}><span aria-hidden="true">↺</span>{content.restartAction}</button>
          <button className="primary-button puzzle-continue" disabled={!solved} onClick={() => { if (solved) onComplete(puzzle.tiles) }}>{content.continueAction}<span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>
  )
}
