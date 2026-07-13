import { cn } from '@/lib/cn'

export interface LedgerColumn<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => React.ReactNode
}

interface ResponsiveLedgerProps<T> {
  rows: T[]
  columns: LedgerColumn<T>[]
  getKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: React.ReactNode
  cardTitle?: (row: T) => React.ReactNode
  cardMeta?: (row: T) => React.ReactNode
  cardAmount?: (row: T) => React.ReactNode
}

export default function ResponsiveLedger<T>({
  rows,
  columns,
  getKey,
  onRowClick,
  empty,
  cardTitle,
  cardMeta,
  cardAmount,
}: ResponsiveLedgerProps<T>) {
  if (rows.length === 0) return <>{empty}</>

  return (
    <>
      <div className="ledger-wrap responsive-ledger-table">
        <table className="ledger">
          <thead>
            <tr>
              {columns.map(col => <th key={col.key} className={col.className}>{col.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={getKey(row)} className={onRowClick ? 'clickable' : undefined} onClick={() => onRowClick?.(row)}>
                {columns.map(col => <td key={col.key} className={col.className}>{col.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="responsive-ledger-cards">
        {rows.map(row => (
          <button
            key={getKey(row)}
            type="button"
            className={cn('ledger-card', onRowClick && 'clickable')}
            onClick={() => onRowClick?.(row)}
          >
            <div className="ledger-card-top">
              <div>
                <div className="ledger-card-title">{cardTitle ? cardTitle(row) : columns[0]?.render(row)}</div>
                {cardMeta && <div className="ledger-card-meta">{cardMeta(row)}</div>}
              </div>
              {cardAmount && <div className="ledger-card-amount">{cardAmount(row)}</div>}
            </div>
            <div className="ledger-card-grid">
              {columns.slice(1, cardAmount ? -1 : undefined).map(col => (
                <div key={col.key}>
                  <span>{col.header}</span>
                  <strong>{col.render(row)}</strong>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
