import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './state/AuthProvider'
import { CartProvider } from './state/CartProvider'
import { ToastProvider } from './shared/components/Toast'
import PwaInstall from './pwa/PwaInstall'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'

const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'))

function LazyPage({ children }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="sr-only">
          Cargando página…
        </p>
      }
    >
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <PwaInstall />
          <Routes>
            <Route path="admin/*" element={<LazyPage><AdminRoutes /></LazyPage>} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="catalogo" element={<LazyPage><CatalogPage /></LazyPage>} />
              <Route path="carrito" element={<LazyPage><CartPage /></LazyPage>} />
              <Route path="privacidad" element={<LazyPage><PrivacyPage /></LazyPage>} />
            </Route>
            <Route path="pedido/:orderId" element={<LazyPage><ConfirmationPage /></LazyPage>} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
