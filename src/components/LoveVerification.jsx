import { useEffect, useState } from 'react'
import { SurpriseDialog } from './SurpriseDialog'
import { useReducedMotion } from './useReducedMotion'

export function LoveVerification({ content, onSeen, motionPaused }) {
  const [open, setOpen] = useState(true)
  const [step, setStep] = useState(0)
  const reduced = useReducedMotion()
  useEffect(() => { onSeen() }, [onSeen])
  useEffect(() => {
    if (!open || step >= content.steps.length - 1) return
    const timer = setTimeout(() => setStep((value) => Math.min(value + 1, content.steps.length - 1)), reduced || motionPaused ? 0 : content.stepMs)
    return () => clearTimeout(timer)
  }, [open, step, reduced, motionPaused, content])
  return open && <SurpriseDialog title={content.title} closeAction={content.skipAction} onClose={() => setOpen(false)} className="verification-dialog">
    <p>{content.disclaimer}</p><ol className="verification-steps">{content.steps.map((label, index) => <li key={label} className={index <= step ? 'checked' : ''}><span aria-hidden="true">{index <= step ? '♡' : '·'}</span>{label}</li>)}</ol>
  </SurpriseDialog>
}
