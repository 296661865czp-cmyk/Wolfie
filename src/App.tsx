import { useState } from 'react'
import TodayPage from './TodayPage'
import ReviewPage from './ReviewPage'
import StatsPage from './StatsPage'
import SettingsPage from './SettingsPage'
import { formatDate } from './dateUtils'

const TabIcon = ({ children, active }: { children: React.ReactNode; active: boolean }) => (
  <svg
    className="tab-icon"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? 'var(--accent)' : 'var(--text)'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: active ? 1 : 0.5 }}
  >
    {children}
  </svg>
)

const tabs = [
  {
    key: 'today' as const,
    label: '今日',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="6.76" y2="6.76" />
        <line x1="17.24" y1="17.24" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="6.76" y2="17.24" />
        <line x1="17.24" y1="6.76" x2="19.07" y2="4.93" />
      </TabIcon>
    ),
  },
  {
    key: 'review' as const,
    label: '回顾',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="14" y2="13" />
      </TabIcon>
    ),
  },
  {
    key: 'stats' as const,
    label: '统计',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <line x1="5" y1="21" x2="5" y2="13" />
        <line x1="10" y1="21" x2="10" y2="9" />
        <line x1="15" y1="21" x2="15" y2="15" />
        <line x1="20" y1="21" x2="20" y2="6" />
      </TabIcon>
    ),
  },
  {
    key: 'settings' as const,
    label: '设置',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </TabIcon>
    ),
  },
] as const

type TabKey = (typeof tabs)[number]['key']

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [currentDate, setCurrentDate] = useState(formatDate(new Date()))

  const renderPage = () => {
    switch (activeTab) {
      case 'today':
        return <TodayPage currentDate={currentDate} onDateChange={setCurrentDate} />
      case 'review':
        return <ReviewPage currentDate={currentDate} onDateChange={setCurrentDate} />
      case 'stats':
        return <StatsPage />
      case 'settings':
        return <SettingsPage />
    }
  }

  return (
    <>
      <main className="main-content">
        {renderPage()}
      </main>

      <nav className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon(activeTab === tab.key)}
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export default App
