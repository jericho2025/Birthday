import { useEffect, useReducer } from 'react'
import { createMachineState, loadMachineState, reduceGiftMachine, saveMachineState } from './giftMachineState.js'

function restore(config) {
  try { return loadMachineState(window.sessionStorage, config) } catch { return createMachineState(config) }
}

// Owned by App, not the stage: a component remount cannot reset the spin budget.
export function useMachineSession(config) {
  const [state, dispatch] = useReducer((current, action) => reduceGiftMachine(current, action, config), config, restore)
  useEffect(() => {
    try { saveMachineState(window.sessionStorage, state, config) } catch { /* Some browsers block session storage. */ }
  }, [state, config])
  return [state, dispatch]
}
