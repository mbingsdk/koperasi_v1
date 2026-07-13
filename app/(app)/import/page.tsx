'use client'

import { useCallback, useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { IMPORT_BATCHES } from '@/lib/mock-data'
import { fmtDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useToast } from '@/components/ui/Toast'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { apiClient } from '@/lib/api-client'

const STEPS = [
  { n: 1, label: 'Unggah', hint: 'Pilih file Excel' },
  { n: 2, label: 'Pratinjau', hint: 'Cek ringkasan' },
  { n: 3, label: 'Review', hint: 'Validasi warning' },
  { n: 4, label: 'Simpan', hint: 'Commit data' },
]

const MOCK_WARNINGS = [
  { sheet: 'Koperasi', row: 142, col: 'NAMA', msg: 'Nama "Agus" terduplikasi, dicocokkan berdasarkan departemen' },
  { sheet: 'Dahib', row: 87, col: 'Bulan', msg: 'Nominal kosong, dicatat sebagai belum bayar (0)' },
  { sheet: 'pinjaman kop', row: 31, col: 'Tanggal', msg: 'Tanggal dinormalisasi dari format DD-MM-YY' },
  { sheet: 'Pengeluaran', row: 204, col: 'Keterangan', msg: 'Kolom catatan dibiarkan kosong' },
]

const MAPPING_RULES = [
  { source: 'Koperasi', target: 'Anggota', fields: 'Nama, departemen, tipe karyawan' },
  { source: 'Dahib / Serikat', target: 'Iuran', fields: 'Periode, dana, nominal' },
  { source: 'Pengeluaran', target: 'Buku Kas', fields: 'Tanggal, kategori, jumlah' },
  { source: 'pinjaman kop', target: 'Pinjaman', fields: 'Peminjam, pokok, angsuran' },
]

export default function ImportPage() {
  const { notify } = useToast()
  const { state, dispatch } = useKoperasiStore()
  const permissions = usePermissions()
  const [step, setStep] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [committed, setCommitted] = useState(false)
  const [confirmCommit, setConfirmCommit] = useState(false)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const importBatches = state.importBatches.length > 0 ? state.importBatches : IMPORT_BATCHES
  const batch = importBatches.find(item => item.id === activeBatchId) ?? importBatches[0] ?? IMPORT_BATCHES[0]
  const summary = batch.summary!
  const warningDetails = summary.warningDetails?.length ? summary.warningDetails : MOCK_WARNINGS

  const currentStep = STEPS.find(item => item.n === step) ?? STEPS[0]

  const summaryCards = useMemo(() => [
    ['Anggota', summary.membersDetected],
    ['Iuran', summary.contributionsDetected],
    ['Transaksi', summary.transactionsDetected],
    ['Pinjaman', summary.loansDetected],
    ['Peringatan', summary.warnings],
    ['Error', summary.errors],
  ], [summary])

  async function previewFile(originalFileName: string, file?: File) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat simulasi impor.', 'info')
      return
    }

    setPreviewing(true)
    try {
      const body = new FormData()
      if (file) body.append('file', file)
      body.append('originalFileName', originalFileName)
      const preview = await apiClient.previewImportBatch(body)
      dispatch({ type: 'import_batch.upsert', batch: preview })
      setActiveBatchId(preview.id)
      setFileName(preview.originalFileName)
      setCommitted(false)
      setStep(2)
      notify('Preview impor dibuat di PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membuat preview impor.', 'error')
    } finally {
      setPreviewing(false)
    }
  }

  function pickDemoFile() {
    void previewFile('koperasi_2026.xlsx')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      if (!permissions.canMutateLedger) {
        notify('Role viewer hanya bisa melihat simulasi impor.', 'info')
        return
      }
      void previewFile(file.name, file)
    }
  }, [notify, permissions.canMutateLedger])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (!permissions.canMutateLedger) {
        notify('Role viewer hanya bisa melihat simulasi impor.', 'info')
        return
      }
      void previewFile(file.name, file)
    }
  }

  async function commitImport() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer tidak bisa menyimpan impor.', 'error')
      setConfirmCommit(false)
      return
    }
    if (!activeBatchId) {
      notify('Preview impor belum tersedia.', 'error')
      setConfirmCommit(false)
      return
    }

    setCommitting(true)
    try {
      const committedBatch = await apiClient.commitImportBatch(activeBatchId)
      dispatch({ type: 'import_batch.upsert', batch: committedBatch })
      setConfirmCommit(false)
      setCommitted(true)
      notify('Batch impor ditandai committed di PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan impor.', 'error')
    } finally {
      setCommitting(false)
    }
  }

  function resetFlow() {
    setStep(1)
    setCommitted(false)
    setFileName(null)
    setActiveBatchId(null)
  }

  return (
    <>
      <PageHeader eyebrow="Migrasi Catatan Lama" title="Impor Excel" />

      <section className="import-hero" aria-label="Ringkasan impor">
        <div className="import-hero-main">
          <p className="eyebrow">Status flow</p>
          <strong>{currentStep.label}</strong>
          <span>{fileName ?? 'Belum ada file dipilih'}</span>
        </div>
        <div className="import-hero-stats">
          <div><span>Sheet</span><strong>{summary.sheetsDetected.length}</strong></div>
          <div><span>Warning</span><strong>{summary.warnings}</strong></div>
          <div><span>Error</span><strong>{summary.errors}</strong></div>
        </div>
      </section>

      <div className="import-stepper" aria-label="Langkah impor">
        {STEPS.map(item => (
          <button
            key={item.n}
            type="button"
            className={cn('import-step', step === item.n && 'active', step > item.n && 'done')}
            onClick={() => step > item.n && setStep(item.n)}
          >
            <span>{item.n}</span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>

      {step === 1 && (
        <section className="import-upload-grid">
          <label
            className={cn('import-dropzone', dragging && 'dragging')}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleFileChange} disabled={!permissions.canMutateLedger || previewing} />
            <span className="import-upload-mark">XLSX</span>
            <h2>{previewing ? 'Membuat preview...' : 'Letakkan file Excel di sini'}</h2>
            <p>Atau klik untuk memilih file. Backend menyimpan batch preview; parser sheet detail akan disempurnakan di tahap berikutnya.</p>
          </label>

          <aside className="import-guide">
            <p className="eyebrow">Format yang dicari</p>
            {MAPPING_RULES.map(rule => (
              <div key={rule.source} className="import-map-card">
                <span>{rule.source}</span>
                <strong>{rule.target}</strong>
                <small>{rule.fields}</small>
              </div>
            ))}
            <button className="btn" onClick={pickDemoFile} disabled={!permissions.canMutateLedger || previewing}>
              {previewing ? 'Memproses...' : 'Pakai file demo'}
            </button>
          </aside>
        </section>
      )}

      {step === 2 && (
        <section className="import-panel">
          <div className="import-section-head">
            <div>
              <p className="eyebrow">Pratinjau file</p>
              <h2>{fileName ?? 'koperasi_2026.xlsx'}</h2>
            </div>
            <span>{summary.sheetsDetected.length} sheet terdeteksi</span>
          </div>

          <div className="import-summary-grid">
            {summaryCards.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString('id-ID')}</strong>
              </div>
            ))}
          </div>

          <div className="import-sheet-list">
            {summary.sheetsDetected.map(sheet => <span key={sheet}>{sheet}</span>)}
          </div>

          <div className="import-actions">
            <button className="btn btn-outline" onClick={() => setStep(1)}>Kembali</button>
            <button className="btn" onClick={() => setStep(3)}>Review warning</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="import-panel">
          <div className="import-section-head">
            <div>
              <p className="eyebrow">Validasi mapping</p>
              <h2>{warningDetails.length} warning perlu diketahui</h2>
            </div>
            <span>Tidak ada error fatal</span>
          </div>

          <div className="import-warning-list">
            {warningDetails.map((warning, index) => (
              <article key={`${warning.sheet}-${warning.row ?? 'sheet'}-${index}`} className="import-warning-card">
                <div>
                  <span>{warning.sheet}</span>
                  <strong>{warning.row ? `Baris ${warning.row}` : 'Level sheet'}{warning.col ? ` - ${warning.col}` : ''}</strong>
                </div>
                <p>{warning.msg}</p>
              </article>
            ))}
          </div>

          <div className="import-actions">
            <button className="btn btn-outline" onClick={() => setStep(2)}>Kembali</button>
            <button className="btn" onClick={() => setStep(4)}>Lanjut simpan</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="import-panel">
          {!committed ? (
            <>
              <div className="import-commit-card">
                <p className="eyebrow">Review akhir</p>
                  <h2>Siap commit batch impor</h2>
                <p>
                  Sistem akan membuat {summary.membersDetected.toLocaleString('id-ID')} anggota,
                  {' '}{summary.contributionsDetected.toLocaleString('id-ID')} catatan iuran,
                  {' '}{summary.transactionsDetected.toLocaleString('id-ID')} transaksi kas, dan
                  {' '}{summary.loansDetected.toLocaleString('id-ID')} pinjaman.
                </p>
              </div>
              <div className="import-actions">
                <button className="btn btn-outline" onClick={() => setStep(3)}>Kembali</button>
                <button className="btn" onClick={() => setConfirmCommit(true)} disabled={!permissions.canMutateLedger || committing || !activeBatchId}>
                  {committing ? 'Menyimpan...' : 'Simpan impor'}
                </button>
              </div>
            </>
          ) : (
            <div className="import-success">
              <span>Selesai</span>
              <h2>Impor tersimpan</h2>
              <p>
                {summary.membersDetected.toLocaleString('id-ID')} anggota,
                {' '}{summary.contributionsDetected.toLocaleString('id-ID')} iuran,
                {' '}{summary.transactionsDetected.toLocaleString('id-ID')} transaksi,
                {' '}{summary.loansDetected.toLocaleString('id-ID')} pinjaman.
              </p>
              <button className="btn" onClick={resetFlow} disabled={!permissions.canMutateLedger}>Impor file lain</button>
            </div>
          )}
        </section>
      )}

      <section className="import-history">
        <div className="import-section-head">
          <div>
            <p className="eyebrow">Riwayat impor</p>
            <h2>Batch terakhir</h2>
          </div>
        </div>

        <div className="import-history-list">
          {importBatches.map(item => (
            <article key={item.id} className="import-history-card">
              <div>
                <span>{item.status}</span>
                <strong>{item.originalFileName}</strong>
                <small>{item.committedAt ? fmtDateTime(item.committedAt) : 'Belum disimpan'}</small>
              </div>
              <div>
                <span>Anggota</span>
                <strong>{item.summary?.membersDetected.toLocaleString('id-ID') ?? 0}</strong>
                <small>{item.summary?.warnings ?? 0} warning</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmCommit}
        title="Simpan impor demo?"
        message="Batch impor akan ditandai committed di PostgreSQL dan audit log akan dibuat."
        confirmLabel={committing ? 'Menyimpan...' : 'Simpan'}
        onConfirm={commitImport}
        onCancel={() => setConfirmCommit(false)}
      />
    </>
  )
}
