import { Outlet } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

export default function AdminLayout() {
  return <div className="min-h-dvh bg-cream text-ink">
    <a href="#admin-contenido" className="sr-only focus:not-sr-only focus:block focus:p-4">Ir al contenido administrativo</a>
    <header className="border-b border-ink/10 bg-brand-deep px-5 py-5">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="w-40"><BrandLogo /></div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-dark">Administración</span>
      </div>
    </header>
    <main id="admin-contenido" className="mx-auto max-w-4xl px-5 py-10 sm:py-16"><Outlet /></main>
    <footer className="px-5 pb-8 text-center text-xs text-muted">AndesMarket · Acceso exclusivo de operadores</footer>
  </div>
}
