import { useEffect, useReducer, useRef } from 'react'
import { initialPinState, isValidPin, pinActionForKey, reducePin } from './pinState'
import './Screens.css'
import './PinChallenge.css'

export function PinChallenge({ content, headingRef, onUnlocked, onBack, onReaction }) {
  const [attempt, dispatch] = useReducer((state, action) => reducePin(state, action, content.pin), initialPinState)
  const unlocked = attempt.status === 'unlocked'
  const configured = isValidPin(content.pin)
  const disabled = unlocked || !configured
  const message = !configured ? content.unavailableMessage : unlocked ? content.successMessage : attempt.status === 'wrong' ? content.wrongMessage : content.idleMessage
  const previousReaction = useRef(initialPinState)

  useEffect(() => {
    if (previousReaction.current === attempt) return
    previousReaction.current = attempt
    if (attempt.status === 'wrong') onReaction?.('pinWrong')
    if (attempt.status === 'unlocked') onReaction?.('pinCorrect')
  }, [attempt, onReaction])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      const action = pinActionForKey(event)
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Time-based completion also works with paused animations or reduced motion.
  useEffect(() => {
    if (!unlocked) return
    const timeout = window.setTimeout(() => onUnlocked(attempt.digits), 1300)
    return () => window.clearTimeout(timeout)
  }, [unlocked, attempt.digits, onUnlocked])

  return (
    <section className={`screen pin-screen pin-${attempt.status}`} aria-labelledby="pin-title">
      <div className="pin-intro">
      <div className="pin-lock" aria-hidden="true"><span className="lock-shackle" /><span className="lock-body">{unlocked ? '♥' : '✧'}</span></div>
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 id="pin-title" ref={headingRef} tabIndex={-1}>{content.title}<em>{content.titleAccent}</em></h1>
      <button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button>
      </div>
      <div className="pin-entry">
      <p className="pin-question" id="pin-question">{content.question}</p>
      <div className="pin-card" role="group" aria-labelledby="pin-question" aria-describedby="pin-instructions">
        <div className="pin-indicators" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <span key={index} className={index < attempt.digits.length ? 'is-filled' : ''}><i /></span>)}
        </div>
        <span className="sr-only" role="status">{attempt.digits.length} of 4 digits entered.</span>
        <p className="pin-feedback" role="status" aria-live="polite" aria-atomic="true">{message}</p>
        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button key={digit} className="pin-key" disabled={disabled} onClick={() => dispatch({ type: 'digit', digit })}>{digit}</button>
          ))}
          <button className="pin-key pin-key-secondary" disabled={disabled || !attempt.digits} onClick={() => dispatch({ type: 'clear' })} aria-label={content.clearLabel} title={`${content.clearLabel} (Escape)`}>↺</button>
          <button className="pin-key" disabled={disabled} onClick={() => dispatch({ type: 'digit', digit: '0' })}>0</button>
          <button className="pin-key pin-key-secondary" disabled={disabled || !attempt.digits} onClick={() => dispatch({ type: 'delete' })} aria-label={content.deleteLabel} title={`${content.deleteLabel} (Backspace)`}>⌫</button>
        </div>
        <p className="pin-instructions" id="pin-instructions">{content.instructions}</p>
      </div>
      <p className="pin-hint">{content.hint}</p>
      </div>
    </section>
  )
}
