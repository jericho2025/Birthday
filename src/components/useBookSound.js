import { useEffect, useRef, useState } from 'react'
import { createBookSound } from './bookSound.js'

export function useBookSound(settings) {
  const [muted, setMuted] = useState(settings.startMuted)
  const mutedRef = useRef(settings.startMuted)
  const engineRef = useRef(null)

  useEffect(() => () => { engineRef.current?.dispose(); engineRef.current = null }, [])

  function playFlip() {
    if (mutedRef.current) return
    if (!engineRef.current) engineRef.current = createBookSound(settings)
    engineRef.current.setMuted(mutedRef.current)
    engineRef.current.playFlip()
  }

  function toggleMute() {
    mutedRef.current = !mutedRef.current
    engineRef.current?.setMuted(mutedRef.current)
    setMuted(mutedRef.current)
  }

  return { muted, toggleMute, playFlip }
}
