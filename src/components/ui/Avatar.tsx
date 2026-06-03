import { type ReactNode } from 'react'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
type AvatarStatus = 'online' | 'offline' | 'away' | 'busy'

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: AvatarSize
  status?: AvatarStatus
  fallback?: ReactNode
  className?: string
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
}

const statusStyles: Record<AvatarStatus, string> = {
  online: 'bg-success-500',
  offline: 'bg-surface-400',
  away: 'bg-warning-500',
  busy: 'bg-danger-500',
}

const statusSizes: Record<AvatarSize, string> = {
  sm: 'size-2.5 ring-1',
  md: 'size-3 ring-2',
  lg: 'size-3.5 ring-2',
  xl: 'size-4 ring-2',
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  fallback,
  className = '',
}: AvatarProps) {
  const initials = name ? getInitials(name) : ''

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name || ''}
          className={`rounded-full object-cover ${sizeStyles[size]}`}
        />
      ) : (
        <span
          className={`rounded-full inline-flex items-center justify-center font-medium text-white bg-primary-500 ${sizeStyles[size]}`}
          aria-label={name || alt}
        >
          {fallback || initials || (
            <svg className="size-1/2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.46A10.96 10.96 0 0112 14c3.378 0 6.15 1.43 8.12 3.665a10.94 10.94 0 013.88 3.328zM12 12a6 6 0 110-12 6 6 0 010 12z" />
            </svg>
          )}
        </span>
      )}
      {status && (
        <span
          className={`absolute bottom-0 end-0 rounded-full ring-white ${statusStyles[status]} ${statusSizes[size]}`}
          aria-label={status}
        />
      )}
    </span>
  )
}
