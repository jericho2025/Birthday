import { useLayoutEffect, useRef } from 'react'
import { MachineSymbol } from './MachineSymbol'
import { makeReelTrack } from './giftMachineState.js'
import { animateMachineReel } from './machineReelAnimation.js'

export function MachineReel({ config, state, index, reduced, onStopped }) {
  const stripRef = useRef(null)
  const spinning = state.phase === 'spinning' && !state.stopped[index]
  const from = state.finishedSpins ? state.history[state.finishedSpins - 1][index] : config.initialSymbols[index]
  const target = config.outcomes[Math.min(state.finishedSpins, 2)].symbols[index]
  const transaction = state.transaction
  const duration = config.settings.reelStopMs[index] + (state.finishedSpins === 2 ? config.settings.finalSpinDelayMs : 0)
  const rows = config.settings.reelCycles * config.symbols.length + 1
  const track = spinning ? makeReelTrack(config, from, target, index) : [state.reels[index]]

  useLayoutEffect(() => {
    if (!spinning) return
    const element = stripRef.current
    return animateMachineReel(element, { rows, cellHeight: element.parentElement.clientHeight, duration, reduced }, () => onStopped(index, transaction))
  }, [spinning, rows, duration, reduced, index, transaction, onStopped])

  const label = spinning ? config.turningLabel : config.symbols.find((symbol) => symbol.id === state.reels[index]).label
  return (
    <div className={`machine-reel${spinning ? ' reel-turning' : ' reel-stopped'}`} role="img" aria-label={`${config.reelLabel} ${index + 1}: ${label}`} data-reel={index}>
      <div className="machine-reel-strip" ref={stripRef} aria-hidden="true">
        {track.map((id, step) => <div className="machine-reel-cell" key={`${transaction}-${step}`}><MachineSymbol symbol={config.symbols.find((symbol) => symbol.id === id)} /></div>)}
      </div>
    </div>
  )
}
