import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AndesPattern from './AndesPattern'
import {
  BUSINESS_INSTAGRAM_URL,
  BUSINESS_PHONE_HREF,
  BUSINESS_PHONE_LABEL,
  CONTACT_WHATSAPP_URL,
} from '../lib/contact'

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  )
}

function ContactIcon({ type }) {
  const paths = {
    about: <path d="M4 19 9 8l3 5 2-3 6 9H4Zm2-13h.01" strokeLinecap="round" strokeLinejoin="round" />,
    whatsapp: <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Zm-10.7-4c.3 3 2.2 5 5.2 5.7" strokeLinecap="round" strokeLinejoin="round" />,
    phone: <path d="M7.2 3.8 10 7.4 8.3 9.5a15 15 0 0 0 6.2 6.2l2.1-1.7 3.6 2.8-1.1 3a2 2 0 0 1-2.2 1.2C9.8 19.7 4.3 14.2 3 7.1a2 2 0 0 1 1.2-2.2l3-1.1Z" strokeLinecap="round" strokeLinejoin="round" />,
    instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.5" /><path d="M17.5 6.5h.01" strokeLinecap="round" /></>,
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      {paths[type]}
    </svg>
  )
}

const linkClass =
  'flex min-h-14 items-center gap-3 rounded-2xl px-3.5 py-2.5 font-bold transition hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark'

export default function ContactMenu({ className = '' }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const backdropPress = useRef(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      trigger?.focus({ preventScroll: true })
    }
  }, [open])

  function closeOnBackdrop(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const outside = event.clientX < rect.left || event.clientX > rect.right
    if (backdropPress.current && event.target === event.currentTarget && outside) setOpen(false)
    backdropPress.current = false
  }

  function containKeyboardFocus(event) {
    if (event.key !== 'Tab') return
    const elements = Array.from(event.currentTarget.querySelectorAll('button, a[href]')).filter(
      (element) => element.getClientRects().length > 0,
    )
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-deep/35 text-white ring-1 ring-white/25 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
      >
        <MenuIcon />
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            onCancel={(event) => {
              event.preventDefault()
              setOpen(false)
            }}
            onKeyDown={containKeyboardFocus}
            onPointerDown={(event) => {
              backdropPress.current = event.target === event.currentTarget
            }}
            onClick={closeOnBackdrop}
            className="fixed inset-y-0 left-auto right-0 m-0 flex h-svh max-h-none w-[min(88vw,360px)] flex-col overflow-hidden border-0 bg-white p-0 text-ink shadow-2xl shadow-ink/30 backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] open:animate-drawer-in backdrop:animate-fade-in"
          >
            <div className="andes-bar relative overflow-hidden px-5 pb-6 pt-[max(18px,env(safe-area-inset-top))] text-white">
              <AndesPattern className="text-white/10" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">Tu minimarket cercano</p>
                  <h2 id={titleId} className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em]">
                    Ayuda y contacto
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
              <section className="rounded-[24px] rounded-tr-[42px] bg-brand-light p-4 text-brand-deep">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-card"><ContactIcon type="about" /></span>
                <h3 className="mt-3 font-display text-lg font-extrabold">¿Qué es AndesMarket?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                  Somos un minimarket local para comprar productos de uso diario con retiro en tienda o delivery.
                </p>
              </section>

              <nav aria-label="Contacto" className="mt-4 flex flex-col gap-1 text-sm text-ink">
                <a href={CONTACT_WHATSAPP_URL} target="_blank" rel="noreferrer" className={`${linkClass} bg-brand-dark text-white hover:bg-brand-deep`}>
                  <ContactIcon type="whatsapp" />
                  <span>Hablar por WhatsApp</span>
                </a>
                <a href={BUSINESS_PHONE_HREF} aria-label="Llamar al negocio" className={linkClass}>
                  <ContactIcon type="phone" />
                  <span><span className="block">Llamar al negocio</span><span className="block text-xs font-semibold text-muted">{BUSINESS_PHONE_LABEL}</span></span>
                </a>
                <a href={BUSINESS_INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Ver Instagram" className={linkClass}>
                  <ContactIcon type="instagram" />
                  <span><span className="block">Ver Instagram</span><span className="block text-xs font-semibold text-muted">@andesmarket.app</span></span>
                </a>
              </nav>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
