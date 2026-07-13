'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: React.ReactNode
  width?: string
}

export default function Drawer({ isOpen, onClose, title, eyebrow, children, width }: DrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn('drawer-backdrop', isOpen && 'open')}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn('drawer-panel', isOpen && 'open')}
        style={width ? { width } : undefined}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center
                     border-[1.5px] border-ledger-deep text-ledger-deep rounded-sm
                     hover:bg-ledger-pale transition-colors"
        >
          x
        </button>

        {/* Header */}
        {(eyebrow || title) && (
          <div className="mb-5 pr-12">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && (
              <h2 className="text-[19px] font-extrabold uppercase tracking-[.04em]">
                {title}
              </h2>
            )}
          </div>
        )}

        {children}
      </div>
    </>,
    document.body
  )
}
