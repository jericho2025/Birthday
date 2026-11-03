import { useEffect, useId, useRef } from 'react'
import './LittleLoveCompanion.css'

export function LittleLoveCompanion({ content, state, dispatch, stage }) {
  const id = useId()
  const restoreRef = useRef(null)
  const muteRef = useRef(null)
  const wasDismissed = useRef(state.dismissed)
  const quiet = content.quietStages.includes(stage)
  const reaction = !state.muted && !state.dismissed && !quiet && state.active?.stage === stage ? state.active : null
  const expression = reaction?.expression || (quiet ? 'shy' : 'happy')

  useEffect(() => {
    if (wasDismissed.current !== state.dismissed) (state.dismissed ? restoreRef : muteRef).current?.focus({ preventScroll: true })
    wasDismissed.current = state.dismissed
  }, [state.dismissed])

  if (state.dismissed) return <div className="love-companion is-dismissed"><button ref={restoreRef} className="companion-restore" onClick={() => dispatch({ type: 'restore' })}><span aria-hidden="true">♡</span>{content.restoreAction}</button></div>

  return <aside className={`love-companion expression-${expression}${reaction ? ' has-reaction' : ''}${quiet ? ' is-quiet' : ''}`} aria-label={content.idleLabel}>
    <svg className="love-mascot" viewBox="0 0 80 76" role="img" aria-label={`${content.name}, ${expression}`}>
      <defs><linearGradient id={`${id}-body`} x2=".85" y2="1"><stop stopColor="#ffe4ed" /><stop offset=".5" stopColor="#efb8d0" /><stop offset="1" stopColor="#d89aba" /></linearGradient></defs>
      <ellipse cx="40" cy="70" rx="20" ry="3" fill="#ad7b9f" opacity=".15" />
      <g className="love-mascot-body">
        <path d="M40 65C31 59 8 43 8 25 8 5 30 2 40 18 50 2 72 5 72 25 72 43 49 59 40 65Z" fill={`url(#${id}-body)`} stroke="#cc91ae" strokeWidth="1.4" />
        <path d="M17 24c1-10 12-12 16-5" fill="none" stroke="#fff7" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="24" cy="38" rx="6" ry="3" fill="#e69cbd" opacity=".5" /><ellipse cx="56" cy="38" rx="6" ry="3" fill="#e69cbd" opacity=".5" />
        <g className="love-eyes" fill="#745369" stroke="#745369" strokeWidth="2" strokeLinecap="round">
          {expression === 'excited' ? <><path d="m25 29 5 4-5 4m30-8-5 4 5 4" fill="none" /></> : expression === 'encouraging' ? <><path d="M25 33q4-5 8 0m14 0q4-5 8 0" fill="none" /></> : <><ellipse cx="29" cy={expression === 'shy' ? 35 : 32} rx="2.2" ry={expression === 'surprised' ? 4 : 3} /><ellipse cx="51" cy={expression === 'shy' ? 35 : 32} rx="2.2" ry={expression === 'surprised' ? 4 : 3} /></>}
        </g>
        {expression === 'surprised' ? <ellipse cx="40" cy="42" rx="3" ry="4" fill="#956276" /> : <path d={expression === 'shy' ? 'M37 43q3 3 6 0' : 'M34 40q6 8 12 0'} fill={expression === 'excited' ? '#a06a83' : 'none'} stroke="#956276" strokeWidth="1.7" strokeLinecap="round" />}
        <path className="love-hand" d="m13 43-5 3m59-3 5 3" stroke="#d797b6" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
    <div className="companion-copy"><span className="companion-idle" aria-hidden={!!reaction}>{quiet || state.muted ? content.quietLabel : content.name}<i aria-hidden="true">✧</i></span><p className="companion-reaction" role="status" aria-live="polite" aria-atomic="true">{reaction?.message || ''}</p></div>
    <div className="companion-controls">
      <button ref={muteRef} className="companion-mute" aria-pressed={state.muted} aria-label={state.muted ? content.unmuteAction : content.muteAction} title={state.muted ? content.unmuteAction : content.muteAction} onClick={() => dispatch({ type: 'mute' })}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14v9H9l-4 3v-3H3z" />{state.muted ? <path d="m2 2 16 16" /> : <path d="M7 8h6" />}</svg></button>
      <button className="companion-dismiss" aria-label={content.dismissAction} title={content.dismissAction} onClick={() => dispatch({ type: 'dismiss' })}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8m0-8-8 8" /></svg></button>
    </div>
  </aside>
}
