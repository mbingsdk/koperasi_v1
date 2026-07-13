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
import type { Fund } from '@/lib/types'

export default function FundsPage() {
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Fund | null>(null)
  const [saving, setSaving] = useState(false)

  function openNew() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat dana.', 'info')
      return
    }
    setEditing({ id: makeId('f'), code: '', name: '', isSystem: false, isActive: true })
    setDrawerOpen(true)
  }

  async function save() {
    if (!permissions.canMutateLedger) return
    if (!editing?.name.trim() || !editing.code.trim()) return
    setSaving(true)
    try {
      const exists = state.funds.some(f => f.id === editing.id)
      const payload = { id: editing.id, code: editing.code, name: editing.name, isSystem: editing.isSystem, isActive: editing.isActive }
      const fund = exists
        ? await apiClient.updateFund(editing.id, payload)
        : await apiClient.createFund(payload)
      dispatch({ type: 'fund.upsert', fund })
      setDrawerOpen(false)
      notify('Dana tersimpan ke PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan dana.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Pengaturan - Dana" title="Dana" actions={<><Link href="/settings" className="btn btn-outline">&lt;- Pengaturan</Link><button className="btn" onClick={openNew} disabled={!permissions.canMutateLedger}>+ Tambah dana</button></>} />
      <ResponsiveLedger
        rows={state.funds}
        getKey={f => f.id}
        onRowClick={permissions.canMutateLedger ? f => { setEditing(f); setDrawerOpen(true) } : undefined}
        cardTitle={f => f.name}
        cardMeta={f => `${f.code} - ${f.isSystem ? 'Sistem' : 'Kustom'}`}
        columns={[
          { key: 'code', header: 'Kode', render: f => <span className="mono text-ink-soft">{f.code}</span> },
          { key: 'name', header: 'Nama', render: f => <span className="font-medium">{f.name}</span> },
          { key: 'type', header: 'Tipe', render: f => f.isSystem ? 'Sistem' : 'Kustom' },
          { key: 'active', header: 'Aktif', render: f => <Stamp variant={f.isActive ? 'active' : 'muted'}>{f.isActive ? 'Aktif' : 'Tidak aktif'}</Stamp> },
        ]}
      />
      <div className="flag-block mt-5 text-[12.5px]">Dana sistem tidak bisa dihapus, tapi bisa dinonaktifkan untuk form baru.</div>
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} eyebrow="Dana" title={editing?.name || 'Tambah dana'}>
        {editing && <div className="flex flex-col gap-4">
          <Field label="Kode"><Input value={editing.code} disabled={editing.isSystem || !permissions.canMutateLedger} onChange={e => setEditing({ ...editing, code: e.target.value })} /></Field>
          <Field label="Nama"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} disabled={!permissions.canMutateLedger} /></Field>
          <Field label="Status"><Select value={editing.isActive ? 'active' : 'inactive'} onChange={e => setEditing({ ...editing, isActive: e.target.value === 'active' })} disabled={!permissions.canMutateLedger}><option value="active">Aktif</option><option value="inactive">Tidak aktif</option></Select></Field>
          <div className="flex gap-3"><button className="btn" onClick={save} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan'}</button><button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button></div>
        </div>}
      </Drawer>
    </>
  )
}
