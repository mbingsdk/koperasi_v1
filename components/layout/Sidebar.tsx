'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { apiClient } from '@/lib/api-client'
import { useKoperasiStore } from '@/lib/store'
import { roleLabel } from '@/lib/roles'

const NAV = [
  { href: '/dashboard', label: 'Ringkasan' },
  { href: '/members',   label: 'Anggota' },
  { href: '/dues',      label: 'Iuran' },
  { href: '/cash',      label: 'Buku Kas' },
  { href: '/loans',     label: 'Pinjaman' },
  { href: '/reports',   label: 'Laporan' },
  { href: '/import',    label: 'Impor Excel' },
  { href: '/settings',  label: 'Pengaturan' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser } = useKoperasiStore()

  async function logout() {
    await apiClient.logout().catch(() => null)
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="stamp-mark text-ledger-deep">KL</div>
        <div className="brand-name">
          <div className="text-[12.5px] font-extrabold uppercase tracking-[.07em] leading-tight">
            Koperasi<br />Ledger
          </div>
          <div className="text-[9.5px] text-ink-soft tracking-[.18em] uppercase mt-1">
            Buku Kas Digital
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 flex flex-col overflow-y-auto">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'nav-item',
              (pathname === href || (href !== '/dashboard' && pathname.startsWith(href))) && 'active'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-5 py-4 border-t border-ledger-pale">
        <div className="sidebar-user-card">
          <div>
            <div className="text-[12px] font-bold">{currentUser?.name ?? 'Memuat pengguna'}</div>
            <div className="text-[10.5px] text-ink-soft uppercase tracking-[.1em] mt-0.5">
              {currentUser?.email ?? 'Session aktif'}
            </div>
          </div>
          <span className={cn('role-badge', currentUser?.role && `role-${currentUser.role}`)}>
            {roleLabel(currentUser?.role)}
          </span>
        </div>
        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
        >
          Keluar
        </button>
      </div>
    </aside>
  )
}
