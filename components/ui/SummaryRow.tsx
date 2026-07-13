interface SummaryCell {
  label: string
  value: string
  negative?: boolean
}

interface SummaryRowProps {
  cells: SummaryCell[]
  cols?: number
}

export default function SummaryRow({ cells, cols = 6 }: SummaryRowProps) {
  return (
    <div
      className="summary-row"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))` }}
    >
      {cells.map((cell, i) => (
        <div key={i} className="summary-cell">
          <div className="s-label">{cell.label}</div>
          <div className={`s-value tabular${cell.negative ? ' neg' : ''}`}>
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  )
}
