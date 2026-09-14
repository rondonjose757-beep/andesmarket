import ProductFan from './ProductFan'
import ProductImage from './ProductImage'

// Góndola del departamento activo: título, resultados, ofertas y subcategorías
// en cuadros con un producto que sobresale.
export default function CatalogHero({
  eyebrow,
  title,
  tone,
  status,
  products,
  fanProducts,
  offersOnly,
  onToggleOffers,
  subcategories,
  activeSubcategoryId,
  onSelectSubcategory,
}) {
  return (
    <section className={`tone-${tone} relative rounded-[28px] rounded-tr-[88px] bg-(--tone-shelf) pt-6`}>
      <div className="flex items-start gap-2 px-5 pb-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-(--tone-deep)">{eyebrow}</p>
          <h1 className="mt-1.5 break-words font-display text-[32px] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink">
            {title}
          </h1>
          <p aria-live="polite" className="mt-2 text-[13px] font-semibold text-(--tone-deep)">
            {status}
          </p>
          <button
            type="button"
            aria-pressed={offersOnly}
            onClick={onToggleOffers}
            className={`mt-3 flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tone-deep) ${offersOnly ? 'bg-accent-dark text-white shadow-md shadow-accent-dark/25' : 'bg-white/70 text-ink ring-1 ring-ink/5 hover:bg-white'}`}
          >
            <span aria-hidden="true" className="font-display text-base font-extrabold">
              %
            </span>{' '}
            Ofertas
          </button>
        </div>
        <ProductFan products={fanProducts} />
      </div>
      {subcategories.length > 0 && (
        <nav
          aria-label="Subcategorías"
          className="scrollbar-hide flex gap-2.5 overflow-x-auto border-t border-(--tone-deep)/10 px-5 pb-4 pt-6"
        >
          {[{ id: 'all', name: 'Todo' }, ...subcategories].map((subcategory) => {
            const active = activeSubcategoryId === subcategory.id
            const sample = products.find((p) => p.subcategory?.id === subcategory.id && p.image_url)
            return (
              <button
                key={subcategory.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectSubcategory(subcategory.id)}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-xl text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--tone-deep)"
              >
                <span
                  className={`relative block aspect-square w-full rounded-[18px] rounded-tr-[32px] transition-all duration-300 ease-spring group-active:scale-95 ${active ? 'bg-white shadow-card ring-2 ring-(--tone-deep)' : 'bg-white/55 group-hover:bg-white'}`}
                >
                  {subcategory.id === 'all' ? (
                    <span aria-hidden="true" className="absolute inset-0 grid grid-cols-2 gap-1.5 p-4 text-(--tone-deep)">
                      {[0, 1, 2, 3].map((cell) => (
                        <span key={cell} className="rounded-[5px] bg-current opacity-70 first:rounded-tr-[9px] first:opacity-100" />
                      ))}
                    </span>
                  ) : (
                    <span className="absolute inset-x-2 -top-3.5 bottom-2 transition-transform duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:rotate-6">
                      <ProductImage src={sample?.image_url} />
                    </span>
                  )}
                </span>
                <span
                  className={`line-clamp-2 text-[11.5px] leading-tight ${active ? 'font-extrabold text-ink' : 'font-semibold text-ink/75'}`}
                >
                  {subcategory.name}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </section>
  )
}
