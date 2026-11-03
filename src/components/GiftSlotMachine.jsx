import { useCallback, useEffect, useRef } from 'react'
import { MachineReel } from './MachineReel'
import { isGiftMachineComplete, isMachineSpinKey, isValidMachineConfig, MACHINE_SPINS } from './giftMachineState.js'
import { useReducedMotion } from './useReducedMotion'
import { useMachineSound } from './useMachineSound'
import './Screens.css'
import './GiftSlotMachine.css'

const confetti = Array.from({ length: 32 }, (_, index) => ({ left: `${(index * 37 + 3) % 100}%`, delay: `${(index % 5) * 0.04}s`, drift: `${(index * 29) % 140 - 70}px`, rotate: `${index * 47}deg` }))

export function GiftSlotMachine({ content, state, dispatch, headingRef, motionPaused, onComplete, onBack }) {
  const reducedMotion = useReducedMotion()
  const reduced = reducedMotion || motionPaused
  const { muted, toggleMute, begin, stopSpin, stopCue, winCue } = useMachineSound(content.settings)
  const requestedRef = useRef(false)
  const continueRef = useRef(null)
  const configured = isValidMachineConfig(content)
  const spinning = state.phase === 'spinning'
  const celebrating = state.phase === 'celebrating'
  const complete = isGiftMachineComplete(state, content)
  const canSpin = configured && state.phase === 'ready' && state.finishedSpins < MACHINE_SPINS
  const remaining = Math.max(0, MACHINE_SPINS - state.finishedSpins - (spinning ? 1 : 0))
  const result = !configured ? content.unavailableMessage : celebrating || complete ? content.jackpotMessage : spinning ? content.spinningLabel : state.finishedSpins ? content.outcomes[state.finishedSpins - 1].message : content.initialMessage

  const onStopped = useCallback((index, transaction) => {
    stopCue(index)
    dispatch({ type: 'reelStopped', reelIndex: index, transaction })
  }, [dispatch, stopCue])

  useEffect(() => {
    if (state.phase === 'ready') requestedRef.current = false
    if (!spinning) stopSpin()
    if (!celebrating) return
    winCue()
    const timeout = window.setTimeout(() => dispatch({ type: 'celebrationFinished', transaction: state.transaction }), reduced ? 0 : content.settings.celebrationMs)
    return () => window.clearTimeout(timeout)
  }, [state.phase, state.transaction, spinning, celebrating, reduced, content.settings.celebrationMs, dispatch, stopSpin, winCue])

  useEffect(() => { if (complete) continueRef.current?.focus({ preventScroll: true }) }, [complete])

  function spin() {
    if (!canSpin || requestedRef.current) return
    requestedRef.current = true
    if (!reduced) begin((content.settings.reelStopMs[2] + content.settings.finalSpinDelayMs) / 1000)
    dispatch({ type: 'spin' })
  }

  return (
    <section className={`screen gift-machine phase-${state.phase}`} aria-labelledby="machine-title" style={{ '--celebration-duration': `${content.settings.celebrationMs}ms` }} onKeyDown={(event) => {
      if (isMachineSpinKey(event)) { event.preventDefault(); spin() }
      if ((event.key === 'Enter' || event.key === ' ') && event.repeat) event.preventDefault()
    }}>
      <header className="machine-heading"><p className="eyebrow">{content.eyebrow}</p><h1 id="machine-title" ref={headingRef} tabIndex={-1}>{content.title}</h1><p>{content.subtitle}</p></header>
      <div className="machine-layout">
        <div className="machine-stage">
          <div className="machine-body" aria-busy={spinning || celebrating}>
            <div className="machine-bow" aria-hidden="true"><i /><i /><span /></div>
            <div className="machine-marquee"><span aria-hidden="true">✧</span>{content.marquee}<span aria-hidden="true">✧</span></div>
            <div className="machine-reel-frame">
              <div className="machine-bulbs" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>
              <div className="machine-reels">{configured && [0, 1, 2].map((index) => <MachineReel key={index} config={content} state={state} index={index} reduced={reduced} onStopped={onStopped} />)}</div>
            </div>
            <div className="machine-dashboard"><button className="machine-spin" disabled={!canSpin} onClick={spin}>{spinning ? content.spinningLabel : content.spinAction}<span aria-hidden="true">✧</span></button><div className="machine-remaining"><span>{content.remainingLabel}</span><strong>{remaining}</strong></div></div>
            <div className="machine-lower-trim" aria-hidden="true"><span />♡<span /></div>
            <button className="machine-lever" disabled={!canSpin} aria-label={content.leverLabel} onClick={spin}><span className="lever-socket" /><span className="lever-arm"><i /></span></button>
            <div className="machine-plinth" aria-hidden="true"><i /><i /></div>
          </div>
          {celebrating && <div className="machine-confetti" aria-hidden="true">{confetti.map((piece, index) => <i key={index} style={{ left: piece.left, '--delay': piece.delay, '--drift': piece.drift, '--rotation': piece.rotate }} />)}</div>}
        </div>
        <aside className="machine-story" aria-label={content.title}>
          <div className="machine-count"><span>{content.finishedLabel}</span><b>{state.finishedSpins} / {MACHINE_SPINS}</b></div>
          <ol className="machine-spin-tracker" aria-label={content.finishedLabel}>{[0, 1, 2].map((index) => <li key={index} className={index < state.finishedSpins ? 'is-finished' : index === state.finishedSpins && spinning ? 'is-active' : ''}><span className="sr-only">Spin </span>{String(index + 1).padStart(2, '0')}</li>)}</ol>
          <p className="machine-result" role="status" aria-live="polite" aria-atomic="true">{result}</p>
          {celebrating || complete ? <div className="machine-prize"><div className="mystery-gift" role="img" aria-label={content.giftLabel}><span className="mystery-gift-bow" /><span className="mystery-gift-lid" /><span className="mystery-gift-ribbon" /><b>?</b></div><h2>{content.jackpotTitle}</h2><p>{content.sealedLabel}</p></div> : <p className="machine-personal-note">{content.personalMessage}</p>}
          <button className="machine-sound text-button" aria-pressed={muted} onClick={toggleMute}>{muted ? content.unmuteAction : content.muteAction}</button>
        </aside>
      </div>
      <p className="machine-instructions">{complete ? content.completeMessage : content.instructions}<span>{content.keyboardHint}</span></p>
      <footer className="machine-journey-actions"><button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button>{complete && <button ref={continueRef} className="primary-button machine-continue" onClick={() => onComplete(state)}>{content.continueAction}<span aria-hidden="true">→</span></button>}</footer>
    </section>
  )
}
