import { useEffect, useRef, useState } from 'react'

// This short noise envelope approximates paper brushing across paper. It is
// synthesized locally, only in a user event, and can be replaced with a recording.
function paperRustle(context, volume) {
  const length = Math.floor(context.sampleRate * 0.24)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let index = 0; index < length; index++) channel[index] = Math.random() * 2 - 1
  const source = context.createBufferSource()
  source.buffer = buffer
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2200
  filter.Q.value = 0.6
  const gain = context.createGain()
  const now = context.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.045)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23)
  source.connect(filter).connect(gain).connect(context.destination)
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  source.start()
  source.stop(now + 0.24)
}

function playRecording(recording, volume) {
  recording.volume = volume
  recording.currentTime = 0
  recording.play().catch(() => {})
}

export function useBookSound(settings) {
  const [muted, setMuted] = useState(settings.startMuted)
  const contextRef = useRef(null)
  const recordingRef = useRef(null)

  useEffect(() => () => {
    recordingRef.current?.pause()
    contextRef.current?.close().catch(() => {})
  }, [])

  function playFlip() {
    if (muted) return
    const volume = Math.max(0, Math.min(1, settings.soundVolume))
    if (settings.flipSoundSrc) {
      const recording = recordingRef.current || new Audio(settings.flipSoundSrc)
      recordingRef.current = recording
      playRecording(recording, volume)
      return
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const context = contextRef.current || new AudioContext()
    contextRef.current = context
    context.resume().then(() => {
      if (context.state === 'running') paperRustle(context, volume)
    }).catch(() => {})
  }

  function toggleMute() {
    if (!muted) {
      recordingRef.current?.pause()
      contextRef.current?.suspend().catch(() => {})
    }
    setMuted((value) => !value)
  }

  return { muted, toggleMute, playFlip }
}
