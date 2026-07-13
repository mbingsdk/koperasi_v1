'use client'

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Drawer from '@/components/ui/Drawer'
import FilterBar from '@/components/ui/FilterBar'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import EmptyState from '@/components/ui/EmptyState'
import { Field, FieldRow, Select, Input } from '@/components/ui/Field'
import AmountInput from '@/components/ui/AmountInput'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useCashLedger, useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { rp, fmtDate } from '@/lib/format'
import { apiClient } from '@/lib/api-client'
import type { CashTransaction, TransactionDirection } from '@/lib/types'

const CATEGORIES = [
  'Pengeluaran Koperasi', 'Dana Hibah', 'Dana Serikat',
  'Penarikan Anggota', 'Pencairan Pinjaman', 'Angsuran Pinjaman',
  'Koreksi Saldo', 'Lainnya',
]

const emptyTx: CashTransaction = {
  id: '',
  transactionDate: '2026-06-13',
  direction: 'outflow',
  category: 'Pengeluaran Koperasi',
  amountIdr: 0,
  note: '',
  createdAt: '',
}

export default function CashPage() {
  const { dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const { transactions, funds, members } = useCashLedger()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState<CashTransaction>(emptyTx)
  const [filterFund, setFilterFund] = useState('all')
  const [filterDir, setFilterDir] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const arah = new URLSearchParams(window.location.search).get('arah')
    if (permissions.canMutateLedger && (arah === 'masuk' || arah === 'keluar')) openNew(arah === 'masuk' ? 'inflow' : 'outflow')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.canMutateLedger])

  const filtered = useMemo(() => transactions.filter(tx => {
    if (filterFund !== 'all' && tx.fund?.id !== filterFund) return false
    if (filterDir !== 'all' && tx.direction !== filterDir) return false
    if (filterCat !== 'all' && tx.category !== filterCat) return false
    if (search) {
      const query = search.toLowerCase()
      const haystack = [
        tx.note,
        tx.category,
        tx.fund?.name,
        tx.member?.name,
        tx.counterpartyName,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  }), [transactions, filterFund, filterDir, filterCat, search])

  const summary = useMemo(() => {
    const inflow = transactions.filter(tx => tx.direction === 'inflow').reduce((sum, tx) => sum + tx.amountIdr, 0)
    const outflow = transactions.filter(tx => tx.direction === 'outflow').reduce((sum, tx) => sum + tx.amountIdr, 0)
    const filteredInflow = filtered.filter(tx => tx.direction === 'inflow').reduce((sum, tx) => sum + tx.amountIdr, 0)
    const filteredOutflow = filtered.filter(tx => tx.direction === 'outflow').reduce((sum, tx) => sum + tx.amountIdr, 0)

    return {
      balance: transactions[0]?.balance ?? 37_055_000,
      inflow,
      outflow,
      net: inflow - outflow,
      filteredNet: filteredInflow - filteredOutflow,
    }
  }, [filtered, transactions])

  function openNew(direction: TransactionDirection) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat buku kas.', 'info')
      return
    }
    setDraft({
      ...emptyTx,
      id: makeId('ct'),
      direction,
      category: direction === 'inflow' ? 'Lainnya' : 'Pengeluaran Koperasi',
      fund: funds[0],
      createdAt: new Date().toISOString(),
    })
    setError('')
    setDrawerOpen(true)
  }

  function openEdit(tx: CashTransaction) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat buku kas.', 'info')
      return
    }
    setDraft(tx)
    setError('')
    setDrawerOpen(true)
  }

  async function saveTx() {
    if (!draft.transactionDate || !draft.fund || draft.amountIdr <= 0 || !draft.note?.trim()) {
      setError('Tanggal, dana, jumlah, dan catatan wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const exists = transactions.some(tx => tx.id === draft.id)
      const payload = {
        id: draft.id,
        transactionDate: draft.transactionDate,
        direction: draft.direction,
        fundId: draft.fund?.id,
        memberId: draft.member?.id,
        counterpartyName: draft.counterpartyName,
        category: draft.category,
        amountIdr: draft.amountIdr,
        note: draft.note,
      }
      const transaction = exists
        ? await apiClient.updateCashTransaction(draft.id, payload)
        : await apiClient.createCashTransaction(payload)
      dispatch({ type: 'cash.upsert', transaction })
      setDrawerOpen(false)
      notify('Transaksi kas tersimpan ke PostgreSQL.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan transaksi.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTx() {
    setSaving(true)
    try {
      await apiClient.deleteCashTransaction(draft.id)
      dispatch({ type: 'cash.delete', id: draft.id })
      setConfirmDelete(false)
      setDrawerOpen(false)
      notify('Transaksi dihapus dari PostgreSQL.', 'info')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus transaksi.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Buku Besar"
        title="Buku Kas"
        actions={
          <>
            <button className="btn btn-outline cash-header-action" onClick={() => openNew('inflow')} disabled={!permissions.canMutateLedger}>+ Pemasukan</button>
            <button className="btn btn-danger-outline cash-header-action" onClick={() => openNew('outflow')} disabled={!permissions.canMutateLedger}>+ Pengeluaran</button>
          </>
        }
      />

      <section className="cash-hero" aria-label="Ringkasan buku kas">
        <div className="cash-balance">
          <p className="eyebrow">Saldo kas berjalan</p>
          <strong>{rp(summary.balance)}</strong>
          <span>{summary.net >= 0 ? 'Surplus' : 'Defisit'} {rp(Math.abs(summary.net))} dari seluruh transaksi</span>
        </div>
        <div className="cash-hero-stats">
          <div>
            <p className="eyebrow">Masuk</p>
            <strong>{rp(summary.inflow)}</strong>
          </div>
          <div>
            <p className="eyebrow">Keluar</p>
            <strong className="text-margin">{rp(summary.outflow)}</strong>
          </div>
          <div>
            <p className="eyebrow">Filter aktif</p>
            <strong>{rp(Math.abs(summary.filteredNet))}</strong>
          </div>
        </div>
        <div className="cash-quick-actions">
          <button className="btn btn-outline" onClick={() => openNew('inflow')} disabled={!permissions.canMutateLedger}>Pemasukan</button>
          <button className="btn btn-danger-outline" onClick={() => openNew('outflow')} disabled={!permissions.canMutateLedger}>Pengeluaran</button>
        </div>
      </section>

      <FilterBar>
        <Field label="Dana">
          <Select value={filterFund} onChange={e => setFilterFund(e.target.value)}>
            <option value="all">Semua dana</option>
            {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </Field>
        <Field label="Arah">
          <Select value={filterDir} onChange={e => setFilterDir(e.target.value)}>
            <option value="all">Semua</option>
            <option value="inflow">Pemasukan</option>
            <option value="outflow">Pengeluaran</option>
          </Select>
        </Field>
        <Field label="Kategori">
          <Select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">Semua</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Cari" className="min-w-[220px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Catatan, anggota, dana" />
        </Field>
      </FilterBar>

      <div className="cash-desktop-table">
        <ResponsiveLedger
          rows={filtered}
          getKey={tx => tx.id}
          onRowClick={permissions.canMutateLedger ? openEdit : undefined}
          empty={<EmptyState title="Belum ada transaksi" message="Tambahkan pemasukan atau pengeluaran kas." />}
          cardTitle={tx => tx.note ?? '-'}
          cardMeta={tx => `${fmtDate(tx.transactionDate)} - ${tx.category}`}
          cardAmount={tx => <span className={tx.direction === 'outflow' ? 'text-margin' : ''}>{tx.direction === 'outflow' ? `(${rp(tx.amountIdr)})` : rp(tx.amountIdr)}</span>}
          columns={[
            { key: 'date', header: 'Tanggal', render: tx => <span className="mono">{fmtDate(tx.transactionDate)}</span> },
            { key: 'category', header: 'Kategori', render: tx => <span className="text-ink-soft text-[12px]">{tx.category}</span> },
            { key: 'note', header: 'Keterangan', render: tx => <>{tx.note}{tx.counterpartyName && <span className="cell-sub">{tx.counterpartyName}</span>}</> },
            { key: 'fund', header: 'Dana', render: tx => tx.fund?.name ?? '-' },
            { key: 'amount', header: 'Jumlah', className: 'num', render: tx => <span className={tx.direction === 'outflow' ? 'amt-out' : ''}>{tx.direction === 'outflow' ? `(${rp(tx.amountIdr)})` : rp(tx.amountIdr)}</span> },
            { key: 'balance', header: 'Saldo', className: 'num', render: tx => <span className="amt-bal">{rp(tx.balance)}</span> },
          ]}
        />
      </div>

      <div className="cash-mobile-list">
        {filtered.length === 0 && <EmptyState title="Belum ada transaksi" message="Tambahkan pemasukan atau pengeluaran kas." />}
        {filtered.map(tx => (
          <button key={tx.id} type="button" className={`cash-card ${tx.direction}`} onClick={() => openEdit(tx)} disabled={!permissions.canMutateLedger}>
            <span className="cash-card-top">
              <span>
                <span className="cash-card-date">{fmtDate(tx.transactionDate)}</span>
                <strong>{tx.note || tx.category}</strong>
                <small>{tx.category} - {tx.fund?.name ?? 'Tanpa dana'}</small>
              </span>
              <span className="cash-direction">{tx.direction === 'inflow' ? 'Masuk' : 'Keluar'}</span>
            </span>
            <span className="cash-card-money">
              <strong>{tx.direction === 'outflow' ? `-${rp(tx.amountIdr)}` : rp(tx.amountIdr)}</strong>
              <small>Saldo {rp(tx.balance)}</small>
            </span>
            {tx.counterpartyName && <span className="cash-card-person">{tx.counterpartyName}</span>}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-ink-soft mt-3">Menampilkan {filtered.length} dari {transactions.length} transaksi</p>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eyebrow={draft.direction === 'inflow' ? 'Transaksi Pemasukan' : 'Transaksi Pengeluaran'}
        title={draft.note || (draft.direction === 'inflow' ? 'Catat Pemasukan' : 'Catat Pengeluaran')}
      >
        <div className="cash-form">
          {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}
          <FieldRow>
            <Field label="Tanggal" className="flex-1">
              <Input type="date" value={draft.transactionDate} onChange={e => setDraft({ ...draft, transactionDate: e.target.value })} />
            </Field>
            <Field label="Arah" className="flex-1">
              <Select value={draft.direction} onChange={e => setDraft({ ...draft, direction: e.target.value as TransactionDirection })}>
                <option value="inflow">Pemasukan</option>
                <option value="outflow">Pengeluaran</option>
              </Select>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Dana" className="flex-1">
              <Select value={draft.fund?.id ?? ''} onChange={e => setDraft({ ...draft, fund: funds.find(f => f.id === e.target.value) })}>
                <option value="">Pilih dana</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Field label="Kategori" className="flex-1">
              <Select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </FieldRow>
          <Field label="Anggota terkait">
            <Select value={draft.member?.id ?? ''} onChange={e => {
              const member = members.find(m => m.id === e.target.value)
              setDraft({ ...draft, member, counterpartyName: member?.name ?? draft.counterpartyName })
            }}>
              <option value="">Tidak terkait anggota</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Jumlah">
            <AmountInput value={draft.amountIdr} onChange={amountIdr => setDraft({ ...draft, amountIdr })} className="cash-amount" />
          </Field>
          <Field label="Catatan">
            <Input value={draft.note ?? ''} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="Keterangan singkat" />
          </Field>
          <div className="cash-form-actions">
            <button className="btn" onClick={saveTx} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan transaksi'}</button>
            <button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button>
            {transactions.some(tx => tx.id === draft.id) && <button className="btn btn-danger-outline ml-auto" onClick={() => setConfirmDelete(true)} disabled={saving || !permissions.canMutateLedger}>Hapus</button>}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus transaksi?"
        message="Transaksi akan dihapus dari PostgreSQL dan saldo akan dihitung ulang."
        danger
        confirmLabel="Hapus"
        onConfirm={deleteTx}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
