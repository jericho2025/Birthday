import './ExperienceShell.css'
import { JourneyHeart, JourneyTracker } from './JourneyTracker'
import { LittleLoveCompanion } from './LittleLoveCompanion'

export function ExperienceShell({ content, experience, journeyView, companion, stage, motionPaused, onNavigate, onToggleMotion, children }) {
  return (
    <div className="experience-shell">
      <header className="site-header">
        <span className="wordmark"><span className="brand-flower" aria-hidden="true">✳</span>{content.brand}</span>
        <LittleLoveCompanion content={experience.companion} state={companion.state} dispatch={companion.dispatch} stage={stage} />
        <span className="date-badge"><span aria-hidden="true">✧</span>{content.dateLabel}</span>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <JourneyHeart view={journeyView} content={experience.journey} note={content.footer} />
        <JourneyTracker view={journeyView} steps={content.journey} content={experience.journey} onNavigate={onNavigate} />
        <button className="motion-button" onClick={onToggleMotion} aria-pressed={motionPaused}>
          <span aria-hidden="true">{motionPaused ? '▷' : 'Ⅱ'}</span>
          {motionPaused ? 'Resume animations' : 'Pause animations'}
        </button>
      </footer>
    </div>
  )
}
