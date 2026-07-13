'use client'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="confirm-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className="eyebrow">Konfirmasi</p>
        <h2 id="confirm-title" className="text-[17px] font-bold uppercase tracking-[.06em] mb-2">{title}</h2>
        <p className="text-[13px] text-ink-soft leading-relaxed mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-outline" onClick={onCancel}>{cancelLabel}</button>
          <button className={danger ? 'btn btn-danger' : 'btn'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
