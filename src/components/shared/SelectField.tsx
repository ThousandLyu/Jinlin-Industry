'use client'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

const selectClass = 'admin-control w-full bg-white'

export default function SelectField({ value, onChange, options, placeholder, className = '' }: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${selectClass} ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
