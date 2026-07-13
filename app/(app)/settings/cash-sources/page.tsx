'use client'

import Link from 'next/link'
import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Stamp from '@/components/ui/Stamp'
import Drawer from '@/components/ui/Drawer'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { Field, Input, Select } from '@/components/ui/Field'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api-client'
import type { CashSource } from '@/lib/types'

export default function CashSourcesPage() {
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CashSource | null>(null)
  const [saving, setSaving] = useState(false)

  function count(id: string) {
    return state.loans.filter(l => l.cashSource.id === id).length
  }

  function openNew() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat sumber kas.', 'info')
      return
    }
    setEditing({ id: makeId('cs'), name: '', isActive: true })
    setDrawerOpen(true)
  }

  async function save() {
    if (!permissions.canMutateLedger) return
    if (!editing?.name.trim()) return
    setSaving(true)
    try {
      const exists = state.cashSources.some(cs => cs.id === editing.id)
      const payload = { id: editing.id, name: editing.name, isActive: editing.isActive }
      const cashSource = exists
        ? await apiClient.updateCashSource(editing.id, payload)
        : await apiClient.createCashSource(payload)
      dispatch({ type: 'cash_source.upsert', cashSource })
      setDrawerOpen(false)
      notify('Sumber kas tersimpan ke PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan sumber kas.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Pengaturan - Sumber Kas" title="Sumber Kas" actions={<><Link href="/settings" className="btn btn-outline">&lt;- Pengaturan</Link><button className="btn" onClick={openNew} disabled={!permissions.canMutateLedger}>+ Tambah sumber</button></>} />
      <ResponsiveLedger
        rows={state.cashSources}
        getKey={cs => cs.id}
        onRowClick={permissions.canMutateLedger ? cs => { setEditing(cs); setDrawerOpen(true) } : undefined}
        cardTitle={cs => cs.name}
        cardMeta={cs => `${count(cs.id)} pinjaman`}
        columns={[
          { key: 'name', header: 'Nama', render: cs => <span className="font-medium">{cs.name}</span> },
          { key: 'loans', header: 'Pinjaman', className: 'num', render: cs => count(cs.id) },
          { key: 'status', header: 'Status', render: cs => <Stamp variant={cs.isActive ? 'active' : 'muted'}>{cs.isActive ? 'Aktif' : 'Tidak aktif'}</Stamp> },
        ]}
      />
      <p className="text-[12px] text-ink-soft mt-4">Sumber kas menunjukkan penanggung jawab kas fisik untuk pinjaman.</p>
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} eyebrow="Sumber kas" title={editing?.name || 'Tambah sumber kas'}>
        {editing && <div className="flex flex-col gap-4">
          <Field label="Nama"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} disabled={!permissions.canMutateLedger} /></Field>
          <Field label="Status"><Select value={editing.isActive ? 'active' : 'inactive'} onChange={e => setEditing({ ...editing, isActive: e.target.value === 'active' })} disabled={!permissions.canMutateLedger}><option value="active">Aktif</option><option value="inactive">Tidak aktif</option></Select></Field>
          <div className="flex gap-3"><button className="btn" onClick={save} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan'}</button><button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button></div>
        </div>}
      </Drawer>
    </>
  )
}
