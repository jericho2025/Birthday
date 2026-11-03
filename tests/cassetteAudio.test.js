import test from 'node:test'
import assert from 'node:assert/strict'
import { connectCassetteAudio } from '../src/components/cassetteAudio.js'
import { boundedVolume, createCassetteState, formatAudioTime, isCassetteComplete, reduceCassette } from '../src/components/cassetteState.js'
import { birthdayContent } from '../src/config/birthdayContent.js'

class FakeAudio extends EventTarget {
  currentTime = 0
  duration = NaN
  volume = 1
  muted = false
  paused = true
  ended = false
  attributes = new Map()
  playCalls = 0
  pauseCalls = 0
  loadCalls = 0
  playResult = null
  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) { this.attributes.delete(name) }
  emit(type) { this.dispatchEvent(new Event(type)) }
  load() { this.loadCalls++; this.duration = NaN; this.currentTime = 0; this.paused = true; this.emit('emptied') }
  play() { this.playCalls++; this.paused = false; return this.playResult || Promise.resolve() }
  pause() { this.pauseCalls++; const wasPaused = this.paused; this.paused = true; if (!wasPaused) this.emit('pause') }
}

function fixture(audioSrc = '/audio/test.wav') {
  const config = { audioSrc, initialVolume: 0.65, startMuted: false }
  const media = new FakeAudio()
  let state = createCassetteState(config)
  let changes = 0
  const controller = connectCassetteAudio(media, config, (action) => { state = reduceCassette(state, action); changes++ })
  return { media, controller, get state() { return state }, get changes() { return changes }, inspect() { state = reduceCassette(state, { type: 'inspect' }) } }
}

function metadata(f, duration = 120) { f.media.duration = duration; f.media.emit('loadedmetadata') }

test('default config includes no song and starts in an honest unavailable state', () => {
  assert.equal(birthdayContent.cassette.audioSrc, '')
  const f = fixture('')
  assert.equal(f.state.status, 'unavailable')
  assert.equal(f.media.attributes.has('src'), false)
  f.controller.play()
  assert.equal(f.media.playCalls, 0)
  assert.equal(f.state.duration, 0)
  assert.equal(isCassetteComplete(f.state), false)
})

test('inspect unlocks the journey without audio and retains completion when the note closes', () => {
  const f = fixture('')
  f.inspect()
  assert.equal(f.state.inspectionOpen, true)
  assert.equal(f.state.status, 'unavailable')
  assert.equal(isCassetteComplete(f.state), true)
  f.inspect()
  assert.equal(f.state.inspectionOpen, false)
  assert.equal(isCassetteComplete(f.state), true)
  assert.equal(isCassetteComplete({ interaction: 'volume' }), false)
  assert.equal(isCassetteComplete(null), false)
})

test('metadata and a play request never falsely indicate actual playback or completion', () => {
  const f = fixture()
  assert.equal(f.media.playCalls, 0)
  metadata(f)
  assert.equal(f.state.status, 'ready')
  assert.equal(f.state.duration, 120)
  f.controller.play()
  assert.equal(f.state.status, 'starting')
  assert.equal(isCassetteComplete(f.state), false)
  f.media.emit('playing')
  assert.equal(f.state.status, 'playing')
  assert.equal(isCassetteComplete(f.state), true)
})

test('buffering, pause, and ended events stop playback animation state', () => {
  const f = fixture()
  metadata(f)
  f.controller.play(); f.media.emit('playing')
  f.media.emit('waiting')
  assert.equal(f.state.status, 'buffering')
  f.media.emit('canplay')
  assert.equal(f.state.status, 'buffering')
  f.media.emit('playing')
  assert.equal(f.state.status, 'playing')
  f.controller.pause()
  assert.equal(f.state.status, 'paused')
  assert.equal(f.media.paused, true)
  f.media.currentTime = 120; f.media.ended = true; f.media.emit('ended')
  assert.equal(f.state.status, 'ended')
  assert.equal(f.state.currentTime, 120)
})

test('seek clamps to duration, invalid seeks do nothing, and restart resets without autoplay', () => {
  const f = fixture()
  f.controller.seek(10)
  assert.equal(f.media.currentTime, 0)
  metadata(f)
  f.controller.seek(500)
  assert.equal(f.state.currentTime, 120)
  f.controller.seek(-5)
  assert.equal(f.state.currentTime, 0)
  f.controller.seek(25)
  f.controller.seek(NaN)
  assert.equal(f.state.currentTime, 25)
  f.controller.play(); f.media.emit('playing')
  const playCalls = f.media.playCalls
  f.controller.restart()
  assert.equal(f.state.currentTime, 0)
  assert.equal(f.state.status, 'paused')
  assert.equal(f.media.playCalls, playCalls)
})

test('volume and mute stay synchronized with native audio and do not unlock the next stage', () => {
  const f = fixture()
  f.controller.setVolume(0.2)
  assert.equal(f.media.volume, 0.2)
  assert.equal(f.state.volume, 0.2)
  f.controller.toggleMute()
  assert.equal(f.state.muted, true)
  assert.equal(f.media.muted, true)
  f.controller.toggleMute()
  assert.equal(f.state.muted, false)
  f.controller.setVolume(2)
  assert.equal(f.media.volume, 1)
  f.controller.setVolume(-1)
  assert.equal(f.media.volume, 0)
  assert.equal(isCassetteComplete(f.state), false)
})

test('autoplay rejection leaves playback stopped and supports a later intentional retry', async () => {
  const f = fixture()
  metadata(f)
  f.media.playResult = Promise.reject({ name: 'NotAllowedError' })
  f.controller.play()
  await Promise.resolve()
  assert.equal(f.state.status, 'blocked')
  assert.equal(isCassetteComplete(f.state), false)
  f.media.playResult = null
  f.controller.play(); f.media.emit('playing')
  assert.equal(f.state.status, 'playing')
})

test('missing or unsupported audio can be retried or bypassed by inspection', () => {
  const f = fixture()
  f.media.emit('error')
  assert.equal(f.state.status, 'error')
  assert.equal(isCassetteComplete(f.state), false)
  f.controller.retry()
  assert.equal(f.state.status, 'loading')
  assert.equal(f.media.playCalls, 0)
  f.media.emit('error')
  f.inspect()
  assert.equal(isCassetteComplete(f.state), true)
})

test('late play rejection after pause cannot overwrite the paused state', async () => {
  const f = fixture()
  metadata(f)
  let reject
  f.media.playResult = new Promise((_, fail) => { reject = fail })
  f.controller.play()
  f.controller.pause()
  reject({ name: 'AbortError' })
  await Promise.resolve()
  assert.equal(f.state.status, 'paused')
  assert.equal(isCassetteComplete(f.state), false)
})

test('a native pause also cancels a pending request and ignores its later rejection', async () => {
  const f = fixture()
  metadata(f)
  let reject
  f.media.playResult = new Promise((_, fail) => { reject = fail })
  f.controller.play()
  f.media.pause()
  reject({ name: 'NotAllowedError' })
  await Promise.resolve()
  assert.equal(f.state.status, 'paused')
  assert.equal(isCassetteComplete(f.state), false)
})

test('cleanup stops audio, removes the source and listeners, and ignores asynchronous work', async () => {
  const f = fixture()
  metadata(f)
  let reject
  f.media.playResult = new Promise((_, fail) => { reject = fail })
  f.controller.play()
  f.controller.dispose()
  const changes = f.changes
  const playCalls = f.media.playCalls
  assert.equal(f.media.paused, true)
  assert.equal(f.media.attributes.has('src'), false)
  for (const event of ['playing', 'pause', 'error', 'timeupdate']) f.media.emit(event)
  reject({ name: 'NotAllowedError' })
  await Promise.resolve()
  f.controller.play(); f.controller.retry(); f.controller.toggleMute(); f.controller.setVolume(0.1)
  assert.equal(f.media.playCalls, playCalls)
  assert.equal(f.changes, changes)
})

test('completion requires inspection or intentional playback, not a stray media event', () => {
  const f = fixture()
  metadata(f)
  f.media.paused = false; f.media.emit('playing')
  assert.equal(f.state.status, 'playing')
  assert.equal(isCassetteComplete(f.state), false)
})

test('unknown and nonfinite times never produce a fabricated song duration', () => {
  assert.equal(formatAudioTime(NaN), '--:--')
  assert.equal(formatAudioTime(Infinity), '--:--')
  assert.equal(formatAudioTime(-1), '--:--')
  assert.equal(formatAudioTime(0), '0:00')
  assert.equal(formatAudioTime(125.9), '2:05')
  assert.equal(boundedVolume(NaN), 0.65)
})
