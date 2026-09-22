import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../state/AdminAuthContext'
import { Button } from '../../shared/components/ui'

export default function AdminRoute({ screen = 'home' }) {
  const { status, busy, refresh, logout } = useAdminAuth()
  if (status === 'checking') return <p role="status" className="py-12 text-center text-muted">Verificando acceso…</p>
  if (status === 'error') return <section className="space-y-5 py-8">
    <h1 className="font-display text-2xl font-bold">No pudimos verificar tu acceso</h1>
    <p role="alert" className="text-muted">Revisa tu conexión. El área administrativa permanece bloqueada.</p>
    <div className="flex flex-wrap gap-3">
      <Button onClick={refresh} disabled={busy}>Volver a intentar</Button>
      <Button variant="secondary" onClick={logout} disabled={busy}>Cerrar sesión administrativa</Button>
    </div>
  </section>
  if (status === 'signed-out') return screen === 'login' ? <Outlet /> : <Navigate to="/admin/login" replace />
  if (status === 'change-pin') return screen === 'pin' ? <Outlet /> : <Navigate to="/admin/cambiar-pin" replace />
  return screen === 'home' ? <Outlet /> : <Navigate to="/admin" replace />
}
