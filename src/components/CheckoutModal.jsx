import { Modal } from '../shared/components/Modal'
import ProfileForm from './ProfileForm'

// Solo pide los datos del cliente (nombre + teléfono) — el método de
// entrega (retiro/delivery) se elige directamente en CartPage.
export default function CheckoutModal({ open, onClose, onReady }) {
  return (
    <Modal open={open} onClose={onClose} title="Antes de confirmar…" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-base text-ink/70">Necesitamos tu nombre y teléfono para procesar tu pedido y avisarte cuando esté listo.</p>
        <ProfileForm onSuccess={onReady} submitLabel="Continuar" />
      </div>
    </Modal>
  )
}
