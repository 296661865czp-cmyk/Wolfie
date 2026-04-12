import { useState, useEffect, useRef, useCallback } from 'react'
import { dbPut, dbDelete, dbGetTasksByDate } from './db'
import type { Task } from './db'
import DateNav from './DateNav'

const NEEDS = [
  { key: 'sonata' as const, label: 'Sonata', color: 'var(--sonata)' },
  { key: 'opera' as const, label: 'Opera', color: 'var(--opera)' },
  { key: 'duty' as const, label: 'Duty', color: 'var(--duty)' },
]

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

/* ── 长按菜单 ── */
interface ContextMenuState {
  taskId: string
  x: number
  y: number
}

/* ── 编辑面板 ── */
interface EditState {
  id: string
  text: string
  need: Task['need']
}

interface TodayPageProps {
  currentDate: string
  onDateChange: (date: string) => void
}

export default function TodayPage({ currentDate, onDateChange }: TodayPageProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [fabOpen, setFabOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [newNeed, setNewNeed] = useState<Task['need']>('sonata')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)

  // 加载当日任务
  const loadTasks = useCallback(async () => {
    const data = await dbGetTasksByDate(currentDate)
    data.sort((a, b) => a.createdAt - b.createdAt)
    setTasks(data)
  }, [currentDate])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // FAB 打开时自动聚焦
  useEffect(() => {
    if (fabOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [fabOpen])

  // 编辑面板自动聚焦
  useEffect(() => {
    if (editState && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editState])

  // 关闭菜单
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu])

  // 添加任务
  const handleAdd = async () => {
    const text = newText.trim()
    if (!text) return
    const task: Task = {
      id: uuid(),
      text,
      need: newNeed,
      done: false,
      date: currentDate,
      createdAt: Date.now(),
    }
    await dbPut('tasks', task)
    setNewText('')
    setFabOpen(false)
    await loadTasks()
  }

  // 切换完成
  const toggleDone = async (task: Task) => {
    const updated = { ...task, done: !task.done }
    await dbPut('tasks', updated)
    await loadTasks()
  }

  // 编辑保存
  const handleEditSave = async () => {
    if (!editState) return
    const text = editState.text.trim()
    if (!text) return
    const original = tasks.find((t) => t.id === editState.id)
    if (!original) return
    const updated: Task = { ...original, text, need: editState.need }
    await dbPut('tasks', updated)
    setEditState(null)
    await loadTasks()
  }

  // 删除
  const handleDelete = async (id: string) => {
    await dbDelete('tasks', id)
    setDeleteConfirm(null)
    setContextMenu(null)
    await loadTasks()
  }

  // 长按
  const handlePointerDown = (taskId: string, e: React.PointerEvent) => {
    longPressTriggered.current = false
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setContextMenu({ taskId, x: e.clientX, y: e.clientY })
    }, 500)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // 阻止长按的默认行为
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  // 统计
  const totalDone = tasks.filter((t) => t.done).length
  const progress = tasks.length > 0 ? totalDone / tasks.length : 0

  // 分组
  const grouped = NEEDS.map((n) => ({
    ...n,
    tasks: tasks.filter((t) => t.need === n.key),
  })).filter((g) => g.tasks.length > 0)

  return (
    <div className="today-page">
      <DateNav currentDate={currentDate} onDateChange={onDateChange} />

      {/* 进度条 */}
      <div className="progress-bar-wrapper">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        {tasks.length > 0 && (
          <span className="progress-label">{totalDone}/{tasks.length}</span>
        )}
      </div>

      {/* 任务列表 */}
      <div className="task-list">
        {tasks.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">今日尚无事项</p>
            <p className="empty-hint">点击 + 添加</p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.key} className="task-group">
            <div className="group-header">
              <span className="group-label" style={{ color: group.color }}>
                <span className="group-dot" style={{ background: group.color }} />
                {group.label}
              </span>
              <span className="group-count">
                {group.tasks.filter((t) => t.done).length}/{group.tasks.length}
              </span>
            </div>
            {group.tasks.map((task) => (
              <div
                key={task.id}
                className={`task-card ${task.done ? 'done' : ''}`}
                onPointerDown={(e) => handlePointerDown(task.id, e)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={handleContextMenu}
              >
                <button
                  className={`checkbox ${task.done ? 'checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDone(task)
                  }}
                  style={task.done ? { borderColor: group.color, background: group.color } : { borderColor: group.color }}
                >
                  {task.done && '✓'}
                </button>
                <span className="task-text">{task.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* FAB — 表单展开时隐藏 */}
      {!fabOpen && (
        <button
          className="fab"
          onClick={() => setFabOpen(true)}
        >
          +
        </button>
      )}

      {/* 添加表单 — 放在顶部，避免手机弹出键盘时被遮挡 */}
      {fabOpen && (
        <div
          className="add-form-overlay"
          onMouseDown={() => { setFabOpen(false); setNewText('') }}
          onTouchStart={() => { setFabOpen(false); setNewText('') }}
        >
          <div
            className="add-form"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="need-selector">
              {NEEDS.map((n) => (
                <button
                  key={n.key}
                  className={`need-btn ${newNeed === n.key ? 'selected' : ''}`}
                  style={newNeed === n.key ? { background: n.color, color: '#fff', borderColor: n.color } : { borderColor: n.color, color: n.color }}
                  onClick={() => setNewNeed(n.key)}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <div className="add-input-row">
              <input
                ref={inputRef}
                className="add-input"
                type="text"
                placeholder="写下你要做的事..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
              />
              <button
                className="add-confirm"
                onClick={handleAdd}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 长按菜单 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-item"
            onClick={() => {
              const t = tasks.find((tk) => tk.id === contextMenu.taskId)
              if (t) setEditState({ id: t.id, text: t.text, need: t.need })
              setContextMenu(null)
            }}
          >
            编辑
          </button>
          {deleteConfirm === contextMenu.taskId ? (
            <button
              className="context-item delete-confirm"
              onClick={() => handleDelete(contextMenu.taskId)}
            >
              确认删除？
            </button>
          ) : (
            <button
              className="context-item delete"
              onClick={() => setDeleteConfirm(contextMenu.taskId)}
            >
              删除
            </button>
          )}
          <button className="context-item" onClick={() => setContextMenu(null)}>
            取消
          </button>
        </div>
      )}

      {/* 编辑面板 */}
      {editState && (
        <div className="edit-overlay" onClick={() => setEditState(null)}>
          <div className="edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="need-selector">
              {NEEDS.map((n) => (
                <button
                  key={n.key}
                  className={`need-btn ${editState.need === n.key ? 'selected' : ''}`}
                  style={editState.need === n.key ? { background: n.color, color: '#fff', borderColor: n.color } : { borderColor: n.color, color: n.color }}
                  onClick={() => setEditState({ ...editState, need: n.key })}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <input
              ref={editInputRef}
              className="add-input"
              type="text"
              value={editState.text}
              onChange={(e) => setEditState({ ...editState, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave()
                if (e.key === 'Escape') setEditState(null)
              }}
            />
            <div className="edit-actions">
              <button className="edit-cancel" onClick={() => setEditState(null)}>取消</button>
              <button className="edit-save" onClick={handleEditSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
