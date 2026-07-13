'use client'

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { FolderTabs } from '@/components/ui/FolderTabs'
import FilterBar from '@/components/ui/FilterBar'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { Field, Select, Input } from '@/components/ui/Field'
import AmountInput from '@/components/ui/AmountInput'
import { useDues, useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { rp } from '@/lib/format'
import { apiClient } from '@/lib/api-client'
import type { MemberContribution } from '@/lib/types'

type DraftRow = { memberId: string; memberName: string; dept: string; type: string; amount: number; note: string; contributionId: string }

function monthOptions() {
  return [
    { label: 'Juni 2026', value: '2026-06-01' },
    { label: 'Mei 2026', value: '2026-05-01' },
    { label: 'April 2026', value: '2026-04-01' },
  ]
}

export default function DuesPage() {
  const { dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const { dues, funds, departments, members, rates } = useDues()
  const [fund, setFund] = useState(funds[0]?.id ?? 'f1')
  const [period, setPeriod] = useState('2026-06-01')
  const [dept, setDept] = useState('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [saving, setSaving] = useState(false)

  const selectedFund = useMemo(() => funds.find(f => f.id === fund) ?? funds[0], [funds, fund])

  useEffect(() => {
    setRows(members.map(member => {
      const existing = dues.find(d => d.member.id === member.id && d.fund.id === selectedFund?.id && d.periodMonth === period)
      return {
        memberId: member.id,
        memberName: member.name,
        dept: member.department?.name ?? '-',
        type: member.employeeType,
        amount: existing?.amountIdr ?? 0,
        note: existing?.note ?? '',
        contributionId: existing?.id ?? makeId('mc'),
      }
    }))
  }, [dues, makeId, members, period, selectedFund?.id])

  const filtered = useMemo(() =>
    rows.filter(r =>
      (dept === 'all' || r.dept === dept) &&
      (!search || r.memberName.toLowerCase().includes(search.toLowerCase()))
    ),
    [rows, dept, search]
  )

  function setAmount(memberId: string, amount: number) {
    if (!permissions.canMutateLedger) return
    setRows(prev => prev.map(r => r.memberId === memberId ? { ...r, amount } : r))
  }

  function setNote(memberId: string, note: string) {
    if (!permissions.canMutateLedger) return
    setRows(prev => prev.map(r => r.memberId === memberId ? { ...r, note } : r))
  }

  function defaultAmountFor(row: DraftRow) {
    const rate = rates.find(item => item.fund.id === selectedFund?.id && item.employeeType === row.type)
    return rate?.amountIdr ?? (row.type === 'Harian' ? 30000 : 50000)
  }

  function applyDefault(memberId: string) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat iuran.', 'info')
      return
    }
    setRows(prev => prev.map(r => r.memberId === memberId ? { ...r, amount: defaultAmountFor(r) } : r))
  }

  function fillDefault() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat iuran.', 'info')
      return
    }
    setRows(prev => prev.map(r => {
      if (r.amount > 0) return r
      return { ...r, amount: defaultAmountFor(r) }
    }))
  }

  async function saveAll() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat iuran.', 'info')
      return
    }
    if (!selectedFund) {
      notify('Dana belum tersedia. Tambahkan dana aktif dulu di Pengaturan.', 'error')
      return
    }

    setSaving(true)
    try {
      const untouched = dues.filter(d => !(d.fund.id === selectedFund?.id && d.periodMonth === period))
      const saved = await apiClient.upsertDuesBatch({
        dues: rows.map(row => ({
          id: row.contributionId,
          memberId: row.memberId,
          fundId: selectedFund.id,
          periodMonth: period,
          amountIdr: row.amount,
          note: row.note || undefined,
        })),
      })
      dispatch({ type: 'dues.upsertMany', dues: [...untouched, ...saved] as MemberContribution[] })
      notify('Iuran tersimpan ke PostgreSQL dan ringkasan diperbarui.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan iuran.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const paidCount = rows.filter(r => r.amount > 0).length
  const unpaidCount = rows.length - paidCount
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const visibleTotal = filtered.reduce((s, r) => s + r.amount, 0)
  const completion = rows.length > 0 ? Math.round((paidCount / rows.length) * 100) : 0

  return (
    <>
      <PageHeader
        eyebrow="Setoran Bulanan"
        title="Iuran"
        actions={
          <select className="field-input font-mono" value={period} onChange={e => setPeriod(e.target.value)}>
            {monthOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        }
      />

      <FolderTabs
        tabs={funds.map(f => ({ key: f.id, label: f.name }))}
        active={fund}
        onChange={setFund}
      />

      <section className="dues-hero" aria-label="Ringkasan iuran">
        <div>
          <p className="eyebrow">Progress periode</p>
          <div className="dues-progress">
            <span style={{ width: `${completion}%` }} />
          </div>
          <p className="dues-progress-copy">{completion}% anggota sudah punya nominal tercatat</p>
        </div>
        <div className="dues-stats">
          <div>
            <p className="eyebrow">Tercatat</p>
            <strong>{paidCount} / {rows.length}</strong>
          </div>
          <div>
            <p className="eyebrow">Belum bayar</p>
            <strong>{unpaidCount}</strong>
          </div>
          <div>
            <p className="eyebrow">Total periode</p>
            <strong>{rp(total)}</strong>
          </div>
        </div>
      </section>

      <FilterBar>
        <Field label="Departemen">
          <Select value={dept} onChange={e => setDept(e.target.value)}>
            <option value="all">Semua</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Cari" className="min-w-[220px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari anggota" />
        </Field>
      </FilterBar>

      <div className="dues-desktop-table">
        <ResponsiveLedger
          rows={filtered}
          getKey={row => row.memberId}
          cardTitle={row => row.memberName}
          cardMeta={row => `${row.dept} - ${row.type}`}
          cardAmount={row => rp(row.amount)}
          columns={[
            { key: 'member', header: 'Anggota', render: row => <span className="font-medium">{row.memberName}</span> },
            { key: 'dept', header: 'Departemen', render: row => row.dept },
            { key: 'type', header: 'Tipe', render: row => row.type },
            { key: 'amount', header: 'Jumlah', className: 'num', render: row => <AmountInput value={row.amount} onChange={v => setAmount(row.memberId, v)} disabled={!permissions.canMutateLedger} /> },
            { key: 'note', header: 'Catatan', render: row => <input value={row.note} onChange={e => setNote(row.memberId, e.target.value)} placeholder="-" className="field-input w-full text-[12.5px]" disabled={!permissions.canMutateLedger} /> },
          ]}
        />
      </div>

      <div className="dues-mobile-list">
        {filtered.map(row => (
          <article key={row.memberId} className={`dues-card ${row.amount > 0 ? 'paid' : 'unpaid'}`}>
            <div className="dues-card-head">
              <div>
                <h2>{row.memberName}</h2>
                <p>{row.dept} - {row.type}</p>
              </div>
              <span className="dues-status">{row.amount > 0 ? 'Tercatat' : 'Kosong'}</span>
            </div>

            <AmountInput
              value={row.amount}
              onChange={v => setAmount(row.memberId, v)}
              className="dues-amount"
              disabled={!permissions.canMutateLedger}
            />

            <input
              value={row.note}
              onChange={e => setNote(row.memberId, e.target.value)}
              placeholder="Catatan opsional"
              className="field-input w-full"
              disabled={!permissions.canMutateLedger}
            />

            <div className="dues-card-actions">
              <button className="btn btn-outline" type="button" onClick={() => applyDefault(row.memberId)} disabled={!permissions.canMutateLedger}>
                Pakai tarif
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setAmount(row.memberId, 0)} disabled={row.amount === 0 || !permissions.canMutateLedger}>
                Kosongkan
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="dues-savebar">
        <div>
          <span>Ditampilkan</span>
          <strong>{rp(visibleTotal)}</strong>
        </div>
        <div className="dues-savebar-actions">
          <button className="btn btn-outline" onClick={fillDefault} disabled={saving || !permissions.canMutateLedger}>Isi default</button>
          <button className="btn" onClick={saveAll} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan semua'}</button>
        </div>
      </div>
    </>
  )
}
