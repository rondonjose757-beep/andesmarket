import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './state/AuthProvider'
import { CartProvider } from './state/CartProvider'
import { ToastProvider } from './shared/components/Toast'
import PwaInstall from './pwa/PwaInstall'
import InstallPrompt from './pwa/InstallPrompt'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import ProfilePage from './pages/ProfilePage'
import ConfirmationPage from './pages/ConfirmationPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <PwaInstall />
          <InstallPrompt />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="catalogo" element={<CatalogPage />} />
              <Route path="carrito" element={<CartPage />} />
              <Route path="mis-pedidos" element={<OrdersPage />} />
              <Route path="perfil" element={<ProfilePage />} />
            </Route>
            <Route path="pedido/:orderId" element={<ConfirmationPage />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
