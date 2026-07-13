'use client'

import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { fmtDateTime } from '@/lib/format'
import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

const ACTION_LABELS: Record<string, string> = {
  'loan.update': 'Diperbarui',
  'cash.create': 'Dibuat',
  'dues.upsert': 'Disimpan massal',
  'import.commit': 'Dikommit',
  'loan.create': 'Dibuat',
  'member.create': 'Dibuat',
  'member.update': 'Diperbarui',
  'loan_payment.create': 'Pembayaran dicatat',
}

const ENTITY_LABELS: Record<string, string> = {
  loan: 'Pinjaman',
  transaction: 'Transaksi kas',
  contribution: 'Iuran',
  import_batch: 'Impor',
  member: 'Anggota',
  user: 'Pengguna',
  department: 'Departemen',
  fund: 'Dana',
  cash_source: 'Sumber kas',
  contribution_rate: 'Tarif iuran',
}

export default function SettingsPage() {
  const { state, dispatch } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const activeUsers = state.users.filter(user => user.isActive).length
  const activeFunds = state.funds.filter(fund => fund.isActive).length
  const activeCashSources = state.cashSources.filter(source => source.isActive).length

  const cards = [
    { href: '/settings/users', title: 'Pengguna', desc: 'Admin, bendahara, dan peninjau laporan', count: state.users.length, meta: `${activeUsers} aktif` },
    { href: '/settings/departments', title: 'Departemen', desc: 'Unit kerja untuk filter anggota dan iuran', count: state.departments.length, meta: `${state.members.length} anggota` },
    { href: '/settings/funds', title: 'Dana', desc: 'Kas koperasi, hibah, serikat, dan dana lokal', count: state.funds.length, meta: `${activeFunds} aktif` },
    { href: '/settings/contribution-rates', title: 'Tarif Iuran', desc: 'Nominal default per dana dan tipe karyawan', count: state.contributionRates.length, meta: 'Dipakai di Iuran' },
    { href: '/settings/cash-sources', title: 'Sumber Kas', desc: 'Penanggung jawab kas fisik untuk pinjaman', count: state.cashSources.length, meta: `${activeCashSources} aktif` },
    { href: '/settings/audit-logs', title: 'Log Audit', desc: 'Jejak perubahan data lokal dan ekspor', count: state.auditLogs.length, meta: 'Terbaru di bawah' },
  ]

  async function reset() {
    if (!permissions.canResetDemo) {
      notify('Reset data demo hanya untuk super admin.', 'error')
      setConfirmReset(false)
      return
    }
    setResetting(true)
    try {
      const data = await apiClient.resetDemoDatabase()
      dispatch({
        type: 'hydrate',
        state: {
          ...data,
          meta: { hydrated: true, version: 3, updatedAt: new Date().toISOString() },
        },
      })
      setConfirmReset(false)
      notify('Database PostgreSQL dan cache lokal dikembalikan ke seed demo.', 'info')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal reset data demo.', 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Konfigurasi Sistem"
        title="Pengaturan"
        actions={<button className="btn btn-danger-outline settings-header-reset" onClick={() => setConfirmReset(true)} disabled={!permissions.canResetDemo}>Reset data demo</button>}
      />

      <section className="settings-hero" aria-label="Ringkasan pengaturan">
        <div className="settings-hero-main">
          <p className="eyebrow">PostgreSQL tersambung</p>
          <strong>{cards.length}</strong>
          <span>Workflow utama membaca backend; master data settings masih bertahap.</span>
        </div>
        <div className="settings-hero-stats">
          <div><span>Pengguna aktif</span><strong>{activeUsers}</strong></div>
          <div><span>Dana aktif</span><strong>{activeFunds}</strong></div>
          <div><span>Audit log</span><strong>{state.auditLogs.length}</strong></div>
        </div>
      </section>

      <div className="settings-grid">
        {cards.map(c => (
          <Link key={c.href} href={c.href} className="settings-card">
            <div className="settings-card-top">
              <h3>{c.title}</h3>
              <span>-&gt;</span>
            </div>
            <p>{c.desc}</p>
            <div className="settings-card-foot">
              <div className="sc-count">{c.count.toLocaleString('id-ID')}</div>
              <small>{c.meta}</small>
              {c.href === '/settings/users' && !permissions.canManageUsers && <small>Super admin only</small>}
            </div>
          </Link>
        ))}
      </div>

      <section className="settings-danger-zone">
        <div>
          <p className="eyebrow">Zona data demo</p>
          <h2>Reset PostgreSQL ke seed awal</h2>
          <p>Gunakan saat ingin mengulang simulasi dari data demo bersih. Cache lokal ikut disegarkan setelah database selesai direset.</p>
        </div>
        <button className="btn btn-danger-outline" onClick={() => setConfirmReset(true)} disabled={resetting || !permissions.canResetDemo}>
          {resetting ? 'Mereset...' : 'Reset data demo'}
        </button>
      </section>

      <div className="panel settings-audit-panel">
        <div className="panel-head">
          <h2>Log Audit - Terbaru</h2>
          <Link href="/settings/audit-logs" className="btn btn-outline !border-white/50 !text-paper !py-1.5 !px-3 !text-[10px]">
            Lihat semua -&gt;
          </Link>
        </div>
        <div className="panel-body">
          <ResponsiveLedger
            rows={state.auditLogs.slice(0, 8)}
            getKey={log => log.id}
            cardTitle={log => ACTION_LABELS[log.action] ?? log.action}
            cardMeta={log => `${log.user.name} - ${fmtDateTime(log.createdAt)}`}
            columns={[
              { key: 'time', header: 'Waktu', render: log => <span className="mono text-ink-soft">{fmtDateTime(log.createdAt)}</span> },
              { key: 'user', header: 'Pengguna', render: log => <span className="font-medium">{log.user.name}</span> },
              { key: 'action', header: 'Aksi', render: log => ACTION_LABELS[log.action] ?? log.action },
              { key: 'entity', header: 'Entitas', render: log => <span className="text-ink-soft">{ENTITY_LABELS[log.entityType] ?? log.entityType}</span> },
            ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset data demo?"
        message="Semua data PostgreSQL akan dikembalikan ke seed demo awal. Perubahan demo yang sudah dibuat akan dihapus."
        danger
        confirmLabel={resetting ? 'Mereset...' : 'Reset data'}
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  )
}
