function SearchIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20.5 20.5 16 16" />
    </svg>
  )
}

// Buscador compartido entre Inicio y Catálogo: píldora blanca con lupa redonda.
export default function SearchBar({ query, onQueryChange, onSubmit, placeholder = '¿Qué quieres comprar hoy?' }) {
  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white p-1 pl-5 text-ink shadow-lg shadow-brand-deep/15 ring-1 ring-ink/5 transition-shadow focus-within:ring-2 focus-within:ring-brand-dark/60"
    >
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar productos"
        className="h-10 w-full min-w-0 truncate bg-transparent text-base font-medium text-ink placeholder:text-muted focus:outline-none"
      />
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white"
      >
        <SearchIcon />
      </span>
    </form>
  )
}
