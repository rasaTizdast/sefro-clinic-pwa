import { useEffect, useRef, type ReactNode, useCallback } from 'react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      handleClose()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    el.addEventListener('cancel', handleCancel)
    el.addEventListener('keydown', handleKeyDown)
    return () => {
      el.removeEventListener('cancel', handleCancel)
      el.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        handleClose()
      }
    },
    [handleClose],
  )

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      className={`backdrop:bg-black/50 w-full ${sizeStyles[size]} rounded-xl bg-white shadow-xl open:flex open:flex-col max-h-[85vh] m-auto`}
    >
      {title && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-200 shrink-0">
          <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="px-6 py-4 overflow-y-auto grow">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 shrink-0">
          {footer}
        </div>
      )}
    </dialog>
  )
}
