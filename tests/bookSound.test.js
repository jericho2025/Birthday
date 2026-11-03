import test from 'node:test'
import assert from 'node:assert/strict'
import { createBookSound } from '../src/components/bookSound.js'

const settings = { startMuted: false, soundVolume: .16, flipSoundSrc: '' }
function environment() {
  const contexts = [], recordings = []
  class Context {
    state = 'running'; sampleRate = 100; currentTime = 0; destination = {}; sources = []; closeCalls = 0
    constructor() { contexts.push(this) }
    resume() { return Promise.resolve() }
    close() { this.closeCalls++; this.state = 'closed'; return Promise.resolve() }
    createBuffer() { return { getChannelData() { return new Float32Array(24) } } }
    createBufferSource() { const source = { connect() { return this }, disconnect() {}, start() {}, stops: 0, stop() { this.stops++ } }; this.sources.push(source); return source }
    createBiquadFilter() { return { frequency: {}, Q: {}, connect() { return this }, disconnect() {} } }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this }, disconnect() {} } }
  }
  class Recording {
    paused = false; src = ''; playCalls = 0; loadCalls = 0
    constructor(src) { this.src = src; recordings.push(this) }
    play() { this.playCalls++; return Promise.resolve() }
    pause() { this.paused = true }
    removeAttribute() { this.src = '' }
    load() { this.loadCalls++ }
  }
  return { AudioContext: Context, Audio: Recording, contexts, recordings }
}

test('book sounds allocate nothing until an intentional unmuted turn', async () => {
  const env = environment(), sound = createBookSound({ ...settings, startMuted: true }, env)
  sound.playFlip()
  assert.equal(env.contexts.length, 0)
  sound.setMuted(false); sound.playFlip()
  await Promise.resolve()
  assert.equal(env.contexts[0].sources.length, 1)
  sound.dispose()
})

test('muting immediately cancels active rustles and invalidates a pending resume even after unmuting', async () => {
  const env = environment(), sound = createBookSound(settings, env)
  sound.playFlip(); sound.setMuted(true); sound.setMuted(false)
  await Promise.resolve()
  assert.equal(env.contexts[0].sources.length, 0)
  sound.playFlip(); await Promise.resolve(); sound.setMuted(true)
  assert.equal(env.contexts[0].sources[0].stops, 2)
  sound.dispose()
})

test('leaving the book closes the context and rejects late resume work without reopening resources', async () => {
  const env = environment(), sound = createBookSound(settings, env)
  sound.playFlip(); sound.dispose(); sound.dispose()
  await Promise.resolve()
  sound.setMuted(false); sound.playFlip()
  assert.equal(env.contexts.length, 1)
  assert.equal(env.contexts[0].closeCalls, 1)
  assert.equal(env.contexts[0].sources.length, 0)
})

test('an optional local recording is muted, paused and released on cleanup', () => {
  const env = environment(), sound = createBookSound({ ...settings, flipSoundSrc: '/audio/page.wav' }, env)
  sound.playFlip()
  sound.setMuted(true)
  assert.equal(env.recordings[0].muted, true)
  assert.equal(env.recordings[0].paused, true)
  sound.dispose()
  assert.equal(env.recordings[0].src, '')
  assert.equal(env.recordings[0].loadCalls, 1)
})

test('unsupported or failing audio never blocks the book', () => {
  const sound = createBookSound(settings, { AudioContext: class { constructor() { throw Error('unsupported') } } })
  assert.doesNotThrow(() => sound.playFlip())
  assert.doesNotThrow(() => sound.dispose())
  assert.doesNotThrow(() => createBookSound(settings, {}).playFlip())
})
