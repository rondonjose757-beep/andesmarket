import { useEffect, useState } from 'react'
import { Button } from '../shared/components/ui'

const DISMISS_KEY = 'andesmarket-install-dismissed-at'
const DISMISS_DAYS = 7

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function wasDismissedRecently() {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24)
  return elapsedDays < DISMISS_DAYS
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return

    if (isIos()) {
      setShowIosHint(true)
      setVisible(true)
      return
    }

    function onBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-ink/8 bg-white p-4 shadow-lg shadow-ink/10">
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Instala AndesMarket</p>
        {showIosHint ? (
          <p className="mt-0.5 text-sm text-ink/60">
            Toca <span className="font-medium">Compartir</span> <span aria-hidden="true">􀈂</span> y luego{' '}
            <span className="font-medium">&quot;Agregar a inicio&quot;</span>.
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-ink/60">Pide más rápido desde tu pantalla de inicio, como una app.</p>
        )}
        <div className="mt-3 flex gap-2">
          {!showIosHint && (
            <Button size="sm" onClick={handleInstallClick}>
              Instalar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dismiss}>
            {showIosHint ? 'Entendido' : 'Ahora no'}
          </Button>
        </div>
      </div>
    </div>
  )
}
