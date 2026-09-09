type BrandLogoProps = {
  variant?: 'onDark' | 'onLight'
  className?: string
}

export function BrandLogo({ variant = 'onDark', className = 'h-12 w-auto' }: BrandLogoProps) {
  const src = variant === 'onDark' ? `${import.meta.env.BASE_URL}brand/logo-on-dark.png` : `${import.meta.env.BASE_URL}brand/logo-on-light.png`
  return <img src={src} alt="B&C Software & Web" className={className} />
}

export function BrandLockup({ className = 'h-14' }: { className?: string }) {
  return (
    <div className="inline-flex rounded-lg bg-ink p-2">
      <BrandLogo variant="onDark" className={`${className} w-auto max-w-[220px] object-contain object-left`} />
    </div>
  )
}
