import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { birthdayContent } from './config/birthdayContent'
import { CelebrationBackdrop } from './components/CelebrationBackdrop'
import { ExperienceShell } from './components/ExperienceShell'
import { WelcomeScreen } from './components/WelcomeScreen'
import { FinalBirthdayCelebration } from './components/FinalBirthdayCelebration'
import { canAccessFinale, canRestartAdventure, finaleBackStage } from './components/finaleState'
import { PinChallenge } from './components/PinChallenge'
import { isValidPin } from './components/pinState'
import { TilePuzzle } from './components/TilePuzzle'
import { isPuzzleSolved } from './components/puzzleState'
import { BirthdayQuiz } from './components/BirthdayQuiz'
import { isQuizComplete } from './components/quizState'
import { BirthdayFlipbook } from './components/BirthdayFlipbook'
import { isBookComplete } from './components/bookState'
import { CassettePlayer } from './components/CassettePlayer'
import { isCassetteComplete } from './components/cassetteState'
import { BirthdayLetter } from './components/BirthdayLetter'
import { isLetterComplete } from './components/letterState'
import { GiftSlotMachine } from './components/GiftSlotMachine'
import { isGiftMachineComplete, machineNextStage } from './components/giftMachineState'
import { useMachineSession } from './components/useMachineSession'
import { GiftReveal } from './components/GiftReveal'
import { createGiftRevealState, giftRevealNextStage, reduceGiftReveal } from './components/giftRevealState'
import './App.css'

export default function App() {
  const [adventure, setAdventure] = useState(0)
  const restart = useCallback(() => setAdventure((current) => current + 1), [])
  return <BirthdayAdventure key={adventure} freshSession={adventure > 0} onRestart={restart} />
}

function BirthdayAdventure({ freshSession, onRestart }) {
  const [stage, setStage] = useState('welcome')
  const [motionPaused, setMotionPaused] = useState(false)
  const headingRef = useRef(null)
  const previousStage = useRef(stage)
  const [machine, machineDispatch] = useMachineSession(birthdayContent.machine, freshSession)
  const [gift, giftDispatch] = useReducer(reduceGiftReveal, undefined, createGiftRevealState)
  const machineComplete = isGiftMachineComplete(machine, birthdayContent.machine)

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

  const completeBook = useCallback((book) => {
    if (isBookComplete(book, birthdayContent.book.pages.length)) {
      setStage((current) => current === 'album' ? 'cassette' : current)
    }
  }, [])

  const completeCassette = useCallback((player) => {
    if (isCassetteComplete(player)) {
      setStage((current) => current === 'cassette' ? 'letter' : current)
    }
  }, [])

  const completeLetter = useCallback((letter) => {
    if (isLetterComplete(letter)) {
      setStage((current) => current === 'letter' ? 'machine' : current)
    }
  }, [])

  const completeMachine = useCallback((result) => {
    if (result === machine) setStage((current) => machineNextStage(current, machine, birthdayContent.machine))
  }, [machine])

  const completeGift = useCallback((result) => {
    if (result === gift) setStage((current) => giftRevealNextStage(current, gift, machineComplete))
  }, [gift, machineComplete])

  const restartAdventure = useCallback((finale) => {
    if (canRestartAdventure(stage, finale, machine, gift, birthdayContent.machine)) onRestart()
  }, [stage, machine, gift, onRestart])

  useEffect(() => {
    if (previousStage.current !== stage || (freshSession && stage === 'welcome')) headingRef.current?.focus()
    previousStage.current = stage
  }, [stage, freshSession])

  return (
    <div className={`birthday-app${motionPaused ? ' motion-paused' : ''}${stage === 'album' ? ' book-active' : ''}${stage === 'cassette' ? ' cassette-active' : ''}${stage === 'letter' ? ' letter-active' : ''}${stage === 'machine' ? ' machine-active' : ''}${stage === 'reveal' ? ' reveal-active' : ''}${stage === 'closing' ? ' closing-active' : ''}`}>
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
        ) : stage === 'album' ? (
          <BirthdayFlipbook key="album" content={birthdayContent.book} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeBook} onBack={() => setStage('welcome')} />
        ) : stage === 'cassette' ? (
          <CassettePlayer key="cassette" content={birthdayContent.cassette} headingRef={headingRef} onComplete={completeCassette} onBack={() => setStage('welcome')} />
        ) : stage === 'letter' ? (
          <BirthdayLetter key="letter" content={birthdayContent.letter} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeLetter} onBack={() => setStage('welcome')} />
        ) : stage === 'machine' ? (
          <GiftSlotMachine key="machine" content={birthdayContent.machine} state={machine} dispatch={machineDispatch} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeMachine} onBack={() => setStage('welcome')} />
        ) : stage === 'reveal' && machineComplete ? (
          <GiftReveal key="reveal" content={birthdayContent.gift} state={gift} dispatch={giftDispatch} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeGift} onBack={() => setStage('machine')} />
        ) : stage === 'closing' && canAccessFinale(machine, gift, birthdayContent.machine) ? (
          <FinalBirthdayCelebration key="closing" content={birthdayContent.finale} headingRef={headingRef} motionPaused={motionPaused} onBack={() => setStage((current) => finaleBackStage(current, machine, gift, birthdayContent.machine))} onRestart={restartAdventure} />
        ) : null}
      </ExperienceShell>
    </div>
  )
}
