import { formatDate } from './dateUtils'
import { dbPut, metaGet, metaSet, templateGetByGroup } from './db'
import type { Task } from './db'

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

export async function generateTodayTemplateTasks(): Promise<void> {
  const today = formatDate(new Date())
  const lastGenerated = await metaGet('lastGeneratedDate')

  if (lastGenerated === today) return

  const dayOfWeek = new Date().getDay() // 0=周日, 6=周六, 1-5=周一到周五

  const groupsToGenerate: ('daily' | 'weekday' | 'weekend')[] = ['daily']
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    groupsToGenerate.push('weekday')
  } else {
    groupsToGenerate.push('weekend')
  }

  const allTemplates = []
  for (const group of groupsToGenerate) {
    const templates = await templateGetByGroup(group)
    allTemplates.push(...templates)
  }

  if (allTemplates.length === 0) {
    // 没有模板也要标记，避免每次打开都查询
    await metaSet('lastGeneratedDate', today)
    return
  }

  const now = Date.now()
  for (const tpl of allTemplates) {
    const task: Task = {
      id: uuid(),
      text: tpl.text,
      need: 'duty',
      date: today,
      done: false,
      createdAt: now,
    }
    await dbPut('tasks', task)
  }

  // 全部生成成功后才更新 lastGeneratedDate
  await metaSet('lastGeneratedDate', today)
}
