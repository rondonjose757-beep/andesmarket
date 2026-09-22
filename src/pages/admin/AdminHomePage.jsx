import { Button, Card } from '../../shared/components/ui'
import { useAdminAuth } from '../../state/AdminAuthContext'
import AdminHeading from '../../components/admin/AdminHeading'

export default function AdminHomePage() {
  const { operator, logout, busy } = useAdminAuth()
  return <section className="space-y-7">
    <div className="space-y-3">
      <p className="text-sm font-bold text-brand-dark">Acceso verificado</p>
      <AdminHeading>Bienvenido, {operator.display_name}</AdminHeading>
    </div>
    <Card className="space-y-3 p-6">
      <h2 className="font-display text-xl font-bold">Estamos preparando tu espacio</h2>
      <p className="leading-relaxed text-muted">Tu acceso administrativo está listo. Las herramientas de pedidos, pagos y reportes estarán disponibles en una próxima etapa.</p>
      <p className="text-sm font-semibold text-brand-dark">No hay operaciones habilitadas todavía.</p>
    </Card>
    <Button variant="secondary" onClick={logout} loading={busy} className="w-full">Cerrar sesión administrativa</Button>
  </section>
}
