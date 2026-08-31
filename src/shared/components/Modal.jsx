import { useEffect } from 'react'
import { IconButton } from './ui'

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${maxWidth} overscroll-contain rounded-2xl bg-white shadow-2xl shadow-ink/20 max-h-[calc(100svh-2rem)] flex flex-col`}
      >
        <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
          <h2 id="modal-title" className="text-xl font-bold text-ink">
            {title}
          </h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
