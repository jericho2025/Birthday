import { useEffect, useReducer, useRef } from 'react'
import { initialLetterState, isLetterBusy, isLetterComplete, letterDragProgress, reduceLetter } from './letterState.js'
import { useReducedMotion } from './useReducedMotion'
import './Screens.css'
import './BirthdayLetter.css'

export function BirthdayLetter({ content, headingRef, motionPaused, onComplete, onBack }) {
  const [letter, dispatch] = useReducer(reduceLetter, initialLetterState)
  const reducedMotion = useReducedMotion()
  const paperRef = useRef(null)
  const pullRef = useRef(null)
  const openRef = useRef(null)
  const pointerRef = useRef(null)
  const previousPhase = useRef('closed')
  const { phase } = letter
  const busy = isLetterBusy(letter)
  const complete = isLetterComplete(letter)
  const reading = phase === 'reading'
  const offered = phase === 'offered'
  const dragging = phase === 'dragging'
  const duration = motionPaused || reducedMotion ? 0 : content.settings.durations[phase] || 0
  const freePaper = ['lifting', 'presenting', 'reading', 'returning'].includes(phase) || (dragging && letter.progress > 0.55)

  useEffect(() => {
    if (!busy) return
    const timeout = window.setTimeout(() => dispatch({ type: 'settled', id: letter.revision }), duration)
    return () => window.clearTimeout(timeout)
  }, [busy, duration, phase, letter.revision])

  useEffect(() => {
    if (phase !== previousPhase.current) {
      if (phase === 'reading') paperRef.current?.focus({ preventScroll: true })
      if (phase === 'offered') pullRef.current?.focus({ preventScroll: true })
      if (phase === 'closed') openRef.current?.focus({ preventScroll: true })
    }
    previousPhase.current = phase
  }, [phase])

  function beginPull(event) {
    if (event.button !== 0 || !offered) return
    event.preventDefault()
    pointerRef.current = { id: event.pointerId, startY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    dispatch({ type: 'dragStart' })
  }

  function movePull(event) {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    dispatch({ type: 'dragMove', progress: letterDragProgress(pointer.startY, event.clientY, content.settings.dragDistancePx) })
  }

  function finishPull(event, cancel = false) {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    pointerRef.current = null
    const progress = letterDragProgress(pointer.startY, event.clientY, content.settings.dragDistancePx)
    dispatch({ type: 'dragMove', progress })
    dispatch({ type: 'dragRelease', commit: !cancel && (Math.abs(event.clientY - pointer.startY) < 4 || progress >= content.settings.dragCommitThreshold) })
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section className={`screen birthday-letter letter-phase-${phase}`} aria-labelledby="letter-title" style={{ '--letter-duration': `${duration}ms`, '--pull-progress': letter.progress }} onKeyDown={(event) => {
      if (event.key !== 'Escape') return
      if (dragging) { pointerRef.current = null; dispatch({ type: 'dragRelease', commit: false }); event.preventDefault() }
      else if (reading || offered) { dispatch({ type: 'close' }); event.preventDefault() }
    }}>
      <header className="letter-heading"><p className="eyebrow">{content.eyebrow}</p><h1 id="letter-title" ref={headingRef} tabIndex={-1}>{content.title} <em>{content.titleAccent}</em></h1></header>
      <div className="letter-scene" aria-busy={busy}>
        <div className="letter-envelope-part letter-envelope-back" aria-hidden="true" />
        <div className={`letter-paper-pocket${freePaper ? ' is-free' : ''}`}>
          <div className="letter-paper">
            <article className="letter-stationery" ref={paperRef} tabIndex={reading ? 0 : -1} aria-hidden={!reading} aria-labelledby="stationery-heading">
              <span className="stationery-flower" aria-hidden="true">✧</span><p className="letter-placeholder-label">{content.placeholderLabel}</p>
              <h2 id="stationery-heading">{content.heading}</h2>
              <div className="stationery-message"><p className="letter-greeting">{content.greeting}</p>{content.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<p className="letter-closing">{content.closing}<span className="letter-signature">{content.signature}</span></p></div>
            </article>
            {(offered || dragging) && <button ref={pullRef} className="letter-pull-tab" aria-label={content.pullAction} onPointerDown={beginPull} onPointerMove={movePull} onPointerUp={finishPull} onPointerCancel={(event) => finishPull(event, true)} onLostPointerCapture={(event) => finishPull(event, true)} onClick={(event) => { if (event.detail === 0) dispatch({ type: 'pull' }) }}><span aria-hidden="true">↑</span>{content.pullTab}</button>}
          </div>
        </div>
        <div className="letter-envelope-part letter-envelope-front" aria-hidden="true"><div className="envelope-pocket-fold" /><div className="letter-envelope-address"><small>{content.envelopeLabel}</small><span>{content.recipient}</span></div></div>
        <div className="letter-envelope-part letter-flap-layer" aria-hidden="true"><div className="letter-flap"><span className="letter-flap-face flap-front" /><span className="letter-flap-face flap-back" /></div></div>
        {phase === 'closed' && <button className="letter-envelope-part envelope-open-target" aria-label={content.openAction} onClick={() => dispatch({ type: 'open' })}><span className="letter-wax-seal" aria-hidden="true">♥</span></button>}
      </div>
      <p className="letter-status" role="status" aria-live="polite" aria-atomic="true">{content.statusLabels[phase]}</p>
      <div className="letter-controls">
        {phase === 'closed' && <button ref={openRef} className="primary-button letter-open" onClick={() => dispatch({ type: 'open' })}>{content.openAction}<span aria-hidden="true">↗</span></button>}
        {(offered || dragging) && <button className="primary-button letter-read" disabled={dragging} onClick={() => dispatch({ type: 'pull' })}>{content.pullAction}<span aria-hidden="true">↑</span></button>}
        {phase !== 'closed' && <><button className="letter-control letter-close" disabled={busy || dragging} onClick={() => dispatch({ type: 'close' })}>{content.closeAction}</button><button className="letter-control letter-replay" disabled={busy || dragging} onClick={() => dispatch({ type: 'replay' })}><span aria-hidden="true">↺</span>{content.replayAction}</button></>}
      </div>
      <p className="letter-instructions">{content.instructions}<span>{content.keyboardHint}</span></p>
      <footer className="letter-journey-actions"><button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button><p role="status" aria-live="polite">{complete ? content.unlockedMessage : content.lockedMessage}</p><button className="primary-button letter-continue" disabled={!complete || busy || dragging} onClick={() => { if (complete && !busy && !dragging) onComplete(letter) }}>{content.continueAction}<span aria-hidden="true">→</span></button></footer>
    </section>
  )
}
