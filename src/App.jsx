import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { birthdayContent } from './config/birthdayContent'
import { birthdayExperience } from './config/birthdayExperience'
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
import { clearBirthdayProgress, initialJourneyProgress, loadJourneyProgress, saveJourneyProgress } from './components/journeyProgress'
import { changeJourneyStage, journeyPresentation, revisitChapter } from './components/journeyPresentation'
import { useLoveCompanion } from './components/useLoveCompanion'
import './App.css'
import './CreativePolish.css'

export default function App() {
  const [adventure, setAdventure] = useState(0)
  const restart = useCallback(() => {
    try { clearBirthdayProgress(window.sessionStorage) } catch { /* Storage is optional. */ }
    setAdventure((current) => current + 1)
  }, [])
  return <BirthdayAdventure key={adventure} freshSession={adventure > 0} onRestart={restart} />
}

function BirthdayAdventure({ freshSession, onRestart }) {
  const [restored] = useState(() => {
    if (freshSession) return initialJourneyProgress()
    try { return loadJourneyProgress(window.sessionStorage, birthdayContent) } catch { return initialJourneyProgress() }
  })
  const [journey, setJourney] = useState({ stage: restored.stage, unlockedThrough: restored.unlockedThrough })
  const { stage, unlockedThrough } = journey
  const setStage = useCallback((update) => setJourney((current) => changeJourneyStage(current, update)), [])
  const [motionPaused, setMotionPaused] = useState(restored.motionPaused)
  const headingRef = useRef(null)
  const previousStage = useRef(null)
  const [machine, machineDispatch] = useMachineSession(birthdayContent.machine, freshSession)
  const [gift, giftDispatch] = useReducer(reduceGiftReveal, restored.gift || createGiftRevealState())
  const machineComplete = isGiftMachineComplete(machine, birthdayContent.machine)
  const companion = useLoveCompanion(birthdayExperience.companion, stage, freshSession)
  const journeyView = journeyPresentation(journey, machine, gift, birthdayContent.machine)
  const navigateToChapter = useCallback((target) => setJourney((current) => revisitChapter(current, target, machine, gift, birthdayContent.machine)), [machine, gift])

  useEffect(() => {
    try { saveJourneyProgress(window.sessionStorage, { stage, unlockedThrough, gift, motionPaused }, birthdayContent, machine) } catch { /* Storage is optional. */ }
  }, [stage, unlockedThrough, gift, machine, motionPaused])

  const unlockPin = useCallback((pin) => {
    if (isValidPin(pin) && pin === birthdayContent.pinChallenge.pin) {
      setStage((current) => current === 'pin' ? 'puzzle' : current)
    }
  }, [setStage])

  const completePuzzle = useCallback((tiles) => {
    if (isPuzzleSolved(tiles)) {
      setStage((current) => current === 'puzzle' ? 'quiz' : current)
    }
  }, [setStage])

  const completeQuiz = useCallback((answers) => {
    if (isQuizComplete(answers, birthdayContent.quizQuestions)) {
      setStage((current) => current === 'quiz' ? 'album' : current)
    }
  }, [setStage])

  const completeBook = useCallback((book) => {
    if (isBookComplete(book, birthdayContent.book.pages.length)) {
      setStage((current) => current === 'album' ? 'cassette' : current)
    }
  }, [setStage])

  const completeCassette = useCallback((player) => {
    if (isCassetteComplete(player)) {
      setStage((current) => current === 'cassette' ? 'letter' : current)
    }
  }, [setStage])

  const completeLetter = useCallback((letter) => {
    if (isLetterComplete(letter)) {
      setStage((current) => current === 'letter' ? 'machine' : current)
    }
  }, [setStage])

  const completeMachine = useCallback((result) => {
    if (result === machine) setStage((current) => machineNextStage(current, machine, birthdayContent.machine))
  }, [machine, setStage])

  const completeGift = useCallback((result) => {
    if (result === gift) setStage((current) => giftRevealNextStage(current, gift, machineComplete))
  }, [gift, machineComplete, setStage])

  const restartAdventure = useCallback((finale) => {
    if (canRestartAdventure(stage, finale, machine, gift, birthdayContent.machine)) onRestart()
  }, [stage, machine, gift, onRestart])

  useEffect(() => {
    if (previousStage.current !== stage || (freshSession && stage === 'welcome')) headingRef.current?.focus()
    previousStage.current = stage
  }, [stage, freshSession])

  return (
    <div className={`birthday-app${motionPaused ? ' motion-paused' : ''}${stage === 'quiz' ? ' quiz-active' : ''}${stage === 'album' ? ' book-active' : ''}${stage === 'cassette' ? ' cassette-active' : ''}${stage === 'letter' ? ' letter-active' : ''}${stage === 'machine' ? ' machine-active' : ''}${stage === 'reveal' ? ' reveal-active' : ''}${stage === 'closing' ? ' closing-active' : ''}`}>
      <CelebrationBackdrop />
      <ExperienceShell content={birthdayContent} experience={birthdayExperience} journeyView={journeyView} companion={companion} stage={stage} motionPaused={motionPaused} onNavigate={navigateToChapter} onToggleMotion={() => setMotionPaused((paused) => !paused)}>
        {stage === 'welcome' ? (
          <WelcomeScreen key="welcome" content={birthdayContent.welcome} headingRef={headingRef} onStart={() => setStage('pin')} />
        ) : stage === 'pin' ? (
          <PinChallenge key="pin" content={birthdayContent.pinChallenge} headingRef={headingRef} onReaction={companion.reportReaction} onUnlocked={unlockPin} onBack={() => setStage('welcome')} />
        ) : stage === 'puzzle' ? (
          <TilePuzzle key="puzzle" content={birthdayContent.puzzle} headingRef={headingRef} onReaction={companion.reportReaction} onComplete={completePuzzle} onBack={() => setStage('welcome')} />
        ) : stage === 'quiz' ? (
          <BirthdayQuiz key="quiz" content={birthdayContent.quiz} questions={birthdayContent.quizQuestions} headingRef={headingRef} onReaction={companion.reportReaction} onComplete={completeQuiz} onBack={() => setStage('welcome')} />
        ) : stage === 'album' ? (
          <BirthdayFlipbook key="album" content={birthdayContent.book} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeBook} onBack={() => setStage('welcome')} />
        ) : stage === 'cassette' ? (
          <CassettePlayer key="cassette" content={birthdayContent.cassette} headingRef={headingRef} onComplete={completeCassette} onBack={() => setStage('welcome')} />
        ) : stage === 'letter' ? (
          <BirthdayLetter key="letter" content={birthdayContent.letter} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeLetter} onBack={() => setStage('welcome')} />
        ) : stage === 'machine' ? (
          <GiftSlotMachine key="machine" content={birthdayContent.machine} state={machine} dispatch={machineDispatch} headingRef={headingRef} motionPaused={motionPaused} onReaction={companion.reportReaction} onComplete={completeMachine} onBack={() => setStage('welcome')} />
        ) : stage === 'reveal' && machineComplete ? (
          <GiftReveal key="reveal" content={birthdayContent.gift} state={gift} dispatch={giftDispatch} headingRef={headingRef} motionPaused={motionPaused} onComplete={completeGift} onBack={() => setStage('machine')} />
        ) : stage === 'closing' && canAccessFinale(machine, gift, birthdayContent.machine) ? (
          <FinalBirthdayCelebration key="closing" content={birthdayContent.finale} headingRef={headingRef} motionPaused={motionPaused} onBack={() => setStage((current) => finaleBackStage(current, machine, gift, birthdayContent.machine))} onRestart={restartAdventure} />
        ) : null}
      </ExperienceShell>
    </div>
  )
}
