import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import FloatingCart from '../components/FloatingCart'

export default function AppLayout() {
  return (
    <div className="min-h-svh bg-cream">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-5 pb-28 sm:px-6 sm:py-6">
        <Outlet />
      </main>

      <FloatingCart />
    </div>
  )
}
