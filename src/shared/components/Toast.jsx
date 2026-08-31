import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(undefined)

const toneClasses = {
  success: 'border-brand/30 bg-white text-ink',
  error: 'border-red-600/30 bg-white text-ink',
  info: 'border-ink/15 bg-white text-ink',
}

const toneDot = {
  success: 'bg-brand',
  error: 'bg-red-600',
  info: 'bg-accent',
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
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-ink/10 ${toneClasses[toast.tone]}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${toneDot[toast.tone]}`} aria-hidden="true" />
            <span className="break-words">{toast.message}</span>
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
