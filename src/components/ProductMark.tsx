import { PRODUCT } from '../lib/autoshop'
import { classNames } from '../lib/format'

export function ProductMark({
  variant = 'onDark',
  showWordmark = true,
  className,
}: {
  variant?: 'onDark' | 'onLight'
  showWordmark?: boolean
  className?: string
}) {
  const ink = variant === 'onDark' ? '#f5f7fa' : '#0b1220'
  const accent = '#00a3ff'
  return (
    <div className={classNames('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden="true">
        <rect x="3" y="8" width="6" height="24" rx="1.5" fill={ink} opacity="0.88" />
        <rect x="17" y="5" width="6" height="30" rx="1.5" fill={accent} />
        <rect x="31" y="8" width="6" height="24" rx="1.5" fill={ink} opacity="0.88" />
        <rect x="1" y="18" width="38" height="4" rx="2" fill={accent} />
      </svg>
      {showWordmark ? (
        <div className="leading-tight">
          <p className="font-display text-xl tracking-tight" style={{ color: ink }}>
            {PRODUCT.name}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
            Shop operations
          </p>
        </div>
      ) : null}
    </div>
  )
}
