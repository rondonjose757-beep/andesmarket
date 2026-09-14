import logo from '../assets/andesmarket-logo.png'

export default function BrandLogo() {
  return (
    <span className="block overflow-hidden rounded-xl bg-cream px-2 py-1">
      {/* El encuadre oculta los márgenes transparentes sin modificar el original. */}
      <span className="block aspect-[9/2] overflow-hidden">
        <img
          src={logo}
          alt="AndesMarket"
          width="2056"
          height="765"
          className="h-full w-full object-cover object-[center_55%]"
        />
      </span>
    </span>
  )
}
