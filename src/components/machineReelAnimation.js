// Returns a disposer so unmounts, Strict Mode, and motion preference changes
// cancel both the visual animation and the completion callback.
export function animateMachineReel(element, { rows, cellHeight, duration, reduced }, onFinished, clock = globalThis) {
  let disposed = false
  const milliseconds = reduced || !element?.animate ? 0 : duration
  const animation = milliseconds ? element.animate([
    { transform: 'translateY(0)' },
    { transform: `translateY(${-rows * cellHeight}px)` },
  ], { duration: milliseconds, easing: 'cubic-bezier(.12,.68,.2,1)', fill: 'forwards' }) : null
  const timer = clock.setTimeout(() => { if (!disposed) onFinished() }, milliseconds ? milliseconds + 40 : 0)
  return () => { disposed = true; clock.clearTimeout(timer); animation?.cancel() }
}
