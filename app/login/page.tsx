'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-paper-2 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[440px] bg-paper border border-ledger-pale p-6 sm:p-9">
        <span className="block w-12 h-[3px] bg-margin rounded-sm mb-7 opacity-80" />
        <div className="h-12 w-12 rounded-full bg-paper-2 border border-ledger-pale mb-7" />
        <div className="h-3 w-36 bg-paper-2 mb-4" />
        <div className="h-16 w-48 bg-paper-2 mb-8" />
        <div className="h-11 w-full bg-paper-2 mb-4" />
        <div className="h-11 w-full bg-paper-2 mb-4" />
        <div className="h-11 w-full bg-ink/10" />
      </div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('admin@koperasi.local')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await apiClient.login({ email, password })
      router.push(searchParams.get('next') || '/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper-2 flex items-center justify-center p-4 sm:p-8">
      <div
        className="relative w-full max-w-[440px] bg-paper border border-ledger-pale
                   p-6 sm:p-9"
      >
        <span className="block w-12 h-[3px] bg-margin rounded-sm mb-7 opacity-80" />

        <div className="stamp-mark mb-7">KL</div>

        <p className="eyebrow">Sistem Koperasi Anggota</p>
        <h1 className="text-[28px] font-extrabold uppercase tracking-[.05em] leading-tight mb-2">
          Koperasi<br />Ledger
        </h1>
        <p className="text-[13px] text-ink-soft mb-8 max-w-[280px]">
          Masuk untuk mencatat iuran, mengelola buku kas, dan memantau pinjaman anggota.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="flag-block !border-margin !bg-margin-pale">{error}</div>}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              className="field-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Kata sandi</label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              className="field-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn justify-center mt-1.5"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-7 flex flex-col sm:flex-row gap-1 sm:justify-between text-[11px] text-ink-faint uppercase tracking-[.08em]">
          <span>v0.1 - PostgreSQL Auth</span>
          <span>Demo: password</span>
        </div>
      </div>
    </div>
  )
}
