import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import { KoperasiStoreProvider } from '@/lib/store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <KoperasiStoreProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </KoperasiStoreProvider>
  )
}
