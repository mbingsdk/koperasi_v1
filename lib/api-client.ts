'use client'

import type { KoperasiState } from '@/lib/store'
import type {
  CashSource,
  CashTransaction,
  ContributionRate,
  Department,
  Fund,
  ImportBatch,
  Loan,
  Member,
  MemberContribution,
  User,
} from '@/lib/types'

type ApiResponse<T> = {
  data: T
  meta?: {
    count?: number
    generatedAt?: string
    source?: string
  }
}

type ApiErrorResponse = {
  error?: {
    code?: string
    message?: string
  }
}

export type BootstrapState = Omit<KoperasiState, 'meta'>

export interface ReportSummary {
  cashIn: number
  cashOut: number
  balance: number
  duesTotal: number
  unpaidCount: number
  activeLoans: number
  period: {
    from: string | null
    to: string | null
  }
}

export class ApiClientError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null) as ApiResponse<T> & ApiErrorResponse | null

  if (!response.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? 'Request API gagal.',
      response.status,
      payload?.error?.code
    )
  }

  return (payload as ApiResponse<T>).data
}

function jsonBody(value: unknown) {
  return JSON.stringify(value)
}

export const apiClient = {
  bootstrap() {
    return request<BootstrapState>('/api/v1/bootstrap')
  },

  login(payload: { email: string; password: string }) {
    return request<User>('/api/v1/auth/login', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  logout() {
    return request<{ loggedOut: boolean }>('/api/v1/auth/logout', {
      method: 'POST',
    })
  },

  me() {
    return request<User>('/api/v1/auth/me')
  },

  resetDemoDatabase() {
    return request<BootstrapState>('/api/v1/demo/reset', {
      method: 'POST',
    })
  },

  getReportSummary(filters: { from?: string; to?: string } = {}) {
    const params = new URLSearchParams()
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    const query = params.toString()
    return request<ReportSummary>(`/api/v1/reports/summary${query ? `?${query}` : ''}`)
  },

  createMember(payload: Record<string, unknown>) {
    return request<Member>('/api/v1/members', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateMember(id: string, payload: Record<string, unknown>) {
    return request<Member>(`/api/v1/members/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  deactivateMember(id: string) {
    return request<Member>(`/api/v1/members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  createCashTransaction(payload: Record<string, unknown>) {
    return request<CashTransaction>('/api/v1/cash-transactions', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateCashTransaction(id: string, payload: Record<string, unknown>) {
    return request<CashTransaction>(`/api/v1/cash-transactions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  deleteCashTransaction(id: string) {
    return request<{ deleted: boolean; id: string }>(`/api/v1/cash-transactions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  upsertDuesBatch(payload: { dues: Array<Record<string, unknown>> }) {
    return request<MemberContribution[]>('/api/v1/dues/batch', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  createLoan(payload: Record<string, unknown>) {
    return request<Loan>('/api/v1/loans', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateLoan(id: string, payload: Record<string, unknown>) {
    return request<Loan>(`/api/v1/loans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  deleteLoan(id: string) {
    return request<{ deleted: boolean; id: string }>(`/api/v1/loans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  createLoanPayment(id: string, payload: Record<string, unknown>) {
    return request<Loan>(`/api/v1/loans/${encodeURIComponent(id)}/payments`, {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  createUser(payload: Record<string, unknown>) {
    return request<User>('/api/v1/users', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateUser(id: string, payload: Record<string, unknown>) {
    return request<User>(`/api/v1/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  deactivateUser(id: string) {
    return request<User>(`/api/v1/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  createDepartment(payload: Record<string, unknown>) {
    return request<Department>('/api/v1/departments', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateDepartment(id: string, payload: Record<string, unknown>) {
    return request<Department>(`/api/v1/departments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  createFund(payload: Record<string, unknown>) {
    return request<Fund>('/api/v1/funds', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateFund(id: string, payload: Record<string, unknown>) {
    return request<Fund>(`/api/v1/funds/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  createCashSource(payload: Record<string, unknown>) {
    return request<CashSource>('/api/v1/cash-sources', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateCashSource(id: string, payload: Record<string, unknown>) {
    return request<CashSource>(`/api/v1/cash-sources/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  createContributionRate(payload: Record<string, unknown>) {
    return request<ContributionRate>('/api/v1/contribution-rates', {
      method: 'POST',
      body: jsonBody(payload),
    })
  },

  updateContributionRate(id: string, payload: Record<string, unknown>) {
    return request<ContributionRate>(`/api/v1/contribution-rates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    })
  },

  previewImportBatch(payload: FormData | Record<string, unknown>) {
    return request<ImportBatch>('/api/v1/import-batches/preview', {
      method: 'POST',
      body: payload instanceof FormData ? payload : jsonBody(payload),
    })
  },

  commitImportBatch(id: string) {
    return request<ImportBatch>(`/api/v1/import-batches/${encodeURIComponent(id)}/commit`, {
      method: 'POST',
    })
  },
}
