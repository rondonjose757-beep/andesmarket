import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './ui'

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

// `hero` dibuja una cabecera visual (p. ej. la foto del producto) que se
// desplaza con el contenido; el título pasa al cuerpo blanco superpuesto.
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  sheet = false,
  footer,
  hero,
  eyebrow,
}) {
  const dialogRef = useRef(null)
  const backdropPress = useRef(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  function closeOnBackdrop(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const outside =
      event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
    if (backdropPress.current && event.target === event.currentTarget && outside) onClose()
    backdropPress.current = false
  }

  function containKeyboardFocus(event) {
    if (event.key !== 'Tab') return
    const elements = Array.from(
      event.currentTarget.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    ).filter((element) => element.getClientRects().length > 0)
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  if (!open) return null
  const handle = sheet && (
    <div
      aria-hidden="true"
      className={`mx-auto h-1.5 w-11 shrink-0 rounded-full sm:hidden ${hero ? 'absolute left-1/2 top-2.5 z-10 -translate-x-1/2 bg-white/80' : 'mt-2.5 bg-ink/15'}`}
    />
  )
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onKeyDown={containKeyboardFocus}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget
      }}
      onClick={closeOnBackdrop}
      className={`fixed max-h-[92svh] flex-col overflow-hidden border-0 bg-white p-0 text-ink shadow-2xl shadow-ink/30 backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] open:flex open:animate-sheet-up backdrop:animate-fade-in ${maxWidth} ${sheet ? 'inset-x-0 bottom-0 top-auto mx-auto mb-0 w-full rounded-t-[32px] sm:inset-0 sm:m-auto sm:w-[calc(100%-2rem)] sm:rounded-[32px]' : 'inset-0 m-auto w-[calc(100%-2rem)] rounded-[28px]'}`}
    >
      {hero ? (
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="relative">
            {hero}
            {handle}
            <IconButton
              label="Cerrar"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 bg-white/90 !text-ink shadow-md shadow-ink/10 hover:bg-white"
            >
              <CloseIcon />
            </IconButton>
          </div>
          <div className="relative -mt-7 rounded-t-[28px] bg-white px-5 pb-5 pt-6">
            {eyebrow}
            <h2 id={titleId} className="font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]">
              {title}
            </h2>
            {children}
          </div>
        </div>
      ) : (
        <>
          {handle}
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
            <h2 id={titleId} className="min-w-0 font-display text-xl font-extrabold leading-snug tracking-[-0.02em]">
              {title}
            </h2>
            <IconButton label="Cerrar" onClick={onClose} className="shrink-0 bg-cream">
              <CloseIcon />
            </IconButton>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 pt-3">{children}</div>
        </>
      )}
      {footer && (
        <div
          className="shrink-0 border-t border-ink/5 bg-white px-5 pt-4"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {footer}
        </div>
      )}
    </dialog>,
    document.body,
  )
}
