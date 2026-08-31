import { Link } from 'react-router-dom'

// Banner estático (sin datos de producto) para completar el carrusel de
// HomePage con contenido siempre disponible: delivery, retiro en tienda, etc.
// Mismo lenguaje visual que <PromoBanner />: tarjeta redondeada con
// degradado, ícono circular a la derecha y texto a la izquierda.
export default function InfoBanner({ to, gradientClass, icon, eyebrow, title, subtitle }) {
  return (
    <Link
      to={to}
      className={`group relative flex h-[256px] w-full flex-col justify-center overflow-hidden rounded-3xl px-6 py-7 text-left text-white shadow-lg shadow-ink/10 transition-transform duration-200 active:scale-[0.99] sm:h-[300px] sm:px-8 sm:py-9 ${gradientClass}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />

      <div className="absolute -right-4 top-1/2 flex h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white/30 bg-white/15 shadow-xl transition-transform duration-300 group-hover:scale-105 sm:h-32 sm:w-32">
        {icon}
      </div>

      <p className="relative text-xs font-bold uppercase tracking-[0.15em] text-white/70">{eyebrow}</p>
      <h2 className="relative mt-1.5 line-clamp-2 max-w-[65%] text-2xl font-black leading-[1.05] sm:max-w-xs sm:text-3xl">{title}</h2>
      <p className="relative mt-2 line-clamp-2 max-w-[70%] text-sm text-white/80 sm:max-w-xs">{subtitle}</p>
    </Link>
  )
}
