import { NavLink } from 'react-router-dom'
import { useCart } from '../state/CartProvider'

const ICONS = {
  home: <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 001 1H9a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2.5a1 1 0 001-1v-9" />,
  catalog: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
  cart: <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.2a2 2 0 002 1.8h7.2a2 2 0 002-1.8L18 8H6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />,
  orders: <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a1 1 0 011 1v15l-3-2-2 2-2-2-2 2-3-2V5a1 1 0 011-1zM9 9h6M9 12h6" />,
  profile: <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />,
}

function NavIcon({ name }) {
  return (
    <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

export default function BottomNav() {
  const { itemCount } = useCart()

  const items = [
    { to: '/', label: 'Inicio', icon: 'home', end: true },
    { to: '/catalogo', label: 'Catálogo', icon: 'catalog' },
    { to: '/carrito', label: 'Carrito', icon: 'cart', badge: itemCount },
    { to: '/mis-pedidos', label: 'Mis pedidos', icon: 'orders' },
    { to: '/perfil', label: 'Perfil', icon: 'profile' },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/8 bg-cream/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors duration-150 ${
                isActive ? 'text-brand-dark' : 'text-ink/45 hover:text-ink/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-150 ${
                    isActive ? 'bg-brand/10' : ''
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.badge > 0 && (
                    <span className="absolute right-1.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
