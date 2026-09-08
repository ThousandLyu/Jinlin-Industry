'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export default function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`admin-modal-card max-w-lg ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8DCC8] bg-[#FDFBF7] p-4">
          <h2 id="modal-title" className="text-lg font-bold text-[#4A3728]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition hover:bg-[#F5F0E8] hover:text-[#4A3728]" aria-label="关闭">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
