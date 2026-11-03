import { useId } from 'react'
import './JourneyTracker.css'

export function JourneyHeart({ view, content, note }) {
  const id = useId()
  return <div className={`journey-heart${view.completed === view.total ? ' is-full' : ''}`} role="progressbar" aria-label={content.heartLabel} aria-valuemin={0} aria-valuemax={view.total} aria-valuenow={view.completed} aria-valuetext={`${view.completed} ${content.of} ${view.total} ${content.chapters}`}>
    <svg viewBox="0 0 48 48" aria-hidden="true"><defs><path id={`${id}-heart`} d="M24 43C17 38 4 28 4 16 4 3 19 1 24 12 29 1 44 3 44 16 44 28 31 38 24 43Z" /><clipPath id={`${id}-clip`}><use href={`#${id}-heart`} /></clipPath><linearGradient id={`${id}-fill`} x2=".8" y2="1"><stop stopColor="#efc6d6" /><stop offset="1" stopColor="#ad7bae" /></linearGradient></defs><use href={`#${id}-heart`} fill="#fbf4f6" stroke="#cdb3cc" strokeWidth="1.2" /><g clipPath={`url(#${id}-clip)`}><rect className="journey-heart-fill" x="0" y={43 * (1 - view.completed / view.total)} width="48" height="48" fill={`url(#${id}-fill)`} /></g><path d="M11 16q1-6 7-6" stroke="#fff9" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
    <div className="journey-heart-copy"><span><b>{view.completed}</b> {content.of} {view.total} {content.chapters}</span><small className="footer-note">{note}</small></div>
  </div>
}

export function JourneyTracker({ view, steps, content, onNavigate }) {
  return <nav className="journey-nav" aria-label={content.name}><ol className="journey-progress" style={{ '--earned': `${view.frontier / (view.total - 1) * 100}%` }}>
    {view.steps.map((step) => {
      const label = step.status === 'locked' ? `${content.chapter} ${step.index + 1} · ${content.mystery}` : steps[step.index].label
      const status = content[step.status]
      return <li key={step.id} className={`journey-stop is-${step.status}`} aria-current={step.status === 'active' ? 'step' : undefined}>
        <button className="journey-step" disabled={!step.canVisit} aria-label={`${label}, ${status}`} onClick={() => onNavigate(step.id)}>
          {step.status === 'locked' ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 9V6a4 4 0 0 1 8 0v3M5 9h10v8H5zM10 12v2" /></svg> : <span className="journey-number" aria-hidden="true">{String(step.index + 1).padStart(2, '0')}</span>}
          {step.status === 'completed' && <span className="journey-check" aria-hidden="true">✧</span>}
        </button><span className="journey-stop-label" aria-hidden="true">{label}<small>{status}</small></span>
        <span className="sr-only">{label}{step.status === 'active' ? ', current step' : ''}</span>
      </li>
    })}
  </ol></nav>
}
