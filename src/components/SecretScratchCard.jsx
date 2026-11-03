import { useEffect, useRef, useState } from 'react'
import { SurpriseDialog } from './SurpriseDialog'
import { scratchCoverage } from './surpriseState'

export function SecretScratchCard({ content, revealed, onReveal, onContinue, onClose, closeAction }) {
  const canvasRef = useRef(null)
  const pointer = useRef(null)
  const points = useRef(new Map())
  const done = useRef(revealed)
  const [open, setOpen] = useState(revealed)
  const [earned, setEarned] = useState(false)
  function reveal() {
    if (done.current) return
    done.current = true
    setOpen(true)
    setEarned(true)
    onReveal()
  }
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || open) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const gradient = ctx.createLinearGradient(0, 0, 600, 220)
    gradient.addColorStop(0, '#cbbde5'); gradient.addColorStop(.5, '#f8d9e5'); gradient.addColorStop(1, '#e3d2ac')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 600, 220)
    ctx.fillStyle = '#6d536e'; ctx.font = '16px Georgia'; ctx.textAlign = 'center'; ctx.fillText(content.foil, 300, 113)
    return () => {
      if (pointer.current !== null && canvas.hasPointerCapture(pointer.current)) canvas.releasePointerCapture(pointer.current)
      pointer.current = null
    }
  }, [content.foil, open])
  function rub(event) {
    if (pointer.current !== event.pointerId || done.current) return
    const canvas = canvasRef.current, rect = canvas.getBoundingClientRect(), ctx = canvas.getContext('2d')
    if (!ctx) return
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.arc(x * 600, y * 220, 30, 0, Math.PI * 2); ctx.fill()
    // Count the actual brush footprint, rather than pointer event frequency.
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const px = x + dx / 24, py = y + dy / 10
      if (px >= 0 && px <= 1 && py >= 0 && py <= 1) points.current.set(`${Math.min(23, Math.floor(px * 24))}:${Math.min(9, Math.floor(py * 10))}`, [px, py])
    }
    if (scratchCoverage([...points.current.values()]) >= .45) reveal()
  }
  function release(event) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    pointer.current = null
  }
  return <SurpriseDialog title={content.title} closeAction={closeAction} onClose={onClose} className="scratch-dialog">
    <p>{content.hint}</p><div className={`scratch-card${open ? ' is-revealed' : ''}${earned ? ' scratch-reward' : ''}`}>
      <p aria-hidden={!open}>{content.message}</p>
      {!open && <canvas ref={canvasRef} width="600" height="220" aria-hidden="true" onPointerDown={(event) => { if (pointer.current !== null) return; pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); rub(event) }} onPointerMove={rub} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { pointer.current = null }} />}
    </div>
    <p className="scratch-status" role="status">{open ? content.revealed : ''}</p>
    <div className="surprise-actions"><button className="primary-button" disabled={open} onClick={reveal}>{content.revealAction}</button><button className="text-button scratch-continue" onClick={onContinue}>{content.continueAction}</button></div>
  </SurpriseDialog>
}
