import { useState, useEffect, useRef } from 'react'
import { templateGetAll, templateAdd, templateUpdate, templateDelete } from './db'
import type { Template } from './db'

const GROUP_OPTIONS = [
  { key: 'daily' as const, label: '每日' },
  { key: 'weekday' as const, label: '工作日' },
  { key: 'weekend' as const, label: '周末' },
]

const GROUP_LABEL_MAP: Record<Template['group'], string> = {
  daily: '每日',
  weekday: '工作日',
  weekend: '周末',
}

interface FormState {
  mode: 'add' | 'edit'
  id?: string
  text: string
  group: Template['group']
}

interface ContextMenuState {
  tplId: string
  x: number
  y: number
}

export default function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)

  const loadTemplates = async () => {
    const data = await templateGetAll()
    data.sort((a, b) => a.createdAt - b.createdAt)
    setTemplates(data)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (form && inputRef.current) {
      inputRef.current.focus()
    }
  }, [form])

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => { setContextMenu(null); setDeleteConfirm(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu])

  const canSave = form ? form.text.trim().length > 0 : false

  const handleSave = async () => {
    if (!form || !canSave) return
    const text = form.text.trim()
    if (form.mode === 'add') {
      await templateAdd(text, form.group)
    } else {
      await templateUpdate(form.id!, { text, group: form.group })
    }
    setForm(null)
    await loadTemplates()
  }

  const handleDelete = async (id: string) => {
    await templateDelete(id)
    setContextMenu(null)
    setDeleteConfirm(null)
    await loadTemplates()
  }

  const startEdit = (tpl: Template) => {
    setForm({ mode: 'edit', id: tpl.id, text: tpl.text, group: tpl.group })
    setContextMenu(null)
  }

  const handlePointerDown = (tplId: string, e: React.PointerEvent) => {
    longPressTriggered.current = false
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setContextMenu({ tplId, x: e.clientX, y: e.clientY })
    }, 500)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const renderForm = () => {
    if (!form) return null
    const isEdit = form.mode === 'edit'
    return (
      <div className="template-form">
        <input
          ref={inputRef}
          className="template-form-input"
          type="text"
          placeholder="写下要做的事..."
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) handleSave()
            if (e.key === 'Escape') setForm(null)
          }}
        />
        <div className="template-form-bottom">
          <div className="template-form-radios">
            {GROUP_OPTIONS.map((g) => (
              <label
                key={g.key}
                className={`template-radio ${form.group === g.key ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="tpl-group"
                  value={g.key}
                  checked={form.group === g.key}
                  onChange={() => setForm({ ...form, group: g.key })}
                />
                {g.label}
              </label>
            ))}
          </div>
          <div className="template-form-actions">
            <button className="template-form-cancel" onClick={() => setForm(null)}>取消</button>
            <button
              className={`template-form-confirm ${!canSave ? 'disabled' : ''}`}
              onClick={handleSave}
              disabled={!canSave}
            >{isEdit ? '保存' : '添加'}</button>
          </div>
        </div>
      </div>
    )
  }

  // 编辑态：表单替换对应的展示行
  const editingId = form?.mode === 'edit' ? form.id : null

  return (
    <div className="template-list-wrap">
      <div className="template-list-divider" />

      {templates.map((tpl) =>
        editingId === tpl.id ? (
          <div key={tpl.id}>{renderForm()}</div>
        ) : (
          <div
            key={tpl.id}
            className="template-row"
            onPointerDown={(e) => handlePointerDown(tpl.id, e)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={handleContextMenu}
          >
            <span className="template-row-text">{tpl.text}</span>
            <span className="template-row-chip">{GROUP_LABEL_MAP[tpl.group]}</span>
          </div>
        ),
      )}

      {/* 添加态：表单替换 "+ 添加" 按钮 */}
      {form?.mode === 'add' ? (
        renderForm()
      ) : (
        <button
          className="template-add-btn"
          onClick={() => setForm({ mode: 'add', text: '', group: 'daily' })}
        >
          + 添加
        </button>
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
              const tpl = templates.find((t) => t.id === contextMenu.tplId)
              if (tpl) startEdit(tpl)
            }}
          >
            编辑
          </button>
          {deleteConfirm === contextMenu.tplId ? (
            <button
              className="context-item delete-confirm"
              onClick={() => handleDelete(contextMenu.tplId)}
            >
              确认删除？
            </button>
          ) : (
            <button
              className="context-item delete"
              onClick={() => setDeleteConfirm(contextMenu.tplId)}
            >
              删除
            </button>
          )}
          <button className="context-item" onClick={() => { setContextMenu(null); setDeleteConfirm(null) }}>
            取消
          </button>
        </div>
      )}
    </div>
  )
}
