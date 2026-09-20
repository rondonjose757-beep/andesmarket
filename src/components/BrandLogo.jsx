import logo from '../assets/andesmarket-logo.webp'

export default function BrandLogo() {
  return (
    <span className="block overflow-hidden">
      {/* El encuadre oculta los márgenes transparentes sin modificar el original. */}
      <span className="block aspect-[9/2] overflow-hidden">
        <img
          src={logo}
          alt="AndesMarket"
          width="1028"
          height="383"
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover object-[center_55%] drop-shadow-sm"
        />
      </span>
    </span>
  )
}
