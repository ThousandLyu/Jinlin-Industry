'use client'

export type BadgeVariant = 'high' | 'medium' | 'low' | 'A' | 'B' | 'C' | 'info' | 'success' | 'warning'

const variantClass: Record<BadgeVariant, string> = {
  high: 'admin-chip-danger',
  medium: 'admin-chip-accent',
  low: 'admin-chip-muted',
  A: 'admin-chip-danger',
  B: 'admin-chip-accent',
  C: 'admin-chip-muted',
  info: 'admin-chip',
  success: 'admin-chip-muted',
  warning: 'admin-chip-accent',
}

export interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`${variantClass[variant]} ${className}`}>
      {children}
    </span>
  )
}
