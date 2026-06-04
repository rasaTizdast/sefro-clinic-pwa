import { useState, useRef, useEffect, type ReactNode } from 'react'

type DropdownAlign = 'start' | 'end'

export interface DropdownItem {
  label?: string
  icon?: ReactNode
  onClick?: () => void
  divider?: boolean
  disabled?: boolean
  danger?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: DropdownAlign
  className?: string
}

export function Dropdown({ trigger, items, align = 'start', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const handleScroll = () => {
      setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((prev) => !prev)
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {trigger}
      </div>

      {open && (
        <div
          ref={menuRef}
          className={`absolute top-full z-50 mt-1 min-w-[180px] rounded-lg bg-white shadow-lg border border-surface-200 py-1 ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-surface-200"
                  role="separator"
                />
              )
            }

            return (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.()
                    setOpen(false)
                  }
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-surface-100 ${
                  item.disabled
                    ? 'text-surface-400 cursor-not-allowed'
                    : item.danger
                      ? 'text-danger-600 hover:bg-danger-50'
                      : 'text-surface-700 hover:bg-surface-100'
                }`}
                role="menuitem"
              >
                {item.icon && <span className="size-4 shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
