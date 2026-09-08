import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type {
  Source, HeritageSite, Person, FactClaim, SourceLink, TimelineEvent,
  MapPoint, DigitalScene, Course, Activity, MediaFile, Settings, UserAccount, SourceSubmission, AiToken
} from '@/types'

interface BaseFields {
  id: string
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

const CACHE_TTL_MS = 30_000

class WriteMutex {
  private queue: Promise<void> = Promise.resolve()

  async acquire(): Promise<() => void> {
    let release: () => void
    const wait = new Promise<void>((resolve) => {
      release = resolve
    })
    const prev = this.queue
    this.queue = prev.then(() => wait)
    await prev
    return release!
  }
}

export class DataService<T extends BaseFields> {
  private filename: string
  private cacheRaw: string | null = null
  private cacheAt: number = 0
  private static mutexes = new Map<string, WriteMutex>()

  constructor(filename: string) {
    this.filename = filename
  }

  private getFilePath(): string {
    return path.join(process.cwd(), 'data', this.filename)
  }

  private getMutex(): WriteMutex {
    const key = this.filename
    if (!DataService.mutexes.has(key)) {
      DataService.mutexes.set(key, new WriteMutex())
    }
    return DataService.mutexes.get(key)!
  }

  private ensureDir(): void {
    const dir = path.dirname(this.getFilePath())
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private async readAll(): Promise<T[]> {
    const now = Date.now()

    if (this.cacheRaw !== null && (now - this.cacheAt) < CACHE_TTL_MS) {
      return JSON.parse(this.cacheRaw) as T[]
    }

    this.ensureDir()
    const filePath = this.getFilePath()

    if (!fs.existsSync(filePath)) {
      await fsp.writeFile(filePath, '[]', 'utf-8')
      this.cacheRaw = '[]'
      this.cacheAt = now
      return []
    }

    try {
      const raw = await fsp.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        throw new Error('Data file content is not an array')
      }
      this.cacheRaw = raw
      this.cacheAt = now
      return parsed as T[]
    } catch {
      await this.handleCorruptedFile(filePath)
      this.cacheRaw = '[]'
      this.cacheAt = now
      return []
    }
  }

  private async readFresh(): Promise<T[]> {
    const filePath = this.getFilePath()
    this.ensureDir()

    if (!fs.existsSync(filePath)) {
      await fsp.writeFile(filePath, '[]', 'utf-8')
      return []
    }

    try {
      const raw = await fsp.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        throw new Error('Data file content is not an array')
      }
      return parsed as T[]
    } catch {
      await this.handleCorruptedFile(filePath)
      return []
    }
  }

  private async handleCorruptedFile(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(process.cwd(), 'data', 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    const backupPath = path.join(backupDir, `corrupted-${this.filename}-${timestamp}.bak`)
    try {
      if (fs.existsSync(filePath)) {
        const corrupted = await fsp.readFile(filePath, 'utf-8')
        await fsp.writeFile(backupPath, corrupted, 'utf-8')
      }
    } catch { /* backup failed, continue */ }

    console.error(
      `[dataService] Corrupted JSON in ${this.filename}, backed up to ${path.basename(backupPath)}. Reinitializing empty.`
    )

    await fsp.writeFile(filePath, '[]', 'utf-8')
  }

  private async writeAll(data: T[]): Promise<void> {
    const filePath = this.getFilePath()
    this.ensureDir()
    const raw = JSON.stringify(data, null, 2)
    await fsp.writeFile(filePath, raw, 'utf-8')
    this.cacheRaw = raw
    this.cacheAt = Date.now()
  }

  async getAll(): Promise<T[]> {
    const items = await this.readAll()
    return items.filter((item) => !(item as any).isDeleted)
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.readAll()
    const item = items.find((i) => i.id === id && !(i as any).isDeleted)
    return item || null
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<T> {
    const release = await this.getMutex().acquire()
    try {
      const items = await this.readFresh()
      const now = new Date().toISOString()
      const newItem = {
        ...data,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      } as unknown as T
      items.push(newItem)
      await this.writeAll(items)
      return newItem
    } finally {
      release()
    }
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const release = await this.getMutex().acquire()
    try {
      const items = await this.readFresh()
      const index = items.findIndex((i) => i.id === id && !(i as any).isDeleted)
      if (index === -1) return null
      items[index] = {
        ...items[index],
        ...data,
        id: items[index].id,
        createdAt: items[index].createdAt,
        updatedAt: new Date().toISOString(),
      } as T
      await this.writeAll(items)
      return items[index]
    } finally {
      release()
    }
  }

  async delete(id: string): Promise<boolean> {
    const release = await this.getMutex().acquire()
    try {
      const items = await this.readFresh()
      const index = items.findIndex((i) => i.id === id && !(i as any).isDeleted)
      if (index === -1) return false
      items[index] = { ...items[index], isDeleted: true, updatedAt: new Date().toISOString() } as T
      await this.writeAll(items)
      return true
    } finally {
      release()
    }
  }

  async query(filter: Partial<T>): Promise<T[]> {
    const items = await this.getAll()
    return items.filter((item) => {
      for (const key of Object.keys(filter) as (keyof T)[]) {
        if (item[key] !== filter[key]) return false
      }
      return true
    })
  }

  async search(keyword: string, fields: (keyof T)[]): Promise<T[]> {
    if (!keyword.trim()) return this.getAll()
    const items = await this.getAll()
    const kw = keyword.toLowerCase()
    return items.filter((item) => {
      return fields.some((field) => {
        const val = item[field]
        if (typeof val === 'string') return val.toLowerCase().includes(kw)
        if (typeof val === 'number') return String(val).includes(kw)
        return false
      })
    })
  }

  async all(): Promise<T[]> {
    return this.readAll()
  }

  async count(): Promise<number> {
    const items = await this.getAll()
    return items.length
  }

  async getPaginated(
    options: {
      page?: number
      pageSize?: number
      sortField?: string
      sortDir?: 'asc' | 'desc'
    } = {}
  ): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1)
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20))
    const sortField = options.sortField
    const sortDir = options.sortDir || 'asc'

    let items = await this.getAll()

    if (sortField && items.length > 0) {
      items = [...items].sort((a, b) => {
        const av = (a as any)[sortField]
        const bv = (b as any)[sortField]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'string') {
          const cmp = av.localeCompare(String(bv), 'zh-CN')
          return sortDir === 'desc' ? -cmp : cmp
        }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'desc' ? -cmp : cmp
      })
    }

    const total = items.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const paged = items.slice(start, start + pageSize)

    return { items: paged, total, page, pageSize, totalPages }
  }
}

export const db = {
  sources: new DataService<Source>('sources.json'),
  sites: new DataService<HeritageSite>('sites.json'),
  people: new DataService<Person>('people.json'),
  facts: new DataService<FactClaim>('facts.json'),
  timeline: new DataService<TimelineEvent>('timeline.json'),
  mapPoints: new DataService<MapPoint>('map_points.json'),
  scenes: new DataService<DigitalScene>('scenes.json'),
  courses: new DataService<Course>('courses.json'),
  activities: new DataService<Activity>('activities.json'),
  media: new DataService<MediaFile>('media.json'),
  settings: new DataService<Settings>('settings.json'),
  users: new DataService<UserAccount>('users.json'),
  sourceSubmissions: new DataService<SourceSubmission>('source_submissions.json'),
  aiTokens: new DataService<AiToken>('ai_tokens.json'),
  sourceLinks: new DataService<SourceLink>('sourceLinks.json'),
}
