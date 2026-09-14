import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import FloatingCart from '../components/FloatingCart'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isCatalog = pathname === '/catalogo'
  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-cream">
      {!isCatalog && <Header hero={pathname === '/'} />}
      <main className={isCatalog ? 'pb-32' : 'mx-auto max-w-5xl px-4 pb-32 pt-3 sm:px-6'}>
        <Outlet />
      </main>
      <FloatingCart />
    </div>
  )
}
