import { PRODUCT } from '../lib/autoshop'
import { classNames } from '../lib/format'
import { BrandLogo, BrandMark } from './BrandLogo'

export function ProductMark({
  variant = 'onDark',
  showWordmark = true,
  className,
}: {
  variant?: 'onDark' | 'onLight'
  showWordmark?: boolean
  className?: string
}) {
  if (showWordmark) {
    return (
      <BrandLogo
        variant={variant}
        className={classNames('h-14 w-auto max-w-[220px] object-contain object-left', className)}
      />
    )
  }

  return <BrandMark className={classNames('h-10 w-10', className)} />
}

export function ProductWordmark({
  variant = 'onDark',
}: {
  variant?: 'onDark' | 'onLight'
}) {
  const ink = variant === 'onDark' ? '#f7f1e8' : '#1c1612'
  const accent = '#d4a017'
  return (
    <div className="leading-tight">
      <p className="font-display text-2xl uppercase tracking-[0.14em]" style={{ color: ink }}>
        {PRODUCT.name}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
        {PRODUCT.tagline}
      </p>
    </div>
  )
}
