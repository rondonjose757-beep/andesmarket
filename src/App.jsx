import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './state/AuthProvider'
import { CartProvider } from './state/CartProvider'
import { ToastProvider } from './shared/components/Toast'
import PwaInstall from './pwa/PwaInstall'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import ProfilePage from './pages/ProfilePage'
import ConfirmationPage from './pages/ConfirmationPage'
import PrivacyPage from './pages/PrivacyPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <PwaInstall />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="catalogo" element={<CatalogPage />} />
              <Route path="carrito" element={<CartPage />} />
              <Route path="mis-pedidos" element={<OrdersPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="privacidad" element={<PrivacyPage />} />
            </Route>
            <Route path="pedido/:orderId" element={<ConfirmationPage />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
