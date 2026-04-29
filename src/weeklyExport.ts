import { formatDate } from './dateUtils'
import { dbGetAll, dbGet } from './db'
import type { Task, Review } from './db'

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getWeekRange(weekEndDate: Date): {
  start: string
  end: string
  dates: string[]
} {
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(weekEndDate)
    d.setDate(d.getDate() - i)
    dates.push(formatDate(d))
  }
  return { start: dates[0], end: dates[6], dates }
}

export async function exportWeeklyMarkdown(weekEndDate: Date): Promise<{
  filename: string
  content: string
}> {
  const { start, end, dates } = getWeekRange(weekEndDate)
  const weekNum = getISOWeek(weekEndDate)

  const allTasks = await dbGetAll<Task>('tasks')
  const tasksByDate = new Map<string, Task[]>()
  for (const t of allTasks) {
    const list = tasksByDate.get(t.date) ?? []
    list.push(t)
    tasksByDate.set(t.date, list)
  }

  const reviewsByDate = new Map<string, string>()
  for (const date of dates) {
    const review = await dbGet<Review>('reviews', date)
    reviewsByDate.set(date, review?.text ?? '')
  }

  const fmt = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return `${dateStr} ${WEEKDAY_CN[dt.getDay()]}`
  }

  let md = `# Week ${weekNum} · ${start.replace(/-/g, '.')} - ${end.replace(/-/g, '.')}\n\n`
  md += `## 任务记录\n\n`

  for (const date of dates) {
    md += `### ${fmt(date)}\n\n`
    const tasks = tasksByDate.get(date)
    if (tasks && tasks.length > 0) {
      for (const t of tasks) {
        md += `- [${t.need}] ${t.text}\n`
      }
    } else {
      md += `（无记录）\n`
    }
    md += `\n`
  }

  md += `---\n\n## 每日感受\n\n`

  for (const date of dates) {
    md += `### ${fmt(date)}\n\n`
    const text = reviewsByDate.get(date)
    if (text) {
      md += `${text}\n`
    } else {
      md += `（无记录）\n`
    }
    md += `\n`
  }

  const filename = `wolfie-week-${weekNum}-${start}-to-${end}.md`
  return { filename, content: md }
}

export function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
