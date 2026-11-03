import { useCallback, useEffect, useReducer } from 'react'
import { createCompanionState, loadCompanionSession, reduceCompanion, saveCompanionSession, scheduleCompanionDismiss } from './companionState.js'

export function useLoveCompanion(config, stage, freshSession) {
  const [state, dispatch] = useReducer((current, action) => reduceCompanion(current, action, config), stage, (initialStage) => {
    try { return loadCompanionSession(window.sessionStorage, initialStage, freshSession) } catch { return createCompanionState(initialStage) }
  })
  const { muted, dismissed, seen, failures } = state
  useEffect(() => { dispatch({ type: 'stage', stage }) }, [stage])
  useEffect(() => {
    try { saveCompanionSession(window.sessionStorage, { muted, dismissed, seen, failures }) } catch { /* Storage is optional. */ }
  }, [muted, dismissed, seen, failures])
  useEffect(() => scheduleCompanionDismiss(state.active, config.settings.reactionMs, dispatch), [state.active, config.settings.reactionMs])
  const reportReaction = useCallback((kind) => dispatch({ type: 'reaction', kind, stage, now: Date.now() }), [stage])
  return { state, dispatch, reportReaction }
}
