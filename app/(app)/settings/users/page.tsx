'use client'

import Link from 'next/link'
import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Stamp from '@/components/ui/Stamp'
import Drawer from '@/components/ui/Drawer'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import { Field, Select, Input } from '@/components/ui/Field'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { fmtDate } from '@/lib/format'
import { apiClient } from '@/lib/api-client'
import type { Role, User } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', viewer: 'Peninjau' }

export default function UsersPage() {
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function openNew() {
    if (!permissions.canManageUsers) {
      notify('Manajemen pengguna hanya untuk super admin.', 'error')
      return
    }
    setEditing({ id: makeId('u'), name: '', email: '', role: 'admin', isActive: true, createdAt: new Date().toISOString() })
    setError('')
    setDrawerOpen(true)
  }

  function openEdit(user: User) {
    if (!permissions.canManageUsers) {
      notify('Manajemen pengguna hanya untuk super admin.', 'error')
      return
    }
    setEditing(user)
    setError('')
    setDrawerOpen(true)
  }

  async function save() {
    if (!editing?.name.trim() || !editing.email.includes('@')) {
      setError('Nama dan email valid wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const exists = state.users.some(user => user.id === editing.id)
      const payload = { id: editing.id, name: editing.name, email: editing.email, role: editing.role, isActive: editing.isActive }
      const user = exists
        ? await apiClient.updateUser(editing.id, payload)
        : await apiClient.createUser(payload)
      dispatch({ type: 'user.upsert', user })
      setDrawerOpen(false)
      notify('Pengguna tersimpan ke PostgreSQL.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan pengguna.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate() {
    if (!editing) return
    setSaving(true)
    try {
      const user = await apiClient.deactivateUser(editing.id)
      dispatch({ type: 'user.upsert', user })
      setDrawerOpen(false)
      notify('Pengguna dinonaktifkan di PostgreSQL.', 'info')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menonaktifkan pengguna.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Pengaturan - Pengguna"
        title="Pengguna"
        actions={<><Link href="/settings" className="btn btn-outline">&lt;- Pengaturan</Link><button className="btn" onClick={openNew} disabled={!permissions.canManageUsers}>+ Tambah pengguna</button></>}
      />

      <ResponsiveLedger
        rows={state.users}
        getKey={u => u.id}
        onRowClick={permissions.canManageUsers ? openEdit : undefined}
        cardTitle={u => u.name}
        cardMeta={u => `${u.email} - ${ROLE_LABELS[u.role]}`}
        columns={[
          { key: 'name', header: 'Nama', render: u => <span className="font-medium">{u.name}</span> },
          { key: 'email', header: 'Email', render: u => <span className="mono text-[12px]">{u.email}</span> },
          { key: 'role', header: 'Peran', render: u => ROLE_LABELS[u.role] },
          { key: 'status', header: 'Status', render: u => <Stamp variant={u.isActive ? 'active' : 'muted'}>{u.isActive ? 'Aktif' : 'Tidak aktif'}</Stamp> },
          { key: 'login', header: 'Login terakhir', render: u => <span className="mono text-ink-soft">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '-'}</span> },
        ]}
      />

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} eyebrow="Pengguna" title={editing?.name || 'Tambah pengguna'}>
        {editing && (
          <div className="flex flex-col gap-4">
            {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}
            <Field label="Nama lengkap"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Peran">
              <Select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value as Role })}>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="viewer">Peninjau</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editing.isActive ? 'active' : 'inactive'} onChange={e => setEditing({ ...editing, isActive: e.target.value === 'active' })}>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak aktif</option>
              </Select>
            </Field>
            <div className="flex flex-wrap gap-3">
              <button className="btn" onClick={save} disabled={saving || !permissions.canManageUsers}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button>
              {editing.isActive && <button className="btn btn-danger-outline ml-auto" onClick={deactivate} disabled={saving || !permissions.canManageUsers}>Nonaktifkan</button>}
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
