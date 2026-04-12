import { formatDisplay, isToday, addDays } from './dateUtils'

interface DateNavProps {
  currentDate: string
  onDateChange: (date: string) => void
}

export default function DateNav({ currentDate, onDateChange }: DateNavProps) {
  return (
    <div className="date-nav">
      <button className="date-arrow" onClick={() => onDateChange(addDays(currentDate, -1))}>
        ‹
      </button>
      <div className="date-display">
        <span className="date-text">{formatDisplay(currentDate)}</span>
        {isToday(currentDate) && <span className="today-badge">今天</span>}
      </div>
      <button className="date-arrow" onClick={() => onDateChange(addDays(currentDate, 1))}>
        ›
      </button>
    </div>
  )
}
