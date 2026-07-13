'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Stamp from '@/components/ui/Stamp'
import { FolderTabs, TabPanel } from '@/components/ui/FolderTabs'
import { Field } from '@/components/ui/Field'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { rp, fmtDate } from '@/lib/format'
import { apiClient } from '@/lib/api-client'

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { state, dispatch } = useKoperasiStore()
  const permissions = usePermissions()
  const { notify } = useToast()
  const member = state.members.find(m => m.id === id) ?? state.members[0]
  const [tab, setTab] = useState('summary')
  const [note, setNote] = useState(member.note ?? '')
  const [savingNote, setSavingNote] = useState(false)

  const loans = state.loans.filter(l => l.member?.id === member.id)
  const dues = state.dues.filter(d => d.member.id === member.id)
  const txns = state.cashTransactions.filter(t => t.member?.id === member.id)
  const paidTotal = dues.reduce((s, d) => s + d.amountIdr, 0)
  const paidDuesCount = dues.filter(d => d.amountIdr > 0).length
  const unpaidDuesCount = dues.filter(d => d.amountIdr === 0).length
  const loanActive = loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remainingAmountIdr, 0)
  const loanPaid = loans.reduce((s, l) => s + l.paidAmountIdr, 0)
  const txnNet = txns.reduce((s, t) => s + (t.direction === 'inflow' ? t.amountIdr : -t.amountIdr), 0)

  return (
    <>
      <PageHeader
        eyebrow={`Anggota - ${member.memberNo ?? 'Tanpa nomor'}`}
        title={member.name}
        actions={
          <>
            <Link href="/members" className="btn btn-outline">&lt;- Semua anggota</Link>
            <Link href="/members" className={`btn ${!permissions.canMutateLedger ? 'pointer-events-none opacity-40' : ''}`}>Edit di daftar</Link>
          </>
        }
      />

      <section className="member-profile-hero" aria-label="Profil anggota">
        <div>
          <div className="member-profile-stamps">
            <Stamp variant={member.status === 'active' ? 'active' : 'muted'}>
              {member.status === 'active' ? 'Aktif' : 'Tidak aktif'}
            </Stamp>
            <Stamp variant="muted">{member.employeeType}</Stamp>
            {member.department && <Stamp variant="muted">{member.department.name}</Stamp>}
          </div>
          <p>{member.joinedAt ? `Bergabung ${fmtDate(member.joinedAt)}` : 'Tanggal bergabung belum diisi'}</p>
        </div>
        <div className="member-profile-stats">
          <div><span>Iuran</span><strong>{rp(paidTotal)}</strong></div>
          <div><span>Pinjaman aktif</span><strong className={loanActive > 0 ? 'text-margin' : ''}>{rp(loanActive)}</strong></div>
          <div><span>Transaksi net</span><strong className={txnNet < 0 ? 'text-margin' : ''}>{rp(Math.abs(txnNet))}</strong></div>
        </div>
      </section>

      <FolderTabs
        tabs={[
          { key: 'summary', label: 'Ringkasan' },
          { key: 'dues', label: 'Iuran' },
          { key: 'loans', label: 'Pinjaman' },
          { key: 'transactions', label: 'Transaksi' },
          { key: 'notes', label: 'Catatan' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <TabPanel id="summary" active={tab}>
        <div className="member-detail-summary">
          <div><span>Iuran tercatat</span><strong>{paidDuesCount}</strong><small>{unpaidDuesCount} belum bayar</small></div>
          <div><span>Total iuran</span><strong>{rp(paidTotal)}</strong><small>Semua dana lokal</small></div>
          <div><span>Total angsuran</span><strong>{rp(loanPaid)}</strong><small>{loans.length} pinjaman</small></div>
          <div><span>Transaksi</span><strong>{txns.length}</strong><small>{txnNet >= 0 ? 'Net masuk' : 'Net keluar'} {rp(Math.abs(txnNet))}</small></div>
        </div>

        <div className="member-profile-panel">
          <div>
            <p className="eyebrow">Anggota sejak</p>
            <p className="mono">{member.joinedAt ? fmtDate(member.joinedAt) : '-'}</p>
          </div>
          <div>
            <p className="eyebrow">Departemen</p>
            <p>{member.department?.name ?? '-'}</p>
          </div>
          <div>
            <p className="eyebrow">Tipe karyawan</p>
            <p>{member.employeeType}</p>
          </div>
          <div>
            <p className="eyebrow">Status</p>
            <p><Stamp variant={member.status === 'active' ? 'active' : 'muted'}>{member.status === 'active' ? 'Aktif' : 'Tidak aktif'}</Stamp></p>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="dues" active={tab}>
        <div className="ledger-wrap member-detail-table">
          <table className="ledger">
            <thead><tr><th>Periode</th><th>Dana</th><th className="num">Jumlah</th><th>Catatan</th></tr></thead>
            <tbody>
              {dues.length === 0 && <tr><td colSpan={4} className="text-center text-ink-soft py-8">Belum ada iuran</td></tr>}
              {dues.map(d => (
                <tr key={d.id}>
                  <td className="mono">Jun 2026</td>
                  <td>{d.fund.name}</td>
                  <td className="num">{rp(d.amountIdr)}</td>
                  <td className="text-ink-soft">{d.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="member-detail-mobile-list">
          {dues.length === 0 && <div className="empty-state"><h3>Belum ada iuran</h3><p>Data iuran anggota belum tercatat.</p></div>}
          {dues.map(d => (
            <article key={d.id} className="member-detail-card">
              <div><span>Jun 2026</span><strong>{d.fund.name}</strong></div>
              <p className={d.amountIdr > 0 ? '' : 'text-margin'}>{rp(d.amountIdr)}</p>
              <small>{d.note ?? 'Tanpa catatan'}</small>
            </article>
          ))}
        </div>
      </TabPanel>

      <TabPanel id="loans" active={tab}>
        <div className="ledger-wrap member-detail-table">
          <table className="ledger">
            <thead>
              <tr><th>Tanggal</th><th>Sumber</th><th className="num">Pokok</th><th className="num">Dibayar</th><th className="num">Sisa</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={6} className="text-center text-ink-soft py-8">Belum ada pinjaman</td></tr>}
              {loans.map(l => (
                <tr key={l.id}>
                  <td className="mono">{fmtDate(l.loanDate)}</td>
                  <td>{l.cashSource.name}</td>
                  <td className="num">{rp(l.principalAmountIdr)}</td>
                  <td className="num">{rp(l.paidAmountIdr)}</td>
                  <td className={`num ${l.remainingAmountIdr > 0 ? 'amt-out' : ''}`}>{rp(l.remainingAmountIdr)}</td>
                  <td><Stamp variant={l.status === 'active' ? 'active' : 'paid'}>{l.status === 'active' ? 'Aktif' : 'Lunas'}</Stamp></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="member-detail-mobile-list">
          {loans.length === 0 && <div className="empty-state"><h3>Belum ada pinjaman</h3><p>Anggota ini belum punya pinjaman.</p></div>}
          {loans.map(l => (
            <article key={l.id} className="member-detail-card">
              <div><span>{fmtDate(l.loanDate)}</span><strong>{l.cashSource.name}</strong></div>
              <p className={l.remainingAmountIdr > 0 ? 'text-margin' : ''}>{rp(l.remainingAmountIdr)}</p>
              <small>Pokok {rp(l.principalAmountIdr)} - Dibayar {rp(l.paidAmountIdr)}</small>
            </article>
          ))}
        </div>
      </TabPanel>

      <TabPanel id="transactions" active={tab}>
        <div className="ledger-wrap member-detail-table">
          <table className="ledger">
            <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th className="num">Jumlah</th></tr></thead>
            <tbody>
              {txns.length === 0 && <tr><td colSpan={4} className="text-center text-ink-soft py-8">Belum ada transaksi</td></tr>}
              {txns.map(t => (
                <tr key={t.id}>
                  <td className="mono">{fmtDate(t.transactionDate)}</td>
                  <td>{t.note ?? '-'}</td>
                  <td>{t.category}</td>
                  <td className={`num ${t.direction === 'outflow' ? 'amt-out' : ''}`}>
                    {t.direction === 'outflow' ? `(${rp(t.amountIdr)})` : rp(t.amountIdr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="member-detail-mobile-list">
          {txns.length === 0 && <div className="empty-state"><h3>Belum ada transaksi</h3><p>Belum ada transaksi terkait anggota ini.</p></div>}
          {txns.map(t => (
            <article key={t.id} className={`member-detail-card ${t.direction}`}>
              <div><span>{fmtDate(t.transactionDate)}</span><strong>{t.note ?? t.category}</strong></div>
              <p className={t.direction === 'outflow' ? 'text-margin' : ''}>{t.direction === 'outflow' ? `-${rp(t.amountIdr)}` : rp(t.amountIdr)}</p>
              <small>{t.category}</small>
            </article>
          ))}
        </div>
      </TabPanel>

      <TabPanel id="notes" active={tab}>
        <div className="member-notes-panel">
          <Field label="Catatan internal">
            <textarea
              rows={5}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Tambahkan catatan internal tentang anggota ini..."
              className="field-input resize-none"
              disabled={!permissions.canMutateLedger}
            />
          </Field>
          <button
            className="btn mt-3"
            disabled={savingNote || !permissions.canMutateLedger}
            onClick={async () => {
              if (!permissions.canMutateLedger) return
              setSavingNote(true)
              try {
                const updated = await apiClient.updateMember(member.id, { note })
                dispatch({ type: 'member.upsert', member: updated })
                notify('Catatan anggota tersimpan ke PostgreSQL.')
              } catch (err) {
                notify(err instanceof Error ? err.message : 'Gagal menyimpan catatan.', 'error')
              } finally {
                setSavingNote(false)
              }
            }}
          >
            {savingNote ? 'Menyimpan...' : 'Simpan catatan'}
          </button>
        </div>
      </TabPanel>
    </>
  )
}
