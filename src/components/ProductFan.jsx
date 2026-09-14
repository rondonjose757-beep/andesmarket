import ProductImage from './ProductImage'

// Tres productos en abanico que sobresalen de la esquina de una góndola.
export default function ProductFan({ products }) {
  const [front, left, right] = products.filter((p) => p.image_url)
  return (
    <div aria-hidden="true" className="relative -mr-1 -mt-10 h-[118px] w-[124px] shrink-0">
      <span className="absolute bottom-1 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-(--tone-deep) opacity-20 blur-md" />
      {left && (
        <div className="absolute bottom-4 left-0 h-[72px] w-[62px] -rotate-[14deg]">
          <ProductImage src={left.image_url} />
        </div>
      )}
      {right && (
        <div className="absolute bottom-4 right-0 h-[72px] w-[62px] rotate-[14deg]">
          <ProductImage src={right.image_url} />
        </div>
      )}
      {front && (
        <div key={front.id} className="absolute bottom-2 left-1/2 h-[96px] w-[86px] -translate-x-1/2 animate-pop-in">
          <ProductImage src={front.image_url} />
        </div>
      )}
    </div>
  )
}
