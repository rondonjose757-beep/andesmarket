import { Button } from '../shared/components/ui'

export default function CatalogState({
  loading,
  error,
  retry,
  message = 'Todavía no hay productos disponibles.',
  onClear,
}) {
  if (loading)
    return (
      <div
        role="status"
        aria-label="Cargando productos"
        className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-[24px] bg-white p-1.5 shadow-card">
            <div
              className="aspect-square animate-pulse rounded-[19px] rounded-tr-[34px] bg-cream-dim"
              style={{ animationDelay: `${i * 90}ms` }}
            />
            <div className="mx-1.5 mt-3 h-3 w-4/5 animate-pulse rounded-full bg-cream-dim" />
            <div className="mx-1.5 mb-2 mt-2 h-3 w-1/2 animate-pulse rounded-full bg-cream-dim" />
          </div>
        ))}
      </div>
    )
  return (
    <div className="rounded-[28px] rounded-tr-[72px] bg-white px-6 py-12 text-center shadow-card">
      <span
        aria-hidden="true"
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] rounded-tr-[32px] ${error ? 'bg-danger-light text-danger' : 'bg-brand-light text-brand-dark'}`}
      >
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {error ? (
            <path d="M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          ) : (
            <path d="M5.5 8h13l-.6 7M9 10.5V7a3 3 0 0 1 6 0v3.5M6.5 20.5 6 12m11 9-2-2m1-2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
          )}
        </svg>
      </span>
      <p
        role={error ? 'alert' : 'status'}
        className={`mx-auto mt-4 max-w-xs font-display text-lg font-extrabold leading-snug tracking-[-0.01em] ${error ? 'text-danger' : 'text-ink'}`}
      >
        {error ? 'No pudimos cargar los productos. Intenta de nuevo.' : message}
      </p>
      {error && retry && (
        <Button variant="secondary" onClick={retry} className="mt-5">
          Reintentar
        </Button>
      )}
      {onClear && (
        <Button variant="secondary" onClick={onClear} className="mt-5">
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
