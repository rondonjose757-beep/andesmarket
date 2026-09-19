import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import FloatingCart from '../components/FloatingCart'
import Footer from '../components/Footer'
import { useCart } from '../state/CartProvider'

export default function AppLayout() {
  const { pathname } = useLocation()
  const { itemCount } = useCart()
  const isCatalog = pathname === '/catalogo'
  const isPrivacy = pathname === '/privacidad'
  const showFloatingCart = Boolean(itemCount) && !isPrivacy && pathname !== '/carrito'
  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-cream">
      {!isCatalog && <Header hero={pathname === '/'} />}
      <main
        className={
          isCatalog
            ? 'pb-32'
            : `mx-auto max-w-5xl px-4 pt-3 sm:px-6 ${isPrivacy ? 'pb-12' : 'pb-32'}`
        }
      >
        <Outlet />
      </main>
      <Footer withCartOffset={showFloatingCart} />
      {!isPrivacy && <FloatingCart />}
    </div>
  )
}
