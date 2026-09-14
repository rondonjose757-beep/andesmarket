import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import FloatingCart from '../components/FloatingCart'

// /catalogo trae su propia cabecera fija (<CatalogHeader>, dentro de
// <CatalogPage>) en vez del Header "hero" genérico: no hay carrusel que
// tape, así que no necesita el espacio ni el degradado del Home.
export default function AppLayout() {
  const { pathname } = useLocation()
  const isCatalog = pathname === '/catalogo'

  return (
    <div className="min-h-svh bg-cream">
      {!isCatalog && <Header />}

      <main className={isCatalog ? '' : 'mx-auto max-w-3xl px-4 py-5 pb-28 sm:px-6 sm:py-6'}>
        <Outlet />
      </main>

      <FloatingCart />
    </div>
  )
}
