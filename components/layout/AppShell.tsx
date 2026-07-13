'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import Sidebar from './Sidebar'
import { apiClient } from '@/lib/api-client'
import { useKoperasiStore } from '@/lib/store'
import { roleLabel } from '@/lib/roles'

const MAIN_NAV = [
  { href: '/dashboard', label: 'Ringkasan', short: 'Home' },
  { href: '/dues', label: 'Iuran', short: 'Iuran' },
  { href: '/cash', label: 'Kas', short: 'Kas' },
  { href: '/members', label: 'Anggota', short: 'Anggota' },
]

const MORE_NAV = [
  { href: '/loans', label: 'Pinjaman' },
  { href: '/reports', label: 'Laporan' },
  { href: '/import', label: 'Impor Excel' },
  { href: '/settings', label: 'Pengaturan' },
]

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser } = useKoperasiStore()
  const [moreOpen, setMoreOpen] = useState(false)

  async function logout() {
    await apiClient.logout().catch(() => null)
    setMoreOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <header className="mobile-topbar">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="stamp-mark !w-9 !h-9 !text-[12px]">KL</span>
          <span>
            <strong>Koperasi Ledger</strong>
            <small>{currentUser ? `${currentUser.name} - ${roleLabel(currentUser.role)}` : 'Buku Kas Digital'}</small>
          </span>
        </Link>
        <button className="mobile-more-button" onClick={() => setMoreOpen(true)}>Menu</button>
      </header>

      <main className="app-main">
        <div className="content-area">
          {children}
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Navigasi utama">
        {MAIN_NAV.map(item => (
          <Link key={item.href} href={item.href} className={cn(isActive(pathname, item.href) && 'active')}>
            <span>{item.short}</span>
          </Link>
        ))}
        <button className={cn(MORE_NAV.some(item => isActive(pathname, item.href)) && 'active')} onClick={() => setMoreOpen(true)}>
          <span>Lainnya</span>
        </button>
      </nav>

      <div className={cn('more-backdrop', moreOpen && 'open')} onClick={() => setMoreOpen(false)} />
      <aside className={cn('more-menu', moreOpen && 'open')} aria-hidden={!moreOpen}>
        <div className="more-menu-head">
          <div>
            <p className="eyebrow">Menu lainnya</p>
            <h2>Koperasi Ledger</h2>
            <div className="more-user">
              <strong>{currentUser?.name ?? 'Memuat pengguna'}</strong>
              <small>{currentUser?.email ?? 'Session aktif'}</small>
              <span className={cn('role-badge', currentUser?.role && `role-${currentUser.role}`)}>
                {roleLabel(currentUser?.role)}
              </span>
            </div>
          </div>
          <button onClick={() => setMoreOpen(false)}>x</button>
        </div>
        <div className="action-list">
          {MORE_NAV.map(item => (
            <Link key={item.href} href={item.href} className={cn('action-item', isActive(pathname, item.href) && 'active')} onClick={() => setMoreOpen(false)}>
              {item.label}<span>-&gt;</span>
            </Link>
          ))}
          <button type="button" className="action-item text-left" onClick={logout}>
            Keluar<span>-&gt;</span>
          </button>
        </div>
      </aside>
    </div>
  )
}
