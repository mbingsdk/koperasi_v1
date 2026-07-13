'use client'

import Link from 'next/link'
import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Drawer from '@/components/ui/Drawer'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { Field, Input, Select } from '@/components/ui/Field'
import AmountInput from '@/components/ui/AmountInput'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { rp, fmtDate } from '@/lib/format'
import { apiClient } from '@/lib/api-client'
import type { ContributionRate, EmployeeType } from '@/lib/types'

export default function ContributionRatesPage() {
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ContributionRate | null>(null)
  const [saving, setSaving] = useState(false)

  function openNew() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat tarif iuran.', 'info')
      return
    }
    setEditing({ id: makeId('cr'), fund: state.funds[0], employeeType: 'Bulanan', amountIdr: 0, effectiveFrom: '2026-06-01' })
    setDrawerOpen(true)
  }

  async function save() {
    if (!permissions.canMutateLedger) return
    if (!editing?.fund?.id || editing.amountIdr <= 0 || !editing.effectiveFrom) return
    setSaving(true)
    try {
      const exists = state.contributionRates.some(rate => rate.id === editing.id)
      const payload = {
        id: editing.id,
        fundId: editing.fund.id,
        employeeType: editing.employeeType,
        amountIdr: editing.amountIdr,
        effectiveFrom: editing.effectiveFrom,
        effectiveTo: editing.effectiveTo,
      }
      const rate = exists
        ? await apiClient.updateContributionRate(editing.id, payload)
        : await apiClient.createContributionRate(payload)
      dispatch({ type: 'contribution_rate.upsert', rate })
      setDrawerOpen(false)
      notify('Tarif iuran tersimpan ke PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan tarif iuran.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Pengaturan - Tarif Iuran" title="Tarif Iuran" actions={<><Link href="/settings" className="btn btn-outline">&lt;- Pengaturan</Link><button className="btn" onClick={openNew} disabled={!permissions.canMutateLedger}>+ Tambah tarif</button></>} />
      <ResponsiveLedger
        rows={state.contributionRates}
        getKey={cr => cr.id}
        onRowClick={permissions.canMutateLedger ? cr => { setEditing(cr); setDrawerOpen(true) } : undefined}
        cardTitle={cr => `${cr.fund.name} - ${cr.employeeType}`}
        cardAmount={cr => rp(cr.amountIdr)}
        columns={[
          { key: 'fund', header: 'Dana', render: cr => <span className="font-medium">{cr.fund.name}</span> },
          { key: 'type', header: 'Tipe Karyawan', render: cr => cr.employeeType },
          { key: 'amount', header: 'Jumlah / Bulan', className: 'num', render: cr => rp(cr.amountIdr) },
          { key: 'from', header: 'Berlaku Dari', render: cr => <span className="mono text-ink-soft">{fmtDate(cr.effectiveFrom)}</span> },
          { key: 'to', header: 'Berlaku Sampai', render: cr => <span className="mono text-ink-soft">{cr.effectiveTo ? fmtDate(cr.effectiveTo) : '-'}</span> },
        ]}
      />
      <p className="text-[12px] text-ink-soft mt-4">Tarif dipakai untuk mengisi nominal awal di halaman Iuran.</p>
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} eyebrow="Tarif iuran" title={editing ? `${editing.fund.name} - ${editing.employeeType}` : 'Tambah tarif'}>
        {editing && <div className="flex flex-col gap-4">
          <Field label="Dana"><Select value={editing.fund.id} onChange={e => setEditing({ ...editing, fund: state.funds.find(f => f.id === e.target.value) ?? editing.fund })} disabled={!permissions.canMutateLedger}>{state.funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
          <Field label="Tipe karyawan"><Select value={editing.employeeType} onChange={e => setEditing({ ...editing, employeeType: e.target.value as EmployeeType })} disabled={!permissions.canMutateLedger}><option>Bulanan</option><option>Harian</option><option>Mixed</option><option>Unknown</option></Select></Field>
          <Field label="Jumlah"><AmountInput value={editing.amountIdr} onChange={amountIdr => setEditing({ ...editing, amountIdr })} disabled={!permissions.canMutateLedger} /></Field>
          <Field label="Berlaku dari"><Input type="date" value={editing.effectiveFrom} onChange={e => setEditing({ ...editing, effectiveFrom: e.target.value })} disabled={!permissions.canMutateLedger} /></Field>
          <Field label="Berlaku sampai"><Input type="date" value={editing.effectiveTo ?? ''} onChange={e => setEditing({ ...editing, effectiveTo: e.target.value || undefined })} disabled={!permissions.canMutateLedger} /></Field>
          <div className="flex gap-3"><button className="btn" onClick={save} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan'}</button><button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button></div>
        </div>}
      </Drawer>
    </>
  )
}
