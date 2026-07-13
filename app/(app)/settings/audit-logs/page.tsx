'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { Field, Select, Input } from '@/components/ui/Field'
import { useKoperasiStore } from '@/lib/store'
import { fmtDateTime } from '@/lib/format'

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  'member.create': 'Anggota - Dibuat',
  'member.update': 'Anggota - Diperbarui',
  'member.deactivate': 'Anggota - Dinonaktifkan',
  'dues.upsert': 'Iuran - Disimpan massal',
  'cash.create': 'Kas - Dibuat',
  'cash.update': 'Kas - Diperbarui',
  'cash.delete': 'Kas - Dihapus',
  'loan.create': 'Pinjaman - Dibuat',
  'loan.update': 'Pinjaman - Diperbarui',
  'loan.delete': 'Pinjaman - Dihapus',
  'loan_payment.create': 'Pembayaran - Dicatat',
  'import.commit': 'Impor - Disimpan',
  'report.export': 'Laporan - Diekspor',
  'user.create': 'Pengguna - Dibuat',
  'user.update': 'Pengguna - Diperbarui',
  'user.deactivate': 'Pengguna - Dinonaktifkan',
}

const ENTITY_LABELS: Record<string, string> = {
  loan: 'Pinjaman',
  transaction: 'Transaksi kas',
  contribution: 'Batch iuran',
  import_batch: 'Impor',
  member: 'Anggota',
  user: 'Pengguna',
  department: 'Departemen',
  fund: 'Dana',
  cash_source: 'Sumber kas',
  contribution_rate: 'Tarif iuran',
}

export default function AuditLogsPage() {
  const { state } = useKoperasiStore()
  const [filterUser, setFilterUser] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [from, setFrom] = useState('2026-06-01')
  const [to, setTo] = useState('2026-12-31')

  const uniqueUsers = useMemo(() => Array.from(new Set(state.auditLogs.map(l => JSON.stringify({ id: l.user.id, name: l.user.name })))).map(s => JSON.parse(s) as { id: string; name: string }), [state.auditLogs])
  const uniqueActions = useMemo(() => Array.from(new Set(state.auditLogs.map(l => l.action))), [state.auditLogs])
  const filtered = state.auditLogs.filter(log => {
    const date = log.createdAt.slice(0, 10)
    if (date < from || date > to) return false
    if (filterUser !== 'all' && log.user.id !== filterUser) return false
    if (filterAction !== 'all' && log.action !== filterAction) return false
    return true
  })

  return (
    <>
      <PageHeader eyebrow="Pengaturan - Audit" title="Log Audit" actions={<Link href="/settings" className="btn btn-outline">&lt;- Pengaturan</Link>} />
      <FilterBar>
        <Field label="Dari"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="Sampai"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <Field label="Pengguna"><Select value={filterUser} onChange={e => setFilterUser(e.target.value)}><option value="all">Semua</option>{uniqueUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Aksi"><Select value={filterAction} onChange={e => setFilterAction(e.target.value)}><option value="all">Semua</option>{uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}</Select></Field>
      </FilterBar>
      <ResponsiveLedger
        rows={filtered}
        getKey={log => log.id}
        cardTitle={log => ACTION_LABELS[log.action] ?? log.action}
        cardMeta={log => `${log.user.name} - ${fmtDateTime(log.createdAt)}`}
        columns={[
          { key: 'time', header: 'Waktu', render: log => <span className="mono text-[12px] text-ink-soft">{fmtDateTime(log.createdAt)}</span> },
          { key: 'user', header: 'Pengguna', render: log => <span className="font-medium">{log.user.name}</span> },
          { key: 'action', header: 'Aksi', render: log => ACTION_LABELS[log.action] ?? log.action },
          { key: 'entity', header: 'Entitas', render: log => <span className="text-ink-soft">{ENTITY_LABELS[log.entityType] ?? log.entityType}</span> },
        ]}
      />
      <p className="text-[12px] text-ink-soft mt-3">Menampilkan {filtered.length} dari {state.auditLogs.length} entri.</p>
    </>
  )
}
