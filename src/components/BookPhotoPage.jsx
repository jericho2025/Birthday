import { birthdaySurprises } from '../config/birthdaySurprises'
import { SurpriseDialog } from './SurpriseDialog'
import { useState } from 'react'

export function BookPhotoPage({ page, number, side, visible, busy }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const note = birthdaySurprises.book.notes[page.id]
  const [failedSource, setFailedSource] = useState(null)
  const hasImage = page.imageSrc && failedSource !== page.imageSrc
  return (
    <article className={`book-photo-page page-${side}`} aria-hidden={!visible} aria-label={`Photo page ${number}`}>
      <div className="book-photo-mount">
        {hasImage ? <img src={page.imageSrc} alt={page.imageAlt || page.placeholder} draggable={false} onError={() => setFailedSource(page.imageSrc)} /> : (
          <div className="book-photo-placeholder"><span aria-hidden="true">✧</span><strong>{page.placeholder}</strong><small>{page.imageSrc ? 'Photo unavailable · replace local image' : 'Your photo goes here'}</small></div>
        )}
      </div>
      <div className="book-page-copy">
        {page.caption && <p className="book-caption">{page.caption}</p>}
        {page.message && <p className="book-message">{page.message}</p>}
      </div>
      {note && <button className="book-secret-note" disabled={!visible || busy} tabIndex={visible && !busy ? 0 : -1} aria-label={birthdaySurprises.book.action} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setNoteOpen(true) }}>&#9825;</button>}
      {noteOpen && visible && !busy && <SurpriseDialog title={birthdaySurprises.book.title} closeAction={birthdaySurprises.closeAction} onClose={() => setNoteOpen(false)}><p className="secret-note-copy">{note}</p></SurpriseDialog>}
      <span className="book-page-number">{String(number).padStart(2, '0')}</span>
    </article>
  )
}
