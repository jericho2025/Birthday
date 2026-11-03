import { JOURNEY_STAGES } from './journeyProgress.js'
import { isGiftMachineComplete } from './giftMachineState.js'
import { isGiftRevealComplete } from './giftRevealState.js'

// Presentation is a projection of the existing checkpoint and completion guards.
// It owns no progress and never changes what an activity considers complete.
export function journeyPresentation(journey, machine, gift, machineConfig) {
  const machineDone = isGiftMachineComplete(machine, machineConfig)
  const giftDone = machineDone && isGiftRevealComplete(gift)
  const ceiling = !machineDone ? 7 : !giftDone ? 8 : 9
  const savedFrontier = Number.isInteger(journey?.unlockedThrough) && journey.unlockedThrough >= 0 && journey.unlockedThrough < JOURNEY_STAGES.length ? journey.unlockedThrough : 0
  const frontier = Math.max(0, Math.min(savedFrontier, ceiling, JOURNEY_STAGES.length - 1))
  const completed = frontier === 9 ? 10 : frontier === 8 && giftDone ? 9 : frontier === 7 && machineDone ? 8 : frontier
  return {
    frontier, completed, total: JOURNEY_STAGES.length,
    steps: JOURNEY_STAGES.map((id, index) => ({
      id, index,
      status: index > frontier ? 'locked' : id === journey?.stage ? 'active' : index < completed ? 'completed' : 'available',
      canVisit: index <= frontier && id !== journey?.stage,
    })),
  }
}

export function changeJourneyStage(current, update) {
  const stage = typeof update === 'function' ? update(current.stage) : update
  const index = JOURNEY_STAGES.indexOf(stage)
  if (index < 0 || index > current.unlockedThrough + 1 || stage === current.stage) return current
  return { stage, unlockedThrough: Math.max(current.unlockedThrough, index) }
}

export function revisitChapter(current, target, machine, gift, machineConfig) {
  const view = journeyPresentation(current, machine, gift, machineConfig)
  const step = view.steps.find((item) => item.id === target)
  return step?.canVisit ? { ...current, stage: target } : current
}
