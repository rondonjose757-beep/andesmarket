import { Link } from 'react-router-dom'

export default function Footer({ withCartOffset = false }) {
  return (
    <footer
      className={`border-t border-ink/10 bg-white/55 px-4 pt-5 sm:px-6 ${
        withCartOffset ? 'pb-32' : 'pb-[max(20px,env(safe-area-inset-bottom))]'
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} AndesMarket</p>
        <Link
          to="/privacidad"
          className="min-h-11 rounded-lg px-3 py-3 font-bold text-brand-dark underline decoration-brand/50 underline-offset-4 transition hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Política de privacidad
        </Link>
      </div>
    </footer>
  )
}
