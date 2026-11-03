import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { BookPhotoPage } from './BookPhotoPage'
import { bookActionForKey, bookPageNumbers, dragProgress, initialBookState, isBookComplete, isValidBookPages, leafTransform, reduceBook } from './bookState'
import { useBookSound } from './useBookSound'
import { useReducedMotion } from './useReducedMotion'
import './Screens.css'
import './BirthdayFlipbook.css'

export function BirthdayFlipbook({ content, headingRef, motionPaused, onComplete, onBack }) {
  const { pages, settings } = content
  const [book, dispatch] = useReducer((state, action) => reduceBook(state, action, pages.length), initialBookState)
  const reducedMotion = useReducedMotion()
  const skipAnimation = motionPaused || reducedMotion
  const { muted, toggleMute, playFlip } = useBookSound(settings)
  const coverRef = useRef(null)
  const leavesRef = useRef(new Map())
  const stageRef = useRef(null)
  const openButtonRef = useRef(null)
  const pointerRef = useRef(null)
  const previousOpened = useRef(false)
  const configured = isValidBookPages(pages)
  const motion = book.motion
  const busy = Boolean(motion)
  const pageNumbers = bookPageNumbers(book, pages.length)
  const complete = isBookComplete(book, pages.length)
  const expanded = motion?.kind === 'open' || (book.opened && motion?.kind !== 'close')
  const movingLeaf = motion?.kind === 'turn' ? (motion.direction === 'next' ? book.spread : book.spread - 1) : -1
  const coverMoving = motion?.kind === 'open' || motion?.kind === 'close'
  const coverProgress = coverMoving ? motion.progress : book.opened ? 1 : 0
  const coverTransform = coverMoving ? leafTransform(coverProgress, motion.kind === 'close', true) : leafTransform(coverProgress, false, true)

  useLayoutEffect(() => {
    if (!motion || motion.phase !== 'settling') return
    const element = motion.kind === 'turn' ? leavesRef.current.get(movingLeaf) : coverRef.current
    const backwards = motion.kind === 'close' || motion.direction === 'previous'
    const hardcover = motion.kind !== 'turn'
    const baseDuration = hardcover ? settings.coverDurationMs : settings.turnDurationMs
    const duration = skipAnimation || !element?.animate ? 0 : Math.max(80, baseDuration * Math.abs(motion.target - motion.progress))
    const animation = duration ? element.animate([
      { transform: leafTransform(motion.progress, backwards, hardcover) },
      { transform: leafTransform((motion.progress + motion.target) / 2, backwards, hardcover), offset: 0.5 },
      { transform: leafTransform(motion.target, backwards, hardcover) },
    ], { duration, easing: 'cubic-bezier(.25,.65,.3,1)', fill: 'forwards' }) : null
    // The timer is independent of animation events, including reduced/paused motion.
    const timer = window.setTimeout(() => dispatch({ type: 'settled', id: motion.id }), duration ? duration + 30 : 0)
    return () => { window.clearTimeout(timer); animation?.cancel() }
  }, [motion, movingLeaf, settings.coverDurationMs, settings.turnDurationMs, skipAnimation])

  useEffect(() => {
    if (book.opened !== previousOpened.current) {
      if (book.opened) stageRef.current?.focus({ preventScroll: true })
      else openButtonRef.current?.focus({ preventScroll: true })
    }
    previousOpened.current = book.opened
  }, [book.opened])

  function canTurn(direction) {
    return book.opened && !busy && (direction === 'next' ? book.spread < pages.length / 2 - 1 : book.spread > 0)
  }

  function request(action) {
    if (!configured || busy || (action.type === 'turn' && !canTurn(action.direction))) return
    if (action.type === 'close' && (!book.opened || book.spread !== 0)) return
    dispatch(action)
    playFlip()
  }

  function beginDrag(event) {
    const direction = event.currentTarget.dataset.direction
    if (event.button !== 0 || !canTurn(direction)) return
    event.preventDefault()
    stageRef.current?.focus({ preventScroll: true })
    const width = stageRef.current.querySelector('.book-rig').getBoundingClientRect().width / 2
    pointerRef.current = { id: event.pointerId, startX: event.clientX, direction, width }
    event.currentTarget.setPointerCapture(event.pointerId)
    dispatch({ type: 'dragStart', direction })
    playFlip()
  }

  function moveDrag(event) {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    dispatch({ type: 'dragMove', progress: dragProgress(pointer.startX, event.clientX, pointer.width, pointer.direction) })
  }

  function finishDrag(event, cancel = false) {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    pointerRef.current = null
    const progress = dragProgress(pointer.startX, event.clientX, pointer.width, pointer.direction)
    const clicked = Math.abs(event.clientX - pointer.startX) < 4
    dispatch({ type: 'dragMove', progress })
    dispatch({ type: 'dragRelease', commit: !cancel && (clicked || progress >= settings.dragCommitThreshold) })
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const visiblePage = (number) => book.opened && pageNumbers.includes(number)

  return (
    <section className="screen book-screen" aria-labelledby="book-title">
      <header className="book-heading"><p className="eyebrow">{content.eyebrow}</p><h1 id="book-title" ref={headingRef} tabIndex={-1}>{content.title}</h1></header>
      {!configured ? <p role="status">{content.unavailableMessage}</p> : (
        <div className="book-stage" ref={stageRef} tabIndex={0} role="group" aria-label="Interactive birthday photo book" aria-describedby="book-instructions" onKeyDown={(event) => {
          if (event.key === 'Escape' && motion?.phase === 'dragging') {
            pointerRef.current = null
            dispatch({ type: 'dragRelease', commit: false })
            event.preventDefault()
            return
          }
          const action = bookActionForKey(event, book.opened)
          if (action) { event.preventDefault(); request(action) }
        }}>
          <div className="book-scene" style={{ '--cover-duration': `${skipAnimation ? 0 : settings.coverDurationMs}ms` }}>
            <div className={`book-rig${expanded ? ' is-expanded' : ''}`} aria-busy={busy}>
              <div className="book-hardback hardback-left" aria-hidden="true" />
              <div className="book-hardback hardback-right" aria-hidden="true" />
              <div className="book-paper-stack stack-left" aria-hidden="true" />
              <div className="book-paper-stack stack-right" aria-hidden="true" />
              <div className="book-last-page"><BookPhotoPage busy={busy} page={pages[pages.length - 1]} number={pages.length} side="right" visible={visiblePage(pages.length)} /></div>
              <div className="book-spine" aria-hidden="true"><span>{content.spineTitle}</span></div>
              <div ref={coverRef} className={`book-leaf book-front-cover${coverMoving ? ' is-moving' : ''}`} style={{ transform: coverTransform, zIndex: coverMoving || !book.opened ? 50 : 1 }}>
                <div className="book-face book-face-front cover-outside" aria-hidden={book.opened}>
                  <button className="book-cover-button" onClick={() => request({ type: 'open' })} disabled={busy || book.opened} tabIndex={book.opened ? -1 : 0} aria-label={content.openAction}>
                    <span className="cover-border" aria-hidden="true" />
                    <span className="cover-ornament" aria-hidden="true">✧</span>
                    <span className="cover-title">{content.coverTitle}</span>
                    <span className="cover-name">{content.coverName}</span>
                    <span className="cover-rule" aria-hidden="true" />
                    <span className="cover-subtitle">{content.coverSubtitle}</span>
                    <span className="cover-flower" aria-hidden="true">✳</span>
                  </button>
                </div>
                <div className="book-face book-face-back"><BookPhotoPage busy={busy} page={pages[0]} number={1} side="left" visible={visiblePage(1)} /></div>
              </div>
              {Array.from({ length: pages.length / 2 - 1 }, (_, index) => {
                const moving = index === movingLeaf
                const turned = index < book.spread
                const transform = moving ? leafTransform(motion.progress, motion.direction === 'previous') : leafTransform(turned ? 1 : 0)
                return (
                  <div key={pages[index * 2 + 1].id} ref={(node) => { if (node) leavesRef.current.set(index, node); else leavesRef.current.delete(index) }} className={`book-leaf${moving ? ' is-moving' : ''}`} style={{ transform, zIndex: moving ? 40 : turned ? 10 + index : 30 - index }}>
                    <div className="book-face book-face-front"><BookPhotoPage busy={busy} page={pages[index * 2 + 1]} number={index * 2 + 2} side="right" visible={visiblePage(index * 2 + 2)} /></div>
                    <div className="book-face book-face-back"><BookPhotoPage busy={busy} page={pages[index * 2 + 2]} number={index * 2 + 3} side="left" visible={visiblePage(index * 2 + 3)} /></div>
                  </div>
                )
              })}
              {book.opened && ['previous', 'next'].map((direction) => (
                <button key={direction} data-direction={direction} className={`book-edge edge-${direction}`} aria-label={direction === 'next' ? content.nextAction : content.previousAction} tabIndex={-1} disabled={!canTurn(direction) && motion?.phase !== 'dragging'}
                  onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)} onClick={(event) => { if (event.detail === 0) request({ type: 'turn', direction }) }}>
                  <span aria-hidden="true">{direction === 'next' ? '›' : '‹'}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="book-page-status" role="status" aria-live="polite" aria-atomic="true">{busy ? content.busyLabel : book.opened ? `${content.pageLabel} ${pageNumbers[0]}–${pageNumbers[1]} ${content.ofLabel} ${pages.length}` : content.coverLabel}</p>
          <div className="book-controls">
            <button className="book-control" disabled={!canTurn('previous')} onClick={() => request({ type: 'turn', direction: 'previous' })}>← {content.previousAction}</button>
            {book.opened ? <button className="book-control book-close" disabled={busy || book.spread !== 0} title={book.spread === 0 ? content.closeAction : content.closeHint} onClick={() => request({ type: 'close' })}>{content.closeAction}</button> : <button ref={openButtonRef} className="book-control book-open" disabled={busy} onClick={() => request({ type: 'open' })}>{content.openAction}</button>}
            <button className="book-control" disabled={!canTurn('next')} onClick={() => request({ type: 'turn', direction: 'next' })}>{content.nextAction} →</button>
            <button className="book-control book-sound" onClick={toggleMute} aria-pressed={muted}>{muted ? content.unmuteAction : content.muteAction}</button>
          </div>
          <p className="book-instructions" id="book-instructions">{content.instructions}</p>
        </div>
      )}
      <div className="book-journey-actions"><button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button><p className="book-completion-note">{complete ? content.completionMessage : content.progressHint}</p>{complete && <button className="primary-button book-continue" disabled={busy} onClick={() => onComplete(book)}>{content.continueAction}<span aria-hidden="true">→</span></button>}</div>
    </section>
  )
}
