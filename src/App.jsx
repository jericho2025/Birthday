import { useEffect, useRef, useState } from 'react'
import { birthdayContent } from './config/birthdayContent'
import { CelebrationBackdrop } from './components/CelebrationBackdrop'
import { ExperienceShell } from './components/ExperienceShell'
import { WelcomeScreen } from './components/WelcomeScreen'
import { StagePlaceholder } from './components/StagePlaceholder'
import './App.css'

export default function App() {
  const [stage, setStage] = useState('welcome')
  const [motionPaused, setMotionPaused] = useState(false)
  const headingRef = useRef(null)
  const previousStage = useRef(stage)

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
        ) : (
          <StagePlaceholder key="pin" content={birthdayContent.pinPlaceholder} headingRef={headingRef} onBack={() => setStage('welcome')} />
        )}
      </ExperienceShell>
    </div>
  )
}
