import './Screens.css'

export function StagePlaceholder({ content, headingRef, onBack }) {
  return (
    <section className="screen placeholder-screen" aria-labelledby="chapter-title">
      <div className="chapter-symbol" aria-hidden="true">✧</div>
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 id="chapter-title" ref={headingRef} tabIndex={-1}>{content.title}<em>{content.titleAccent}</em></h1>
      <p className="screen-description">{content.description}</p>
      <div className="placeholder-panel">
        <div className="pin-preview" aria-hidden="true">{[0, 1, 2, 3].map((digit) => <span key={digit}>·</span>)}</div>
        <p>{content.label}</p><small>{content.note}</small>
      </div>
      <button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button>
    </section>
  )
}
