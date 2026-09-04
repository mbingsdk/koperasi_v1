export type ExcelCellValue = string | number | boolean | Date | null | undefined
export type ExcelRow = Record<string, ExcelCellValue>

export interface ExcelSheet {
  name: string
  rows: ExcelRow[]
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function headerLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function safeSheetName(value: string) {
  const cleaned = value.replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim()
  return (cleaned || 'Sheet').slice(0, 31)
}

function uniqueSheetName(name: string, existing: Set<string>) {
  const base = safeSheetName(name)
  let candidate = base
  let count = 2

  while (existing.has(candidate)) {
    const suffix = ` ${count}`
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
    count += 1
  }

  existing.add(candidate)
  return candidate
}

function normalizeRows(rows: ExcelRow[]) {
  return rows.length > 0 ? rows : [{ info: 'Tidak ada data' }]
}

function collectHeaders(rows: ExcelRow[]) {
  const headers = new Set<string>()
  rows.forEach(row => Object.keys(row).forEach(key => headers.add(key)))
  return Array.from(headers)
}

function cellLength(value: ExcelCellValue) {
  if (value instanceof Date) return 10
  return String(value ?? '').length
}

export async function downloadXlsx(filename: string, sheets: ExcelSheet[]) {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheetNames = new Set<string>()

  workbook.creator = 'Koperasi Ledger'
  workbook.created = new Date()
  workbook.modified = new Date()

  for (const sheet of sheets) {
    const rows = normalizeRows(sheet.rows)
    const headers = collectHeaders(rows)
    const worksheet = workbook.addWorksheet(uniqueSheetName(sheet.name, sheetNames))

    worksheet.columns = headers.map(key => ({
      header: headerLabel(key),
      key,
      width: Math.min(Math.max(headerLabel(key).length + 2, 12), 34),
    }))

    rows.forEach(row => {
      worksheet.addRow(headers.map(key => row[key] ?? ''))
    })

    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    }

    const headerRow = worksheet.getRow(1)
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF2D1F12' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9E0C8' } }
      cell.alignment = { vertical: 'middle' }
    })
    headerRow.height = 22

    worksheet.columns.forEach((column, index) => {
      const key = headers[index]
      const maxLength = rows.reduce(
        (max, row) => Math.max(max, cellLength(row[key]), headerLabel(key).length),
        0
      )
      column.width = Math.min(Math.max(maxLength + 2, 12), 42)

      if (rows.some(row => typeof row[key] === 'number')) {
        column.numFmt = '#,##0'
      }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer as BlobPart], { type: MIME_XLSX })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
