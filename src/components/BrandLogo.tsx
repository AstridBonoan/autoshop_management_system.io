type BrandLogoProps = {
  variant?: 'onDark' | 'onLight'
  className?: string
}

export function BrandLogo({ variant = 'onDark', className = 'h-12 w-auto' }: BrandLogoProps) {
  const src = variant === 'onDark' ? `${import.meta.env.BASE_URL}brand/logo-on-dark.png` : `${import.meta.env.BASE_URL}brand/logo-on-light.png`
  return <img src={src} alt="Bayline" className={className} />
}

export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}brand/mark.png`} alt="" className={`rounded-xl ${className}`} />
}

export function BrandLockup({ className = 'h-14' }: { className?: string }) {
  return <BrandLogo variant="onLight" className={`${className} w-auto max-w-[240px] object-contain object-left`} />
}
