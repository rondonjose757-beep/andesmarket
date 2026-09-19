import { Modal } from '../shared/components/Modal'
import ProfileForm from './ProfileForm'

// Solo pide los datos del cliente (nombre + teléfono) — el método de
// entrega (retiro/delivery) se elige directamente en CartPage.
export default function CheckoutModal({ open, onClose, onReady }) {
  return (
    <Modal open={open} onClose={onClose} title="Antes de confirmar…" maxWidth="max-w-lg">
      <div className="flex flex-col gap-5">
        <p className="text-[15px] leading-relaxed text-muted">
          Comparte los datos de este pedido para que podamos procesarlo y avisarte cuando esté listo.
        </p>
        <ProfileForm onSuccess={onReady} submitLabel="Continuar" />
      </div>
    </Modal>
  )
}
