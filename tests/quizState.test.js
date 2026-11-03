import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdayContent } from '../src/config/birthdayContent.js'
import { initialQuizState, isQuizComplete, isValidQuiz, quizOptionForKey, reduceQuiz } from '../src/components/quizState.js'

const questions = birthdayContent.quizQuestions
const answer = (state, optionIndex, questionId = questions[state.index].id) => reduceQuiz(state, { type: 'answer', optionIndex, questionId }, questions)
const next = (state, questionId = questions[state.index].id) => reduceQuiz(state, { type: 'next', questionId }, questions)
const copyQuestions = () => structuredClone(questions)

test('central content has exactly five labeled placeholder questions with four distinct options and one correct index', () => {
  assert.equal(questions.length, 5)
  assert.equal(isValidQuiz(questions), true)
  for (const question of questions) {
    assert.match(question.prompt, /placeholder/i)
    assert.equal(question.options.length, 4)
    assert.ok(question.options.every((option) => /placeholder/i.test(option)))
    assert.equal(question.options.filter((_, index) => index === question.correctIndex).length, 1)
  }
})

test('unanswered and wrong questions cannot advance or record a correct answer', () => {
  assert.equal(next(initialQuizState), initialQuizState)
  const wrongIndex = (questions[0].correctIndex + 1) % 4
  const wrong = answer(initialQuizState, wrongIndex)
  assert.equal(wrong.status, 'wrong')
  assert.equal(wrong.selectedIndex, wrongIndex)
  assert.deepEqual(wrong.answers, [])
  assert.equal(wrong.index, 0)
  assert.equal(next(wrong), wrong)
  assert.equal(isQuizComplete(wrong.answers, questions), false)
})

test('wrong choices can retry repeatedly without revealing or selecting the correct answer', () => {
  let state = initialQuizState
  for (let index = 0; index < 4; index++) {
    if (index === questions[0].correctIndex) continue
    state = answer(state, index)
    assert.equal(state.status, 'wrong')
    assert.equal(state.selectedIndex, index)
    assert.deepEqual(state.answers, [])
  }
  const correct = answer(state, questions[0].correctIndex)
  assert.equal(correct.status, 'correct')
  assert.deepEqual(correct.answers, [questions[0].correctIndex])
  assert.deepEqual(initialQuizState.answers, [])
})

test('correct answers freeze selection and Next opens only the following unanswered question', () => {
  const correct = answer(initialQuizState, questions[0].correctIndex)
  assert.equal(answer(correct, (questions[0].correctIndex + 1) % 4), correct)
  assert.equal(answer(correct, questions[0].correctIndex), correct)
  const advanced = next(correct)
  assert.equal(advanced.index, 1)
  assert.equal(advanced.selectedIndex, null)
  assert.equal(advanced.status, 'idle')
  assert.equal(advanced.complete, false)
  assert.equal(next(advanced), advanced)
})

test('stale question events, future question events, and invalid choices are ignored', () => {
  const correct = answer(initialQuizState, questions[0].correctIndex)
  const advanced = next(correct)
  assert.equal(answer(advanced, questions[1].correctIndex, questions[0].id), advanced)
  assert.equal(next(advanced, questions[0].id), advanced)
  assert.equal(answer(initialQuizState, questions[1].correctIndex, questions[1].id), initialQuizState)
  for (const optionIndex of [-1, 4, null, undefined, 1.5, '1']) {
    assert.equal(answer(initialQuizState, optionIndex), initialQuizState)
  }
})

test('all five questions must be answered in sequence, then Finish enters a frozen completion state', () => {
  let state = initialQuizState
  for (let index = 0; index < 5; index++) {
    assert.equal(state.index, index)
    assert.equal(state.complete, false)
    assert.equal(isQuizComplete(state.answers, questions), false)
    state = answer(state, questions[index].correctIndex)
    assert.equal(state.complete, false)
    state = next(state)
  }
  assert.equal(state.complete, true)
  assert.equal(state.index, 4)
  assert.equal(isQuizComplete(state.answers, questions), true)
  assert.equal(answer(state, 0), state)
  assert.equal(next(state), state)
})

test('the album completion guard rejects partial, wrong, extra, or incorrectly typed answers', () => {
  const answers = questions.map((question) => question.correctIndex)
  assert.equal(isQuizComplete(answers, questions), true)
  for (const invalid of [null, [], answers.slice(0, 4), [...answers, 0], answers.map(String), answers.map((index) => (index + 1) % 4)]) {
    assert.equal(isQuizComplete(invalid, questions), false)
  }
})

test('malformed question configuration fails closed', () => {
  const duplicateIds = copyQuestions()
  duplicateIds[1].id = duplicateIds[0].id
  const badOptions = copyQuestions()
  badOptions[0].options = ['A', 'A', 'C', 'D']
  const missingOption = copyQuestions()
  missingOption[0].options.pop()
  const blankPrompt = copyQuestions()
  blankPrompt[0].prompt = ' '
  const badAnswer = copyQuestions()
  badAnswer[0].correctIndex = 4
  for (const invalid of [null, [], questions.slice(0, 4), [...questions, questions[0]], duplicateIds, badOptions, missingOption, blankPrompt, badAnswer]) {
    assert.equal(isValidQuiz(invalid), false)
    assert.equal(reduceQuiz(initialQuizState, { type: 'next', questionId: questions[0].id }, invalid), initialQuizState)
    assert.equal(isQuizComplete(questions.map((question) => question.correctIndex), invalid), false)
  }
})

test('keyboard shortcuts map 1–4 to the same choices while navigation, shortcuts, and held keys remain untouched', () => {
  for (let number = 1; number <= 4; number++) assert.equal(quizOptionForKey({ key: String(number) }), number - 1)
  for (const key of ['0', '5', 'Enter', ' ', 'Tab', 'a']) assert.equal(quizOptionForKey({ key }), null)
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'repeat']) assert.equal(quizOptionForKey({ key: '1', [modifier]: true }), null)
})
