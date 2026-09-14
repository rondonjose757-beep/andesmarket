const buttonVariants = {
  primary: 'bg-brand-dark text-white shadow-float hover:bg-brand-deep active:bg-brand-deep',
  secondary: 'bg-white text-ink ring-1 ring-ink/10 hover:bg-cream hover:ring-ink/20',
  ghost: 'bg-transparent text-ink/70 hover:bg-ink/5 hover:text-ink',
  danger: 'bg-white text-danger ring-1 ring-danger/30 hover:bg-danger-light',
}

const buttonSizes = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-[15px] gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
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
      className={`inline-flex items-center justify-center rounded-full font-bold tracking-[-0.01em] transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
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
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink/70 transition duration-150 hover:bg-ink/5 hover:text-ink active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-muted">{hint}</p>}
      {error && (
        <p className="text-sm font-semibold text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}

const controlClasses =
  'w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-base text-ink ring-1 ring-ink/10 placeholder:text-muted/70 transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark disabled:cursor-not-allowed disabled:bg-cream-dim disabled:text-ink/40'

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
  neutral: 'bg-ink/8 text-ink/75',
  brand: 'bg-brand-light text-brand-dark',
  accent: 'bg-accent-light text-accent-dark',
  info: 'tone-cielo bg-(--tone-shelf) text-(--tone-deep)',
  danger: 'bg-danger-light text-danger',
  muted: 'bg-ink/8 text-muted',
}

export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${badgeVariants[variant]} ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function Card({ className = '', children }) {
  return <div className={`rounded-[24px] bg-white shadow-card ${className}`}>{children}</div>
}
