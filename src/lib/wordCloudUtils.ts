export interface WordCloudItem {
  text: string
  size: number
  weight: number
  type: 'keyword' | 'entity' | 'person'
  relatedSources: Array<{
    id: string
    title: string
    grade: string
    count: number
  }>
  totalRelated: number
}

export function weightToColor(weight: number, maxWeight: number): string {
  const ratio = maxWeight > 0 ? weight / maxWeight : 0
  if (ratio >= 0.9) return '#4A3728'
  if (ratio >= 0.6) return '#8B1A2B'
  if (ratio >= 0.3) return '#C49A2B'
  return 'rgba(196, 154, 43, 0.7)'
}

export function sizeFromWeight(weight: number, maxWeight: number): number {
  const minSize = 14
  const maxSize = 72
  if (maxWeight <= 0) return minSize
  const ratio = weight / maxWeight
  return Math.round(minSize + ratio * (maxSize - minSize))
}
