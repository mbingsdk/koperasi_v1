'use client'

import Link from 'next/link'
import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Drawer from '@/components/ui/Drawer'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { Field, Input } from '@/components/ui/Field'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api-client'
import type { Department } from '@/lib/types'

export default function DepartmentsPage() {
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)

  function count(id: string) {
    return state.members.filter(m => m.department?.id === id).length
  }

  function openNew() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat departemen.', 'info')
      return
    }
    setEditing({ id: makeId('d'), name: '' })
    setDrawerOpen(true)
  }

  async function save() {
    if (!permissions.canMutateLedger) return
    if (!editing?.name.trim()) return
    setSaving(true)
    try {
      const exists = state.departments.some(d => d.id === editing.id)
      const department = exists
        ? await apiClient.updateDepartment(editing.id, { name: editing.name })
        : await apiClient.createDepartment({ id: editing.id, name: editing.name })
      dispatch({ type: 'department.upsert', department })
      setDrawerOpen(false)
      notify('Departemen tersimpan ke PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan departemen.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Pengaturan - Departemen" title="Departemen" actions={<><Link href="/settings" className="btn btn-outline">&lt;- Pengaturan</Link><button className="btn" onClick={openNew} disabled={!permissions.canMutateLedger}>+ Tambah departemen</button></>} />
      <ResponsiveLedger
        rows={state.departments}
        getKey={d => d.id}
        onRowClick={permissions.canMutateLedger ? d => { setEditing(d); setDrawerOpen(true) } : undefined}
        cardTitle={d => d.name}
        cardMeta={d => `${count(d.id)} anggota`}
        columns={[
          { key: 'name', header: 'Departemen', render: d => <span className="font-medium">{d.name}</span> },
          { key: 'members', header: 'Anggota', className: 'num', render: d => count(d.id) },
        ]}
      />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} eyebrow="Departemen" title={editing?.name || 'Tambah departemen'}>
        {editing && <div className="flex flex-col gap-4"><Field label="Nama departemen"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} disabled={!permissions.canMutateLedger} /></Field><div className="flex gap-3"><button className="btn" onClick={save} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan'}</button><button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button></div></div>}
      </Drawer>
    </>
  )
}
