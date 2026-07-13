'use client'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Stamp from '@/components/ui/Stamp'
import { Field, FieldRow, Input } from '@/components/ui/Field'
import AmountInput from '@/components/ui/AmountInput'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { rp, fmtDate } from '@/lib/format'
import { apiClient } from '@/lib/api-client'

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const loan = state.loans.find(l => l.id === id) ?? state.loans[0]
  const [payAmount, setPayAmount] = useState(0)
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState('2026-06-13')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const pct = loan.principalAmountIdr > 0
    ? Math.round((loan.paidAmountIdr / loan.principalAmountIdr) * 100)
    : 0

  return (
    <>
      <PageHeader
        eyebrow={`${loan.cashSource.name} - ${fmtDate(loan.loanDate)}`}
        title={loan.member?.name ?? loan.counterpartyName ?? 'Detail Pinjaman'}
        actions={
          <>
            <Link href="/loans" className="btn btn-outline">&lt;- Semua pinjaman</Link>
            <button className="btn" disabled={!permissions.canMutateLedger}>Edit pinjaman</button>
          </>
        }
      />

      <Stamp variant={loan.status === 'active' ? 'active' : loan.status === 'paid' ? 'paid' : 'danger'}>
        {loan.status === 'active' ? 'Aktif' : loan.status === 'paid' ? 'Lunas' : 'Dibatalkan'}
      </Stamp>

      {/* KPI strip */}
      <div className="summary-row my-6" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="summary-cell"><div className="s-label">Pokok</div><div className="s-value">{rp(loan.principalAmountIdr)}</div></div>
        <div className="summary-cell"><div className="s-label">Dibayar</div><div className="s-value">{rp(loan.paidAmountIdr)}</div></div>
        <div className="summary-cell"><div className="s-label">Sisa</div><div className={`s-value ${loan.remainingAmountIdr > 0 ? 'neg' : ''}`}>{rp(loan.remainingAmountIdr)}</div></div>
        <div className="summary-cell"><div className="s-label">Progress</div><div className="s-value">{pct}%</div></div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-ledger-pale mb-8 rounded-sm overflow-hidden">
        <div className="h-full bg-ledger-deep transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Payment history */}
        <div className="panel">
          <div className="panel-head"><h2>Riwayat Pembayaran</h2></div>
          <div className="ledger-wrap border-0">
            <table className="ledger">
              <thead><tr><th>Tanggal</th><th className="num">Jumlah</th><th>Catatan</th><th></th></tr></thead>
              <tbody>
                {loan.payments.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-ink-soft py-8">Belum ada pembayaran</td></tr>
                )}
                {loan.payments.map(p => (
                  <tr key={p.id}>
                    <td className="mono">{fmtDate(p.paymentDate)}</td>
                    <td className="num">{rp(p.amountIdr)}</td>
                    <td className="text-ink-soft">{p.note ?? '—'}</td>
                    <td>
                      <button className="text-[11px] text-margin font-bold uppercase tracking-wider hover:underline disabled:opacity-40" disabled={!permissions.canMutateLedger}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record payment */}
        {loan.status === 'active' && (
          <div className="panel panel-body">
            <p className="eyebrow mb-4">Catat pembayaran</p>
            <div className="flex flex-col gap-4">
              {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}
              <Field label="Tanggal">
                <Input type="date" className="font-mono" value={payDate} onChange={e => setPayDate(e.target.value)} disabled={!permissions.canMutateLedger} />
              </Field>
              <Field label="Jumlah">
                <AmountInput value={payAmount} onChange={setPayAmount} disabled={!permissions.canMutateLedger} />
              </Field>
              <Field label="Catatan">
                <Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Contoh: Angsuran ketiga" disabled={!permissions.canMutateLedger} />
              </Field>
              <button
                className="btn"
                disabled={saving || !permissions.canMutateLedger}
                onClick={async () => {
                  if (!permissions.canMutateLedger) return
                  if (payAmount <= 0 || payAmount > loan.remainingAmountIdr) {
                    setError('Jumlah pembayaran wajib positif dan tidak boleh melebihi sisa pinjaman.')
                    return
                  }
                  setSaving(true)
                  try {
                    const updated = await apiClient.createLoanPayment(loan.id, {
                      id: makeId('lp'),
                      paymentDate: payDate,
                      amountIdr: payAmount,
                      note: payNote || undefined,
                    })
                    dispatch({ type: 'loan.upsert', loan: updated })
                    setPayAmount(0)
                    setPayNote('')
                    setError('')
                    notify('Pembayaran pinjaman tercatat ke PostgreSQL.')
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Gagal mencatat pembayaran.'
                    setError(message)
                    notify(message, 'error')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan pembayaran'}
              </button>
            </div>
          </div>
        )}

        {/* Loan metadata */}
        <div className="panel panel-body">
          <p className="eyebrow mb-3">Detail pinjaman</p>
          <div className="flex flex-col gap-3 text-[13px]">
            <div><p className="eyebrow">Sumber kas</p><p>{loan.cashSource.name}</p></div>
            <div><p className="eyebrow">Tanggal pinjaman</p><p className="mono">{fmtDate(loan.loanDate)}</p></div>
            <div><p className="eyebrow">Catatan</p><p className="text-ink-soft">{loan.note ?? '—'}</p></div>
            {loan.payments.length > 0 && (
              <div>
                <p className="eyebrow">Tanda angsuran</p>
                <div className="flex gap-0.5 mt-1">
                  {loan.payments.map((_, i) => (
                    <span key={i} className="block w-0.5 h-4 bg-ledger-deep" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
