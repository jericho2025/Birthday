export const initialPinState = { digits: '', status: 'idle' }

export function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin)
}

// Shared by mouse and keyboard input. A successful attempt cannot be edited.
export function reducePin(state, action, expectedPin) {
  if (state.status === 'unlocked' || !isValidPin(expectedPin)) return state
  if (action.type === 'clear') return initialPinState
  if (action.type === 'delete') return { digits: state.digits.slice(0, -1), status: 'idle' }
  if (action.type !== 'digit' || !/^[0-9]$/.test(action.digit)) return state

  const digits = (state.status === 'wrong' ? '' : state.digits) + action.digit
  if (digits.length > 4) return state
  const status = digits.length < 4 ? 'idle' : digits === expectedPin ? 'unlocked' : 'wrong'
  return { digits, status }
}

export function pinActionForKey(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return null
  if (/^[0-9]$/.test(event.key)) return { type: 'digit', digit: event.key }
  if (event.key === 'Backspace' || event.key === 'Delete') return { type: 'delete' }
  if (event.key === 'Escape') return { type: 'clear' }
  return null
}
