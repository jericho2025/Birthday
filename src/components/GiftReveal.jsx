import { useEffect, useRef, useState } from 'react'
import { isGiftOpened, isGiftRevealComplete } from './giftRevealState.js'
import { useReducedMotion } from './useReducedMotion'
import './Screens.css'
import './GiftReveal.css'

function GiftPhoto({ photo }) {
  const [failedSource, setFailedSource] = useState(null)
  // Local files only; no remote product images or tracking requests.
  const local = typeof photo.src === 'string' && /^\/(?!\/)/.test(photo.src)
  return <div className="gift-photo">
    {local && failedSource !== photo.src ? <img src={photo.src} alt={photo.alt} onError={() => setFailedSource(photo.src)} /> : <div className="gift-photo-placeholder">
      <span className="gift-photo-mark" aria-hidden="true">✧</span>
      <p>{photo.placeholder}</p><small>{photo.placeholderNote}</small>
    </div>}
  </div>
}

export function GiftReveal({ content, state, dispatch, headingRef, motionPaused, onComplete, onBack }) {
  const reducedMotion = useReducedMotion()
  const reduced = motionPaused || reducedMotion
  const opened = isGiftOpened(state)
  const claimed = isGiftRevealComplete(state)
  const busy = ['untying', 'lifting', 'illuminating'].includes(state.phase)
  const presentationRef = useRef(null)
  const confirmationRef = useRef(null)
  const durations = content.settings.durations

  useEffect(() => {
    if (!busy) return
    const timer = window.setTimeout(() => dispatch({ type: 'settled', revision: state.revision }), reduced ? 0 : durations[state.phase])
    return () => window.clearTimeout(timer)
  }, [busy, state.phase, state.revision, durations, dispatch, reduced])

  useEffect(() => {
    if (claimed) confirmationRef.current?.focus({ preventScroll: true })
    else if (opened) presentationRef.current?.focus({ preventScroll: true })
  }, [opened, claimed])

  return <section className={`screen gift-reveal gift-${state.phase}${reduced ? ' gift-reduced' : ''}`} aria-labelledby="gift-title" style={{ '--ribbon-ms': `${durations.untying}ms`, '--lid-ms': `${durations.lifting}ms`, '--light-ms': `${durations.illuminating}ms` }}>
    <header className="gift-heading"><p className="eyebrow">{content.eyebrow}</p><h1 id="gift-title" ref={headingRef} tabIndex={-1}>{content.title}<em>{content.titleAccent}</em></h1><p>{content.introduction}</p></header>
    {!opened ? <>
      <div className="gift-theatre" aria-busy={busy}>
        <div className="gift-halo" aria-hidden="true" />
        <div className="gift-sparkles" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i }}>✧</i>)}</div>
        <div className="gift-box" role="img" aria-label={content.boxLabel}>
          <div className="gift-box-base"><span className="gift-ribbon-front" /></div>
          <div className="gift-box-lid"><span className="gift-lid-ribbon" /><div className="gift-satin-bow"><i /><i /><span /><b /><b /></div></div>
          <div className="gift-box-glow" aria-hidden="true" />
        </div>
        <span className="gift-theatre-note">{content.sealedNote}</span>
      </div>
      <div className="gift-open-controls"><p role="status" aria-live="polite">{busy ? content.openingMessages[state.phase] : ''}</p><button className="primary-button" disabled={busy} onClick={() => dispatch({ type: 'open' })}>{busy ? content.openingMessages[state.phase] : content.openAction}<span aria-hidden="true">✧</span></button></div>
    </> : <div className="gift-presentation" ref={presentationRef} tabIndex={-1} aria-labelledby="gift-reveal-title">
      <div className="gift-presentation-photo"><GiftPhoto photo={content.photo} /><span className="gift-photo-caption">{content.giftName}</span></div>
      <div className="gift-presentation-copy"><p className="gift-small-label">WITH LOVE, FOR YOU</p><h2 id="gift-reveal-title">{content.revealTitle}</h2><p>{content.message}</p>
        {!claimed ? <button className="primary-button" onClick={() => dispatch({ type: 'claim' })}>{content.claimAction}<span aria-hidden="true">♡</span></button> : <div className="gift-claim-confirmation" ref={confirmationRef} tabIndex={-1} role="status"><h3>{content.confirmationTitle}</h3><p>{content.confirmation}</p></div>}
      </div>
      <div className="gift-reveal-particles" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    </div>}
    <footer className="gift-journey-actions"><button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button>{claimed && <button className="primary-button" onClick={() => onComplete(state)}>{content.continueAction}<span aria-hidden="true">→</span></button>}</footer>
  </section>
}
