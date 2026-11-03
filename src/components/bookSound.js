// Local paper rustle / optional recording, created only after an unmuted turn.
export function createBookSound(settings, environment = globalThis) {
  let context, recording, disposed = false, muted = settings.startMuted, revision = 0
  const voices = new Set()
  const volume = Number.isFinite(settings.soundVolume) ? Math.max(0, Math.min(1, settings.soundVolume)) : .16

  function stopVoices() {
    for (const voice of [...voices]) {
      try { voice.source.stop() } catch { /* Already ended. */ }
      voice.release()
    }
  }

  function rustle() {
    const length = Math.floor(context.sampleRate * .24)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) channel[i] = Math.random() * 2 - 1
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain()
    source.buffer = buffer
    filter.type = 'bandpass'; filter.frequency.value = 2200; filter.Q.value = .6
    const now = context.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + .045)
    gain.gain.exponentialRampToValueAtTime(.001, now + .23)
    source.connect(filter).connect(gain).connect(context.destination)
    const voice = { source, release() { source.disconnect(); filter.disconnect(); gain.disconnect(); voices.delete(voice) } }
    voices.add(voice)
    source.onended = voice.release
    source.start(); source.stop(now + .24)
  }

  return {
    playFlip() {
      if (disposed || muted) return
      const token = ++revision
      try {
        if (settings.flipSoundSrc) {
          recording ||= new environment.Audio(settings.flipSoundSrc)
          recording.muted = false
          recording.volume = volume
          recording.currentTime = 0
          Promise.resolve(recording.play()).catch(() => {})
          return
        }
        const Context = environment.AudioContext || environment.webkitAudioContext
        if (!Context) return
        context ||= new Context()
        Promise.resolve(context.resume()).then(() => {
          if (!disposed && !muted && token === revision && context.state === 'running') rustle()
        }).catch(() => {})
      } catch { /* Unavailable audio must never prevent turning pages. */ }
    },
    setMuted(value) {
      muted = value
      if (!muted) return
      revision++
      if (recording) { recording.muted = true; recording.pause() }
      stopVoices()
    },
    dispose() {
      if (disposed) return
      disposed = true; revision++
      stopVoices()
      if (recording) { recording.muted = true; recording.pause(); recording.removeAttribute('src'); recording.load() }
      if (context) Promise.resolve(context.close()).catch(() => {})
    },
  }
}
