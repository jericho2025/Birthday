// Short, quiet local effects. Construction/resume is called only by a user spin.
export function createMachineSound(AudioContextClass, volume) {
  const context = new AudioContextClass()
  const voices = new Set()
  let disposed = false
  let muted = false
  const level = Number.isFinite(volume) ? Math.max(0, Math.min(0.15, volume)) : 0.04

  function stopVoice(voice) {
    try { voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect() } catch { /* Already ended. */ }
    voices.delete(voice)
  }
  function tone(frequency, seconds, delay = 0, group = 'cue') {
    if (disposed || muted || context.state !== 'running' || !level) return
    const source = context.createOscillator()
    const gain = context.createGain()
    const voice = { source, gain, group }
    voices.add(voice)
    const now = context.currentTime + delay
    source.type = group === 'spin' ? 'triangle' : 'sine'
    source.frequency.setValueAtTime(frequency, now)
    if (group === 'spin') source.frequency.exponentialRampToValueAtTime(65, now + seconds)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(level * (group === 'spin' ? 0.13 : 0.7), now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
    source.connect(gain).connect(context.destination)
    source.onended = () => { source.disconnect(); gain.disconnect(); voices.delete(voice) }
    source.start(now)
    source.stop(now + seconds)
  }
  function stopSpin() { for (const voice of [...voices]) if (voice.group === 'spin') stopVoice(voice) }
  function stopAll() { for (const voice of [...voices]) stopVoice(voice) }
  return {
    begin(seconds) {
      if (disposed || muted) return
      stopSpin()
      context.resume().then(() => { if (!disposed && !muted) tone(115, seconds, 0, 'spin') }).catch(() => {})
    },
    stopSpin,
    stopCue(index) { tone(520 + index * 110, 0.1) },
    winCue() { [784, 988, 1175].forEach((frequency, index) => tone(frequency, 0.24, index * 0.12)) },
    setMuted(value) { muted = value; if (muted) stopAll() },
    dispose() { if (disposed) return; disposed = true; stopAll(); context.close().catch(() => {}) },
  }
}
