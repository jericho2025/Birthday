import { boundedVolume } from './cassetteState.js'

const events = ['loadedmetadata', 'durationchange', 'canplay', 'playing', 'pause', 'waiting', 'stalled', 'ended', 'error', 'emptied', 'timeupdate', 'volumechange', 'seeking', 'seeked']

// Native audio adapter, kept outside React so event handling and disposal can be tested.
export function connectCassetteAudio(media, config, dispatch) {
  let disposed = false
  let requested = false
  let version = 0
  const hasSource = Boolean(config.audioSrc)
  const snapshot = () => ({ currentTime: media.currentTime, duration: media.duration, volume: media.volume, muted: media.muted, paused: media.paused, ended: media.ended })
  const emit = (event) => {
    if (disposed) return
    if (event === 'pause') { requested = false; version++ }
    if (['ended', 'error', 'emptied'].includes(event)) requested = false
    dispatch({ type: 'media', event, requested, hasSource, snapshot: snapshot() })
  }
  const listeners = events.map((event) => {
    const listener = () => emit(event)
    media.addEventListener(event, listener)
    return [event, listener]
  })
  media.volume = boundedVolume(config.initialVolume)
  media.muted = Boolean(config.startMuted)
  dispatch({ type: 'reset', hasSource })
  if (hasSource) media.setAttribute('src', config.audioSrc)
  else media.removeAttribute('src')
  media.load()

  function pause() {
    if (disposed) return
    requested = false
    version++
    media.pause()
    emit('pause')
  }

  function play() {
    if (disposed || !hasSource) return
    requested = true
    const token = ++version
    dispatch({ type: 'requestPlay' })
    const failed = (error) => {
      if (disposed || version !== token || !requested) return
      requested = false
      if (error?.name === 'AbortError') { emit('pause'); return }
      dispatch({ type: 'playFailure', blocked: error?.name === 'NotAllowedError' })
    }
    try {
      if (media.ended) media.currentTime = 0
      Promise.resolve(media.play()).catch(failed)
    } catch (error) { failed(error) }
  }

  return {
    play, pause,
    restart() {
      if (disposed || !hasSource) return
      pause()
      try { media.currentTime = 0 } catch { /* Media may not yet be seekable. */ }
      emit('timeupdate')
    },
    seek(seconds) {
      if (disposed || !hasSource || !Number.isFinite(media.duration) || media.duration <= 0 || !Number.isFinite(seconds)) return
      try { media.currentTime = Math.max(0, Math.min(media.duration, seconds)) } catch { return }
      emit('timeupdate')
    },
    setVolume(volume) {
      if (disposed || !Number.isFinite(volume)) return
      media.volume = boundedVolume(volume)
      emit('volumechange')
    },
    toggleMute() {
      if (disposed) return
      media.muted = !media.muted
      emit('volumechange')
    },
    retry() {
      if (disposed || !hasSource) return
      pause()
      dispatch({ type: 'reset', hasSource })
      media.load()
    },
    dispose() {
      if (disposed) return
      disposed = true
      requested = false
      version++
      listeners.forEach(([event, listener]) => media.removeEventListener(event, listener))
      media.pause()
      media.removeAttribute('src')
      media.load()
    },
  }
}
