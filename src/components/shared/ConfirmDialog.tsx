'use client'
import Modal from './Modal'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = '确认操作',
  message = '确定要执行此操作吗？',
  confirmLabel = '确定',
  cancelLabel = '取消',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-sm leading-6 text-gray-600">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="admin-button admin-button-outline">
          {cancelLabel}
        </button>
        <button onClick={() => { onConfirm(); onClose() }} className="admin-button admin-button-danger">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
