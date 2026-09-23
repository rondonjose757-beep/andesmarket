import { NavLink } from 'react-router-dom'

const links = [
  ['/admin', 'Pedidos'],
  ['/admin/reportes', 'Reportes'],
  ['/admin/tasas', 'Tasas Bs/$'],
]

export default function AdminNavigation() {
  return <nav aria-label="Navegación administrativa" className="mb-7 flex flex-wrap gap-2">
    {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-bold transition ${isActive ? 'bg-brand-dark text-white' : 'bg-white text-brand-dark ring-1 ring-ink/10 hover:bg-brand-light'}`}>{label}</NavLink>)}
  </nav>
}
