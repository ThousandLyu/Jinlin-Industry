'use client'

export interface TextFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel'
  className?: string
}

const inputClass = 'admin-control w-full'

export default function TextField({ value, onChange, placeholder, type = 'text', className = '' }: TextFieldProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} ${className}`}
    />
  )
}
