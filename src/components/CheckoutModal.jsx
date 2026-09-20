import { Modal } from '../shared/components/Modal'
import ProfileForm from './ProfileForm'

// Solo pide los datos de contacto. La dirección y el sector se completan
// previamente en el carrito.
export default function CheckoutModal({ open, onClose, onReady }) {
  return (
    <Modal open={open} onClose={onClose} title="Antes de confirmar…" maxWidth="max-w-lg">
      <div className="flex flex-col gap-5">
        <p className="text-[15px] leading-relaxed text-muted">
          Comparte tu nombre y teléfono para confirmar este pedido delivery y coordinar el pago por WhatsApp.
        </p>
        <ProfileForm onSuccess={onReady} submitLabel="Continuar" />
      </div>
    </Modal>
  )
}
