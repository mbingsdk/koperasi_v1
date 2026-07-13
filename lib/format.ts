/** Format integer as "Rp 1.500.000" */
export function rp(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

/** Format as "(Rp 1.500.000)" for outflows / negatives */
export function rpOut(amount: number): string {
  return '(' + rp(amount) + ')'
}

/** "13/06/2026" */
export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** "Jun 2026" */
export function fmtMonth(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}

/** "Juni 2026" */
export function fmtMonthLong(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

/** "13/06" short date */
export function fmtShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })
}

/** "13/06/2026 09:14" */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return fmtDate(iso) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/** Parse "1.500.000" string into a number */
export function parseRpInput(value: string): number {
  return parseInt(value.replace(/\./g, ''), 10) || 0
}

/** Format number input to "1.500.000" */
export function formatRpInput(value: string): string {
  const n = value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
