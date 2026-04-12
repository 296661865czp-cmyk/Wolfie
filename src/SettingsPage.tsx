import { useState, useRef } from 'react'
import { dbGetAll, dbPut, dbDelete } from './db'
import type { Task, Review } from './db'

export default function SettingsPage() {
  const [toast, setToast] = useState('')
  const [importConfirm, setImportConfirm] = useState(false)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingData = useRef<{ tasks: Task[]; reviews: Review[] } | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  // 导出
  const handleExport = async () => {
    const tasks = await dbGetAll<Task>('tasks')
    const reviews = await dbGetAll<Review>('reviews')
    const backup = {
      app: 'wolfie',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: { tasks, reviews },
    }
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const now = new Date()
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    a.href = url
    a.download = `wolfie-backup-${ymd}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('导出成功')
  }

  // 导入 — 读文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (parsed.app !== 'wolfie') {
          setImportError('文件格式不正确')
          return
        }
        if (!parsed.data?.tasks || !parsed.data?.reviews) {
          setImportError('文件缺少必要的数据字段')
          return
        }
        pendingData.current = { tasks: parsed.data.tasks, reviews: parsed.data.reviews }
        setImportConfirm(true)
      } catch {
        setImportError('无法解析文件内容')
      }
    }
    reader.readAsText(file)
    // 重置 input 以便同一文件可再次选择
    e.target.value = ''
  }

  // 导入 — 确认
  const handleImportConfirm = async () => {
    if (!pendingData.current) return
    const { tasks, reviews } = pendingData.current
    // 清空并重新写入：先删再写
    const allTasks = await dbGetAll<Task>('tasks')
    for (const t of allTasks) {
      await dbDelete('tasks', t.id)
    }
    const allReviews = await dbGetAll<Review>('reviews')
    for (const r of allReviews) {
      await dbDelete('reviews', r.date)
    }
    for (const t of tasks) {
      await dbPut('tasks', t)
    }
    for (const r of reviews) {
      await dbPut('reviews', r)
    }
    pendingData.current = null
    setImportConfirm(false)
    showToast('导入成功')
  }

  return (
    <div className="settings-page">
      {/* 数据管理 */}
      <div className="settings-section">
        <h3 className="settings-section-title">数据</h3>
        <button className="settings-item" onClick={handleExport}>
          <span>导出数据</span>
          <span className="settings-arrow">›</span>
        </button>
        <button className="settings-item" onClick={() => fileInputRef.current?.click()}>
          <span>导入数据</span>
          <span className="settings-arrow">›</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* 导入错误提示 */}
        {importError && (
          <div className="settings-error">{importError}</div>
        )}

        {/* 导入确认 */}
        {importConfirm && (
          <div className="import-confirm">
            <p className="import-confirm-text">导入将覆盖现有数据，是否继续？</p>
            <div className="import-confirm-actions">
              <button className="import-cancel" onClick={() => { setImportConfirm(false); pendingData.current = null }}>取消</button>
              <button className="import-ok" onClick={handleImportConfirm}>确认导入</button>
            </div>
          </div>
        )}
      </div>

      {/* 关于 */}
      <div className="settings-section">
        <h3 className="settings-section-title">关于</h3>
        <div className="settings-info">
          <p className="settings-app-name">Wolfie</p>
          <p className="settings-version">Version 1.0</p>
          <p className="settings-tagline">以出世的心做入世的事</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  )
}
