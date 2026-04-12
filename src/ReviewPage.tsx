import { useState, useEffect, useCallback, useRef } from 'react'
import { dbGetTasksByDate, dbPut, dbGet } from './db'
import type { Task, Review } from './db'
import DateNav from './DateNav'

interface ReviewPageProps {
  currentDate: string
  onDateChange: (date: string) => void
}

export default function ReviewPage({ currentDate, onDateChange }: ReviewPageProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [savedText, setSavedText] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadData = useCallback(async () => {
    const taskData = await dbGetTasksByDate(currentDate)
    setTasks(taskData)
    const review = await dbGet<Review>('reviews', currentDate)
    setSavedText(review?.text ?? '')
    setEditing(false)
  }, [currentDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  const handleEnterEdit = () => {
    setDraft(savedText)
    setEditing(true)
  }

  const handleSave = async () => {
    const text = draft.trim()
    const review: Review = {
      date: currentDate,
      text,
      updatedAt: Date.now(),
    }
    await dbPut('reviews', review)
    setSavedText(text)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const total = tasks.length
  const done = tasks.filter((t) => t.done).length
  const sonataDone = tasks.filter((t) => t.need === 'sonata' && t.done).length
  const operaDone = tasks.filter((t) => t.need === 'opera' && t.done).length
  const dutyDone = tasks.filter((t) => t.need === 'duty' && t.done).length

  return (
    <div className="review-page">
      <DateNav currentDate={currentDate} onDateChange={onDateChange} />

      {/* 当日数据摘要 */}
      <div className="review-summary">
        <div className="summary-item">
          <span className="summary-value">{done}/{total}</span>
          <span className="summary-label">完成</span>
        </div>
        <div className="summary-item">
          <span className="summary-value" style={{ color: 'var(--sonata)' }}>{sonataDone}</span>
          <span className="summary-label">Sonata</span>
        </div>
        <div className="summary-item">
          <span className="summary-value" style={{ color: 'var(--opera)' }}>{operaDone}</span>
          <span className="summary-label">Opera</span>
        </div>
        <div className="summary-item">
          <span className="summary-value" style={{ color: 'var(--duty)' }}>{dutyDone}</span>
          <span className="summary-label">Duty</span>
        </div>
      </div>

      {/* 回顾文本 */}
      <div className="review-write">
        {editing ? (
          <>
            <div className="review-edit-block">
              <textarea
                ref={textareaRef}
                className="review-textarea"
                placeholder="写下你的感受..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="review-actions">
                <button className="review-cancel-btn" onClick={handleCancel}>取消</button>
                <button className="review-save-btn" onClick={handleSave}>保存</button>
              </div>
            </div>
          </>
        ) : (
          <div className="review-display" onClick={handleEnterEdit}>
            {savedText ? (
              <p className="review-saved-text">{savedText}</p>
            ) : (
              <p className="review-placeholder">记录今天的感受...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
