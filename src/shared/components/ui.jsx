const buttonVariants = {
  primary: 'bg-brand text-white hover:bg-brand-dark active:bg-brand-dark shadow-sm shadow-brand/20',
  secondary: 'bg-white text-ink border border-ink/15 hover:border-ink/30 hover:bg-cream-dim',
  ghost: 'bg-transparent text-ink/70 hover:bg-ink/5 hover:text-ink',
  danger: 'bg-white text-red-600 border border-red-600/30 hover:bg-red-600/5',
}

const buttonSizes = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-base gap-2',
  lg: 'h-14 px-7 text-lg gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink/70 transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-base font-bold text-ink">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-ink/60">{hint}</p>}
      {error && (
        <p className="text-sm font-semibold text-red-600" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}

const controlClasses =
  'w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink/40 transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:bg-cream-dim disabled:text-ink/40'

export function Input({ className = '', ...props }) {
  return <input className={`${controlClasses} ${className}`} {...props} />
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return <textarea rows={rows} className={`${controlClasses} resize-none ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${controlClasses} bg-white ${className}`} {...props}>
      {children}
    </select>
  )
}

const badgeVariants = {
  neutral: 'bg-ink/8 text-ink/70',
  brand: 'bg-brand/10 text-brand-dark',
  accent: 'bg-accent/10 text-accent',
  info: 'bg-blue-500/10 text-blue-700',
  danger: 'bg-red-500/10 text-red-700',
  muted: 'bg-ink/8 text-ink/50',
}

export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Card({ className = '', children }) {
  return <div className={`rounded-2xl border border-ink/8 bg-white shadow-sm shadow-ink/5 ${className}`}>{children}</div>
}
