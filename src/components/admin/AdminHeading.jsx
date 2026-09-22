import { useEffect, useRef } from 'react'

export default function AdminHeading({ children }) {
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold tracking-tight text-ink outline-none sm:text-4xl">{children}</h1>
}
