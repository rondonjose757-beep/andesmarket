import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminAuthProvider from '../../state/AdminAuthProvider'
import AdminLayout from '../../layouts/AdminLayout'
import AdminRoute from '../../components/admin/AdminRoute'

const AdminLoginPage = lazy(() => import('./AdminLoginPage'))
const AdminChangePinPage = lazy(() => import('./AdminChangePinPage'))
const AdminOrdersPage = lazy(() => import('./AdminOrdersPage'))
const AdminOrderDetailPage = lazy(() => import('./AdminOrderDetailPage'))
const AdminReportsPage = lazy(() => import('./AdminReportsPage'))
const AdminRatesPage = lazy(() => import('./AdminRatesPage'))

export default function AdminRoutes() {
  return <AdminAuthProvider>
    <Suspense fallback={<p role="status" className="p-8 text-center text-muted">Cargando administración…</p>}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route element={<AdminRoute screen="login" />}><Route path="login" element={<AdminLoginPage />} /></Route>
          <Route element={<AdminRoute screen="pin" />}><Route path="cambiar-pin" element={<AdminChangePinPage />} /></Route>
          <Route element={<AdminRoute />}>
            <Route index element={<AdminOrdersPage />} />
            <Route path="pedidos" element={<AdminOrdersPage />} />
            <Route path="pedidos/:orderId" element={<AdminOrderDetailPage />} />
            <Route path="reportes" element={<AdminReportsPage />} />
            <Route path="tasas" element={<AdminRatesPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  </AdminAuthProvider>
}
