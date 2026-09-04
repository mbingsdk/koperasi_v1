'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { dashboardMetrics, useCashLedger, useDues, useKoperasiStore } from '@/lib/store'
import { fmtShortDate, rp, rpOut } from '@/lib/format'
import { apiClient, type ReportSummary } from '@/lib/api-client'

export default function DashboardPage() {
  const { state } = useKoperasiStore()
  const { transactions } = useCashLedger()
  const { dues } = useDues()
  const metrics = dashboardMetrics(state)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const unpaid = dues.filter(d => d.amountIdr === 0)
  const paidCount = dues.filter(d => d.amountIdr > 0).length
  const completion = dues.length > 0 ? Math.round((paidCount / dues.length) * 100) : 0
  const balance = summary?.balance ?? Number(metrics.cards[0]?.value.replace(/[^\d]/g, '') ?? 0)
  const duesPaid = summary?.duesTotal ?? metrics.duesPaid
  const expenses = summary?.cashOut ?? metrics.expenses
  const activeLoans = summary?.activeLoans ?? metrics.activeLoans

  useEffect(() => {
    let cancelled = false
    apiClient.getReportSummary()
      .then(data => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Aksi Harian"
        title="Ringkasan"
        actions={
          <select className="field-input font-mono">
            <option>Juni 2026</option>
            <option>Mei 2026</option>
            <option>April 2026</option>
          </select>
        }
      />

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Saldo kerja bulan ini</p>
          <h2>{rp(balance)}</h2>
          <p className="dashboard-hero-copy">
            {paidCount} dari {dues.length} iuran tercatat. {unpaid.length} anggota masih perlu dicek.
          </p>
        </div>
        <div className="dashboard-progress" aria-label={`Progres iuran ${completion}%`}>
          <span>{completion}%</span>
          <div><i style={{ width: `${completion}%` }} /></div>
        </div>
      </section>

      <section className="quick-action-grid" aria-label="Aksi harian">
        <Link href="/dues" className="quick-action primary">
          <span>01</span>
          <strong>Catat Iuran</strong>
          <small>Input setoran anggota</small>
        </Link>
        <Link href="/cash?arah=masuk" className="quick-action">
          <span>02</span>
          <strong>Kas Masuk</strong>
          <small>Pemasukan dana</small>
        </Link>
        <Link href="/cash?arah=keluar" className="quick-action danger">
          <span>03</span>
          <strong>Kas Keluar</strong>
          <small>Pengeluaran koperasi</small>
        </Link>
        <Link href="/loans" className="quick-action">
          <span>04</span>
          <strong>Pinjaman</strong>
          <small>Tambah atau angsur</small>
        </Link>
      </section>

      <div className="dashboard-metrics">
        {[
          { label: 'Dana Hibah', value: metrics.cards[1]?.value ?? 'Rp 0' },
          { label: 'Dana Serikat', value: metrics.cards[2]?.value ?? 'Rp 0' },
          { label: 'Pinjaman Aktif', value: rp(activeLoans) },
          { label: 'Pengeluaran Jun', value: rpOut(expenses), danger: true },
        ].map(card => (
          <div key={card.label} className="dashboard-metric">
            <p>{card.label}</p>
            <strong className={card.danger ? 'text-margin' : undefined}>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-workspace">
        <div className="panel">
          <div className="panel-head">
            <h2>Buku Kas - Transaksi Terbaru</h2>
            <Link href="/cash" className="btn btn-outline !py-1.5 !px-3 !text-[10px] !border-white/50 !text-paper">
              Lihat semua -&gt;
            </Link>
          </div>
          <div className="panel-body">
            <ResponsiveLedger
              rows={transactions.slice(0, 6)}
              getKey={tx => tx.id}
              cardTitle={tx => tx.note ?? '-'}
              cardMeta={tx => `${fmtShortDate(tx.transactionDate)} - ${tx.fund?.name ?? 'Tanpa dana'}`}
              cardAmount={tx => tx.direction === 'outflow' ? rpOut(tx.amountIdr) : rp(tx.amountIdr)}
              columns={[
                { key: 'date', header: 'Tanggal', render: tx => <span className="mono">{fmtShortDate(tx.transactionDate)}</span> },
                { key: 'note', header: 'Keterangan', render: tx => <>{tx.note}{tx.counterpartyName && <span className="cell-sub">{tx.counterpartyName}</span>}</> },
                { key: 'fund', header: 'Dana', render: tx => tx.fund?.name ?? '-' },
                { key: 'amount', header: 'Jumlah', className: 'num', render: tx => <span className={tx.direction === 'outflow' ? 'amt-out' : ''}>{tx.direction === 'outflow' ? rpOut(tx.amountIdr) : rp(tx.amountIdr)}</span> },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="panel">
            <div className="panel-head">
              <h2>Prioritas Iuran</h2>
              <Link href="/dues" className="btn btn-outline !border-white/50 !text-paper !py-1.5 !px-3 !text-[10px]">
                Buka
              </Link>
            </div>
            <div className="panel-body">
              <p className="dashboard-note">
                {paidCount} dari {dues.length} anggota sudah tercatat.{' '}
                <span className="mono">{rp(duesPaid)}</span>
              </p>
              <p className="eyebrow mt-4">Belum tercatat</p>
              {unpaid.length === 0 && <p className="text-[12px] text-ink-soft">Semua anggota sudah tercatat.</p>}
              {unpaid.slice(0, 5).map(d => (
                <div key={d.id} className="flag-block">{d.member.name} - {d.member.department?.name ?? 'Tanpa departemen'}</div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Navigasi Kerja</h2></div>
            <div className="action-list">
              {([
                ['/members', 'Cari kartu anggota'],
                ['/cash', 'Audit buku kas'],
                ['/reports', 'Ekspor laporan XLSX'],
                ['/settings', 'Pengaturan data'],
              ] as const).map(([href, label]) => (
                <Link key={href} href={href} className="action-item">
                  {label} <span className="text-ledger-deep font-mono">-&gt;</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
