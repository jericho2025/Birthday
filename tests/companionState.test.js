import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayExperience } from '../src/config/birthdayExperience.js'
import { COMPANION_SESSION_KEY, createCompanionState, loadCompanionSession, reduceCompanion, saveCompanionSession, scheduleCompanionDismiss } from '../src/components/companionState.js'

const config = birthdayExperience.companion
const reduce = (state, action) => reduceCompanion(state, action, config)
const react = (state, kind, now = 10000) => reduce(state, { type: 'reaction', stage: state.stage, kind, now })
const storage = () => {
  const data = new Map()
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) }
}

test('companion starts quietly and only accepts configured reactions from the current challenge', () => {
  const state = createCompanionState('pin')
  assert.equal(state.active, null)
  assert.equal(react(state, 'pinWrong').active.expression, 'surprised')
  for (const kind of ['jackpot', 'puzzleComplete', 'unknown', 'toString']) assert.equal(react(state, kind), state)
  assert.equal(reduce(state, { type: 'reaction', stage: 'quiz', kind: 'pinWrong', now: 1 }), state)
  assert.equal(react(state, 'pinWrong', NaN), state)
})

test('wrong attempts get one gentle tease and at most one encouraging follow-up', () => {
  let state = react(createCompanionState('pin'), 'pinWrong')
  assert.equal(state.active.kind, 'pinWrong')
  const first = state.active
  state = react(state, 'pinWrong', 11000)
  assert.equal(state.active, first)
  state = react(state, 'pinWrong', 15000)
  assert.equal(state.active.kind, 'pinEncourage')
  const encouragement = state.active
  const settled = state
  for (let i = 0; i < 100; i++) state = react(state, 'pinWrong', 20000 + i)
  assert.equal(state, settled)
  assert.equal(state.active, encouragement)
  assert.equal(state.failures.pin, 3)
  assert.deepEqual(state.seen, ['pinWrong', 'pinEncourage'])
  assert.equal(state.serial, 2)
})

test('success preempts a lower-priority reaction; repeated events never extend it or replay it', () => {
  let state = react(createCompanionState('pin'), 'pinWrong')
  state = react(state, 'pinCorrect', 10001)
  assert.equal(state.active.kind, 'pinCorrect')
  const success = state.active
  for (let i = 0; i < 100; i++) state = react(state, 'pinCorrect', 10002 + i)
  assert.equal(state.active, success)
  state = reduce(state, { type: 'expire', id: success.id })
  assert.equal(react(state, 'pinCorrect', 30000).active, null)
})

test('quiz celebrations are bounded across correct answers and rapid Finish events', () => {
  let state = react(createCompanionState('quiz'), 'quizCorrect')
  for (let i = 0; i < 5; i++) state = react(state, 'quizCorrect', 20000 + i * 5000)
  assert.equal(state.serial, 1)
  state = react(state, 'quizComplete', 41000)
  assert.equal(state.active.kind, 'quizComplete')
  for (let i = 0; i < 100; i++) state = react(state, 'quizComplete', 41001 + i)
  assert.equal(state.serial, 2)
})

test('cooldown suppresses rather than queues reactions, and jackpot remains a single milestone', () => {
  let state = react(createCompanionState('quiz'), 'quizWrong')
  state = reduce(state, { type: 'stage', stage: 'machine' })
  // Equal-priority failure would be suppressed; a new success can take precedence.
  state = react(state, 'nearMiss', 10001)
  const miss = state.active
  assert.equal(miss.kind, 'nearMiss')
  assert.equal(react(state, 'nearMiss', 20000).active, miss)
  state = react(state, 'jackpot', 10002)
  assert.equal(state.active.kind, 'jackpot')
  const won = state.active
  for (let i = 0; i < 100; i++) state = react(state, 'jackpot', 10003 + i)
  assert.equal(state.active, won)

  let suppressed = react(createCompanionState('pin'), 'pinWrong')
  suppressed = react(suppressed, 'pinWrong', 10001)
  suppressed = react(suppressed, 'pinWrong', 10002)
  assert.equal(suppressed.active.kind, 'pinWrong')
  assert.ok(suppressed.seen.includes('pinEncourage'))
  suppressed = reduce(suppressed, { type: 'expire', id: suppressed.active.id })
  assert.equal(react(suppressed, 'pinWrong', 30000).active, null)
})

test('chapter changes clear the bubble, discard stale events, and prevent repeats on revisits', () => {
  let state = react(createCompanionState('puzzle'), 'puzzleComplete')
  const bubble = state.active
  for (const stage of config.quietStages) {
    state = reduce(state, { type: 'stage', stage })
    assert.equal(state.active, null)
    assert.equal(reduce(state, { type: 'reaction', stage: 'puzzle', kind: 'puzzleComplete', now: 20000 }), state)
  }
  state = reduce(state, { type: 'stage', stage: 'puzzle' })
  assert.equal(react(state, 'puzzleComplete', 40000).active, null)
  assert.equal(reduce(state, { type: 'expire', id: bubble.id }), state)
})

test('muting and dismissal immediately suppress reactions without queuing them for restoration', () => {
  let muted = react(createCompanionState('pin'), 'pinWrong')
  muted = reduce(muted, { type: 'mute' })
  assert.equal(muted.active, null)
  muted = react(muted, 'pinCorrect')
  assert.equal(muted.active, null)
  muted = reduce(muted, { type: 'mute' })
  assert.equal(react(muted, 'pinCorrect', 50000).active, null)

  let dismissed = reduce(createCompanionState('quiz'), { type: 'dismiss' })
  dismissed = react(dismissed, 'quizCorrect')
  assert.equal(dismissed.active, null)
  dismissed = reduce(dismissed, { type: 'restore' })
  assert.equal(react(dismissed, 'quizCorrect', 50000).active, null)
  assert.equal(dismissed.dismissed, false)
})

test('quiet-scene policy also suppresses otherwise valid configured events', () => {
  const quiet = { ...config, quietStages: [...config.quietStages, 'quiz'] }
  const state = reduceCompanion(createCompanionState('quiz'), { type: 'reaction', stage: 'quiz', kind: 'quizCorrect', now: 10000 }, quiet)
  assert.equal(state.active, null)
  assert.deepEqual(state.seen, ['quizCorrect'])
})

test('refresh restores only preferences and suppression history, never a bubble, clock or timer', () => {
  const store = storage()
  let state = react(createCompanionState('pin'), 'pinWrong')
  state = reduce(state, { type: 'mute' })
  saveCompanionSession(store, state)
  const raw = store.getItem(COMPANION_SESSION_KEY)
  assert.doesNotMatch(raw, /message|active|lastAt|serial|1120|timer/)
  const restored = loadCompanionSession(store, 'pin')
  assert.equal(restored.muted, true)
  assert.equal(restored.active, null)
  assert.equal(restored.lastAt, null)
  assert.deepEqual(restored.seen, state.seen)
  assert.equal(react(restored, 'pinWrong').active, null)
})

test('a confirmed fresh adventure clears reaction history while respecting mute/dismiss preferences', () => {
  const store = storage()
  let state = react(createCompanionState('pin'), 'pinWrong')
  state = reduce(reduce(state, { type: 'mute' }), { type: 'dismiss' })
  saveCompanionSession(store, state)
  const fresh = loadCompanionSession(store, 'welcome', true)
  assert.deepEqual(fresh.seen, [])
  assert.deepEqual(fresh.failures, { pin: 0, quiz: 0 })
  assert.equal(fresh.muted, true)
  assert.equal(fresh.dismissed, true)
})

test('corrupt and blocked storage fail quietly without preventing reactions', () => {
  const store = storage()
  for (const record of ['bad json', '{}', JSON.stringify({ version: 1, muted: false, dismissed: false, seen: ['unknown'], failures: { pin: 0, quiz: 0 } })]) {
    store.setItem(COMPANION_SESSION_KEY, record)
    assert.deepEqual(loadCompanionSession(store, 'pin'), createCompanionState('pin'))
  }
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') } }
  assert.equal(loadCompanionSession(blocked, 'pin').active, null)
  assert.doesNotThrow(() => saveCompanionSession(blocked, createCompanionState('pin')))
})

test('dismissal timers clean up and stale expirations cannot remove newer reactions', () => {
  const jobs = new Map()
  const clock = { setTimeout(fn, ms) { jobs.set(1, { fn, ms }); return 1 }, clearTimeout(id) { jobs.delete(id) } }
  let state = react(createCompanionState('pin'), 'pinWrong')
  const dispose = scheduleCompanionDismiss(state.active, 4200, (action) => { state = reduce(state, action) }, clock)
  const job = jobs.get(1)
  assert.equal(job.ms, 4200)
  dispose(); job.fn()
  assert.equal(state.active.kind, 'pinWrong')
  assert.equal(jobs.size, 0)
  const oldId = state.active.id
  state = react(state, 'pinCorrect', 10001)
  assert.equal(reduce(state, { type: 'expire', id: oldId }), state)
  const finish = scheduleCompanionDismiss(state.active, 4200, (action) => { state = reduce(state, action) }, clock)
  jobs.get(1).fn()
  assert.equal(state.active, null)
  finish()
})

test('all five expressions and respectful public-safe copy remain centrally configurable', () => {
  assert.deepEqual(new Set(Object.values(config.reactions).map((r) => r.expression)), new Set(['surprised', 'encouraging', 'happy', 'excited', 'shy']))
  for (const { message } of Object.values(config.reactions)) {
    assert.match(message, /My Love|Love|Sweetheart/)
    assert.doesNotMatch(message, /\b(girl|bro|dude)\b/i)
  }
})
