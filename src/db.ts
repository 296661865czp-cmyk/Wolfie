const DB_NAME = 'wolfie-db'
const DB_VERSION = 1

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
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function dbPut<T extends Task | Review>(
  storeName: 'tasks' | 'reviews',
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
  storeName: 'tasks' | 'reviews',
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
  storeName: 'tasks' | 'reviews',
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
  storeName: 'tasks' | 'reviews',
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
