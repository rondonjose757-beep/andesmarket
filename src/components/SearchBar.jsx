function SearchIcon({ className = '' }) {
  return (
    <svg className={`h-5 w-5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  )
}

// Buscador reutilizado en cualquier cabecera: pastilla blanca sobre fondo
// verde de marca. `onSubmit` decide qué pasa al confirmar (navegar al
// catálogo desde otras páginas, o nada si ya se filtra en vivo).
export default function SearchBar({ query, onQueryChange, onSubmit, placeholder = '¿Qué quieres comprar hoy?' }) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-1 items-center gap-2.5 rounded-full bg-white px-4 py-3 text-ink shadow-sm focus-within:ring-2 focus-within:ring-brand-dark/40"
    >
      <SearchIcon className="text-ink/40" />
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar productos"
        className="w-full truncate bg-transparent text-[15px] font-medium text-ink placeholder:text-ink/40 focus:outline-none"
      />
    </form>
  )
}
