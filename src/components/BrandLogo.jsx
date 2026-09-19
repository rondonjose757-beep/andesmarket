import logo from '../assets/andesmarket-logo.png'

export default function BrandLogo() {
  return (
    <span className="block overflow-hidden">
      {/* El encuadre oculta los márgenes transparentes sin modificar el original. */}
      <span className="block aspect-[9/2] overflow-hidden">
        <img
          src={logo}
          alt="AndesMarket"
          width="2056"
          height="765"
          className="h-full w-full object-cover object-[center_55%] drop-shadow-sm"
        />
      </span>
    </span>
  )
}
