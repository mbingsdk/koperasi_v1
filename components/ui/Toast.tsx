'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error' | 'info'
type ToastItem = { id: string; message: string; kind: ToastKind }

interface ToastValue {
  notify: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  function notify(message: string, kind: ToastKind = 'success') {
    const item = { id: `${Date.now()}-${Math.random()}`, message, kind }
    setItems(prev => [item, ...prev].slice(0, 3))
    window.setTimeout(() => setItems(prev => prev.filter(t => t.id !== item.id)), 3200)
  }

  const value = useMemo(() => ({ notify }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {items.map(item => (
          <div key={item.id} className={cn('toast', `toast-${item.kind}`)}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
