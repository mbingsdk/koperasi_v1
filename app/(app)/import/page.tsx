'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { IMPORT_BATCHES } from '@/lib/mock-data'
import { fmtDateTime, rp } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useToast } from '@/components/ui/Toast'
import { useKoperasiStore, usePermissions } from '@/lib/store'
import { downloadXlsx } from '@/lib/export/excel'
import { apiClient, type ImportCommitSimulation } from '@/lib/api-client'
import type { ImportBatch, ImportRowGroup, ImportRowRef, ImportSkippedRows } from '@/lib/types'

type ImportSummary = NonNullable<ImportBatch['summary']>
type MappedRows = NonNullable<ImportSummary['mappedRows']>
type ReviewTab = keyof MappedRows
type SkippedRows = Record<ReviewTab, ImportRowRef[]>
type DuplicateRows = Record<ReviewTab, Set<ImportRowRef>>
type DuplicateGroupMap = Record<ReviewTab, Map<ImportRowRef, ImportRowRef[]>>
type ConflictRows = Record<ReviewTab, Set<ImportRowRef>>
type ReviewStatusFilter = 'all' | 'accepted' | 'skipped' | 'duplicates' | 'conflicts'
type SourceRow = { sourceFile?: string; sourceSheet?: string }
type ReviewRow = { row: number; importKey?: string }

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

const REVIEW_TABS: Array<{ key: ReviewTab; label: string }> = [
  { key: 'members', label: 'Anggota' },
  { key: 'dues', label: 'Iuran' },
  { key: 'cashTransactions', label: 'Kas' },
  { key: 'loans', label: 'Pinjaman' },
]

const REVIEW_ROW_HEIGHT = 220
const REVIEW_VIEWPORT_HEIGHT = 560
const REVIEW_OVERSCAN = 8
const REVIEW_STATUS_FILTERS: Array<{ key: ReviewStatusFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'accepted', label: 'Diterima' },
  { key: 'skipped', label: 'Diskip' },
  { key: 'duplicates', label: 'Duplikat' },
  { key: 'conflicts', label: 'Konflik DB' },
]
const COMMIT_GROUPS: Array<{ key: ImportRowGroup; label: string; hint: string }> = [
  { key: 'members', label: 'Anggota', hint: 'Master anggota dan departemen' },
  { key: 'dues', label: 'Iuran', hint: 'Iuran koperasi, dahib, serikat' },
  { key: 'cashTransactions', label: 'Buku Kas', hint: 'Pengeluaran dan pencairan' },
  { key: 'loans', label: 'Pinjaman', hint: 'Pokok pinjaman per sumber kas' },
]

const EMPTY_MAPPED_ROWS: MappedRows = {
  members: [],
  dues: [],
  cashTransactions: [],
  loans: [],
}

const EMPTY_SKIPPED_ROWS: SkippedRows = {
  members: [],
  dues: [],
  cashTransactions: [],
  loans: [],
}

const EMPTY_DUPLICATE_ROWS: DuplicateRows = {
  members: new Set<ImportRowRef>(),
  dues: new Set<ImportRowRef>(),
  cashTransactions: new Set<ImportRowRef>(),
  loans: new Set<ImportRowRef>(),
}

const EMPTY_DUPLICATE_GROUP_MAP: DuplicateGroupMap = {
  members: new Map<ImportRowRef, ImportRowRef[]>(),
  dues: new Map<ImportRowRef, ImportRowRef[]>(),
  cashTransactions: new Map<ImportRowRef, ImportRowRef[]>(),
  loans: new Map<ImportRowRef, ImportRowRef[]>(),
}

const EMPTY_CONFLICT_ROWS: ConflictRows = {
  members: new Set<ImportRowRef>(),
  dues: new Set<ImportRowRef>(),
  cashTransactions: new Set<ImportRowRef>(),
  loans: new Set<ImportRowRef>(),
}

function shortText(value: unknown, fallback = '-') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function reviewKey(row: ReviewRow): ImportRowRef {
  return row.importKey ?? row.row
}

function rowLabel(row: ReviewRow) {
  return row.importKey ? `${row.row}` : String(row.row)
}

function duplicateKey(parts: unknown[]) {
  return parts
    .map(part => String(part ?? '').trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|')
}

function markDuplicateRows<T extends ReviewRow>(rows: T[], getKey: (row: T) => string) {
  const groups = new Map<string, ImportRowRef[]>()

  for (const row of rows) {
    const key = getKey(row)
    if (!key.replace(/\|/g, '').trim()) continue
    groups.set(key, [...(groups.get(key) ?? []), reviewKey(row)])
  }

  const duplicates = new Set<ImportRowRef>()
  for (const groupRows of groups.values()) {
    if (groupRows.length > 1) {
      groupRows.forEach(row => duplicates.add(row))
    }
  }

  return duplicates
}

function detectDuplicateRows(rows: MappedRows): DuplicateRows {
  return {
    members: markDuplicateRows(rows.members, row => duplicateKey([row.name])),
    dues: markDuplicateRows(rows.dues, row => duplicateKey([row.memberName, row.fundCode, row.periodMonth])),
    cashTransactions: markDuplicateRows(rows.cashTransactions, row => duplicateKey([
      row.transactionDate,
      row.direction,
      row.category,
      row.amountIdr,
      row.counterpartyName,
    ])),
    loans: markDuplicateRows(rows.loans, row => duplicateKey([
      row.borrowerName,
      row.loanDate,
      row.principalAmountIdr,
    ])),
  }
}

function duplicateGroupMapFromSets(duplicateRows: DuplicateRows): DuplicateGroupMap {
  return {
    members: new Map(Array.from(duplicateRows.members).map(row => [row, Array.from(duplicateRows.members).filter(item => item !== row)])),
    dues: new Map(Array.from(duplicateRows.dues).map(row => [row, Array.from(duplicateRows.dues).filter(item => item !== row)])),
    cashTransactions: new Map(Array.from(duplicateRows.cashTransactions).map(row => [row, Array.from(duplicateRows.cashTransactions).filter(item => item !== row)])),
    loans: new Map(Array.from(duplicateRows.loans).map(row => [row, Array.from(duplicateRows.loans).filter(item => item !== row)])),
  }
}

function duplicateRowsFromSummary(summary: ImportSummary, rows: MappedRows, hasMappedRows: boolean): DuplicateRows {
  if (summary.duplicateRows) {
    return {
      members: new Set(summary.duplicateRows.members ?? []),
      dues: new Set(summary.duplicateRows.dues ?? []),
      cashTransactions: new Set(summary.duplicateRows.cashTransactions ?? []),
      loans: new Set(summary.duplicateRows.loans ?? []),
    }
  }

  return hasMappedRows ? detectDuplicateRows(rows) : EMPTY_DUPLICATE_ROWS
}

function conflictRowsFromSummary(summary: ImportSummary): ConflictRows {
  if (!summary.conflictRows) return EMPTY_CONFLICT_ROWS

  return {
    members: new Set(summary.conflictRows.members ?? []),
    dues: new Set(summary.conflictRows.dues ?? []),
    cashTransactions: new Set(summary.conflictRows.cashTransactions ?? []),
    loans: new Set(summary.conflictRows.loans ?? []),
  }
}

function duplicateGroupMapFromSummary(summary: ImportSummary, duplicateRows: DuplicateRows): DuplicateGroupMap {
  if (!summary.duplicateGroups) return duplicateGroupMapFromSets(duplicateRows)

  const fromGroups = (groups: Array<{ rows: ImportRowRef[] }> | undefined) => {
    const map = new Map<ImportRowRef, ImportRowRef[]>()
    groups?.forEach(group => {
      group.rows.forEach(row => {
        map.set(row, group.rows.filter(item => item !== row))
      })
    })
    return map
  }

  return {
    members: fromGroups(summary.duplicateGroups.members),
    dues: fromGroups(summary.duplicateGroups.dues),
    cashTransactions: fromGroups(summary.duplicateGroups.cashTransactions),
    loans: fromGroups(summary.duplicateGroups.loans),
  }
}

function duplicateGroupLabel(duplicateGroupMap: DuplicateGroupMap, tab: ReviewTab, row: ReviewRow) {
  const relatedRows = duplicateGroupMap[tab].get(reviewKey(row)) ?? []
  if (relatedRows.length === 0) return 'Duplikat'
  if (relatedRows.every(item => typeof item === 'number')) {
    return `Sama dengan baris ${relatedRows.join(', ')}`
  }
  return `${relatedRows.length} data serupa`
}

function skippedRowsFromDuplicates(duplicateRows: DuplicateRows): SkippedRows {
  return {
    members: Array.from(duplicateRows.members).sort((a, b) => String(a).localeCompare(String(b))),
    dues: Array.from(duplicateRows.dues).sort((a, b) => String(a).localeCompare(String(b))),
    cashTransactions: Array.from(duplicateRows.cashTransactions).sort((a, b) => String(a).localeCompare(String(b))),
    loans: Array.from(duplicateRows.loans).sort((a, b) => String(a).localeCompare(String(b))),
  }
}

function countSkippedRows(skippedRows: SkippedRows) {
  return REVIEW_TABS.reduce((total, tab) => total + skippedRows[tab.key].length, 0)
}

function isSkipped(skippedRows: SkippedRows, tab: ReviewTab, row: ReviewRow) {
  return skippedRows[tab].includes(reviewKey(row)) || skippedRows[tab].includes(row.row)
}

function hasDuplicate(duplicateRows: DuplicateRows, tab: ReviewTab, row: ReviewRow) {
  return duplicateRows[tab].has(reviewKey(row)) || duplicateRows[tab].has(row.row)
}

function hasConflict(conflictRows: ConflictRows, tab: ReviewTab, row: ReviewRow) {
  return conflictRows[tab].has(reviewKey(row)) || conflictRows[tab].has(row.row)
}

function reviewStatus(skippedRows: SkippedRows, tab: ReviewTab, row: ReviewRow) {
  return isSkipped(skippedRows, tab, row) ? 'Diskip' : 'Diterima'
}

function duplicateStatus(duplicateRows: DuplicateRows, duplicateGroupMap: DuplicateGroupMap, tab: ReviewTab, row: ReviewRow) {
  return hasDuplicate(duplicateRows, tab, row) ? duplicateGroupLabel(duplicateGroupMap, tab, row) : 'Tidak'
}

function conflictStatus(conflictRows: ConflictRows, tab: ReviewTab, row: ReviewRow) {
  return hasConflict(conflictRows, tab, row) ? 'Ada di PostgreSQL' : 'Tidak'
}

function sourceKey(row: SourceRow) {
  return `${row.sourceFile ?? ''}|${row.sourceSheet ?? ''}`
}

function sourceLabel(row: SourceRow) {
  return [row.sourceFile, row.sourceSheet].filter(Boolean).join(' / ') || 'Sumber tidak diketahui'
}

function matchesSource(row: SourceRow, sourceFilter: string) {
  return sourceFilter === 'all' || sourceKey(row) === sourceFilter
}

function importReviewExportRows(rows: MappedRows, skippedRows: SkippedRows, duplicateRows: DuplicateRows, duplicateGroupMap: DuplicateGroupMap, conflictRows: ConflictRows) {
  return [
    ...rows.members.map(row => ({
      sumber_file: row.sourceFile,
      sumber_sheet: row.sourceSheet,
      jenis: 'Anggota',
      baris: row.row,
      status: reviewStatus(skippedRows, 'members', row),
      duplikat: duplicateStatus(duplicateRows, duplicateGroupMap, 'members', row),
      konflik_db: conflictStatus(conflictRows, 'members', row),
      nama: row.name,
      dana: '',
      periode_tanggal: row.joinedAt,
      kategori: row.departmentName,
      nominal: '',
      catatan: row.employeeType,
    })),
    ...rows.dues.map(row => ({
      sumber_file: row.sourceFile,
      sumber_sheet: row.sourceSheet,
      jenis: 'Iuran',
      baris: row.row,
      status: reviewStatus(skippedRows, 'dues', row),
      duplikat: duplicateStatus(duplicateRows, duplicateGroupMap, 'dues', row),
      konflik_db: conflictStatus(conflictRows, 'dues', row),
      nama: row.memberName,
      dana: row.fundCode,
      periode_tanggal: row.periodMonth,
      kategori: '',
      nominal: row.amountIdr,
      catatan: row.note,
    })),
    ...rows.cashTransactions.map(row => ({
      sumber_file: row.sourceFile,
      sumber_sheet: row.sourceSheet,
      jenis: 'Buku Kas',
      baris: row.row,
      status: reviewStatus(skippedRows, 'cashTransactions', row),
      duplikat: duplicateStatus(duplicateRows, duplicateGroupMap, 'cashTransactions', row),
      konflik_db: conflictStatus(conflictRows, 'cashTransactions', row),
      nama: row.counterpartyName,
      dana: row.fundCode,
      periode_tanggal: row.transactionDate,
      kategori: `${row.direction} - ${row.category}`,
      nominal: row.amountIdr,
      catatan: row.note,
    })),
    ...rows.loans.map(row => ({
      sumber_file: row.sourceFile,
      sumber_sheet: row.sourceSheet,
      jenis: 'Pinjaman',
      baris: row.row,
      status: reviewStatus(skippedRows, 'loans', row),
      duplikat: duplicateStatus(duplicateRows, duplicateGroupMap, 'loans', row),
      konflik_db: conflictStatus(conflictRows, 'loans', row),
      nama: row.borrowerName,
      dana: row.cashSourceName,
      periode_tanggal: row.loanDate,
      kategori: 'Pinjaman',
      nominal: row.principalAmountIdr,
      catatan: row.note,
    })),
  ]
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'import'
}

function matchesQuery(parts: unknown[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return parts.some(part => String(part ?? '').toLowerCase().includes(needle))
}

function matchesStatus(isSkipped: boolean, isDuplicate: boolean, isConflict: boolean, statusFilter: ReviewStatusFilter) {
  if (statusFilter === 'conflicts') return isConflict
  if (statusFilter === 'duplicates') return isDuplicate
  if (statusFilter === 'skipped') return isSkipped
  if (statusFilter === 'accepted') return !isSkipped
  return true
}

function reviewRowNumbers(
  tab: ReviewTab,
  rows: MappedRows,
  skippedRows: SkippedRows,
  duplicateRows: DuplicateRows,
  conflictRows: ConflictRows,
  query: string,
  statusFilter: ReviewStatusFilter,
  sourceFilter: string
) {
  if (tab === 'members') {
    return rows.members
      .filter(row => matchesSource(row, sourceFilter))
      .filter(row => matchesQuery([row.row, row.sourceFile, row.sourceSheet, row.name, row.memberNo, row.departmentName, row.employeeType], query))
      .filter(row => matchesStatus(isSkipped(skippedRows, 'members', row), hasDuplicate(duplicateRows, 'members', row), hasConflict(conflictRows, 'members', row), statusFilter))
      .map(reviewKey)
  }

  if (tab === 'dues') {
    return rows.dues
      .filter(row => matchesSource(row, sourceFilter))
      .filter(row => matchesQuery([row.row, row.sourceFile, row.sourceSheet, row.memberName, row.fundCode, row.periodMonth, row.amountIdr, row.note], query))
      .filter(row => matchesStatus(isSkipped(skippedRows, 'dues', row), hasDuplicate(duplicateRows, 'dues', row), hasConflict(conflictRows, 'dues', row), statusFilter))
      .map(reviewKey)
  }

  if (tab === 'cashTransactions') {
    return rows.cashTransactions
      .filter(row => matchesSource(row, sourceFilter))
      .filter(row => matchesQuery([
        row.row,
        row.sourceFile,
        row.sourceSheet,
        row.transactionDate,
        row.direction,
        row.fundCode,
        row.counterpartyName,
        row.category,
        row.amountIdr,
        row.note,
      ], query))
      .filter(row => matchesStatus(isSkipped(skippedRows, 'cashTransactions', row), hasDuplicate(duplicateRows, 'cashTransactions', row), hasConflict(conflictRows, 'cashTransactions', row), statusFilter))
      .map(reviewKey)
  }

  return rows.loans
    .filter(row => matchesSource(row, sourceFilter))
    .filter(row => matchesQuery([
      row.row,
      row.sourceFile,
      row.sourceSheet,
      row.borrowerName,
      row.cashSourceName,
      row.principalAmountIdr,
      row.paidAmountIdr,
      row.loanDate,
      row.note,
    ], query))
    .filter(row => matchesStatus(isSkipped(skippedRows, 'loans', row), hasDuplicate(duplicateRows, 'loans', row), hasConflict(conflictRows, 'loans', row), statusFilter))
    .map(reviewKey)
}

function VirtualReviewList<T extends ReviewRow>({
  rows,
  emptyMessage,
  renderRow,
}: {
  rows: T[]
  emptyMessage: string
  renderRow: (row: T) => ReactNode
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const totalRows = rows.length
  const visibleCapacity = Math.ceil(REVIEW_VIEWPORT_HEIGHT / REVIEW_ROW_HEIGHT)
  const startIndex = Math.max(Math.floor(scrollTop / REVIEW_ROW_HEIGHT) - REVIEW_OVERSCAN, 0)
  const endIndex = Math.min(startIndex + visibleCapacity + REVIEW_OVERSCAN * 2, totalRows)
  const visibleRows = rows.slice(startIndex, endIndex)
  const estimatedHeight = Math.max(totalRows * REVIEW_ROW_HEIGHT, REVIEW_ROW_HEIGHT)
  const firstVisible = totalRows === 0 ? 0 : startIndex + 1
  const lastVisible = totalRows === 0 ? 0 : endIndex

  useEffect(() => {
    setScrollTop(0)
    viewportRef.current?.scrollTo({ top: 0 })
  }, [rows])

  if (totalRows === 0) {
    return <div className="import-review-empty">{emptyMessage}</div>
  }

  return (
    <>
      <div className="import-review-window-meta">
        <span>{totalRows.toLocaleString('id-ID')} baris ditemukan</span>
        <strong>
          {firstVisible.toLocaleString('id-ID')}-{lastVisible.toLocaleString('id-ID')} terlihat
        </strong>
      </div>
      <div
        ref={viewportRef}
        className="import-review-viewport"
        onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className="import-review-spacer" style={{ height: estimatedHeight }}>
          <div className="import-review-window" style={{ transform: `translateY(${startIndex * REVIEW_ROW_HEIGHT}px)` }}>
            {visibleRows.map(row => renderRow(row))}
          </div>
        </div>
      </div>
    </>
  )
}

function ReviewPreview({
  tab,
  rows,
  skippedRows,
  duplicateRows,
  duplicateGroupMap,
  conflictRows,
  query,
  statusFilter,
  sourceFilter,
  onToggleSkipped,
}: {
  tab: ReviewTab
  rows: MappedRows
  skippedRows: SkippedRows
  duplicateRows: DuplicateRows
  duplicateGroupMap: DuplicateGroupMap
  conflictRows: ConflictRows
  query: string
  statusFilter: ReviewStatusFilter
  sourceFilter: string
  onToggleSkipped: (tab: ReviewTab, row: ImportRowRef) => void
}) {
  const isEmpty = rows[tab].length === 0

  if (isEmpty) {
    return (
      <div className="import-review-empty">
        Belum ada baris yang berhasil dipetakan untuk bagian ini.
      </div>
    )
  }

  if (tab === 'members') {
    const filteredRows = rows.members.filter(row => matchesQuery([
      row.row,
      row.sourceFile,
      row.sourceSheet,
      row.name,
      row.memberNo,
      row.departmentName,
      row.employeeType,
    ], query) && matchesSource(row, sourceFilter) && matchesStatus(isSkipped(skippedRows, 'members', row), hasDuplicate(duplicateRows, 'members', row), hasConflict(conflictRows, 'members', row), statusFilter))
    return (
      <VirtualReviewList
        rows={filteredRows}
        emptyMessage="Tidak ada anggota yang cocok dengan pencarian."
        renderRow={row => (
          <article key={`member-${reviewKey(row)}`} className={cn('import-review-row', isSkipped(skippedRows, 'members', row) && 'skipped', (hasDuplicate(duplicateRows, 'members', row) || hasConflict(conflictRows, 'members', row)) && 'conflict')}>
            <div>
              <span>Baris {rowLabel(row)} / {shortText(row.sourceSheet, 'Sheet')}</span>
              <strong>{shortText(row.name)}</strong>
            </div>
            <small>{shortText(row.departmentName, 'Tanpa departemen')} / {shortText(row.employeeType, 'Unknown')}</small>
            {hasDuplicate(duplicateRows, 'members', row) && <em>{duplicateGroupLabel(duplicateGroupMap, 'members', row)}</em>}
            {hasConflict(conflictRows, 'members', row) && <em>Ada di DB</em>}
            <button type="button" className="import-review-toggle" onClick={() => onToggleSkipped('members', reviewKey(row))}>
              {isSkipped(skippedRows, 'members', row) ? 'Terima baris' : 'Skip baris'}
            </button>
          </article>
        )}
      />
    )
  }

  if (tab === 'dues') {
    const filteredRows = rows.dues.filter(row => matchesQuery([
      row.row,
      row.sourceFile,
      row.sourceSheet,
      row.memberName,
      row.fundCode,
      row.periodMonth,
      row.amountIdr,
      row.note,
    ], query) && matchesSource(row, sourceFilter) && matchesStatus(isSkipped(skippedRows, 'dues', row), hasDuplicate(duplicateRows, 'dues', row), hasConflict(conflictRows, 'dues', row), statusFilter))
    return (
      <VirtualReviewList
        rows={filteredRows}
        emptyMessage="Tidak ada iuran yang cocok dengan pencarian."
        renderRow={row => (
          <article key={`due-${reviewKey(row)}`} className={cn('import-review-row', isSkipped(skippedRows, 'dues', row) && 'skipped', (hasDuplicate(duplicateRows, 'dues', row) || hasConflict(conflictRows, 'dues', row)) && 'conflict')}>
            <div>
              <span>Baris {rowLabel(row)} / {shortText(row.sourceSheet, row.fundCode)}</span>
              <strong>{shortText(row.memberName)}</strong>
            </div>
            <small>{row.periodMonth} / {rp(row.amountIdr)}</small>
            {hasDuplicate(duplicateRows, 'dues', row) && <em>{duplicateGroupLabel(duplicateGroupMap, 'dues', row)}</em>}
            {hasConflict(conflictRows, 'dues', row) && <em>Ada di DB</em>}
            <button type="button" className="import-review-toggle" onClick={() => onToggleSkipped('dues', reviewKey(row))}>
              {isSkipped(skippedRows, 'dues', row) ? 'Terima baris' : 'Skip baris'}
            </button>
          </article>
        )}
      />
    )
  }

  if (tab === 'cashTransactions') {
    const filteredRows = rows.cashTransactions.filter(row => matchesQuery([
      row.row,
      row.sourceFile,
      row.sourceSheet,
      row.transactionDate,
      row.direction,
      row.fundCode,
      row.counterpartyName,
      row.category,
      row.amountIdr,
      row.note,
    ], query) && matchesSource(row, sourceFilter) && matchesStatus(isSkipped(skippedRows, 'cashTransactions', row), hasDuplicate(duplicateRows, 'cashTransactions', row), hasConflict(conflictRows, 'cashTransactions', row), statusFilter))
    return (
      <VirtualReviewList
        rows={filteredRows}
        emptyMessage="Tidak ada transaksi kas yang cocok dengan pencarian."
        renderRow={row => (
          <article key={`cash-${reviewKey(row)}`} className={cn('import-review-row', isSkipped(skippedRows, 'cashTransactions', row) && 'skipped', (hasDuplicate(duplicateRows, 'cashTransactions', row) || hasConflict(conflictRows, 'cashTransactions', row)) && 'conflict')}>
            <div>
              <span>Baris {rowLabel(row)} / {shortText(row.sourceSheet, row.transactionDate)}</span>
              <strong>{shortText(row.category)}</strong>
            </div>
            <small>{row.direction} / {rp(row.amountIdr)} / {shortText(row.counterpartyName, 'Tanpa pihak')}</small>
            {hasDuplicate(duplicateRows, 'cashTransactions', row) && <em>{duplicateGroupLabel(duplicateGroupMap, 'cashTransactions', row)}</em>}
            {hasConflict(conflictRows, 'cashTransactions', row) && <em>Ada di DB</em>}
            <button type="button" className="import-review-toggle" onClick={() => onToggleSkipped('cashTransactions', reviewKey(row))}>
              {isSkipped(skippedRows, 'cashTransactions', row) ? 'Terima baris' : 'Skip baris'}
            </button>
          </article>
        )}
      />
    )
  }

  const filteredRows = rows.loans.filter(row => matchesQuery([
    row.row,
    row.sourceFile,
    row.sourceSheet,
    row.borrowerName,
    row.cashSourceName,
    row.principalAmountIdr,
    row.paidAmountIdr,
    row.loanDate,
    row.note,
  ], query) && matchesSource(row, sourceFilter) && matchesStatus(isSkipped(skippedRows, 'loans', row), hasDuplicate(duplicateRows, 'loans', row), hasConflict(conflictRows, 'loans', row), statusFilter))
  return (
    <VirtualReviewList
      rows={filteredRows}
      emptyMessage="Tidak ada pinjaman yang cocok dengan pencarian."
      renderRow={row => (
        <article key={`loan-${reviewKey(row)}`} className={cn('import-review-row', isSkipped(skippedRows, 'loans', row) && 'skipped', (hasDuplicate(duplicateRows, 'loans', row) || hasConflict(conflictRows, 'loans', row)) && 'conflict')}>
          <div>
            <span>Baris {rowLabel(row)} / {shortText(row.sourceSheet, row.loanDate)}</span>
            <strong>{shortText(row.borrowerName)}</strong>
          </div>
          <small>Pokok {rp(row.principalAmountIdr)} / Terbayar {rp(row.paidAmountIdr ?? 0)}</small>
          {hasDuplicate(duplicateRows, 'loans', row) && <em>{duplicateGroupLabel(duplicateGroupMap, 'loans', row)}</em>}
          {hasConflict(conflictRows, 'loans', row) && <em>Ada di DB</em>}
          <button type="button" className="import-review-toggle" onClick={() => onToggleSkipped('loans', reviewKey(row))}>
            {isSkipped(skippedRows, 'loans', row) ? 'Terima baris' : 'Skip baris'}
          </button>
        </article>
      )}
    />
  )
}

export default function ImportPage() {
  const { notify } = useToast()
  const { state, dispatch } = useKoperasiStore()
  const permissions = usePermissions()
  const [step, setStep] = useState(1)
  const [reviewTab, setReviewTab] = useState<ReviewTab>('members')
  const [reviewSearch, setReviewSearch] = useState('')
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('all')
  const [reviewSourceFilter, setReviewSourceFilter] = useState('all')
  const [autoSkipDuplicates, setAutoSkipDuplicates] = useState(false)
  const [skippedRows, setSkippedRows] = useState<SkippedRows>(EMPTY_SKIPPED_ROWS)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [committed, setCommitted] = useState(false)
  const [confirmCommit, setConfirmCommit] = useState(false)
  const [commitTarget, setCommitTarget] = useState<ImportRowGroup[] | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [cleaningOldPreviews, setCleaningOldPreviews] = useState(false)
  const [commitSimulation, setCommitSimulation] = useState<ImportCommitSimulation | null>(null)
  const [simulatingCommit, setSimulatingCommit] = useState(false)
  const importBatches = state.importBatches.length > 0 ? state.importBatches : IMPORT_BATCHES
  const batch = importBatches.find(item => item.id === activeBatchId) ?? importBatches[0] ?? IMPORT_BATCHES[0]
  const summary = batch.summary!
  const warningDetails = summary.warningDetails?.length ? summary.warningDetails : MOCK_WARNINGS
  const mappedRows = summary.mappedRows ?? EMPTY_MAPPED_ROWS
  const hasMappedRows = Boolean(summary.mappedRows)
  const sourceFiles = summary.sourceFiles?.length ? summary.sourceFiles : fileName ? fileName.split(' + ') : []
  const oldPreviewBatchIds = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return importBatches
      .filter(item => item.status !== 'committed')
      .filter(item => {
        const createdAt = Date.parse(item.createdAt)
        return Number.isFinite(createdAt) && createdAt < cutoff
      })
      .map(item => item.id)
  }, [importBatches])

  const currentStep = STEPS.find(item => item.n === step) ?? STEPS[0]

  const summaryCards = useMemo(() => [
    ['Anggota', summary.membersDetected],
    ['Iuran', summary.contributionsDetected],
    ['Transaksi', summary.transactionsDetected],
    ['Pinjaman', summary.loansDetected],
    ['Peringatan', summary.warnings],
    ['Error', summary.errors],
  ], [summary])

  const reviewTabs = useMemo(() => REVIEW_TABS.map(tab => {
    const skipped = skippedRows[tab.key].length
    return {
      ...tab,
      count: Math.max(mappedRows[tab.key].length - skipped, 0),
      skipped,
    }
  }), [mappedRows, skippedRows])

  const duplicateRows = useMemo(
    () => duplicateRowsFromSummary(summary, mappedRows, hasMappedRows),
    [hasMappedRows, mappedRows, summary]
  )

  const duplicateGroupMap = useMemo(
    () => hasMappedRows ? duplicateGroupMapFromSummary(summary, duplicateRows) : EMPTY_DUPLICATE_GROUP_MAP,
    [duplicateRows, hasMappedRows, summary]
  )

  const conflictRows = useMemo(
    () => conflictRowsFromSummary(summary),
    [summary]
  )

  const duplicateCount = useMemo(
    () => REVIEW_TABS.reduce((total, tab) => total + duplicateRows[tab.key].size, 0),
    [duplicateRows]
  )

  const conflictCount = useMemo(
    () => REVIEW_TABS.reduce((total, tab) => total + conflictRows[tab.key].size, 0),
    [conflictRows]
  )

  const skippedCount = useMemo(
    () => countSkippedRows(skippedRows),
    [skippedRows]
  )

  const sourceOptions = useMemo(() => {
    const sourceMap = new Map<string, string>()
    REVIEW_TABS.forEach(tab => {
      mappedRows[tab.key].forEach(row => {
        const key = sourceKey(row)
        if (key !== '|' && !sourceMap.has(key)) sourceMap.set(key, sourceLabel(row))
      })
    })
    return Array.from(sourceMap.entries()).map(([key, label]) => ({ key, label }))
  }, [mappedRows])

  const commitCounts = useMemo(() => ({
    members: hasMappedRows ? mappedRows.members.filter(row => !isSkipped(skippedRows, 'members', row)).length : summary.membersDetected,
    contributions: hasMappedRows ? mappedRows.dues.filter(row => !isSkipped(skippedRows, 'dues', row)).length : summary.contributionsDetected,
    transactions: hasMappedRows ? mappedRows.cashTransactions.filter(row => !isSkipped(skippedRows, 'cashTransactions', row)).length : summary.transactionsDetected,
    loans: hasMappedRows ? mappedRows.loans.filter(row => !isSkipped(skippedRows, 'loans', row)).length : summary.loansDetected,
  }), [hasMappedRows, mappedRows, skippedRows, summary])

  const mappedRowCount = useMemo(
    () => mappedRows.members.length + mappedRows.dues.length + mappedRows.cashTransactions.length + mappedRows.loans.length,
    [mappedRows]
  )

  const committedGroups = useMemo<Record<ImportRowGroup, boolean>>(() => ({
    members: batch.status === 'committed' || Boolean(summary.committedGroups?.members),
    dues: batch.status === 'committed' || Boolean(summary.committedGroups?.dues),
    cashTransactions: batch.status === 'committed' || Boolean(summary.committedGroups?.cashTransactions),
    loans: batch.status === 'committed' || Boolean(summary.committedGroups?.loans),
  }), [batch.status, summary.committedGroups])

  const remainingCommitGroups = useMemo(
    () => COMMIT_GROUPS.map(group => group.key).filter(group => !committedGroups[group]),
    [committedGroups]
  )

  const isFullyCommitted = remainingCommitGroups.length === 0 || committed

  const commitGroupCards = useMemo(() => COMMIT_GROUPS.map(group => {
    const serverGroup = commitSimulation?.groups.find(item => item.group === group.key)
    const rows = mappedRows[group.key] as ReviewRow[]
    const total = hasMappedRows
      ? rows.length
      : group.key === 'members'
        ? summary.membersDetected
        : group.key === 'dues'
          ? summary.contributionsDetected
          : group.key === 'cashTransactions'
            ? summary.transactionsDetected
            : summary.loansDetected
    const skipped = hasMappedRows ? rows.filter(row => isSkipped(skippedRows, group.key, row)).length : skippedRows[group.key].length
    const updates = hasMappedRows ? rows.filter(row => !isSkipped(skippedRows, group.key, row) && hasConflict(conflictRows, group.key, row)).length : 0
    const ready = Math.max(total - skipped, 0)
    const created = Math.max(ready - updates, 0)
    const count = group.key === 'members'
      ? commitCounts.members
      : group.key === 'dues'
        ? commitCounts.contributions
        : group.key === 'cashTransactions'
          ? commitCounts.transactions
          : commitCounts.loans
    const savedCount = group.key === 'members'
      ? summary.committedCounts?.members ?? 0
      : group.key === 'dues'
        ? summary.committedCounts?.contributions ?? 0
        : group.key === 'cashTransactions'
          ? summary.committedCounts?.transactions ?? 0
          : summary.committedCounts?.loans ?? 0

    return {
      ...group,
      count: serverGroup?.ready ?? count,
      total: serverGroup?.total ?? total,
      skipped: serverGroup?.skipped ?? skipped,
      updates: serverGroup?.updates ?? updates,
      created: serverGroup?.created ?? created,
      savedCount,
      committed: serverGroup?.committed ?? committedGroups[group.key],
      serverBlockedReason: serverGroup?.blockedReason ?? null,
    }
  }), [commitCounts, commitSimulation, committedGroups, conflictRows, hasMappedRows, mappedRows, skippedRows, summary])

  const commitTargetLabel = useMemo(() => {
    const target = commitTarget ?? remainingCommitGroups
    return target
      .map(key => COMMIT_GROUPS.find(group => group.key === key)?.label ?? key)
      .join(', ')
  }, [commitTarget, remainingCommitGroups])

  useEffect(() => {
    if (step !== 4 || !activeBatchId) {
      setCommitSimulation(null)
      setSimulatingCommit(false)
      return
    }

    let cancelled = false
    setSimulatingCommit(true)
    apiClient.simulateImportCommitBatch(activeBatchId, { skippedRows, groups: remainingCommitGroups })
      .then(simulation => {
        if (!cancelled) setCommitSimulation(simulation)
      })
      .catch(error => {
        if (!cancelled) {
          setCommitSimulation({
            canCommit: false,
            issues: [error instanceof Error ? error.message : 'Simulasi commit gagal.'],
            requestedGroups: remainingCommitGroups,
            groupsToCommit: [],
            groups: [],
            totals: { total: 0, skipped: 0, ready: 0, updates: 0, created: 0 },
          })
        }
      })
      .finally(() => {
        if (!cancelled) setSimulatingCommit(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeBatchId, remainingCommitGroups, skippedRows, step])

  const commitGroupBlockReasons = useMemo(() => {
    const reasons = new Map<ImportRowGroup, string | null>()
    commitGroupCards.forEach(group => {
      let reason: string | null = null
      if (!permissions.canMutateLedger) reason = 'Role viewer hanya bisa melihat preview.'
      else if (!activeBatchId) reason = 'Preview impor belum tersedia.'
      else if (!hasMappedRows) reason = 'Mapping baris belum tersedia. Upload file Excel asli dulu.'
      else if (mappedRowCount === 0) reason = 'Preview tidak punya baris mapped.'
      else if (group.committed) reason = `${group.label} sudah committed.`
      else if (group.count === 0) reason = `Tidak ada baris aktif untuk ${group.label}.`
      else if (group.serverBlockedReason) reason = group.serverBlockedReason
      else if (committing) reason = 'Proses simpan sedang berjalan.'
      reasons.set(group.key, reason)
    })
    return reasons
  }, [activeBatchId, commitGroupCards, committing, hasMappedRows, mappedRowCount, permissions.canMutateLedger])

  const commitPreflightIssues = useMemo(() => {
    if (simulatingCommit) return ['Memuat simulasi commit dari server.']
    if (commitSimulation) return commitSimulation.issues

    const issues: string[] = []
    const remainingReadyCount = commitGroupCards
      .filter(group => !group.committed)
      .reduce((total, group) => total + group.count, 0)

    if (!permissions.canMutateLedger) issues.push('Role viewer tidak bisa menyimpan impor.')
    if (!activeBatchId) issues.push('Preview impor belum tersedia.')
    if (!hasMappedRows) issues.push('Mapping baris belum tersedia. Buat preview dari file Excel asli.')
    if (hasMappedRows && mappedRowCount === 0) issues.push('Preview tidak punya baris mapped.')
    if (remainingCommitGroups.length === 0) issues.push('Semua grup impor sudah committed.')
    if (remainingCommitGroups.length > 0 && remainingReadyCount === 0) issues.push('Tidak ada baris aktif untuk grup yang tersisa. Batalkan skip baris atau impor file lain.')
    if (committing) issues.push('Proses simpan sedang berjalan.')

    return issues
  }, [activeBatchId, commitGroupCards, commitSimulation, committing, hasMappedRows, mappedRowCount, permissions.canMutateLedger, remainingCommitGroups.length, simulatingCommit])

  const canCommitRemaining = !simulatingCommit && (commitSimulation ? commitSimulation.canCommit : commitPreflightIssues.length === 0)

  const importBreakdown = useMemo(() => {
    const summarize = <T,>(items: T[], getLabel: (item: T) => string, getAmount: (item: T) => number) => {
      const groups = new Map<string, { label: string; count: number; amount: number }>()
      items.forEach(item => {
        const label = getLabel(item) || 'Tidak diketahui'
        const current = groups.get(label) ?? { label, count: 0, amount: 0 }
        groups.set(label, {
          label,
          count: current.count + 1,
          amount: current.amount + getAmount(item),
        })
      })
      return Array.from(groups.values()).sort((a, b) => b.amount - a.amount || b.count - a.count).slice(0, 6)
    }

    return [
      { title: 'Iuran per dana', rows: summarize(mappedRows.dues, row => row.fundCode, row => row.amountIdr) },
      { title: 'Kas keluar per dana', rows: summarize(mappedRows.cashTransactions, row => row.fundCode ?? row.category, row => row.amountIdr) },
      { title: 'Pinjaman per sumber', rows: summarize(mappedRows.loans, row => row.cashSourceName ?? 'Sumber kas', row => row.principalAmountIdr) },
    ].filter(group => group.rows.length > 0)
  }, [mappedRows])

  useEffect(() => {
    if (reviewSourceFilter !== 'all' && !sourceOptions.some(option => option.key === reviewSourceFilter)) {
      setReviewSourceFilter('all')
    }
  }, [reviewSourceFilter, sourceOptions])

  const activeReviewRows = useMemo(
    () => reviewRowNumbers(reviewTab, mappedRows, skippedRows, duplicateRows, conflictRows, reviewSearch, reviewStatusFilter, reviewSourceFilter),
    [conflictRows, duplicateRows, mappedRows, reviewSearch, reviewSourceFilter, reviewStatusFilter, reviewTab, skippedRows]
  )

  const activeDuplicateRows = useMemo(
    () => reviewRowNumbers(reviewTab, mappedRows, skippedRows, duplicateRows, conflictRows, reviewSearch, 'duplicates', reviewSourceFilter),
    [conflictRows, duplicateRows, mappedRows, reviewSearch, reviewSourceFilter, reviewTab, skippedRows]
  )

  const activeConflictRows = useMemo(
    () => reviewRowNumbers(reviewTab, mappedRows, skippedRows, duplicateRows, conflictRows, reviewSearch, 'conflicts', reviewSourceFilter),
    [conflictRows, duplicateRows, mappedRows, reviewSearch, reviewSourceFilter, reviewTab, skippedRows]
  )

  function toggleSkippedRow(tab: ReviewTab, row: ImportRowRef) {
    setSkippedRows(current => {
      const exists = current[tab].includes(row)
      return {
        ...current,
        [tab]: exists ? current[tab].filter(item => item !== row) : [...current[tab], row],
      }
    })
  }

  function bulkSetSkipped(tab: ReviewTab, rows: ImportRowRef[], skipped: boolean) {
    if (rows.length === 0) return

    setSkippedRows(current => {
      const rowSet = new Set(rows)
      const nextRows = skipped
        ? Array.from(new Set([...current[tab], ...rows])).sort((a, b) => String(a).localeCompare(String(b)))
        : current[tab].filter(row => !rowSet.has(row))

      return {
        ...current,
        [tab]: nextRows,
      }
    })
  }

  async function exportReviewXlsx() {
    const rows = importReviewExportRows(mappedRows, skippedRows, duplicateRows, duplicateGroupMap, conflictRows)
    if (rows.length === 0) {
      notify('Belum ada baris review untuk diekspor.', 'error')
      return
    }

    const dateSlug = (batch.createdAt || new Date().toISOString()).slice(0, 10)
    const filename = `koperasi-review-import-${safeSlug(batch.originalFileName)}-${dateSlug}.xlsx`
    try {
      await downloadXlsx(filename, [{ name: 'Review Import', rows }])
      notify(`XLSX review import dibuat: ${filename}`)
    } catch {
      notify('Gagal membuat XLSX review import.', 'error')
    }
  }

  async function previewFiles(files: File[], fallbackName = 'koperasi_2026.xlsx') {
    if (!permissions.canMutateLedger) {
      notify('Role viewer hanya bisa melihat simulasi impor.', 'info')
      return
    }

    const originalFileName = files.length > 0 ? files.map(file => file.name).join(' + ') : fallbackName

    setPreviewing(true)
    try {
      const body = new FormData()
      files.forEach(file => body.append('files', file))
      body.append('originalFileName', originalFileName)
      const preview = await apiClient.previewImportBatch(body)
      const previewSummary = preview.summary
      const previewMappedRows = previewSummary?.mappedRows ?? EMPTY_MAPPED_ROWS
      const previewDuplicateRows = previewSummary
        ? duplicateRowsFromSummary(previewSummary, previewMappedRows, Boolean(previewSummary.mappedRows))
        : EMPTY_DUPLICATE_ROWS
      const nextSkippedRows = autoSkipDuplicates
        ? skippedRowsFromDuplicates(previewDuplicateRows)
        : { ...EMPTY_SKIPPED_ROWS }
      const nextSkippedCount = countSkippedRows(nextSkippedRows)

      dispatch({ type: 'import_batch.upsert', batch: preview })
      setActiveBatchId(preview.id)
      setFileName(preview.originalFileName)
      setCommitted(false)
      setCommitTarget(null)
      setSkippedRows(nextSkippedRows)
      setReviewSearch('')
      setReviewStatusFilter('all')
      setReviewSourceFilter('all')
      setStep(2)
      notify(autoSkipDuplicates && nextSkippedCount > 0
        ? `Preview dibuat. ${nextSkippedCount} baris duplikat otomatis diskip.`
        : files.length > 1
          ? `Preview gabungan ${files.length} file dibuat di PostgreSQL.`
          : 'Preview impor dibuat di PostgreSQL.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membuat preview impor.', 'error')
    } finally {
      setPreviewing(false)
    }
  }

  function pickDemoFile() {
    void previewFiles([], 'koperasi_2026.xlsx')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(file => /\.(xlsx|xls)$/i.test(file.name))
    if (files.length > 0) {
      if (!permissions.canMutateLedger) {
        notify('Role viewer hanya bisa melihat simulasi impor.', 'info')
        return
      }
      void previewFiles(files)
    }
  }, [notify, permissions.canMutateLedger])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      if (!permissions.canMutateLedger) {
        notify('Role viewer hanya bisa melihat simulasi impor.', 'info')
        return
      }
      void previewFiles(files)
      e.target.value = ''
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
    const groups = commitTarget ?? remainingCommitGroups
    if (groups.length === 0) {
      notify('Semua grup impor sudah tersimpan.', 'info')
      setConfirmCommit(false)
      return
    }

    setCommitting(true)
    try {
      const skippedPayload: ImportSkippedRows = skippedRows
      const committedBatch = await apiClient.commitImportBatch(activeBatchId, { skippedRows: skippedPayload, groups })
      const nextCommittedGroups = committedBatch.summary?.committedGroups
      const nextFullyCommitted = COMMIT_GROUPS.every(group => Boolean(nextCommittedGroups?.[group.key]))
      dispatch({ type: 'import_batch.upsert', batch: committedBatch })
      setConfirmCommit(false)
      setCommitTarget(null)
      setCommitted(nextFullyCommitted)
      notify(nextFullyCommitted
        ? (skippedCount > 0 ? `Batch impor committed. ${skippedCount} baris diskip.` : 'Batch impor committed di PostgreSQL.')
        : `${groups.length} grup impor tersimpan. Lanjutkan grup berikutnya saat siap.`)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan impor.', 'error')
    } finally {
      setCommitting(false)
    }
  }

  function confirmCommitGroups(groups: ImportRowGroup[]) {
    if (groups.length === 0) {
      notify('Semua grup impor sudah tersimpan.', 'info')
      return
    }
    const isAllRemaining = groups.length === remainingCommitGroups.length && groups.every(group => remainingCommitGroups.includes(group))
    if (isAllRemaining) {
      if (!canCommitRemaining) {
        notify(commitPreflightIssues[0] ?? 'Commit impor belum siap.', 'error')
        return
      }
    } else {
      const blockedReason = groups.map(group => commitGroupBlockReasons.get(group)).find(Boolean)
      if (blockedReason) {
        notify(blockedReason, 'error')
        return
      }
    }
    setCommitTarget(groups)
    setConfirmCommit(true)
  }

  async function deletePreviewBatch(id: string) {
    if (!permissions.canMutateLedger) {
      notify('Role viewer tidak bisa membersihkan preview impor.', 'error')
      return
    }

    setDeletingBatchId(id)
    try {
      await apiClient.deleteImportPreviewBatch(id)
      dispatch({ type: 'import_batch.delete', id })
      if (activeBatchId === id) {
        setActiveBatchId(null)
        setStep(1)
        setFileName(null)
        setSkippedRows({ ...EMPTY_SKIPPED_ROWS })
      }
      notify('Preview impor dibersihkan dari PostgreSQL.', 'info')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membersihkan preview impor.', 'error')
    } finally {
      setDeletingBatchId(null)
    }
  }

  async function cleanupOldPreviewBatches() {
    if (!permissions.canMutateLedger) {
      notify('Role viewer tidak bisa membersihkan preview impor.', 'error')
      return
    }
    if (oldPreviewBatchIds.length === 0) {
      notify('Tidak ada preview impor lama yang perlu dibersihkan.', 'info')
      return
    }

    setCleaningOldPreviews(true)
    try {
      const result = await apiClient.cleanupImportPreviewBatches({ olderThanDays: 7 })
      dispatch({ type: 'import_batch.deleteMany', ids: result.deletedIds })
      if (activeBatchId && result.deletedIds.includes(activeBatchId)) {
        setActiveBatchId(null)
        setStep(1)
        setFileName(null)
        setSkippedRows({ ...EMPTY_SKIPPED_ROWS })
      }
      notify(`${result.deletedCount.toLocaleString('id-ID')} preview impor lama dibersihkan.`, 'info')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membersihkan preview impor lama.', 'error')
    } finally {
      setCleaningOldPreviews(false)
    }
  }

  function resetFlow() {
    setStep(1)
    setCommitted(false)
    setCommitTarget(null)
    setFileName(null)
    setActiveBatchId(null)
    setSkippedRows({ ...EMPTY_SKIPPED_ROWS })
    setAutoSkipDuplicates(false)
    setReviewSearch('')
    setReviewStatusFilter('all')
    setReviewSourceFilter('all')
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
            <input type="file" accept=".xlsx,.xls" multiple className="sr-only" onChange={handleFileChange} disabled={!permissions.canMutateLedger || previewing} />
            <span className="import-upload-mark">XLSX</span>
            <h2>{previewing ? 'Membuat preview...' : 'Letakkan file Excel di sini'}</h2>
            <p>Pilih satu atau beberapa file. Cocok untuk pasangan file iuran dan file pengeluaran/pinjaman, lalu direview sebagai satu batch.</p>
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
            <label className="import-preview-option">
              <input
                type="checkbox"
                checked={autoSkipDuplicates}
                onChange={event => setAutoSkipDuplicates(event.target.checked)}
                disabled={!permissions.canMutateLedger || previewing}
              />
              <span>
                <strong>Auto-skip duplikat</strong>
                <small>Baris duplikat otomatis ditandai skip setelah preview.</small>
              </span>
            </label>
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

          {sourceFiles.length > 0 && (
            <div className="import-file-list" aria-label="File sumber impor">
              {sourceFiles.map(file => <span key={file}>{file}</span>)}
            </div>
          )}

          <div className="import-summary-grid">
            {summaryCards.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString('id-ID')}</strong>
              </div>
            ))}
          </div>

          {importBreakdown.length > 0 && (
            <div className="import-breakdown-grid">
              {importBreakdown.map(group => (
                <article key={group.title}>
                  <strong>{group.title}</strong>
                  {group.rows.map(row => (
                    <span key={row.label}>
                      <em>{row.label}</em>
                      <small>{row.count.toLocaleString('id-ID')} baris / {rp(row.amount)}</small>
                    </span>
                  ))}
                </article>
              ))}
            </div>
          )}

          <div className="import-sheet-list">
            {summary.sheetsDetected.map((sheet, index) => <span key={`${sheet}-${index}`}>{sheet}</span>)}
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
              <h2>Review data sebelum commit</h2>
            </div>
            <span>{warningDetails.length} warning / {summary.errors} error</span>
          </div>

          <div className="import-review-panel">
            <div className="import-review-tabs" role="tablist" aria-label="Preview mapping impor">
              {reviewTabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  className={cn('import-review-tab', reviewTab === tab.key && 'active')}
                  onClick={() => setReviewTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  <strong>{tab.count.toLocaleString('id-ID')}</strong>
                  {tab.skipped > 0 && <small>{tab.skipped.toLocaleString('id-ID')} skip</small>}
                </button>
              ))}
            </div>
            <div className="import-review-tools">
              <label>
                <span>Cari baris</span>
                <input
                  value={reviewSearch}
                  onChange={event => setReviewSearch(event.target.value)}
                  placeholder="Nama, baris, dana, tanggal..."
                />
              </label>
              <label>
                <span>Sumber</span>
                <select value={reviewSourceFilter} onChange={event => setReviewSourceFilter(event.target.value)}>
                  <option value="all">Semua file dan sheet</option>
                  {sourceOptions.map(option => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </label>
              {reviewSearch && (
                <button type="button" onClick={() => setReviewSearch('')}>
                  Bersihkan
                </button>
              )}
            </div>
            <div className="import-review-ops">
              <div className="import-review-status" aria-label="Filter status baris">
                {REVIEW_STATUS_FILTERS.map(filter => (
                  <button
                    key={filter.key}
                    type="button"
                    className={cn(reviewStatusFilter === filter.key && 'active')}
                    onClick={() => setReviewStatusFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="import-review-bulk">
                <span>{activeReviewRows.length.toLocaleString('id-ID')} baris aktif</span>
                <button
                  type="button"
                  onClick={() => bulkSetSkipped(reviewTab, activeReviewRows, true)}
                  disabled={activeReviewRows.length === 0 || reviewStatusFilter === 'skipped'}
                >
                  Skip hasil
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetSkipped(reviewTab, activeDuplicateRows, true)}
                  disabled={activeDuplicateRows.length === 0}
                >
                  Skip duplikat
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetSkipped(reviewTab, activeConflictRows, true)}
                  disabled={activeConflictRows.length === 0}
                >
                  Skip konflik
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetSkipped(reviewTab, activeReviewRows, false)}
                  disabled={activeReviewRows.length === 0 || reviewStatusFilter === 'accepted'}
                >
                  Terima hasil
                </button>
              </div>
            </div>
            <div className="import-review-export">
              <div>
                <strong>Arsip review import</strong>
                <span>XLSX berisi semua tab, status skip, flag duplikat, dan konflik DB.</span>
              </div>
              <button type="button" onClick={() => void exportReviewXlsx()} disabled={!hasMappedRows}>
                Ekspor XLSX
              </button>
            </div>
            {duplicateCount > 0 && (
              <div className="import-review-conflict">
                <strong>{duplicateCount.toLocaleString('id-ID')} baris duplikat terdeteksi</strong>
                <span>Cek badge duplikat di tiap tab sebelum commit.</span>
              </div>
            )}
            {conflictCount > 0 && (
              <div className="import-review-conflict">
                <strong>{conflictCount.toLocaleString('id-ID')} baris sudah ada di PostgreSQL</strong>
                <span>Baris bertanda Ada di DB sebaiknya dicek sebelum commit.</span>
              </div>
            )}
            <ReviewPreview
              tab={reviewTab}
              rows={mappedRows}
              skippedRows={skippedRows}
              duplicateRows={duplicateRows}
              duplicateGroupMap={duplicateGroupMap}
              conflictRows={conflictRows}
              query={reviewSearch}
              statusFilter={reviewStatusFilter}
              sourceFilter={reviewSourceFilter}
              onToggleSkipped={toggleSkippedRow}
            />
          </div>

          <div className="import-section-head import-warning-head">
            <div>
              <p className="eyebrow">Warning parser</p>
              <h2>{warningDetails.length} catatan perlu diketahui</h2>
            </div>
            <span>Tidak menghentikan commit</span>
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
          {!isFullyCommitted ? (
            <>
              <div className="import-commit-card">
                <p className="eyebrow">Review akhir</p>
                <h2>Simpan bertahap per modul</h2>
                <p>
                  Sistem akan menyimpan {commitCounts.members.toLocaleString('id-ID')} anggota,
                  {' '}{commitCounts.contributions.toLocaleString('id-ID')} catatan iuran,
                  {' '}{commitCounts.transactions.toLocaleString('id-ID')} transaksi kas, dan
                  {' '}{commitCounts.loans.toLocaleString('id-ID')} pinjaman.
                  {skippedCount > 0 ? ` ${skippedCount.toLocaleString('id-ID')} baris akan diskip.` : ''}
                </p>
              </div>
              <div className={cn('import-preflight', commitPreflightIssues.length > 0 && 'blocked')}>
                <div>
                  <span>{simulatingCommit ? 'Mengecek server' : commitPreflightIssues.length > 0 ? 'Belum siap commit' : 'Siap commit'}</span>
                  <strong>{commitPreflightIssues.length > 0 ? 'Cek catatan preflight' : 'Simulasi backend aman'}</strong>
                </div>
                {commitPreflightIssues.length > 0 ? (
                  <ul>
                    {commitPreflightIssues.map(issue => <li key={issue}>{issue}</li>)}
                  </ul>
                ) : (
                  <p>
                    {commitSimulation
                      ? `${commitSimulation.totals.ready.toLocaleString('id-ID')} baris aktif, ${commitSimulation.totals.created.toLocaleString('id-ID')} baru, ${commitSimulation.totals.updates.toLocaleString('id-ID')} update, ${commitSimulation.totals.skipped.toLocaleString('id-ID')} skip.`
                      : 'Batch punya mapping aktif dan masih ada grup yang bisa disimpan.'}
                  </p>
                )}
              </div>
              <div className="import-commit-grid">
                {commitGroupCards.map(group => (
                  <article key={group.key} className={cn(group.committed && 'done')}>
                    <div>
                      <span>{group.committed ? 'Tersimpan' : 'Belum disimpan'}</span>
                      <strong>{group.label}</strong>
                      <small>{group.hint}</small>
                    </div>
                    <p>
                      {group.committed
                        ? `${group.savedCount.toLocaleString('id-ID')} baris sudah masuk`
                        : `${group.count.toLocaleString('id-ID')} baris siap disimpan`}
                    </p>
                    {!group.committed && (
                      <dl>
                        <div><dt>Baru</dt><dd>{group.created.toLocaleString('id-ID')}</dd></div>
                        <div><dt>Update</dt><dd>{group.updates.toLocaleString('id-ID')}</dd></div>
                        <div><dt>Skip</dt><dd>{group.skipped.toLocaleString('id-ID')}</dd></div>
                        <div><dt>Total</dt><dd>{group.total.toLocaleString('id-ID')}</dd></div>
                      </dl>
                    )}
                    {commitGroupBlockReasons.get(group.key) && (
                      <em className="import-commit-reason">{commitGroupBlockReasons.get(group.key)}</em>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => confirmCommitGroups([group.key])}
                      disabled={Boolean(commitGroupBlockReasons.get(group.key))}
                    >
                      {group.committed ? 'Selesai' : `Simpan ${group.label}`}
                    </button>
                  </article>
                ))}
              </div>
              <div className="import-actions">
                <button className="btn btn-outline" onClick={() => setStep(3)}>Kembali</button>
                <button className="btn" onClick={() => confirmCommitGroups(remainingCommitGroups)} disabled={!canCommitRemaining}>
                  {committing ? 'Menyimpan...' : 'Simpan semua sisa'}
                </button>
              </div>
            </>
          ) : (
            <div className="import-success">
              <span>Selesai</span>
              <h2>Impor tersimpan</h2>
              <p>
                {(summary.committedCounts?.members ?? commitCounts.members).toLocaleString('id-ID')} anggota,
                {' '}{(summary.committedCounts?.contributions ?? commitCounts.contributions).toLocaleString('id-ID')} iuran,
                {' '}{(summary.committedCounts?.transactions ?? commitCounts.transactions).toLocaleString('id-ID')} transaksi,
                {' '}{(summary.committedCounts?.loans ?? commitCounts.loans).toLocaleString('id-ID')} pinjaman.
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
          <button
            type="button"
            className="import-history-maintenance"
            onClick={() => void cleanupOldPreviewBatches()}
            disabled={!permissions.canMutateLedger || cleaningOldPreviews || oldPreviewBatchIds.length === 0}
          >
            {cleaningOldPreviews
              ? 'Membersihkan...'
              : oldPreviewBatchIds.length > 0
                ? `Bersihkan ${oldPreviewBatchIds.length.toLocaleString('id-ID')} preview lama`
                : 'Preview lama bersih'}
          </button>
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
              {item.status !== 'committed' && (
                <button
                  type="button"
                  className="import-history-cleanup"
                  onClick={() => void deletePreviewBatch(item.id)}
                  disabled={!permissions.canMutateLedger || deletingBatchId === item.id}
                >
                  {deletingBatchId === item.id ? 'Membersihkan...' : 'Bersihkan preview'}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmCommit}
        title="Simpan data impor?"
        message={skippedCount > 0
          ? `${commitTargetLabel || 'Grup terpilih'} akan disimpan. ${skippedCount.toLocaleString('id-ID')} baris bertanda skip tidak akan masuk.`
          : `${commitTargetLabel || 'Grup terpilih'} akan masuk dalam satu transaksi PostgreSQL.`}
        confirmLabel={committing ? 'Menyimpan...' : 'Simpan'}
        onConfirm={commitImport}
        onCancel={() => {
          setConfirmCommit(false)
          setCommitTarget(null)
        }}
      />
    </>
  )
}
