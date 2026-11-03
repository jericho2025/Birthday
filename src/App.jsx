import { useCallback, useEffect, useRef, useState } from 'react'
import { birthdayContent } from './config/birthdayContent'
import { CelebrationBackdrop } from './components/CelebrationBackdrop'
import { ExperienceShell } from './components/ExperienceShell'
import { WelcomeScreen } from './components/WelcomeScreen'
import { StagePlaceholder } from './components/StagePlaceholder'
import { PinChallenge } from './components/PinChallenge'
import { isValidPin } from './components/pinState'
import { TilePuzzle } from './components/TilePuzzle'
import { isPuzzleSolved } from './components/puzzleState'
import { BirthdayQuiz } from './components/BirthdayQuiz'
import { isQuizComplete } from './components/quizState'
import './App.css'

export default function App() {
  const [stage, setStage] = useState('welcome')
  const [motionPaused, setMotionPaused] = useState(false)
  const headingRef = useRef(null)
  const previousStage = useRef(stage)

  const unlockPin = useCallback((pin) => {
    if (isValidPin(pin) && pin === birthdayContent.pinChallenge.pin) {
      setStage((current) => current === 'pin' ? 'puzzle' : current)
    }
  }, [])

  const completePuzzle = useCallback((tiles) => {
    if (isPuzzleSolved(tiles)) {
      setStage((current) => current === 'puzzle' ? 'quiz' : current)
    }
  }, [])

  const completeQuiz = useCallback((answers) => {
    if (isQuizComplete(answers, birthdayContent.quizQuestions)) {
      setStage((current) => current === 'quiz' ? 'album' : current)
    }
  }, [])

  useEffect(() => {
    if (previousStage.current !== stage) headingRef.current?.focus()
    previousStage.current = stage
  }, [stage])

  return (
    <div className={`birthday-app${motionPaused ? ' motion-paused' : ''}`}>
      <CelebrationBackdrop />
      <ExperienceShell content={birthdayContent} stage={stage} motionPaused={motionPaused} onToggleMotion={() => setMotionPaused((paused) => !paused)}>
        {stage === 'welcome' ? (
          <WelcomeScreen key="welcome" content={birthdayContent.welcome} headingRef={headingRef} onStart={() => setStage('pin')} />
        ) : stage === 'pin' ? (
          <PinChallenge key="pin" content={birthdayContent.pinChallenge} headingRef={headingRef} onUnlocked={unlockPin} onBack={() => setStage('welcome')} />
        ) : stage === 'puzzle' ? (
          <TilePuzzle key="puzzle" content={birthdayContent.puzzle} headingRef={headingRef} onComplete={completePuzzle} onBack={() => setStage('welcome')} />
        ) : stage === 'quiz' ? (
          <BirthdayQuiz key="quiz" content={birthdayContent.quiz} questions={birthdayContent.quizQuestions} headingRef={headingRef} onComplete={completeQuiz} onBack={() => setStage('welcome')} />
        ) : (
          <StagePlaceholder key="album" content={birthdayContent.albumPlaceholder} headingRef={headingRef} onBack={() => setStage('welcome')} />
        )}
      </ExperienceShell>
    </div>
  )
}
