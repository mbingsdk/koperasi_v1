'use client'
import { useState, useEffect } from 'react'
import { formatRpInput, parseRpInput } from '@/lib/format'

interface AmountInputProps {
  value: number
  onChange?: (value: number) => void
  className?: string
  placeholder?: string
  name?: string
  disabled?: boolean
}

export default function AmountInput({ value, onChange, className, placeholder, name, disabled }: AmountInputProps) {
  const [display, setDisplay] = useState(value > 0 ? formatRpInput(String(value)) : '')

  useEffect(() => {
    setDisplay(value > 0 ? formatRpInput(String(value)) : '')
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatRpInput(e.target.value)
    setDisplay(formatted)
    onChange?.(parseRpInput(formatted))
  }

  return (
    <div className={`amount-wrap ${className ?? ''}`}>
      <span className="amount-prefix">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        name={name}
        value={display}
        onChange={handleChange}
        placeholder={placeholder ?? '0'}
        className="amount-input"
        disabled={disabled}
      />
    </div>
  )
}
