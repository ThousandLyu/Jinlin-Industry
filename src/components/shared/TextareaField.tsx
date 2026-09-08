'use client'

export interface TextareaFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

const textareaClass = 'admin-control w-full'

export default function TextareaField({ value, onChange, placeholder, rows = 3, className = '' }: TextareaFieldProps) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${textareaClass} ${className}`}
    />
  )
}
