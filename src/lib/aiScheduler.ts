import fs from 'fs/promises';
import path from 'path';
import { isAIEnabledAsync } from '@/lib/aiClient';
import { ensureAllSummaries } from '@/lib/sumaryStore';

const QUEUE_FILE = path.join(process.cwd(), 'data', 'ai-queue-status.json');

export type TaskType = 'generate-summary' | 'detect-conflict' | 'link-persons' | 'build-token' | 'discover-links';

export interface QueueTask {
  id: string;
  type: TaskType;
  targetType: string;
  targetId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueStatus {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
  currentTask?: QueueTask | null;
  lastRunAt?: string;
  tasks: QueueTask[];
}

function emptyStatus(): QueueStatus {
  return { total: 0, pending: 0, running: 0, done: 0, failed: 0, tasks: [] };
}

async function readQueue(): Promise<QueueStatus> {
  try {
    const raw = await fs.readFile(QUEUE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return emptyStatus();
  }
}

async function writeQueue(status: QueueStatus): Promise<void> {
  await fs.mkdir(path.dirname(QUEUE_FILE), { recursive: true });
  await fs.writeFile(QUEUE_FILE, JSON.stringify(status, null, 2));
}

/** 获取当前队列状态 */
export async function getQueueStatus(): Promise<QueueStatus> {
  return readQueue();
}

/** 入队任务 */
export async function enqueueTask(task: Omit<QueueTask, 'id' | 'status' | 'done' | 'failed'>): Promise<QueueTask> {
  const status = await readQueue();
  const newTask: QueueTask = {
    ...task,
    id: `${task.type}-${task.targetType}-${task.targetId}-${Date.now()}`,
    status: 'pending',
  };
  status.tasks.push(newTask);
  status.total = status.tasks.length;
  status.pending = status.tasks.filter(t => t.status === 'pending').length;
  await writeQueue(status);
  return newTask;
}

/** 执行队列：逐条处理pending任务，限速3s，最多20条 */
export async function runQueue(options: {
  signal?: AbortSignal;
  onProgress?: (status: QueueStatus) => void;
  maxConsecutive?: number;
} = {}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const enabled = await isAIEnabledAsync();
  if (!enabled) return { processed: 0, succeeded: 0, failed: 0 };

  const maxConsecutive = options.maxConsecutive ?? 20;
  const status = await readQueue();
  const pendingTasks = status.tasks.filter(t => t.status === 'pending').slice(0, maxConsecutive);

  if (pendingTasks.length === 0) {
    // 无手动入队任务，自动补全缺失摘要
    try {
      const result = await ensureAllSummaries({ signal: options.signal, maxConsecutive });
      return result;
    } catch {
      return { processed: 0, succeeded: 0, failed: 0 };
    }
  }

  let succeeded = 0; let failed = 0;
  for (let i = 0; i < pendingTasks.length; i++) {
    if (options.signal?.aborted) break;
    const task = pendingTasks[i];
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    status.currentTask = task;
    status.running = 1;
    await writeQueue(status);
    options.onProgress?.(status);

    try {
      // 根据任务类型执行对应操作
      if (task.type === 'generate-summary' && task.targetType === 'source') {
        const { buildSummaryForSource } = await import('@/lib/sumaryStore');
        const source = await (await import('@/lib/dataService')).db.sources.getById(task.targetId);
        if (source) await buildSummaryForSource(source as any);
      }
      task.status = 'done';
      task.completedAt = new Date().toISOString();
      succeeded++;
    } catch (e) {
      task.status = 'failed';
      task.error = String(e);
      failed++;
    }

    status.running = 0;
    status.currentTask = null;
    status.done = status.tasks.filter(t => t.status === 'done').length;
    status.failed = status.tasks.filter(t => t.status === 'failed').length;
    status.pending = status.tasks.filter(t => t.status === 'pending').length;
    status.lastRunAt = new Date().toISOString();
    await writeQueue(status);

    if (i < pendingTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  return { processed: pendingTasks.length, succeeded, failed };
}

/** 清空已完成/失败的任务 */
export async function clearQueue(): Promise<void> {
  const status = await readQueue();
  status.tasks = status.tasks.filter(t => t.status === 'pending');
  status.done = 0;
  status.failed = 0;
  status.total = status.tasks.length;
  status.pending = status.tasks.length;
  status.currentTask = null;
  await writeQueue(status);
}
