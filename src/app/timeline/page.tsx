import TimelineClient from './TimelineClient'
import { db } from '@/lib/dataService'

export default async function TimelinePage() {
  const [events, sources] = await Promise.all([
    db.timeline.getAll(),
    db.sources.getAll(),
  ])

  const publicEvents = events
    .filter((event: any) => !event.isDeleted)
    .filter((event: any) => event.isPublished !== false)
    .filter((event: any) => (event.reviewStatus || 'approved') === 'approved')
    .sort((a: any, b: any) => Number(a.year) - Number(b.year))

  return <TimelineClient events={publicEvents} sources={sources.filter((source: any) => !source.isDeleted)} />
}
