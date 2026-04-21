import { useState, useEffect, useCallback } from 'react'
import { dbGetAll } from './db'
import type { Task } from './db'
import { formatDate } from './dateUtils'

const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

const RANGES = [
  { key: '7d', label: '近7天', days: 7 },
  { key: '30d', label: '近30天', days: 30 },
  { key: '1y', label: '近1年', days: 0 },
] as const

type RangeKey = (typeof RANGES)[number]['key']

interface DayData {
  date: string
  label: string
  total: number
  done: number
}

function getDatesInRange(days: number): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(formatDate(d))
  }
  return dates
}

function getLast12Months(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}月`
    months.push({ key, label })
  }
  return months
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}/${d}`
}

export default function StatsPage() {
  const [range, setRange] = useState<RangeKey>('7d')
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    dbGetAll<Task>('tasks').then(setTasks)
  }, [])

  const buildDayData = useCallback((): DayData[] => {
    // Group tasks by date
    const byDate = new Map<string, { total: number; done: number }>()
    for (const t of tasks) {
      const entry = byDate.get(t.date) ?? { total: 0, done: 0 }
      entry.total++
      if (t.done) entry.done++
      byDate.set(t.date, entry)
    }

    if (range === '1y') {
      // Aggregate by month: fixed 12 bars
      const months = getLast12Months()
      return months.map((m) => {
        let total = 0
        let done = 0
        for (const [dateStr, entry] of byDate) {
          if (dateStr.startsWith(m.key)) {
            total += entry.total
            done += entry.done
          }
        }
        return { date: m.key, label: m.label, total, done }
      })
    }

    const days = RANGES.find((r) => r.key === range)!.days
    const dates = getDatesInRange(days)

    return dates.map((d, i) => {
      const [y, m, day] = d.split('-').map(Number)
      const dateObj = new Date(y, m - 1, day)
      const entry = byDate.get(d)
      let label = ''
      if (range === '7d') {
        label = `周${WEEKDAYS_SHORT[dateObj.getDay()]} ${formatShortDate(d)}`
      } else if (range === '30d') {
        if (i % 7 === 0) {
          label = formatShortDate(d)
        }
      }
      return {
        date: d,
        label,
        total: entry?.total ?? 0,
        done: entry?.done ?? 0,
      }
    })
  }, [range, tasks])

  const dayData = buildDayData()
  const maxVal = Math.max(1, ...dayData.map((d) => d.total))

  // Attribution counts for selected range
  const rangeTasks = range === '1y'
    ? tasks.filter((t) => {
        const now = new Date()
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        const [y, m, d] = t.date.split('-').map(Number)
        const td = new Date(y, m - 1, d)
        return td >= oneYearAgo
      })
    : tasks.filter((t) => dayData.some((d) => d.date === t.date))
  const sonataTotal = rangeTasks.filter((t) => t.need === 'sonata').length
  const operaTotal = rangeTasks.filter((t) => t.need === 'opera').length
  const dutyTotal = rangeTasks.filter((t) => t.need === 'duty').length
  const attrMax = Math.max(1, sonataTotal, operaTotal, dutyTotal)

  // Completion rate
  const totalTasks = rangeTasks.length
  const totalDone = rangeTasks.filter((t) => t.done).length
  const rate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  return (
    <div className="stats-page">
      {/* 时间范围切换 */}
      <div className="range-selector">
        {RANGES.map((r) => (
          <button
            key={r.key}
            className={`range-btn ${range === r.key ? 'active' : ''}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {totalTasks === 0 ? (
        <div className="stats-empty">
          <p>暂无数据</p>
        </div>
      ) : (
        <>
          {/* 柱状图 */}
          <div className="chart-section">
            <div className="chart">
              {dayData.map((d) => (
                <div key={d.date} className="chart-col">
                  <div className="chart-bars">
                    <div
                      className="chart-bar total-bar"
                      style={{ height: `${(d.total / maxVal) * 100}%` }}
                    />
                    <div
                      className="chart-bar done-bar"
                      style={{ height: `${(d.done / maxVal) * 100}%` }}
                    />
                  </div>
                  {d.label ? <span className="chart-label">{d.label}</span> : <span className="chart-label-spacer" />}
                </div>
              ))}
            </div>
          </div>

          {/* 归因分布 */}
          <div className="attr-section">
            <h3 className="section-title">归因分布</h3>
            <div className="attr-row">
              <span className="attr-name">Sonata</span>
              <div className="attr-track">
                <div className="attr-fill" style={{ width: `${(sonataTotal / attrMax) * 100}%`, background: 'var(--sonata)' }} />
              </div>
              <span className="attr-count">{sonataTotal}</span>
            </div>
            <div className="attr-row">
              <span className="attr-name">Opera</span>
              <div className="attr-track">
                <div className="attr-fill" style={{ width: `${(operaTotal / attrMax) * 100}%`, background: 'var(--opera)' }} />
              </div>
              <span className="attr-count">{operaTotal}</span>
            </div>
            <div className="attr-row">
              <span className="attr-name">Duty</span>
              <div className="attr-track">
                <div className="attr-fill" style={{ width: `${(dutyTotal / attrMax) * 100}%`, background: 'var(--duty)' }} />
              </div>
              <span className="attr-count">{dutyTotal}</span>
            </div>
          </div>

          {/* 完成率 */}
          <div className="rate-section">
            <span className="rate-value">{rate}%</span>
            <span className="rate-detail">{totalDone}/{totalTasks}</span>
          </div>
        </>
      )}
    </div>
  )
}
