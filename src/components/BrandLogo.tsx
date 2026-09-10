type BrandLogoProps = {
  variant?: 'onDark' | 'onLight'
  className?: string
}

function logoColors(variant: 'onDark' | 'onLight') {
  if (variant === 'onDark') {
    return { ink: '#e8eef3', steel: '#5eb4c7', post: '#9fd0dc' }
  }
  return { ink: '#12171d', steel: '#1b6b82', post: '#0e4a5c' }
}

export function BrandLogo({ variant = 'onDark', className = 'h-12 w-auto' }: BrandLogoProps) {
  const { ink, steel, post } = logoColors(variant)
  return (
    <svg viewBox="0 0 520 120" className={className} role="img" aria-label="Bayline">
      <rect x="8" y="18" width="14" height="84" rx="2" fill={steel} />
      <rect x="86" y="18" width="14" height="84" rx="2" fill={steel} />
      <rect x="22" y="52" width="64" height="10" fill={post} />
      <rect x="47" y="62" width="10" height="40" fill={ink} />
      <text
        x="124"
        y="82"
        fill={ink}
        fontFamily="Oswald, Impact, sans-serif"
        fontSize="64"
        fontWeight="600"
        letterSpacing="6"
      >
        BAYLINE
      </text>
      <rect x="128" y="94" width="196" height="3" fill={steel} />
    </svg>
  )
}

export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={`rounded-xl ${className}`} role="img" aria-hidden>
      <rect width="80" height="80" rx="16" fill="#0b1520" />
      <rect x="16" y="16" width="10" height="48" rx="1" fill="#e8eef3" />
      <rect x="54" y="16" width="10" height="48" rx="1" fill="#e8eef3" />
      <rect x="35" y="16" width="10" height="48" rx="1" fill="#5eb4c7" />
      <rect x="16" y="36" width="48" height="7" fill="#3d9aad" />
    </svg>
  )
}

export function BrandLockup({ className = 'h-14' }: { className?: string }) {
  return <BrandLogo variant="onLight" className={`${className} w-auto max-w-[240px]`} />
}
