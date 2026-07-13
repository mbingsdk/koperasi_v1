'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Stamp from '@/components/ui/Stamp'
import Drawer from '@/components/ui/Drawer'
import FilterBar from '@/components/ui/FilterBar'
import ResponsiveLedger from '@/components/ui/ResponsiveLedger'
import EmptyState from '@/components/ui/EmptyState'
import { Field, Select, Input } from '@/components/ui/Field'
import { useKoperasiStore, useMembers, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api-client'
import type { EmployeeType, Member } from '@/lib/types'

const emptyMember: Member = {
  id: '',
  memberNo: '',
  name: '',
  normalizedName: '',
  employeeType: 'Bulanan',
  status: 'active',
  joinedAt: '2026-06-01',
}

export default function MembersPage() {
  const { state, dispatch, makeId } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const { members, departments } = useMembers()
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('all')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState<Member>(emptyMember)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => members.filter(m => {
    if (search && !`${m.name} ${m.memberNo ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (dept !== 'all' && m.department?.id !== dept) return false
    if (type !== 'all' && m.employeeType !== type) return false
    if (status !== 'all' && m.status !== status) return false
    return true
  }), [members, search, dept, type, status])

  const activeCount = members.filter(m => m.status === 'active').length
  const inactiveCount = members.length - activeCount
  const withActiveLoan = new Set(state.loans.filter(l => l.status === 'active' && l.member?.id).map(l => l.member!.id)).size
  const filteredActive = filtered.filter(m => m.status === 'active').length

  function memberStats(member: Member) {
    const duesTotal = state.dues.filter(d => d.member.id === member.id).reduce((sum, due) => sum + due.amountIdr, 0)
    const loanRemaining = state.loans.filter(l => l.member?.id === member.id && l.status === 'active').reduce((sum, loan) => sum + loan.remainingAmountIdr, 0)
    return { duesTotal, loanRemaining }
  }

  function openNew() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat data anggota.', 'info')
      return
    }
    setDraft({ ...emptyMember, id: makeId('m'), memberNo: `KOP-${String(members.length + 1).padStart(4, '0')}` })
    setError('')
    setDrawerOpen(true)
  }

  function openEdit(member: Member) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat detail anggota.', 'info')
      return
    }
    setDraft(member)
    setError('')
    setDrawerOpen(true)
  }

  async function saveMember() {
    if (!draft.name.trim()) {
      setError('Nama anggota wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const exists = members.some(m => m.id === draft.id)
      const payload = {
        id: draft.id,
        memberNo: draft.memberNo,
        name: draft.name,
        departmentId: draft.department?.id,
        employeeType: draft.employeeType,
        status: draft.status,
        joinedAt: draft.joinedAt,
        note: draft.note,
      }
      const member = exists
        ? await apiClient.updateMember(draft.id, payload)
        : await apiClient.createMember(payload)
      dispatch({ type: 'member.upsert', member })
      setDrawerOpen(false)
      notify('Data anggota tersimpan ke PostgreSQL.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan anggota.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate() {
    setSaving(true)
    try {
      const member = await apiClient.deactivateMember(draft.id)
      dispatch({ type: 'member.upsert', member })
      setDrawerOpen(false)
      notify('Anggota dinonaktifkan di PostgreSQL.', 'info')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menonaktifkan anggota.'
      setError(message)
      notify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Buku Anggota"
        title="Anggota"
        actions={<button className="btn member-header-action" onClick={openNew} disabled={!permissions.canMutateLedger} title={!permissions.canMutateLedger ? 'Role viewer hanya bisa melihat data' : undefined}>+ Tambah anggota</button>}
      />

      <section className="member-hero" aria-label="Ringkasan anggota">
        <div className="member-hero-main">
          <p className="eyebrow">Anggota aktif</p>
          <strong>{activeCount}</strong>
          <span>{inactiveCount} tidak aktif, {withActiveLoan} punya pinjaman aktif</span>
        </div>
        <div className="member-hero-stats">
          <div>
            <p className="eyebrow">Total anggota</p>
            <strong>{members.length}</strong>
          </div>
          <div>
            <p className="eyebrow">Filter aktif</p>
            <strong>{filteredActive} / {filtered.length}</strong>
          </div>
        </div>
        <button className="btn member-quick-action" onClick={openNew} disabled={!permissions.canMutateLedger}>Tambah anggota</button>
      </section>

      <FilterBar>
        <Field label="Cari" className="min-w-[220px] flex-[2]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama atau nomor anggota" />
        </Field>
        <Field label="Departemen">
          <Select value={dept} onChange={e => setDept(e.target.value)}>
            <option value="all">Semua</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Tipe">
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="all">Semua</option>
            {['Bulanan', 'Harian', 'Mixed', 'Unknown'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">Semua</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak aktif</option>
          </Select>
        </Field>
      </FilterBar>

      <div className="member-desktop-table">
        <ResponsiveLedger
          rows={filtered}
          getKey={m => m.id}
          onRowClick={permissions.canMutateLedger ? openEdit : undefined}
          empty={<EmptyState title="Tidak ada anggota" message="Ubah filter atau tambah anggota baru." action={permissions.canMutateLedger ? <button className="btn" onClick={openNew}>Tambah anggota</button> : undefined} />}
          cardTitle={m => m.name}
          cardMeta={m => `${m.memberNo ?? '-'} - ${m.department?.name ?? 'Tanpa departemen'}`}
          columns={[
            { key: 'no', header: 'No. Anggota', render: m => <span className="mono text-ink-soft">{m.memberNo ?? '-'}</span> },
            { key: 'name', header: 'Nama', render: m => <strong>{m.name}</strong> },
            { key: 'dept', header: 'Departemen', render: m => m.department?.name ?? '-' },
            { key: 'type', header: 'Tipe', render: m => m.employeeType },
            { key: 'status', header: 'Status', render: m => <Stamp variant={m.status === 'active' ? 'active' : 'muted'}>{m.status === 'active' ? 'Aktif' : 'Tidak aktif'}</Stamp> },
          ]}
        />
      </div>

      <div className="member-mobile-list">
        {filtered.length === 0 && <EmptyState title="Tidak ada anggota" message="Ubah filter atau tambah anggota baru." action={permissions.canMutateLedger ? <button className="btn" onClick={openNew}>Tambah anggota</button> : undefined} />}
        {filtered.map(member => {
          const stats = memberStats(member)
          return (
            <article key={member.id} className={`member-card ${member.status}`}>
              <div className="member-card-head">
                <div>
                  <span className="member-number">{member.memberNo ?? 'Tanpa nomor'}</span>
                  <h2>{member.name}</h2>
                  <p>{member.department?.name ?? 'Tanpa departemen'} - {member.employeeType}</p>
                </div>
                <Stamp variant={member.status === 'active' ? 'active' : 'muted'}>{member.status === 'active' ? 'Aktif' : 'Tidak aktif'}</Stamp>
              </div>
              <div className="member-card-grid">
                <div><span>Iuran</span><strong>{new Intl.NumberFormat('id-ID').format(stats.duesTotal)}</strong></div>
                <div><span>Pinjaman</span><strong>{new Intl.NumberFormat('id-ID').format(stats.loanRemaining)}</strong></div>
              </div>
              {member.note && <p className="member-note">{member.note}</p>}
              <div className="member-card-actions">
                <Link className="btn btn-outline" href={`/members/${member.id}`}>Detail</Link>
                <button className="btn" type="button" onClick={() => openEdit(member)} disabled={!permissions.canMutateLedger}>Edit</button>
              </div>
            </article>
          )
        })}
      </div>
      <p className="text-[12px] text-ink-soft mt-3">Menampilkan {filtered.length} dari {members.length} anggota.</p>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eyebrow={draft.memberNo ? `Anggota - ${draft.memberNo}` : 'Anggota baru'}
        title={draft.name || 'Tambah anggota'}
      >
        <div className="member-form">
          {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}
          <Field label="No. anggota">
            <Input value={draft.memberNo ?? ''} onChange={e => setDraft({ ...draft, memberNo: e.target.value })} />
          </Field>
          <Field label="Nama lengkap">
            <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Contoh: Siti Aminah" />
          </Field>
          <Field label="Departemen">
            <Select value={draft.department?.id ?? ''} onChange={e => setDraft({ ...draft, department: departments.find(d => d.id === e.target.value) })}>
              <option value="">Pilih departemen</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Tipe karyawan">
            <Select value={draft.employeeType} onChange={e => setDraft({ ...draft, employeeType: e.target.value as EmployeeType })}>
              <option>Bulanan</option>
              <option>Harian</option>
              <option>Mixed</option>
              <option>Unknown</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Member['status'] })}>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak aktif</option>
            </Select>
          </Field>
          <Field label="Catatan internal">
            <textarea rows={4} value={draft.note ?? ''} onChange={e => setDraft({ ...draft, note: e.target.value })} className="field-input resize-none" />
          </Field>
          <div className="member-form-actions">
            <button className="btn" onClick={saveMember} disabled={saving || !permissions.canMutateLedger}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            <button className="btn btn-outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Batal</button>
            {members.some(m => m.id === draft.id) && draft.status === 'active' && (
              <button className="btn btn-danger-outline ml-auto" onClick={deactivate} disabled={saving || !permissions.canMutateLedger}>Nonaktifkan</button>
            )}
          </div>
        </div>
      </Drawer>
    </>
  )
}
