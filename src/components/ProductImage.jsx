import { useState } from 'react'

// Foto de producto recortada (PNG transparente) con sombra suave, brillo de
// carga y alternativa si falla.
export default function ProductImage({ src, className = '', shadow = true }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const [loadedSrc, setLoadedSrc] = useState(null)
  const loaded = loadedSrc === src
  return src && failedSrc !== src ? (
    <div className="relative h-full w-full">
      {!loaded && (
        <span aria-hidden="true" className="absolute inset-[18%] animate-pulse rounded-[38%] bg-white/35" />
      )}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={`relative h-full w-full object-contain transition-opacity duration-300 ${shadow ? 'cutout' : ''} ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </div>
  ) : (
    <div
      className="flex h-full w-full items-center justify-center rounded-2xl text-[var(--tone-deep,var(--color-muted))] opacity-60"
      aria-label="Sin imagen"
    >
      <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="m4 7 2-4h12l2 4v13H4Z M4 7h16 M9 11a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
