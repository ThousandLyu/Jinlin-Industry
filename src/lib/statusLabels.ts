export const RISK_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

export const RISK_BADGE_CLASSES: Record<string, string> = {
  high: 'border-red-200 bg-red-100 text-red-800',
  medium: 'border-yellow-200 bg-yellow-100 text-yellow-800',
  low: 'border-green-200 bg-green-100 text-green-800',
}

export const REVIEW_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已审核',
  rejected: '已驳回',
}

export function riskLabel(value?: string) {
  return RISK_LABELS[value || 'low'] || RISK_LABELS.low
}

export function riskBadgeClass(value?: string) {
  return RISK_BADGE_CLASSES[value || 'low'] || RISK_BADGE_CLASSES.low
}

export function reviewLabel(value?: string) {
  return REVIEW_LABELS[value || 'pending'] || REVIEW_LABELS.pending
}
