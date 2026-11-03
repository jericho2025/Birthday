import { useEffect, useId, useRef } from 'react'

// Native top-layer dialog keeps discoveries out of the book's 3D clipping context.
export function SurpriseDialog({ title, closeAction, onClose, children, className = '' }) {
  const ref = useRef(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className={`surprise-dialog ${className}`} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose() }} onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <span className="surprise-seal" aria-hidden="true">♡</span><h2 id={id}>{title}</h2>
    {children}
    <button className="text-button surprise-close" onClick={onClose}>{closeAction}</button>
  </dialog>
}
