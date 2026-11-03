import { useEffect, useReducer, useRef } from 'react'
import { initialQuizState, isValidQuiz, quizOptionForKey, reduceQuiz } from './quizState'
import './Screens.css'
import './BirthdayQuiz.css'

const optionLetters = ['A', 'B', 'C', 'D']
const celebrationPieces = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 37 + 7) % 100}%`, delay: `${(index % 6) * 0.06}s`, rotation: `${index * 47}deg`,
}))

export function BirthdayQuiz({ content, questions, headingRef, onComplete, onBack, onReaction }) {
  const [quiz, dispatch] = useReducer((state, action) => reduceQuiz(state, action, questions), initialQuizState)
  const questionHeadingRef = useRef(null)
  const previousView = useRef('0')
  const view = quiz.complete ? 'complete' : String(quiz.index)
  const configured = isValidQuiz(questions)
  const question = configured ? questions[quiz.index] : null
  const correct = quiz.status === 'correct'
  const feedback = correct ? content.correctMessage : quiz.status === 'wrong' ? content.wrongMessage : content.idleMessage
  const previousReaction = useRef(initialQuizState)

  useEffect(() => {
    if (previousReaction.current === quiz) return
    previousReaction.current = quiz
    if (quiz.complete) onReaction?.('quizComplete')
    else if (quiz.status === 'correct') onReaction?.('quizCorrect')
    else if (quiz.status === 'wrong') onReaction?.('quizWrong')
  }, [quiz, onReaction])

  useEffect(() => {
    if (previousView.current !== view) questionHeadingRef.current?.focus()
    previousView.current = view
  }, [view])

  function selectAnswer(optionIndex) {
    if (question) dispatch({ type: 'answer', questionId: question.id, optionIndex })
  }

  return (
    <section className="screen quiz-screen" aria-labelledby="quiz-title" onKeyDown={(event) => {
      if (quiz.complete || !configured) return
      const optionIndex = quizOptionForKey(event)
      if (optionIndex !== null) { event.preventDefault(); selectAnswer(optionIndex) }
    }}>
      <div className="quiz-intro">
        <span className="quiz-intro-symbol" aria-hidden="true">✧</span>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="quiz-title" ref={headingRef} tabIndex={-1}>{content.title}<em>{content.titleAccent}</em></h1>
        <p className="screen-description">{content.description}</p>
        <p className="quiz-preview-label">{content.placeholderLabel}</p>
        <p className="quiz-preview-note">{content.placeholderNote}</p>
        <button className="text-button" onClick={onBack}><span aria-hidden="true">←</span>{content.backAction}</button>
      </div>
      <div className="quiz-card">
        {!configured ? <p role="status">{content.unavailableMessage}</p> : (
          <div key={view} className="quiz-view">
            {quiz.complete ? (
              <div className="quiz-completion">
                <div className="quiz-celebration" aria-hidden="true">{celebrationPieces.map((piece, index) => <i key={index} style={{ left: piece.left, '--delay': piece.delay, '--rotation': piece.rotation }} />)}</div>
                <span className="quiz-victory-symbol" aria-hidden="true">✳</span>
                <p className="quiz-counter">{content.completionLabel}</p>
                <h2 className="quiz-question quiz-completion-title" ref={questionHeadingRef} tabIndex={-1}>{content.completionTitle}<em>{content.completionAccent}</em></h2>
                <p className="quiz-completion-message">{content.completionMessage}</p>
                <button className="primary-button" onClick={() => onComplete(quiz.answers)}>{content.continueAction}<span aria-hidden="true">→</span></button>
              </div>
            ) : (
              <>
                <div className="quiz-progress-row">
                  <p className="quiz-counter">{content.questionLabel} {quiz.index + 1} {content.ofLabel} {questions.length}</p>
                  <div className="quiz-question-dots" aria-hidden="true">{questions.map((item, index) => <span key={item.id} className={index < quiz.index ? 'is-done' : index === quiz.index ? 'is-current' : ''} />)}</div>
                </div>
                <h2 className="quiz-question" id="quiz-question" ref={questionHeadingRef} tabIndex={-1}>{question.prompt}</h2>
                <div className="quiz-options" role="group" aria-labelledby="quiz-question" aria-describedby="quiz-instructions">
                  {question.options.map((option, index) => {
                    const selected = quiz.selectedIndex === index
                    return (
                      <button key={index} className={`quiz-option${selected ? ` is-${quiz.status}` : ''}`} aria-pressed={selected} aria-disabled={correct} onClick={() => selectAnswer(index)}>
                        <span className="quiz-option-letter" aria-hidden="true">{optionLetters[index]}</span>
                        <span>{option}</span>
                        {selected && <span className="quiz-answer-mark" aria-hidden="true">{correct ? '✓' : '×'}</span>}
                      </button>
                    )
                  })}
                </div>
                <p className={`quiz-feedback feedback-${quiz.status}`} role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
                <button className="primary-button quiz-next" disabled={!correct} onClick={() => dispatch({ type: 'next', questionId: question.id })}>{quiz.index === questions.length - 1 ? content.finishAction : content.nextAction}<span aria-hidden="true">→</span></button>
                <p className="quiz-instructions" id="quiz-instructions">{content.instructions}</p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
