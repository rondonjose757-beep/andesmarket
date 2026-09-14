import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(undefined)

const toneClasses = {
  success: 'bg-brand text-ink',
  error: 'bg-danger text-white',
  info: 'bg-accent text-ink',
}

const tonePaths = {
  success: 'm5 12.5 4.5 4.5L19 7.5',
  error: 'M12 7v6m0 4h.01',
  info: 'M12 11v6m0-10h.01',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, tone = 'info') => {
      const id = ++idRef.current
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-sm flex-col items-center gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full animate-pop-in items-center gap-3 rounded-[22px] bg-ink py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-float"
          >
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClasses[toast.tone]}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d={tonePaths[toast.tone]} />
              </svg>
            </span>
            <span className="min-w-0 break-words py-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
