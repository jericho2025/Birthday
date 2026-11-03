import { useCallback, useEffect, useRef, useState } from 'react'
import { createMachineSound } from './machineSound.js'

export function useMachineSound(settings) {
  const [muted, setMuted] = useState(settings.startMuted)
  const mutedRef = useRef(settings.startMuted)
  const engineRef = useRef(null)
  useEffect(() => () => { engineRef.current?.dispose(); engineRef.current = null }, [])

  const begin = useCallback((seconds) => {
    if (mutedRef.current) return
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) return
    try {
      if (!engineRef.current) engineRef.current = createMachineSound(Context, settings.soundVolume)
      engineRef.current.begin(seconds)
    } catch { /* Audio availability never blocks the birthday journey. */ }
  }, [settings.soundVolume])
  const stopSpin = useCallback(() => engineRef.current?.stopSpin(), [])
  const stopCue = useCallback((index) => { if (!mutedRef.current) engineRef.current?.stopCue(index) }, [])
  const winCue = useCallback(() => { if (!mutedRef.current) engineRef.current?.winCue() }, [])
  function toggleMute() {
    mutedRef.current = !mutedRef.current
    engineRef.current?.setMuted(mutedRef.current)
    setMuted(mutedRef.current)
  }
  return { muted, toggleMute, begin, stopSpin, stopCue, winCue }
}
