'use client'

import { useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Stamp from '@/components/ui/Stamp'
import Drawer from '@/components/ui/Drawer'
import FilterBar from '@/components/ui/FilterBar'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import EmptyState from '@/components/ui/EmptyState'
import { Field, FieldRow, Select, Input } from '@/components/ui/Field'
import AmountInput from '@/components/ui/AmountInput'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useKoperasiStore, useLoans, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { rp, fmtDate } from '@/lib/format'
import { apiClient } from '@/lib/api-client'
import type { Loan, LoanStatus } from '@/lib/types'

const emptyLoan: Loan = {
  id: '',
  principalAmountIdr: 0,
  paidAmountIdr: 0,
  remainingAmountIdr: 0,
  loanDate: '2026-06-13',
  status: 'active',
  cashSource: { id: '', name: '', isActive: true },
  payments: [],
}

export default function LoansPage() {
  const { dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const { loans, cashSources, members } = useLoans()
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Loan | null>(null)
  const [loanDrawer, setLoanDrawer] = useState(false)
  const [draft, setDraft] = useState<Loan>(emptyLoan)
  const [payAmount, setPayAmount] = useState(0)
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState('2026-06-13')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() =>
    loans.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (sourceFilter !== 'all' && l.cashSource.id !== sourceFilter) return false
      if (search && !`${l.member?.name ?? ''} ${l.counterpartyName ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
    [loans, statusFilter, sourceFilter, search]
  )

  const activeTotal = loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remainingAmountIdr, 0)
  const repaidTotal = loans.reduce((s, l) => s + l.paidAmountIdr, 0)
  const settledCount = loans.filter(l => l.status === 'paid').length
  const activeCount = loans.filter(l => l.status === 'active').length
  const filteredRemaining = filtered.reduce((s, l) => s + l.remainingAmountIdr, 0)

  const stampVariant = (s: LoanStatus) => s === 'active' ? 'active' : s === 'paid' ? 'paid' : 'danger'
  const statusLabel = (s: LoanStatus) => s === 'active' ? 'Aktif' : s === 'paid' ? 'Lunas' : 'Dibatalkan'
  const paidPercent = (loan: Loan) => loan.principalAmountIdr > 0 ? Math.min(100, Math.round((loan.paidAmountIdr / loan.principalAmountIdr) * 100)) : 0

  function openPayment(loan: Loan) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat pinjaman.', 'info')
      return
    }
    setSelected(loan)
    setPayAmount(0)
    setPayNote('')
    setPayDate('2026-06-13')
    setError('')
  }

  function openNew() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat pinjaman.', 'info')
      return
    }
    setDraft({ ...emptyLoan, id: makeId('l'), cashSource: cashSources[0], remainingAmountIdr: 0 })
    setError('')
    setLoanDrawer(true)
  }

  function openEdit(loan: Loan) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat pinjaman.', 'info')
      return
    }
    setDraft(loan)
    setError('')
    setLoanDrawer(true)
  }

  async function saveLoan() {
    if (!draft.cashSource?.id || draft.principalAmountIdr <= 0 || (!draft.member && !draft.counterpartyName?.trim())) {
      setError('Anggota/nama peminjam, sumber kas, dan pokok pinjaman wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const exists = loans.some(l => l.id === draft.id)
      const payload = {
        id: draft.id,
        memberId: draft.member?.id,
        counterpartyName: draft.member ? undefined : draft.counterpartyName,
        cashSourceId: draft.cashSource.id,
        principalAmountIdr: draft.principalAmountIdr,
        paidAmountIdr: draft.paidAmountIdr,
        loanDate: draft.loanDate,
        status: draft.status,
        note: draft.note,
      }
      const loan = exists
        ? await apiClient.updateLoan(draft.id, payload)
        : await apiClient.createLoan(payload)
      dispatch({ type: 'loan.upsert', loan })
      setLoanDrawer(false)
      notify('Pinjaman tersimpan ke PostgreSQL.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan pinjaman.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function addPayment() {
    if (!selected) return
    if (payAmount <= 0) {
      setError('Jumlah pembayaran wajib lebih dari 0.')
      return
    }
    if (payAmount > selected.remainingAmountIdr) {
      setError('Jumlah pembayaran tidak boleh melebihi sisa pinjaman.')
      return
    }

    setSaving(true)
    try {
      const loan = await apiClient.createLoanPayment(selected.id, {
        id: makeId('lp'),
        paymentDate: payDate,
        amountIdr: payAmount,
        note: payNote || undefined,
      })
      dispatch({ type: 'loan.upsert', loan })
      setSelected(null)
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
  }

  async function deleteLoan() {
    if (!draft.id) return
    setSaving(true)
    try {
      await apiClient.deleteLoan(draft.id)
      dispatch({ type: 'loan.delete', id: draft.id })
      setConfirmDelete(false)
      setLoanDrawer(false)
      notify('Pinjaman dihapus dari PostgreSQL.', 'info')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus pinjaman.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Pinjaman Anggota"
        title="Pinjaman"
        actions={<button className="btn loan-header-action" onClick={openNew} disabled={!permissions.canMutateLedger}>+ Pinjaman baru</button>}
      />

      <section className="loan-hero" aria-label="Ringkasan pinjaman">
        <div className="loan-hero-main">
          <p className="eyebrow">Sisa pinjaman aktif</p>
          <strong>{rp(activeTotal)}</strong>
          <span>{activeCount} pinjaman aktif, {settledCount} sudah lunas</span>
        </div>
        <div className="loan-hero-stats">
          <div>
            <p className="eyebrow">Terbayar</p>
            <strong>{rp(repaidTotal)}</strong>
          </div>
          <div>
            <p className="eyebrow">Filter aktif</p>
            <strong>{rp(filteredRemaining)}</strong>
          </div>
        </div>
        <button className="btn loan-quick-action" onClick={openNew} disabled={!permissions.canMutateLedger}>Pinjaman baru</button>
      </section>

      <FilterBar>
        <Field label="Status">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LoanStatus | 'all')}>
            <option value="all">Semua</option>
            <option value="active">Aktif</option>
            <option value="paid">Lunas</option>
            <option value="cancelled">Dibatalkan</option>
          </Select>
        </Field>
        <Field label="Sumber Kas">
          <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="all">Semua</option>
            {cashSources.map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
          </Select>
        </Field>
        <Field label="Cari anggota" className="min-w-[220px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama anggota" />
        </Field>
      </FilterBar>

      <div className="loan-desktop-table">
        <ResponsiveLedger
          rows={filtered}
          getKey={loan => loan.id}
          onRowClick={permissions.canMutateLedger ? openPayment : undefined}
          empty={<EmptyState title="Belum ada pinjaman" message="Tambahkan pinjaman baru untuk mulai memantau angsuran." action={permissions.canMutateLedger ? <button className="btn" onClick={openNew}>Pinjaman baru</button> : undefined} />}
          cardTitle={loan => loan.member?.name ?? loan.counterpartyName ?? '-'}
          cardMeta={loan => `${loan.cashSource.name} - ${fmtDate(loan.loanDate)}`}
          cardAmount={loan => <span className={loan.remainingAmountIdr > 0 ? 'text-margin' : ''}>{rp(loan.remainingAmountIdr)}</span>}
          columns={[
            { key: 'member', header: 'Anggota', render: loan => <span className="font-medium">{loan.member?.name ?? loan.counterpartyName ?? '-'}</span> },
            { key: 'source', header: 'Sumber', render: loan => <span className="text-ink-soft">{loan.cashSource.name}</span> },
            { key: 'principal', header: 'Pokok', className: 'num', render: loan => rp(loan.principalAmountIdr) },
            { key: 'paid', header: 'Dibayar', className: 'num', render: loan => rp(loan.paidAmountIdr) },
            { key: 'remaining', header: 'Sisa', className: 'num', render: loan => <span className={loan.remainingAmountIdr > 0 ? 'amt-out' : ''}>{rp(loan.remainingAmountIdr)}</span> },
            { key: 'status', header: 'Status', render: loan => <Stamp variant={stampVariant(loan.status)}>{statusLabel(loan.status)}</Stamp> },
          ]}
        />
      </div>

      <div className="loan-mobile-list">
        {filtered.length === 0 && <EmptyState title="Belum ada pinjaman" message="Tambahkan pinjaman baru untuk mulai memantau angsuran." action={permissions.canMutateLedger ? <button className="btn" onClick={openNew}>Pinjaman baru</button> : undefined} />}
        {filtered.map(loan => {
          const progress = paidPercent(loan)
          return (
            <article key={loan.id} className={`loan-card ${loan.status}`}>
              <div className="loan-card-head">
                <div>
                  <span>{fmtDate(loan.loanDate)} - {loan.cashSource.name}</span>
                  <h2>{loan.member?.name ?? loan.counterpartyName ?? '-'}</h2>
                </div>
                <Stamp variant={stampVariant(loan.status)}>{statusLabel(loan.status)}</Stamp>
              </div>

              <div className="loan-card-amount">
                <div>
                  <p>Sisa pinjaman</p>
                  <strong>{rp(loan.remainingAmountIdr)}</strong>
                </div>
                <small>{progress}% terbayar</small>
              </div>

              <div className="loan-progress" aria-label={`Progress pembayaran ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="loan-card-grid">
                <div><span>Pokok</span><strong>{rp(loan.principalAmountIdr)}</strong></div>
                <div><span>Dibayar</span><strong>{rp(loan.paidAmountIdr)}</strong></div>
              </div>

              <div className="loan-card-actions">
                <button className="btn" type="button" onClick={() => openPayment(loan)} disabled={loan.status !== 'active' || !permissions.canMutateLedger}>
                  Angsur
                </button>
                <button className="btn btn-outline" type="button" onClick={() => openEdit(loan)} disabled={!permissions.canMutateLedger}>
                  Edit
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        eyebrow={selected ? `${selected.cashSource.name} - ${fmtDate(selected.loanDate)}` : ''}
        title={selected?.member?.name ?? selected?.counterpartyName ?? ''}
      >
        {selected && (
          <div className="loan-payment-panel">
            {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}

            <div className="loan-drawer-summary">
              <div>
                <p className="eyebrow">Sisa</p>
                <strong className={selected.remainingAmountIdr > 0 ? 'text-margin' : ''}>{rp(selected.remainingAmountIdr)}</strong>
                <span>{paidPercent(selected)}% dari pokok sudah terbayar</span>
              </div>
              <div className="loan-progress">
                <span style={{ width: `${paidPercent(selected)}%` }} />
              </div>
            </div>

            <div className="loan-mini-stats">
              <div><span>Pokok</span><strong>{rp(selected.principalAmountIdr)}</strong></div>
              <div><span>Dibayar</span><strong>{rp(selected.paidAmountIdr)}</strong></div>
              <div><span>Status</span><strong>{statusLabel(selected.status)}</strong></div>
            </div>

            <div className="ledger-wrap loan-payment-table">
              <table className="ledger">
                <thead><tr><th>Tanggal</th><th className="num">Jumlah</th><th>Catatan</th></tr></thead>
                <tbody>
                  {selected.payments.length === 0 && <tr><td colSpan={3} className="text-center text-ink-soft py-5">Belum ada pembayaran</td></tr>}
                  {selected.payments.map(p => (
                    <tr key={p.id}><td className="mono">{fmtDate(p.paymentDate)}</td><td className="num">{rp(p.amountIdr)}</td><td>{p.note ?? '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected.status === 'active' && (
              <>
                <p className="eyebrow">Catat pembayaran</p>
                <FieldRow>
                  <Field label="Tanggal" className="flex-1"><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} disabled={!permissions.canMutateLedger} /></Field>
                  <Field label="Jumlah" className="flex-1"><AmountInput value={payAmount} onChange={setPayAmount} className="loan-amount" disabled={!permissions.canMutateLedger} /></Field>
                </FieldRow>
                <Field label="Catatan"><Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Contoh: Angsuran ketiga" disabled={!permissions.canMutateLedger} /></Field>
                <div className="loan-payment-actions">
                  <button className="btn btn-outline" type="button" onClick={() => setPayAmount(selected.remainingAmountIdr)} disabled={!permissions.canMutateLedger}>
                    Lunasi sisa
                  </button>
                  <button className="btn" onClick={addPayment} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan pembayaran'}</button>
                </div>
              </>
            )}
            <button className="btn btn-outline" onClick={() => { openEdit(selected); setSelected(null) }} disabled={!permissions.canMutateLedger}>Edit pinjaman</button>
          </div>
        )}
      </Drawer>

      <Drawer
        isOpen={loanDrawer}
        onClose={() => setLoanDrawer(false)}
        eyebrow={draft.id && loans.some(l => l.id === draft.id) ? 'Edit pinjaman' : 'Pinjaman baru'}
        title={draft.member?.name ?? draft.counterpartyName ?? 'Form pinjaman'}
      >
        <div className="loan-form">
          {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}
          <Field label="Anggota">
            <Select value={draft.member?.id ?? ''} onChange={e => {
              const member = members.find(m => m.id === e.target.value)
              setDraft({ ...draft, member, counterpartyName: member?.name })
            }}>
              <option value="">Pilih anggota</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Nama peminjam non-anggota">
            <Input value={!draft.member ? draft.counterpartyName ?? '' : ''} disabled={!!draft.member} onChange={e => setDraft({ ...draft, counterpartyName: e.target.value })} />
          </Field>
          <FieldRow>
            <Field label="Tanggal" className="flex-1"><Input type="date" value={draft.loanDate} onChange={e => setDraft({ ...draft, loanDate: e.target.value })} /></Field>
            <Field label="Sumber Kas" className="flex-1">
              <Select value={draft.cashSource?.id ?? ''} onChange={e => setDraft({ ...draft, cashSource: cashSources.find(cs => cs.id === e.target.value) ?? draft.cashSource })}>
                {cashSources.map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
              </Select>
            </Field>
          </FieldRow>
          <Field label="Pokok pinjaman">
            <AmountInput value={draft.principalAmountIdr} onChange={principalAmountIdr => setDraft({ ...draft, principalAmountIdr, remainingAmountIdr: Math.max(principalAmountIdr - draft.paidAmountIdr, 0) })} className="loan-amount" />
          </Field>
          <Field label="Catatan">
            <Input value={draft.note ?? ''} onChange={e => setDraft({ ...draft, note: e.target.value })} />
          </Field>
          <div className="loan-form-actions">
            <button className="btn" onClick={saveLoan} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan pinjaman'}</button>
            <button className="btn btn-outline" onClick={() => setLoanDrawer(false)} disabled={saving}>Batal</button>
            {loans.some(l => l.id === draft.id) && <button className="btn btn-danger-outline ml-auto" onClick={() => setConfirmDelete(true)} disabled={saving || !permissions.canMutateLedger}>Hapus</button>}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus pinjaman?"
        message="Pinjaman dan riwayat pembayarannya akan dihapus dari PostgreSQL."
        danger
        confirmLabel="Hapus"
        onConfirm={deleteLoan}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
