import './ExperienceShell.css'

export function ExperienceShell({ content, stage, motionPaused, onToggleMotion, children }) {
  const currentStep = content.journey.findIndex((step) => step.id === stage)
  return (
    <div className="experience-shell">
      <header className="site-header">
        <span className="wordmark"><span className="brand-flower" aria-hidden="true">✳</span>{content.brand}</span>
        <span className="date-badge"><span aria-hidden="true">✧</span>{content.dateLabel}</span>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <span className="footer-note">{content.footer}</span>
        <ol className="journey-progress" aria-label="Birthday journey progress">
          {content.journey.map((step, index) => (
            <li key={step.id} className={index <= currentStep ? 'is-reached' : ''} aria-current={index === currentStep ? 'step' : undefined}>
              <span className="sr-only">{step.label}{index === currentStep ? ', current step' : ''}</span>
            </li>
          ))}
        </ol>
        <button className="motion-button" onClick={onToggleMotion} aria-pressed={motionPaused}>
          <span aria-hidden="true">{motionPaused ? '▷' : 'Ⅱ'}</span>
          {motionPaused ? 'Resume animations' : 'Pause animations'}
        </button>
      </footer>
    </div>
  )
}
