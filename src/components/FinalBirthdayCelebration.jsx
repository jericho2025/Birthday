import { useEffect, useReducer, useRef } from 'react'
import { BirthdayCake } from './BirthdayCake'
import { createFinaleState, finaleStepDelay, reduceFinale, scheduleFinaleStep } from './finaleState.js'
import { useReducedMotion } from './useReducedMotion'
import './Screens.css'
import './FinalBirthdayCelebration.css'

const particles = Array.from({ length: 38 }, (_, i) => ({ left: `${(i * 37 + 4) % 100}%`, delay: `${(i % 8) * .17}s`, drift: `${i % 2 ? 65 : -65}px`, rotation: `${i * 41}deg` }))

function FinaleAtmosphere() {
  return <div className="finale-atmosphere" aria-hidden="true">
    <div className="finale-light light-one" /><div className="finale-light light-two" />
    <div className="finale-hearts">{Array.from({ length: 6 }, (_, i) => <span key={i} style={{ '--i': i }}>♡</span>)}</div>
    <div className="finale-stars">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i }}>✧</i>)}</div>
    <div className="finale-confetti">{particles.map((piece, i) => <i key={i} style={{ left: piece.left, '--delay': piece.delay, '--drift': piece.drift, '--rotation': piece.rotation }} />)}</div>
  </div>
}

export function FinalBirthdayCelebration({ content, headingRef, motionPaused, onBack, onRestart }) {
  const [state, dispatch] = useReducer(reduceFinale, undefined, createFinaleState)
  const reducedMotion = useReducedMotion()
  const still = reducedMotion || motionPaused
  const busy = state.phase !== 'settled'
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const restartRef = useRef(null)
  const previousRestart = useRef('idle')
  const restartedRef = useRef(false)
  const delay = finaleStepDelay(state, content.settings, reducedMotion, motionPaused)
  const messageVisible = still || ['message', 'settled'].includes(state.phase)
  const cakeVisible = still || state.phase !== 'greeting'

  useEffect(() => {
    return scheduleFinaleStep(state.revision, delay, dispatch)
  }, [delay, state.revision])

  useEffect(() => {
    if (state.run > 0) headingRef.current?.focus({ preventScroll: true })
  }, [state.run, headingRef])

  useEffect(() => {
    const dialog = dialogRef.current
    if (state.restart === 'confirming') {
      if (!dialog.open) dialog.showModal()
      cancelRef.current?.focus()
    } else {
      if (dialog.open) dialog.close()
      if (previousRestart.current === 'confirming' && state.restart === 'idle') restartRef.current?.focus()
    }
    previousRestart.current = state.restart
    return () => { if (dialog.open) dialog.close() }
  }, [state.restart])

  useEffect(() => {
    if (state.restart !== 'confirmed' || restartedRef.current) return
    restartedRef.current = true
    onRestart(state)
  }, [state, onRestart])

  function replay() {
    if (busy || state.restart !== 'idle') return
    dispatch({ type: 'replay' })
  }

  return <section className={`screen final-celebration finale-${state.phase}${still ? ' finale-still' : ''}`} aria-labelledby="finale-title" data-celebration-run={state.run} style={{ '--greeting-ms': `${content.settings.durations.greeting}ms`, '--cake-ms': `${content.settings.durations.cake}ms`, '--message-ms': `${content.settings.durations.message}ms` }}>
    <div key={state.run} className="finale-scene">
      <FinaleAtmosphere />
      <header className="finale-heading"><p className="eyebrow">{content.eyebrow}</p><h1 id="finale-title" ref={headingRef} tabIndex={-1}>{content.title}{' '}<em>{content.recipient}</em></h1><p className="finale-subtitle">{content.subtitle}</p></header>
      <div className="finale-keepsake">
        <figure className="finale-cake-scene" aria-hidden={!cakeVisible}><BirthdayCake label={content.cakeLabel} /><figcaption>{content.cakeNote}</figcaption></figure>
        <article className="finale-card" aria-labelledby="finale-card-title" aria-hidden={!messageVisible} tabIndex={messageVisible ? 0 : -1}>
          <span className="finale-card-flower" aria-hidden="true">✳</span><p className="finale-placeholder-label">{content.card.label}</p><h2 id="finale-card-title">{content.card.heading}</h2>
          <div className="finale-card-message"><p>{content.card.greeting}</p>{content.card.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<p className="finale-signature">{content.card.signature}</p></div>
          <span className="finale-card-heart" aria-hidden="true">♡</span>
        </article>
      </div>
      <p className="finale-closing-note">{content.closingNote}</p>
    </div>
    <footer className="finale-actions">
      <button className="primary-button finale-replay" disabled={busy || state.restart !== 'idle'} onClick={replay}><span aria-hidden="true">↻</span>{content.replayAction}</button>
      <div className="finale-secondary-actions"><button className="text-button finale-back" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button><span aria-hidden="true">·</span><button ref={restartRef} className="text-button finale-restart" onClick={() => dispatch({ type: 'requestRestart' })}>{content.restartAction}</button></div>
    </footer>
    <p className="sr-only" role="status" aria-live="polite">{busy ? content.replayBusyLabel : content.readyMessage}</p>
    <dialog ref={dialogRef} className="finale-restart-dialog" aria-labelledby="restart-title" aria-describedby="restart-description" onCancel={(event) => { event.preventDefault(); dispatch({ type: 'cancelRestart' }) }}>
      <span className="finale-dialog-heart" aria-hidden="true">♡</span><h2 id="restart-title">{content.confirmation.title}</h2><p id="restart-description">{content.confirmation.message}</p>
      <div><button ref={cancelRef} className="primary-button finale-cancel-restart" onClick={() => dispatch({ type: 'cancelRestart' })}>{content.confirmation.cancelAction}</button><button className="text-button finale-confirm-restart" disabled={state.restart !== 'confirming'} onClick={() => dispatch({ type: 'confirmRestart' })}>{content.confirmation.confirmAction}</button></div>
    </dialog>
  </section>
}
