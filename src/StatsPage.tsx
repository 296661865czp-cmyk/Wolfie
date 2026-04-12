import { useState, useEffect, useCallback } from 'react'
import { dbGetAll } from './db'
import type { Task } from './db'
import { formatDate } from './dateUtils'

const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

const RANGES = [
  { key: '7d', label: '近7天', days: 7 },
  { key: '30d', label: '近30天', days: 30 },
  { key: 'all', label: '全部', days: 0 },
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

function getAllDates(tasks: Task[]): string[] {
  if (tasks.length === 0) return []
  const dates = [...new Set(tasks.map((t) => t.date))].sort()
  return dates
}

function aggregateByWeek(dates: string[]): string[][] {
  const weeks: string[][] = []
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7))
  }
  return weeks
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
    let dates: string[]

    if (range === 'all') {
      dates = getAllDates(tasks)
    } else {
      const days = RANGES.find((r) => r.key === range)!.days
      dates = getDatesInRange(days)
    }

    // Group tasks by date
    const byDate = new Map<string, { total: number; done: number }>()
    for (const t of tasks) {
      const entry = byDate.get(t.date) ?? { total: 0, done: 0 }
      entry.total++
      if (t.done) entry.done++
      byDate.set(t.date, entry)
    }

    // For all mode with >60 days, aggregate by week
    if (range === 'all' && dates.length > 60) {
      const weeks = aggregateByWeek(dates)
      return weeks.map((weekDates) => {
        let total = 0
        let done = 0
        for (const d of weekDates) {
          const entry = byDate.get(d)
          if (entry) {
            total += entry.total
            done += entry.done
          }
        }
        const first = weekDates[0]
        const last = weekDates[weekDates.length - 1]
        return {
          date: first,
          label: `${formatShortDate(first)}-${formatShortDate(last)}`,
          total,
          done,
        }
      })
    }

    return dates.map((d) => {
      const [y, m, day] = d.split('-').map(Number)
      const dateObj = new Date(y, m - 1, day)
      const entry = byDate.get(d)
      // For 30d, only show label on Mondays
      let label = ''
      if (range === '7d') {
        label = `周${WEEKDAYS_SHORT[dateObj.getDay()]} ${formatShortDate(d)}`
      } else if (range === '30d') {
        if (dateObj.getDay() === 1) {
          label = formatShortDate(d)
        }
      } else {
        label = formatShortDate(d)
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
  const rangeDateSet = new Set(dayData.map((d) => d.date))
  const rangeTasks = range === 'all' ? tasks : tasks.filter((t) => rangeDateSet.has(t.date))
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
                  {d.label && <span className="chart-label">{d.label}</span>}
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
