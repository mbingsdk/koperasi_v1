'use client'

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import EmptyState from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { downloadCsv, useCashLedger, useReports } from '@/lib/store'
import { rp, fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useToast } from '@/components/ui/Toast'
import { apiClient, type ReportSummary } from '@/lib/api-client'

type ReportKey = 'monthly' | 'ledger' | 'arrears' | 'loans'

const REPORT_TYPES: { key: ReportKey; label: string; hint: string }[] = [
  { key: 'monthly', label: 'Laporan Bulanan', hint: 'Ringkasan kas, iuran, pinjaman' },
  { key: 'ledger', label: 'Buku Kas', hint: 'Mutasi dan saldo berjalan' },
  { key: 'arrears', label: 'Tunggakan Iuran', hint: 'Anggota belum bayar' },
  { key: 'loans', label: 'Pinjaman', hint: 'Pokok, angsuran, sisa' },
]

function monthSlug(value: string) {
  return value.slice(0, 7)
}

function expectedDue(employeeType: string) {
  return employeeType === 'Harian' ? 30000 : 50000
}

export default function ReportsPage() {
  const { notify } = useToast()
  const reports = useReports()
  const { transactions } = useCashLedger()
  const [active, setActive] = useState<ReportKey>('monthly')
  const [from, setFrom] = useState('2026-06-01')
  const [to, setTo] = useState('2026-06-30')
  const [apiSummary, setApiSummary] = useState<ReportSummary | null>(null)

  const activeType = REPORT_TYPES.find(item => item.key === active) ?? REPORT_TYPES[0]
  const unpaid = reports.dues.filter(d => d.amountIdr === 0)

  const cashRows = useMemo(
    () => transactions.filter(tx => tx.transactionDate >= from && tx.transactionDate <= to),
    [transactions, from, to]
  )

  const loanRows = useMemo(
    () => reports.loans.filter(loan => loan.loanDate >= from && loan.loanDate <= to),
    [reports.loans, from, to]
  )

  useEffect(() => {
    let cancelled = false
    apiClient.getReportSummary({ from, to })
      .then(summary => {
        if (!cancelled) setApiSummary(summary)
      })
      .catch(() => {
        if (!cancelled) setApiSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  const reportStats = useMemo(() => {
    const cashInRange = cashRows.filter(tx => tx.direction === 'inflow').reduce((sum, tx) => sum + tx.amountIdr, 0)
    const cashOutRange = cashRows.filter(tx => tx.direction === 'outflow').reduce((sum, tx) => sum + tx.amountIdr, 0)
    const loanRemaining = reports.loans.filter(loan => loan.status === 'active').reduce((sum, loan) => sum + loan.remainingAmountIdr, 0)

    return {
      cashInRange: apiSummary?.cashIn ?? cashInRange,
      cashOutRange: apiSummary?.cashOut ?? cashOutRange,
      netRange: (apiSummary?.cashIn ?? cashInRange) - (apiSummary?.cashOut ?? cashOutRange),
      unpaidCount: apiSummary?.unpaidCount ?? unpaid.length,
      loanRemaining: apiSummary?.activeLoans ?? loanRemaining,
      endingBalance: apiSummary?.balance ?? cashRows[0]?.balance ?? reports.summary.balance,
      duesTotal: apiSummary?.duesTotal ?? reports.summary.duesTotal,
    }
  }, [apiSummary, cashRows, reports.loans, reports.summary.balance, reports.summary.duesTotal, unpaid.length])

  const exportFilename = `koperasi-${activeType.key === 'monthly' ? 'laporan-bulanan' : activeType.key === 'ledger' ? 'buku-kas' : activeType.key === 'arrears' ? 'tunggakan' : 'pinjaman'}-${monthSlug(from)}.csv`

  function exportCsv() {
    if (active === 'ledger') {
      downloadCsv(exportFilename, cashRows.map(tx => ({
        tanggal: tx.transactionDate,
        kategori: tx.category,
        keterangan: tx.note,
        dana: tx.fund?.name,
        arah: tx.direction,
        jumlah: tx.amountIdr,
        saldo: tx.balance,
      })))
    } else if (active === 'arrears') {
      downloadCsv(exportFilename, unpaid.map(d => ({
        anggota: d.member.name,
        departemen: d.member.department?.name,
        tipe: d.member.employeeType,
        seharusnya: expectedDue(d.member.employeeType),
        dibayar: d.amountIdr,
      })))
    } else if (active === 'loans') {
      downloadCsv(exportFilename, loanRows.map(l => ({
        peminjam: l.member?.name ?? l.counterpartyName,
        sumber_kas: l.cashSource.name,
        tanggal: l.loanDate,
        pokok: l.principalAmountIdr,
        dibayar: l.paidAmountIdr,
        sisa: l.remainingAmountIdr,
        status: l.status,
      })))
    } else {
      downloadCsv(exportFilename, [
        { metrik: 'Kas masuk', nilai: reportStats.cashInRange },
        { metrik: 'Kas keluar', nilai: reportStats.cashOutRange },
        { metrik: 'Saldo akhir', nilai: reportStats.endingBalance },
        { metrik: 'Iuran diterima', nilai: reportStats.duesTotal },
        { metrik: 'Pinjaman aktif', nilai: reportStats.loanRemaining },
        { metrik: 'Anggota menunggak', nilai: reportStats.unpaidCount },
      ])
    }
    notify(`CSV ${activeType.label} berhasil dibuat.`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Diolah dari PostgreSQL"
        title="Laporan"
        actions={<button className="btn report-header-action" onClick={exportCsv}>Ekspor CSV</button>}
      />

      <section className="report-hero" aria-label="Ringkasan laporan">
        <div className="report-hero-main">
          <p className="eyebrow">Saldo akhir periode</p>
          <strong>{rp(reportStats.endingBalance)}</strong>
          <span>{fmtDate(from)} sampai {fmtDate(to)}</span>
        </div>
        <div className="report-hero-stats">
          <div><span>Net kas</span><strong className={reportStats.netRange < 0 ? 'text-margin' : ''}>{rp(Math.abs(reportStats.netRange))}</strong></div>
          <div><span>Tunggakan</span><strong>{reportStats.unpaidCount}</strong></div>
          <div><span>Pinjaman aktif</span><strong>{rp(reportStats.loanRemaining)}</strong></div>
        </div>
      </section>

      <FilterBar>
        <Field label="Dari"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="Sampai"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
      </FilterBar>

      <div className="report-layout">
        <aside className="report-picker" aria-label="Jenis laporan">
          {REPORT_TYPES.map(item => (
            <button
              key={item.key}
              type="button"
              className={cn('report-type-card', active === item.key && 'active')}
              onClick={() => setActive(item.key)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
        </aside>

        <section className="report-workspace">
          <div className="report-export-card">
            <div>
              <p className="eyebrow">Ekspor aktif</p>
              <h2>{activeType.label}</h2>
              <p>{exportFilename}</p>
            </div>
            <button className="btn" onClick={exportCsv}>Ekspor CSV</button>
          </div>

          {active === 'monthly' && (
            <div className="report-panel">
              <div className="report-metric-grid">
                <div><span>Kas Masuk</span><strong>{rp(reportStats.cashInRange)}</strong></div>
                <div><span>Kas Keluar</span><strong className="text-margin">{rp(reportStats.cashOutRange)}</strong></div>
                <div><span>Iuran</span><strong>{rp(reportStats.duesTotal)}</strong></div>
                <div><span>Pinjaman Aktif</span><strong>{rp(reportStats.loanRemaining)}</strong></div>
              </div>
              <div className="report-note">
                {reportStats.unpaidCount} anggota masih belum tercatat iurannya pada periode ini.
              </div>
            </div>
          )}

          {active === 'ledger' && (
            <div className="report-panel">
              <ResponsiveLedger
                rows={cashRows}
                getKey={tx => tx.id}
                empty={<EmptyState title="Tidak ada transaksi" message="Ubah rentang tanggal untuk melihat buku kas." />}
                cardTitle={tx => tx.note ?? tx.category}
                cardMeta={tx => `${fmtDate(tx.transactionDate)} - ${tx.category}`}
                cardAmount={tx => tx.direction === 'outflow' ? `-${rp(tx.amountIdr)}` : rp(tx.amountIdr)}
                columns={[
                  { key: 'date', header: 'Tanggal', render: tx => <span className="mono">{fmtDate(tx.transactionDate)}</span> },
                  { key: 'desc', header: 'Keterangan', render: tx => tx.note ?? '-' },
                  { key: 'debit', header: 'Debit', className: 'num', render: tx => tx.direction === 'outflow' ? rp(tx.amountIdr) : '-' },
                  { key: 'credit', header: 'Kredit', className: 'num', render: tx => tx.direction === 'inflow' ? rp(tx.amountIdr) : '-' },
                  { key: 'balance', header: 'Saldo', className: 'num', render: tx => rp(tx.balance) },
                ]}
              />
            </div>
          )}

          {active === 'arrears' && (
            <div className="report-panel">
              <ResponsiveLedger
                rows={unpaid}
                getKey={d => d.id}
                empty={<EmptyState title="Tidak ada tunggakan" message="Semua iuran pada data PostgreSQL sudah tercatat." />}
                cardTitle={d => d.member.name}
                cardMeta={d => `${d.member.department?.name ?? '-'} - ${d.member.employeeType}`}
                cardAmount={d => rp(expectedDue(d.member.employeeType))}
                columns={[
                  { key: 'member', header: 'Anggota', render: d => <span className="font-medium">{d.member.name}</span> },
                  { key: 'dept', header: 'Departemen', render: d => d.member.department?.name ?? '-' },
                  { key: 'type', header: 'Tipe', render: d => d.member.employeeType },
                  { key: 'expected', header: 'Seharusnya', className: 'num', render: d => rp(expectedDue(d.member.employeeType)) },
                  { key: 'paid', header: 'Dibayar', className: 'num', render: d => rp(d.amountIdr) },
                ]}
              />
            </div>
          )}

          {active === 'loans' && (
            <div className="report-panel">
              <ResponsiveLedger
                rows={loanRows}
                getKey={l => l.id}
                empty={<EmptyState title="Tidak ada pinjaman" message="Tidak ada pinjaman pada rentang tanggal ini." />}
                cardTitle={l => l.member?.name ?? l.counterpartyName ?? '-'}
                cardMeta={l => `${l.cashSource.name} - ${fmtDate(l.loanDate)}`}
                cardAmount={l => rp(l.remainingAmountIdr)}
                columns={[
                  { key: 'borrower', header: 'Peminjam', render: l => l.member?.name ?? l.counterpartyName ?? '-' },
                  { key: 'source', header: 'Sumber', render: l => l.cashSource.name },
                  { key: 'principal', header: 'Pokok', className: 'num', render: l => rp(l.principalAmountIdr) },
                  { key: 'paid', header: 'Dibayar', className: 'num', render: l => rp(l.paidAmountIdr) },
                  { key: 'remaining', header: 'Sisa', className: 'num', render: l => rp(l.remainingAmountIdr) },
                ]}
              />
            </div>
          )}
        </section>
      </div>
    </>
  )
}
