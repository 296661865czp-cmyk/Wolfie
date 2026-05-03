const DB_NAME = 'wolfie-db'
const DB_VERSION = 2

export interface Task {
  id: string
  text: string
  need: 'sonata' | 'opera' | 'duty' // 随心奏鸣 | 命题歌剧 | 应差谋生
  done: boolean
  date: string // YYYY-MM-DD
  createdAt: number // timestamp
}

export interface Review {
  date: string // YYYY-MM-DD, 主键
  text: string
  updatedAt: number // timestamp
}

export interface Template {
  id: string
  text: string
  group: 'daily' | 'weekday' | 'weekend'
  createdAt: number
  order: number
}

export interface MetaEntry {
  key: string
  value: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' })
        tasksStore.createIndex('date', 'date', { unique: false })
      }

      if (!db.objectStoreNames.contains('reviews')) {
        db.createObjectStore('reviews', { keyPath: 'date' })
      }

      if (!db.objectStoreNames.contains('templates')) {
        const templatesStore = db.createObjectStore('templates', { keyPath: 'id' })
        templatesStore.createIndex('group', 'group', { unique: false })
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function dbPut<T extends Task | Review | Template | MetaEntry>(
  storeName: 'tasks' | 'reviews' | 'templates' | 'meta',
  value: T,
): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbGet<T>(
  storeName: 'tasks' | 'reviews' | 'templates' | 'meta',
  key: string,
): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function dbGetAll<T>(
  storeName: 'tasks' | 'reviews' | 'templates' | 'meta',
): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

export async function dbDelete(
  storeName: 'tasks' | 'reviews' | 'templates' | 'meta',
  key: string,
): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbGetTasksByDate(date: string): Promise<Task[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readonly')
    const index = tx.objectStore('tasks').index('date')
    const request = index.getAll(date)
    request.onsuccess = () => resolve(request.result as Task[])
    request.onerror = () => reject(request.error)
  })
}

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

// ── Template CRUD ──

export async function templateAdd(
  text: string,
  group: 'daily' | 'weekday' | 'weekend',
): Promise<Template> {
  const now = Date.now()
  const tpl: Template = {
    id: uuid(),
    text,
    group,
    createdAt: now,
    order: now,
  }
  await dbPut('templates', tpl)
  return tpl
}

export async function templateUpdate(id: string, patch: Partial<Template>): Promise<void> {
  const existing = await dbGet<Template>('templates', id)
  if (!existing) return
  await dbPut('templates', { ...existing, ...patch })
}

export async function templateDelete(id: string): Promise<void> {
  await dbDelete('templates', id)
}

export async function templateGetAll(): Promise<Template[]> {
  return dbGetAll<Template>('templates')
}

export async function templateGetByGroup(group: 'daily' | 'weekday' | 'weekend'): Promise<Template[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly')
    const index = tx.objectStore('templates').index('group')
    const request = index.getAll(group)
    request.onsuccess = () => resolve(request.result as Template[])
    request.onerror = () => reject(request.error)
  })
}

// ── Meta CRUD ──

export async function metaGet(key: string): Promise<string | null> {
  const entry = await dbGet<MetaEntry>('meta', key)
  return entry?.value ?? null
}

export async function metaSet(key: string, value: string): Promise<void> {
  await dbPut('meta', { key, value })
}
