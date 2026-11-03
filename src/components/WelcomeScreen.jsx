import './Screens.css'

export function WelcomeScreen({ content, headingRef, onStart }) {
  return (
    <section className="screen welcome-screen" aria-labelledby="welcome-title">
      <div className="envelope-illustration" aria-hidden="true">
        <span className="envelope-spark spark-one">✧</span><span className="envelope-spark spark-two">✦</span>
        <div className="envelope-letter">just for you</div>
        <div className="envelope-body"><span className="envelope-heart">♥</span></div>
      </div>
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 id="welcome-title" ref={headingRef} tabIndex={-1}>{content.title}<em>{content.recipient}<span className="title-star" aria-hidden="true">✧</span></em></h1>
      <p className="screen-description">{content.description}</p>
      <button className="primary-button" onClick={onStart}>{content.action}<span aria-hidden="true">↗</span></button>
      <p className="action-note"><span aria-hidden="true">✧</span>{content.note}</p>
    </section>
  )
}
