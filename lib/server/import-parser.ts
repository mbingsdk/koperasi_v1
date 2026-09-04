import ExcelJS from 'exceljs'
import type { ImportBatch } from '@/lib/types'

type ImportSummary = NonNullable<ImportBatch['summary']>
type WarningDetail = NonNullable<ImportSummary['warningDetails']>[number]
type MappedRows = NonNullable<ImportSummary['mappedRows']>
type DuplicateRows = NonNullable<ImportSummary['duplicateRows']>
type DuplicateGroups = NonNullable<ImportSummary['duplicateGroups']>
type ImportRowRef = NonNullable<DuplicateGroups['members']>[number]['rows'][number]
type Worksheet = ExcelJS.Worksheet
interface ParseImportOptions {
  sourceFileName?: string
  warnMissingSheets?: boolean
}
interface SourceMeta {
  sourceFile?: string
  sourceSheet?: string
}

const EXPECTED_SHEETS = ['Koperasi', 'Dahib', 'Serikat', 'Pengeluaran', 'pinjaman kop']

const HEADER_HINTS = {
  members: ['nama'],
  dues: ['nama', 'bulan'],
  cash: ['tanggal', 'jumlah'],
  loans: ['nama', 'pinjaman'],
}

const MONTHS: Record<string, string> = {
  jan: '01',
  januari: '01',
  feb: '02',
  februari: '02',
  mar: '03',
  maret: '03',
  apr: '04',
  april: '04',
  mei: '05',
  jun: '06',
  juni: '06',
  jul: '07',
  juli: '07',
  agus: '08',
  agustus: '08',
  aug: '08',
  sep: '09',
  september: '09',
  okt: '10',
  oktober: '10',
  oct: '10',
  nov: '11',
  november: '11',
  des: '12',
  desember: '12',
  dec: '12',
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeKey(value: unknown) {
  return normalize(value).replace(/[^a-z0-9]+/g, '')
}

function duplicateKey(parts: unknown[]) {
  return parts
    .map(part => normalize(part).replace(/\s+/g, ' '))
    .join('|')
}

function importKey(parts: unknown[]) {
  return parts
    .map(part => String(part ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    .filter(Boolean)
    .join(':')
}

function rowRef(row: { row: number; importKey?: string }): ImportRowRef {
  return row.importKey ?? row.row
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
  return Math.max(rows.length - findHeaderRowIndex(rows) - 1, 0)
}

function findHeaderRowIndex(rows: string[][]) {
  const index = rows.findIndex(row => {
    const keys = row.map(normalizeKey)
    return keys.some(key => key === 'nama' || key.includes('tanggal'))
  })
  return index >= 0 ? index : 0
}

function dataRows(rows: string[][]) {
  const headerIndex = findHeaderRowIndex(rows)
  return rows.slice(headerIndex + 1).map((row, index) => ({
    row,
    rowNumber: headerIndex + index + 2,
  }))
}

function headerMap(rows: string[][]) {
  const headers = rows[findHeaderRowIndex(rows)] ?? []
  return headers.map((header, index) => ({ key: normalizeKey(header), index }))
}

function findIndex(rows: string[][], aliases: string[]) {
  const headers = headerMap(rows)
  const keys = aliases.map(normalizeKey)
  return headers.find(header => keys.some(key => header.key.includes(key)))?.index ?? -1
}

function valueAt(row: string[], index: number) {
  return index >= 0 ? row[index]?.trim() ?? '' : ''
}

function valueByAlias(rows: string[][], row: string[], aliases: string[]) {
  return valueAt(row, findIndex(rows, aliases))
}

function parseAmount(value: string) {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? Math.round(amount) : 0
}

function firstPositiveAmount(row: string[]) {
  for (const cell of row) {
    const amount = parseAmount(cell)
    if (amount > 0) return amount
  }
  return 0
}

function isoDate(value: string, fallback = '2026-06-01') {
  if (!value) return fallback
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)

  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (match) {
    const day = match[1].padStart(2, '0')
    const month = match[2].padStart(2, '0')
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    return `${year}-${month}-${day}`
  }

  return fallback
}

function periodMonth(value: string) {
  return isoDate(value).slice(0, 7) + '-01'
}

function monthNumber(value: string) {
  return MONTHS[normalizeKey(value)]
}

function yearNumber(value: string) {
  const match = normalize(value).match(/\b(20\d{2}|19\d{2})\b/)
  return match ? match[1] : ''
}

function monthColumns(rows: string[][]) {
  const headerIndex = findHeaderRowIndex(rows)
  const monthRow = rows[headerIndex] ?? []
  const yearRow = rows[headerIndex - 1] ?? []
  let activeYear = ''

  return monthRow.flatMap((header, index) => {
    const year = yearNumber(yearRow[index])
    if (year) activeYear = year

    const month = monthNumber(header)
    if (!month || !activeYear) return []

    return [{
      index,
      monthLabel: header,
      period: `${activeYear}-${month}-01`,
    }]
  })
}

function hasWideMonthHeader(rows: string[][]) {
  const headerIndex = findHeaderRowIndex(rows)
  const header = rows[headerIndex] ?? []
  return header.some(cell => normalizeKey(cell) === 'nama')
    && header.some(cell => Boolean(monthNumber(cell)))
}

function employeeType(value: string): MappedRows['members'][number]['employeeType'] {
  const normalized = normalize(value)
  if (normalized.includes('hari')) return 'Harian'
  if (normalized.includes('mix')) return 'Mixed'
  if (normalized.includes('bulan')) return 'Bulanan'
  return 'Unknown'
}

function fundCodeFromSheet(sheetName: string) {
  const normalized = normalize(sheetName)
  if (normalized.includes('dahib') || normalized.includes('hibah')) return 'dana_hibah'
  if (normalized.includes('serikat')) return 'serikat'
  return 'koperasi'
}

function fundCodeFromCategory(category: string) {
  const normalized = normalize(category)
  if (normalized.includes('hibah')) return 'dana_hibah'
  if (normalized.includes('serikat')) return 'serikat'
  return 'koperasi'
}

function mapMembers(rows: string[][], source: SourceMeta = {}): MappedRows['members'] {
  const nameIndex = findIndex(rows, ['nama anggota', 'nama', 'anggota', 'name'])

  return dataRows(rows).map(({ row, rowNumber }) => {
    const name = valueAt(row, nameIndex) || row.find(cell => /[a-zA-Z]/.test(cell)) || ''
    return {
      importKey: importKey(['member', rowNumber, name]),
      row: rowNumber,
      ...source,
      memberNo: valueByAlias(rows, row, ['no anggota', 'nomor anggota', 'member no', 'no']) || undefined,
      name: name.trim(),
      departmentName: valueByAlias(rows, row, ['departemen', 'department', 'bagian', 'unit']) || undefined,
      employeeType: employeeType(valueByAlias(rows, row, ['tipe', 'type', 'jenis', 'karyawan', 'status'])),
      joinedAt: valueByAlias(rows, row, ['tanggal gabung', 'bergabung', 'joined'])
        ? isoDate(valueByAlias(rows, row, ['tanggal gabung', 'bergabung', 'joined']))
        : undefined,
    }
  }).filter(member => member.name)
}

function mapDues(sheetName: string, rows: string[][], source: SourceMeta = {}): MappedRows['dues'] {
  const nameIndex = findIndex(rows, ['nama anggota', 'nama', 'anggota', 'name'])
  const wideMonthColumns = monthColumns(rows)

  if (wideMonthColumns.length > 0) {
    return dataRows(rows).flatMap(({ row, rowNumber }) => {
      const memberName = valueAt(row, nameIndex) || row.find(cell => /[a-zA-Z]/.test(cell)) || ''
      if (!memberName || normalizeKey(memberName) === 'nama') return []

      return wideMonthColumns.flatMap(column => {
        const amountIdr = parseAmount(valueAt(row, column.index))
        if (amountIdr <= 0) return []

        return [{
          importKey: importKey(['due', rowNumber, memberName, fundCodeFromSheet(sheetName), column.period]),
          row: rowNumber,
          ...source,
          memberName,
          fundCode: fundCodeFromSheet(sheetName),
          periodMonth: column.period,
          amountIdr,
          note: column.monthLabel,
        }]
      })
    })
  }

  const amountIndex = findIndex(rows, ['nominal', 'jumlah', 'iuran', 'dahib', 'serikat'])
  const periodIndex = findIndex(rows, ['bulan', 'periode', 'tanggal'])
  const noteIndex = findIndex(rows, ['catatan', 'keterangan', 'note'])

  return dataRows(rows).map(({ row, rowNumber }) => {
    const amountText = valueAt(row, amountIndex)
    return {
      importKey: importKey(['due', rowNumber, valueAt(row, nameIndex), fundCodeFromSheet(sheetName), periodMonth(valueAt(row, periodIndex))]),
      row: rowNumber,
      ...source,
      memberName: valueAt(row, nameIndex) || row.find(cell => /[a-zA-Z]/.test(cell)) || '',
      fundCode: fundCodeFromSheet(sheetName),
      periodMonth: periodMonth(valueAt(row, periodIndex)),
      amountIdr: amountText ? parseAmount(amountText) : firstPositiveAmount(row),
      note: valueAt(row, noteIndex) || undefined,
    }
  }).filter(due => due.memberName && due.amountIdr >= 0)
}

function mapCashTransactions(rows: string[][], source: SourceMeta = {}): MappedRows['cashTransactions'] {
  const headerIndex = findHeaderRowIndex(rows)
  const headers = rows[headerIndex] ?? []
  const dateIndex = findIndex(rows, ['tanggal', 'date'])
  const nameIndex = findIndex(rows, ['nama', 'anggota', 'penerima'])
  const noteIndex = findIndex(rows, ['keterangan', 'catatan', 'note'])
  const amountColumns = headers
    .map((header, index) => ({ header, index, key: normalizeKey(header) }))
    .filter(column => column.header && !['tanggal', 'date', 'nama', 'anggota', 'penerima', 'keterangan', 'catatan', 'note'].includes(column.key))

  if (amountColumns.length > 0) {
    return dataRows(rows).flatMap(({ row, rowNumber }) => {
      const transactionDate = isoDate(valueAt(row, dateIndex))
      const counterpartyName = valueAt(row, nameIndex) || undefined
      const rowNote = valueAt(row, noteIndex)

      return amountColumns.flatMap(column => {
        const amountIdr = parseAmount(valueAt(row, column.index))
        if (amountIdr <= 0) return []

        return [{
          importKey: importKey(['cash', rowNumber, transactionDate, column.header, amountIdr, counterpartyName]),
          row: rowNumber,
          ...source,
          transactionDate,
          direction: 'outflow' as const,
          fundCode: fundCodeFromCategory(column.header),
          counterpartyName,
          category: column.header,
          amountIdr,
          note: rowNote || [column.header, counterpartyName].filter(Boolean).join(' - '),
        }]
      })
    })
  }

  return dataRows(rows).map(({ row, rowNumber }) => {
    const category = valueByAlias(rows, row, ['kategori', 'jenis', 'akun']) || 'Pengeluaran'
    const note = valueByAlias(rows, row, ['keterangan', 'catatan', 'note']) || category
    return {
      importKey: importKey(['cash', rowNumber, valueByAlias(rows, row, ['tanggal', 'date']), category, firstPositiveAmount(row), valueByAlias(rows, row, ['nama', 'anggota', 'penerima'])]),
      row: rowNumber,
      ...source,
      transactionDate: isoDate(valueByAlias(rows, row, ['tanggal', 'date'])),
      direction: 'outflow' as const,
      fundCode: fundCodeFromCategory(category),
      counterpartyName: valueByAlias(rows, row, ['nama', 'anggota', 'penerima']) || undefined,
      category,
      amountIdr: parseAmount(valueByAlias(rows, row, ['nominal', 'jumlah', 'debit', 'keluar'])) || firstPositiveAmount(row),
      note,
    }
  }).filter(transaction => transaction.amountIdr > 0)
}

function mapLoans(rows: string[][], source: SourceMeta = {}): MappedRows['loans'] {
  const nameIndex = findIndex(rows, ['nama anggota', 'nama', 'peminjam', 'anggota'])
  const headerIndex = findHeaderRowIndex(rows)
  const headers = rows[headerIndex] ?? []
  const dateIndex = findIndex(rows, ['tanggal', 'date'])
  const noteIndex = findIndex(rows, ['catatan', 'keterangan', 'note'])
  const amountColumns = headers
    .map((header, index) => ({ header, index, key: normalizeKey(header) }))
    .filter(column => column.header && !['tanggal', 'date', 'nama', 'anggota', 'peminjam', 'keterangan', 'catatan', 'note'].includes(column.key))

  if (amountColumns.length > 0) {
    return dataRows(rows).flatMap(({ row, rowNumber }) => {
      const borrowerName = valueAt(row, nameIndex) || row.find(cell => /[a-zA-Z]/.test(cell)) || ''
      if (!borrowerName || normalizeKey(borrowerName) === 'nama') return []

      return amountColumns.flatMap(column => {
        const principal = parseAmount(valueAt(row, column.index))
        if (principal <= 0) return []

        return [{
          importKey: importKey(['loan', rowNumber, borrowerName, column.header, principal, valueAt(row, dateIndex)]),
          row: rowNumber,
          ...source,
          borrowerName,
          cashSourceName: column.header,
          principalAmountIdr: principal,
          paidAmountIdr: undefined,
          loanDate: isoDate(valueAt(row, dateIndex)),
          note: valueAt(row, noteIndex) || undefined,
        }]
      })
    })
  }

  return dataRows(rows).map(({ row, rowNumber }) => {
    const principal = parseAmount(valueByAlias(rows, row, ['pokok', 'pinjaman', 'nominal', 'jumlah'])) || firstPositiveAmount(row)
    const paid = parseAmount(valueByAlias(rows, row, ['dibayar', 'terbayar', 'angsuran', 'bayar']))
    return {
      importKey: importKey(['loan', rowNumber, valueAt(row, nameIndex), principal, valueByAlias(rows, row, ['tanggal', 'date'])]),
      row: rowNumber,
      ...source,
      borrowerName: valueAt(row, nameIndex) || row.find(cell => /[a-zA-Z]/.test(cell)) || '',
      cashSourceName: valueByAlias(rows, row, ['sumber kas', 'kas', 'bendahara']) || undefined,
      principalAmountIdr: principal,
      paidAmountIdr: paid || undefined,
      loanDate: isoDate(valueByAlias(rows, row, ['tanggal', 'date'])),
      note: valueByAlias(rows, row, ['catatan', 'keterangan', 'note']) || undefined,
    }
  }).filter(loan => loan.borrowerName && loan.principalAmountIdr > 0)
}

function duplicateRowGroups<T extends { row: number; importKey?: string }>(rows: T[], getKey: (row: T) => string) {
  const groups = new Map<string, ImportRowRef[]>()

  for (const row of rows) {
    const key = getKey(row)
    if (!key.replace(/\|/g, '').trim()) continue
    groups.set(key, [...(groups.get(key) ?? []), rowRef(row)])
  }

  return Array.from(groups.entries())
    .filter(([, groupRows]) => groupRows.length > 1)
    .map(([key, groupRows]) => ({
      key,
      rows: groupRows.sort((a, b) => String(a).localeCompare(String(b))),
    }))
    .sort((a, b) => String(a.rows[0]).localeCompare(String(b.rows[0])))
}

function detectDuplicateGroups(rows: MappedRows): DuplicateGroups {
  return {
    members: duplicateRowGroups(rows.members, row => duplicateKey([row.name])),
    dues: duplicateRowGroups(rows.dues, row => duplicateKey([row.memberName, row.fundCode, row.periodMonth])),
    cashTransactions: duplicateRowGroups(rows.cashTransactions, row => duplicateKey([
      row.transactionDate,
      row.direction,
      row.category,
      row.amountIdr,
      row.counterpartyName,
    ])),
    loans: duplicateRowGroups(rows.loans, row => duplicateKey([
      row.borrowerName,
      row.loanDate,
      row.principalAmountIdr,
    ])),
  }
}

function duplicateRowsFromGroups(groups: DuplicateGroups): DuplicateRows {
  return {
    members: groups.members?.flatMap(group => group.rows) ?? [],
    dues: groups.dues?.flatMap(group => group.rows) ?? [],
    cashTransactions: groups.cashTransactions?.flatMap(group => group.rows) ?? [],
    loans: groups.loans?.flatMap(group => group.rows) ?? [],
  }
}

function hasHeader(rows: string[][], hints: string[]) {
  if (hints.includes('bulan') && hasWideMonthHeader(rows)) return true

  const header = rows[findHeaderRowIndex(rows)]?.map(normalize).join(' ') ?? ''
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

function displaySheetName(sheetName: string, sourceFileName?: string) {
  return sourceFileName ? `${sourceFileName} / ${sheetName}` : sheetName
}

function hasDetectedSheet(summary: ImportSummary, expected: string) {
  const normalizedExpected = normalize(expected)
  return summary.sheetsDetected.some(sheet => normalize(sheet).includes(normalizedExpected))
}

function mergeMappedRows(summaries: ImportSummary[]): MappedRows {
  return summaries.reduce<MappedRows>((merged, summary) => ({
    members: [...merged.members, ...(summary.mappedRows?.members ?? [])],
    dues: [...merged.dues, ...(summary.mappedRows?.dues ?? [])],
    cashTransactions: [...merged.cashTransactions, ...(summary.mappedRows?.cashTransactions ?? [])],
    loans: [...merged.loans, ...(summary.mappedRows?.loans ?? [])],
  }), {
    members: [],
    dues: [],
    cashTransactions: [],
    loans: [],
  })
}

export function mergeImportSummaries(summaries: ImportSummary[]): ImportSummary {
  const mappedRows = mergeMappedRows(summaries)
  const duplicateGroups = detectDuplicateGroups(mappedRows)
  const duplicateRows = duplicateRowsFromGroups(duplicateGroups)
  const warningDetails: WarningDetail[] = summaries.flatMap(summary => summary.warningDetails ?? [])
  const sheetsDetected = Array.from(new Set(summaries.flatMap(summary => summary.sheetsDetected)))
  const sourceFiles = Array.from(new Set(summaries.flatMap(summary => summary.sourceFiles ?? [])))

  for (const expected of EXPECTED_SHEETS) {
    if (!summaries.some(summary => hasDetectedSheet(summary, expected))) {
      warningDetails.push({
        sheet: expected,
        msg: `Sheet "${expected}" tidak ditemukan di seluruh file impor.`,
      })
    }
  }

  return {
    sourceFiles,
    sheetsDetected,
    membersDetected: mappedRows.members.length,
    contributionsDetected: mappedRows.dues.length,
    transactionsDetected: mappedRows.cashTransactions.length,
    loansDetected: mappedRows.loans.length,
    warnings: warningDetails.length,
    errors: summaries.length === 0 ? 1 : summaries.reduce((total, summary) => total + summary.errors, 0),
    warningDetails: warningDetails.slice(0, 50),
    mappedRows,
    duplicateRows,
    duplicateGroups,
  }
}

export async function parseImportWorkbook(buffer: ArrayBuffer, options: ParseImportOptions = {}): Promise<ImportSummary> {
  const workbook = new ExcelJS.Workbook()
  const uploadBuffer = Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0]
  await workbook.xlsx.load(uploadBuffer)

  const warnings: WarningDetail[] = []
  const sheetsDetected = workbook.worksheets.map(sheet => displaySheetName(sheet.name, options.sourceFileName))

  for (const expected of options.warnMissingSheets === false ? [] : EXPECTED_SHEETS) {
    if (!findSheet(workbook, expected)) {
      warnings.push({
        sheet: displaySheetName(expected, options.sourceFileName),
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
  const sourceFor = (sheet?: Worksheet): SourceMeta => ({
    sourceFile: options.sourceFileName,
    sourceSheet: sheet?.name,
  })

  if (koperasiSheet && !hasHeader(koperasiRows, HEADER_HINTS.members)) {
    warnings.push({ sheet: displaySheetName(koperasiSheet.name, options.sourceFileName), row: 1, col: 'Header', msg: 'Kolom nama anggota belum jelas.' })
  }
  if (dahibSheet && !hasHeader(dahibRows, HEADER_HINTS.dues)) {
    warnings.push({ sheet: displaySheetName(dahibSheet.name, options.sourceFileName), row: 1, col: 'Header', msg: 'Kolom iuran Dahib belum jelas.' })
  }
  if (serikatSheet && !hasHeader(serikatRows, HEADER_HINTS.dues)) {
    warnings.push({ sheet: displaySheetName(serikatSheet.name, options.sourceFileName), row: 1, col: 'Header', msg: 'Kolom iuran Serikat belum jelas.' })
  }
  if (pengeluaranSheet && !hasHeader(pengeluaranRows, HEADER_HINTS.cash)) {
    warnings.push({ sheet: displaySheetName(pengeluaranSheet.name, options.sourceFileName), row: 1, col: 'Header', msg: 'Kolom tanggal/jumlah pengeluaran belum jelas.' })
  }
  if (pinjamanSheet && !hasHeader(pinjamanRows, HEADER_HINTS.loans)) {
    warnings.push({ sheet: displaySheetName(pinjamanSheet.name, options.sourceFileName), row: 1, col: 'Header', msg: 'Kolom nama/pinjaman belum jelas.' })
  }

  if (dahibSheet) detectAmountWarnings(displaySheetName(dahibSheet.name, options.sourceFileName), dahibRows, warnings)
  if (serikatSheet) detectAmountWarnings(displaySheetName(serikatSheet.name, options.sourceFileName), serikatRows, warnings)

  const mappedRows: MappedRows = {
    members: mapMembers(koperasiRows, sourceFor(koperasiSheet)),
    dues: [
      ...(koperasiSheet ? mapDues(koperasiSheet.name, koperasiRows, sourceFor(koperasiSheet)) : []),
      ...(dahibSheet ? mapDues(dahibSheet.name, dahibRows, sourceFor(dahibSheet)) : []),
      ...(serikatSheet ? mapDues(serikatSheet.name, serikatRows, sourceFor(serikatSheet)) : []),
    ],
    cashTransactions: mapCashTransactions(pengeluaranRows, sourceFor(pengeluaranSheet)),
    loans: mapLoans(pinjamanRows, sourceFor(pinjamanSheet)),
  }
  const duplicateGroups = detectDuplicateGroups(mappedRows)
  const duplicateRows = duplicateRowsFromGroups(duplicateGroups)

  return {
    sourceFiles: options.sourceFileName ? [options.sourceFileName] : undefined,
    sheetsDetected,
    membersDetected: mappedRows.members.length || dataRowCount(koperasiRows),
    contributionsDetected: mappedRows.dues.length || dataRowCount(dahibRows) + dataRowCount(serikatRows),
    transactionsDetected: mappedRows.cashTransactions.length || dataRowCount(pengeluaranRows),
    loansDetected: mappedRows.loans.length || dataRowCount(pinjamanRows),
    warnings: warnings.length,
    errors: sheetsDetected.length === 0 ? 1 : 0,
    warningDetails: warnings.slice(0, 50),
    mappedRows,
    duplicateRows,
    duplicateGroups,
  }
}
