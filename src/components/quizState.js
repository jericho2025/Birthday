export const QUIZ_LENGTH = 5
export const initialQuizState = { index: 0, selectedIndex: null, answers: [], status: 'idle', complete: false }

export function isValidQuiz(questions) {
  return Array.isArray(questions) && questions.length === QUIZ_LENGTH &&
    new Set(questions.map((question) => question?.id)).size === QUIZ_LENGTH &&
    questions.every((question) => question && typeof question.id === 'string' && question.id.trim() &&
      typeof question.prompt === 'string' && question.prompt.trim() &&
      Array.isArray(question.options) && question.options.length === 4 &&
      question.options.every((option) => typeof option === 'string' && option.trim()) &&
      new Set(question.options).size === 4 &&
      Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4)
}

export function isQuizComplete(answers, questions) {
  return isValidQuiz(questions) && Array.isArray(answers) && answers.length === QUIZ_LENGTH &&
    questions.every((question, index) => answers[index] === question.correctIndex)
}

export function reduceQuiz(state, action, questions) {
  if (!isValidQuiz(questions) || state.complete) return state
  const question = questions[state.index]
  // Reject stale clicks from the previous question and attempts to jump ahead.
  if (!question || action.questionId !== question.id) return state
  if (action.type === 'answer') {
    if (state.status === 'correct' || !Number.isInteger(action.optionIndex) || action.optionIndex < 0 || action.optionIndex > 3) return state
    const correct = action.optionIndex === question.correctIndex
    return {
      ...state,
      selectedIndex: action.optionIndex,
      status: correct ? 'correct' : 'wrong',
      answers: correct ? [...state.answers, action.optionIndex] : state.answers,
    }
  }
  if (action.type !== 'next' || state.status !== 'correct' || state.answers.length !== state.index + 1) return state
  if (state.index === QUIZ_LENGTH - 1) {
    return isQuizComplete(state.answers, questions) ? { ...state, complete: true } : state
  }
  return { ...state, index: state.index + 1, selectedIndex: null, status: 'idle' }
}

export function quizOptionForKey(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || !/^[1-4]$/.test(event.key)) return null
  return Number(event.key) - 1
}
