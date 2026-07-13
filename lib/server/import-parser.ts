import ExcelJS from 'exceljs'
import type { ImportBatch } from '@/lib/types'

type ImportSummary = NonNullable<ImportBatch['summary']>
type WarningDetail = NonNullable<ImportSummary['warningDetails']>[number]
type Worksheet = ExcelJS.Worksheet

const EXPECTED_SHEETS = ['Koperasi', 'Dahib', 'Serikat', 'Pengeluaran', 'pinjaman kop']

const HEADER_HINTS = {
  members: ['nama'],
  dues: ['nama', 'bulan'],
  cash: ['tanggal', 'jumlah'],
  loans: ['nama', 'pinjaman'],
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function cellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '')
    if ('result' in value) return String(value.result ?? '')
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map(part => part.text).join('')
    }
  }
  return String(value)
}

function rowsForSheet(sheet?: Worksheet) {
  if (!sheet) return []

  const rows: string[][] = []
  sheet.eachRow({ includeEmpty: false }, row => {
    const values: string[] = []
    row.eachCell({ includeEmpty: true }, cell => {
      values.push(cellText(cell.value).trim())
    })
    if (values.some(Boolean)) rows.push(values)
  })

  return rows
}

function findSheet(workbook: ExcelJS.Workbook, expected: string) {
  const normalizedExpected = normalize(expected)
  return workbook.worksheets.find(sheet => normalize(sheet.name) === normalizedExpected)
    ?? workbook.worksheets.find(sheet => normalize(sheet.name).includes(normalizedExpected))
}

function dataRowCount(rows: string[][]) {
  if (rows.length === 0) return 0
  return Math.max(rows.length - 1, 0)
}

function hasHeader(rows: string[][], hints: string[]) {
  const header = rows[0]?.map(normalize).join(' ') ?? ''
  return hints.every(hint => header.includes(hint))
}

function detectAmountWarnings(sheet: string, rows: string[][], warnings: WarningDetail[]) {
  rows.slice(1).forEach((row, index) => {
    const hasName = row.some(cell => /[a-zA-Z]/.test(cell))
    const hasNumber = row.some(cell => {
      const value = Number(cell.replace(/[^\d-]/g, ''))
      return Number.isFinite(value) && value > 0
    })

    if (hasName && !hasNumber) {
      warnings.push({
        sheet,
        row: index + 2,
        col: 'Nominal',
        msg: 'Baris berisi teks tetapi nominal belum terdeteksi.',
      })
    }
  })
}

export async function parseImportWorkbook(buffer: ArrayBuffer): Promise<ImportSummary> {
  const workbook = new ExcelJS.Workbook()
  const uploadBuffer = Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0]
  await workbook.xlsx.load(uploadBuffer)

  const warnings: WarningDetail[] = []
  const sheetsDetected = workbook.worksheets.map(sheet => sheet.name)

  for (const expected of EXPECTED_SHEETS) {
    if (!findSheet(workbook, expected)) {
      warnings.push({
        sheet: expected,
        msg: `Sheet "${expected}" tidak ditemukan.`,
      })
    }
  }

  const koperasiSheet = findSheet(workbook, 'Koperasi')
  const dahibSheet = findSheet(workbook, 'Dahib')
  const serikatSheet = findSheet(workbook, 'Serikat')
  const pengeluaranSheet = findSheet(workbook, 'Pengeluaran')
  const pinjamanSheet = findSheet(workbook, 'pinjaman kop')

  const koperasiRows = rowsForSheet(koperasiSheet)
  const dahibRows = rowsForSheet(dahibSheet)
  const serikatRows = rowsForSheet(serikatSheet)
  const pengeluaranRows = rowsForSheet(pengeluaranSheet)
  const pinjamanRows = rowsForSheet(pinjamanSheet)

  if (koperasiSheet && !hasHeader(koperasiRows, HEADER_HINTS.members)) {
    warnings.push({ sheet: koperasiSheet.name, row: 1, col: 'Header', msg: 'Kolom nama anggota belum jelas.' })
  }
  if (dahibSheet && !hasHeader(dahibRows, HEADER_HINTS.dues)) {
    warnings.push({ sheet: dahibSheet.name, row: 1, col: 'Header', msg: 'Kolom iuran Dahib belum jelas.' })
  }
  if (serikatSheet && !hasHeader(serikatRows, HEADER_HINTS.dues)) {
    warnings.push({ sheet: serikatSheet.name, row: 1, col: 'Header', msg: 'Kolom iuran Serikat belum jelas.' })
  }
  if (pengeluaranSheet && !hasHeader(pengeluaranRows, HEADER_HINTS.cash)) {
    warnings.push({ sheet: pengeluaranSheet.name, row: 1, col: 'Header', msg: 'Kolom tanggal/jumlah pengeluaran belum jelas.' })
  }
  if (pinjamanSheet && !hasHeader(pinjamanRows, HEADER_HINTS.loans)) {
    warnings.push({ sheet: pinjamanSheet.name, row: 1, col: 'Header', msg: 'Kolom nama/pinjaman belum jelas.' })
  }

  if (dahibSheet) detectAmountWarnings(dahibSheet.name, dahibRows, warnings)
  if (serikatSheet) detectAmountWarnings(serikatSheet.name, serikatRows, warnings)

  return {
    sheetsDetected,
    membersDetected: dataRowCount(koperasiRows),
    contributionsDetected: dataRowCount(dahibRows) + dataRowCount(serikatRows),
    transactionsDetected: dataRowCount(pengeluaranRows),
    loansDetected: dataRowCount(pinjamanRows),
    warnings: warnings.length,
    errors: sheetsDetected.length === 0 ? 1 : 0,
    warningDetails: warnings.slice(0, 50),
  }
}
