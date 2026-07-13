'use client'
import { cn } from '@/lib/cn'

interface Tab {
  key: string
  label: string
}

interface FolderTabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export function FolderTabs({ tabs, active, onChange }: FolderTabsProps) {
  return (
    <div className="folder-tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={cn('folder-tab', active === tab.key && 'active')}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

interface TabPanelProps {
  id: string
  active: string
  children: React.ReactNode
}

export function TabPanel({ id, active, children }: TabPanelProps) {
  if (id !== active) return null
  return <div>{children}</div>
}
