'use client'

export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}

export default function FormField({ label, required = false, error, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-semibold text-[#4A3728]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[#8B1A2B]">{error}</p>}
    </div>
  )
}
