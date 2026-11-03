import test from 'node:test'
import assert from 'node:assert/strict'
import { initialPinState, isValidPin, pinActionForKey, reducePin } from '../src/components/pinState.js'
import { birthdayContent } from '../src/config/birthdayContent.js'

const birthdayPin = birthdayContent.pinChallenge.pin

function enter(digits, pin = birthdayPin, state = initialPinState) {
  return [...digits].reduce((attempt, digit) => reducePin(attempt, { type: 'digit', digit }, pin), state)
}

test('only a complete matching four-digit attempt unlocks, including leading zeros', () => {
  assert.equal(birthdayPin, '1120')
  assert.equal(birthdayContent.pinChallenge.question, 'When is your birthday? (MMDD)')
  assert.deepEqual(enter('112'), { digits: '112', status: 'idle' })
  assert.equal(enter('1120').status, 'unlocked')
  assert.equal(enter('0000').status, 'wrong')
  assert.equal(enter('0123', '0123').status, 'unlocked')
  assert.equal(enter('9999').status, 'wrong')
})

test('wrong attempts can be replaced, corrected, or cleared', () => {
  const wrong = enter('1121')
  assert.deepEqual(enter('1', birthdayPin, wrong), { digits: '1', status: 'idle' })
  const edited = reducePin(wrong, { type: 'delete' }, birthdayPin)
  assert.deepEqual(edited, { digits: '112', status: 'idle' })
  assert.equal(enter('0', birthdayPin, edited).status, 'unlocked')
  assert.deepEqual(reducePin(wrong, { type: 'clear' }, birthdayPin), initialPinState)
  assert.equal(enter('1111', birthdayPin, wrong).status, 'wrong')
})

test('successful input is frozen during the unlock animation', () => {
  const unlocked = enter('1120')
  for (const action of [{ type: 'digit', digit: '1' }, { type: 'delete' }, { type: 'clear' }]) {
    assert.equal(reducePin(unlocked, action, birthdayPin), unlocked)
  }
})

test('invalid configuration and nonnumeric actions cannot unlock the challenge', () => {
  for (const pin of [undefined, null, 0, '000', '00000', 'abcd']) {
    assert.equal(isValidPin(pin), false)
    const attempt = [...birthdayPin].reduce((state, digit) => reducePin(state, { type: 'digit', digit }, pin), initialPinState)
    assert.equal(attempt, initialPinState)
  }
  assert.equal(reducePin(initialPinState, { type: 'digit', digit: 'x' }, birthdayPin), initialPinState)
  assert.deepEqual(reducePin(initialPinState, { type: 'delete' }, birthdayPin), initialPinState)
})

test('physical keys map to the same actions while shortcuts and held keys are ignored', () => {
  for (const digit of '0123456789') assert.deepEqual(pinActionForKey({ key: digit }), { type: 'digit', digit })
  for (const key of ['Backspace', 'Delete']) assert.deepEqual(pinActionForKey({ key }), { type: 'delete' })
  assert.deepEqual(pinActionForKey({ key: 'Escape' }), { type: 'clear' })
  for (const key of ['Enter', 'Tab', 'ArrowLeft', 'a']) assert.equal(pinActionForKey({ key }), null)
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'repeat']) assert.equal(pinActionForKey({ key: '0', [modifier]: true }), null)
})
