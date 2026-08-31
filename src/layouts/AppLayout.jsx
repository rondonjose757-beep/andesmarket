import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-svh bg-cream pb-20">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
