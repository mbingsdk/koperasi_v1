'use client'

import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import {
  AUDIT_LOGS,
  CASH_SOURCES,
  CASH_TRANSACTIONS,
  CONTRIBUTION_RATES,
  DEPARTMENTS,
  DUES_JUNE,
  FUNDS,
  IMPORT_BATCHES,
  LOANS,
  MEMBERS,
  USERS,
} from './mock-data'
import type {
  AuditAction,
  AuditLog,
  CashSource,
  CashTransaction,
  ContributionRate,
  Department,
  Fund,
  ImportBatch,
  Loan,
  LoanPayment,
  Member,
  MemberContribution,
  Role,
  User,
} from './types'
import { rp } from './format'
import { apiClient, type BootstrapState } from './api-client'

const STORAGE_KEY = 'koperasi-ledger:v2'

export interface StoreMeta {
  hydrated: boolean
  version: number
  updatedAt: string
}

export interface KoperasiState {
  departments: Department[]
  funds: Fund[]
  cashSources: CashSource[]
  members: Member[]
  contributionRates: ContributionRate[]
  dues: MemberContribution[]
  cashTransactions: CashTransaction[]
  loans: Loan[]
  users: User[]
  importBatches: ImportBatch[]
  auditLogs: AuditLog[]
  meta: StoreMeta
}

export type KoperasiAction =
  | { type: 'hydrate'; state: KoperasiState }
  | { type: 'reset' }
  | { type: 'member.upsert'; member: Member }
  | { type: 'member.deactivate'; id: string }
  | { type: 'dues.upsertMany'; dues: MemberContribution[] }
  | { type: 'cash.upsert'; transaction: CashTransaction }
  | { type: 'cash.delete'; id: string }
  | { type: 'loan.upsert'; loan: Loan }
  | { type: 'loan.delete'; id: string }
  | { type: 'loan_payment.create'; loanId: string; payment: LoanPayment }
  | { type: 'department.upsert'; department: Department }
  | { type: 'fund.upsert'; fund: Fund }
  | { type: 'cash_source.upsert'; cashSource: CashSource }
  | { type: 'contribution_rate.upsert'; rate: ContributionRate }
  | { type: 'user.upsert'; user: User }
  | { type: 'user.deactivate'; id: string }
  | { type: 'import_batch.upsert'; batch: ImportBatch }
  | { type: 'import_batch.delete'; id: string }
  | { type: 'import_batch.deleteMany'; ids: string[] }

interface StoreValue {
  state: KoperasiState
  currentUser: User | null
  permissions: {
    canMutateLedger: boolean
    canManageUsers: boolean
    canResetDemo: boolean
    isViewer: boolean
    role: Role | null
  }
  dispatch: React.Dispatch<KoperasiAction>
  resetDemoData: () => void
  makeId: (prefix: string) => string
}

const StoreContext = createContext<StoreValue | null>(null)

function nowIso() {
  return new Date().toISOString()
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function seedState(): KoperasiState {
  return {
    departments: DEPARTMENTS,
    funds: FUNDS,
    cashSources: CASH_SOURCES,
    members: MEMBERS,
    contributionRates: CONTRIBUTION_RATES,
    dues: DUES_JUNE,
    cashTransactions: CASH_TRANSACTIONS,
    loans: LOANS,
    users: USERS,
    importBatches: IMPORT_BATCHES,
    auditLogs: AUDIT_LOGS,
    meta: { hydrated: true, version: 2, updatedAt: nowIso() },
  }
}

function withMeta(state: BootstrapState): KoperasiState {
  return {
    ...state,
    meta: { hydrated: true, version: 3, updatedAt: nowIso() },
  }
}

function compactStateForStorage(state: KoperasiState): KoperasiState {
  return {
    ...state,
    importBatches: state.importBatches.map(batch => {
      if (!batch.summary) return batch

      const {
        mappedRows: _mappedRows,
        duplicateRows: _duplicateRows,
        duplicateGroups: _duplicateGroups,
        conflictRows: _conflictRows,
        warningDetails,
        ...summary
      } = batch.summary

      return {
        ...batch,
        summary: {
          ...summary,
          warningDetails: warningDetails?.slice(0, 50),
        },
      }
    }),
  }
}

function audit(action: AuditAction, entityType: string, entityId?: string): AuditLog {
  return {
    id: id('al'),
    user: { id: 'u1', name: 'Siti Bendahara' },
    action,
    entityType,
    entityId,
    createdAt: nowIso(),
  }
}

function withAudit(state: KoperasiState, log: AuditLog): KoperasiState {
  return {
    ...state,
    auditLogs: [log, ...state.auditLogs],
    meta: { ...state.meta, updatedAt: nowIso() },
  }
}

function replaceById<T extends { id: string }>(items: T[], item: T) {
  return items.some(i => i.id === item.id)
    ? items.map(i => (i.id === item.id ? item : i))
    : [item, ...items]
}

function reducer(state: KoperasiState, action: KoperasiAction): KoperasiState {
  switch (action.type) {
    case 'hydrate':
      return { ...action.state, meta: { ...action.state.meta, hydrated: true } }
    case 'reset':
      return seedState()
    case 'member.upsert': {
      const member = { ...action.member, normalizedName: normalizeName(action.member.name) }
      const exists = state.members.some(m => m.id === member.id)
      return withAudit(
        {
          ...state,
          members: replaceById(state.members, member),
          dues: state.dues.map(d => d.member.id === member.id ? { ...d, member } : d),
          loans: state.loans.map(l => l.member?.id === member.id ? { ...l, member } : l),
          cashTransactions: state.cashTransactions.map(t => t.member?.id === member.id ? { ...t, member, counterpartyName: member.name } : t),
        },
        audit(exists ? 'member.update' : 'member.create', 'member', member.id)
      )
    }
    case 'member.deactivate': {
      const members = state.members.map(m => m.id === action.id ? { ...m, status: 'inactive' as const } : m)
      const member = members.find(m => m.id === action.id)
      return withAudit({ ...state, members }, audit('member.deactivate', 'member', member?.id))
    }
    case 'dues.upsertMany':
      return withAudit({ ...state, dues: action.dues }, audit('dues.upsert', 'contribution'))
    case 'cash.upsert': {
      const exists = state.cashTransactions.some(t => t.id === action.transaction.id)
      return withAudit(
        { ...state, cashTransactions: replaceById(state.cashTransactions, action.transaction) },
        audit(exists ? 'cash.update' : 'cash.create', 'transaction', action.transaction.id)
      )
    }
    case 'cash.delete':
      return withAudit(
        { ...state, cashTransactions: state.cashTransactions.filter(t => t.id !== action.id) },
        audit('cash.delete', 'transaction', action.id)
      )
    case 'loan.upsert': {
      const exists = state.loans.some(l => l.id === action.loan.id)
      return withAudit(
        { ...state, loans: replaceById(state.loans, action.loan) },
        audit(exists ? 'loan.update' : 'loan.create', 'loan', action.loan.id)
      )
    }
    case 'loan.delete':
      return withAudit({ ...state, loans: state.loans.filter(l => l.id !== action.id) }, audit('loan.delete', 'loan', action.id))
    case 'loan_payment.create': {
      const loans = state.loans.map(loan => {
        if (loan.id !== action.loanId) return loan
        const paidAmountIdr = loan.paidAmountIdr + action.payment.amountIdr
        const remainingAmountIdr = Math.max(loan.principalAmountIdr - paidAmountIdr, 0)
        return {
          ...loan,
          paidAmountIdr,
          remainingAmountIdr,
          status: remainingAmountIdr === 0 ? 'paid' as const : loan.status,
          payments: [action.payment, ...loan.payments],
        }
      })
      return withAudit({ ...state, loans }, audit('loan_payment.create', 'loan_payment', action.payment.id))
    }
    case 'department.upsert': {
      const exists = state.departments.some(d => d.id === action.department.id)
      return withAudit({ ...state, departments: replaceById(state.departments, action.department) }, audit(exists ? 'department.update' : 'department.create', 'department', action.department.id))
    }
    case 'fund.upsert': {
      const exists = state.funds.some(f => f.id === action.fund.id)
      return withAudit({ ...state, funds: replaceById(state.funds, action.fund) }, audit(exists ? 'fund.update' : 'fund.create', 'fund', action.fund.id))
    }
    case 'cash_source.upsert': {
      const exists = state.cashSources.some(cs => cs.id === action.cashSource.id)
      return withAudit({ ...state, cashSources: replaceById(state.cashSources, action.cashSource) }, audit(exists ? 'cash_source.update' : 'cash_source.create', 'cash_source', action.cashSource.id))
    }
    case 'contribution_rate.upsert': {
      const exists = state.contributionRates.some(r => r.id === action.rate.id)
      return withAudit({ ...state, contributionRates: replaceById(state.contributionRates, action.rate) }, audit(exists ? 'contribution_rate.update' : 'contribution_rate.create', 'contribution_rate', action.rate.id))
    }
    case 'user.upsert': {
      const exists = state.users.some(u => u.id === action.user.id)
      return withAudit({ ...state, users: replaceById(state.users, action.user) }, audit(exists ? 'user.update' : 'user.create', 'user', action.user.id))
    }
    case 'user.deactivate':
      return withAudit(
        { ...state, users: state.users.map(u => u.id === action.id ? { ...u, isActive: false } : u) },
        audit('user.deactivate', 'user', action.id)
      )
    case 'import_batch.upsert': {
      return {
        ...state,
        importBatches: replaceById(state.importBatches, action.batch),
        meta: { ...state.meta, updatedAt: nowIso() },
      }
    }
    case 'import_batch.delete': {
      return {
        ...state,
        importBatches: state.importBatches.filter(batch => batch.id !== action.id),
        meta: { ...state.meta, updatedAt: nowIso() },
      }
    }
    case 'import_batch.deleteMany': {
      const ids = new Set(action.ids)
      return {
        ...state,
        importBatches: state.importBatches.filter(batch => !ids.has(batch.id)),
        meta: { ...state.meta, updatedAt: nowIso() },
      }
    }
    default:
      return state
  }
}

export function KoperasiStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seedState())
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const [bootstrap, user] = await Promise.all([
          apiClient.bootstrap(),
          apiClient.me().catch(() => null),
        ])
        if (!cancelled) dispatch({ type: 'hydrate', state: withMeta(bootstrap) })
        if (!cancelled) setCurrentUser(user)
      } catch {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!cancelled && raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) as KoperasiState })
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compactStateForStorage(state)))
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [ready, state])

  const value = useMemo<StoreValue>(() => ({
    state,
    currentUser,
    permissions: {
      canMutateLedger: currentUser?.role === 'super_admin' || currentUser?.role === 'admin',
      canManageUsers: currentUser?.role === 'super_admin',
      canResetDemo: currentUser?.role === 'super_admin',
      isViewer: currentUser?.role === 'viewer',
      role: currentUser?.role ?? null,
    },
    dispatch,
    resetDemoData: () => dispatch({ type: 'reset' }),
    makeId: id,
  }), [currentUser, state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useKoperasiStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useKoperasiStore must be used within KoperasiStoreProvider')
  return ctx
}

export function usePermissions() {
  return useKoperasiStore().permissions
}

export function useMembers() {
  const { state } = useKoperasiStore()
  return { members: state.members, departments: state.departments }
}

export function useDues() {
  const { state } = useKoperasiStore()
  return { dues: state.dues, funds: state.funds, departments: state.departments, members: state.members, rates: state.contributionRates }
}

export function useCashLedger() {
  const { state } = useKoperasiStore()
  return useMemo(() => {
    let running = 37_055_000
    const transactions = [...state.cashTransactions]
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .map(tx => {
        const balance = running
        running = tx.direction === 'inflow' ? running - tx.amountIdr : running + tx.amountIdr
        return { ...tx, balance }
      })
    return { transactions, funds: state.funds, members: state.members }
  }, [state.cashTransactions, state.funds, state.members])
}

export function useLoans() {
  const { state } = useKoperasiStore()
  return { loans: state.loans, cashSources: state.cashSources, members: state.members }
}

export function useReports() {
  const { state } = useKoperasiStore()
  const summary = useMemo(() => {
    const duesTotal = state.dues.reduce((s, d) => s + d.amountIdr, 0)
    const unpaid = state.dues.filter(d => d.amountIdr === 0)
    const activeLoans = state.loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remainingAmountIdr, 0)
    const cashIn = state.cashTransactions.filter(t => t.direction === 'inflow').reduce((s, t) => s + t.amountIdr, 0)
    const cashOut = state.cashTransactions.filter(t => t.direction === 'outflow').reduce((s, t) => s + t.amountIdr, 0)
    return { duesTotal, unpaid, activeLoans, cashIn, cashOut, balance: 37_055_000 + cashIn - cashOut }
  }, [state])
  return { ...state, summary }
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number | undefined>>) {
  const headers = Object.keys(rows[0] ?? { info: 'Tidak ada data' })
  const escape = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function dashboardMetrics(state: KoperasiState) {
  const activeLoans = state.loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remainingAmountIdr, 0)
  const expenses = state.cashTransactions.filter(t => t.direction === 'outflow').reduce((s, t) => s + t.amountIdr, 0)
  const duesPaid = state.dues.reduce((s, d) => s + d.amountIdr, 0)
  const unpaid = state.dues.filter(d => d.amountIdr === 0).length
  return {
    activeLoans,
    expenses,
    duesPaid,
    unpaid,
    cards: [
      { label: 'Kas Koperasi', value: rp(24_300_000 + duesPaid - expenses) },
      { label: 'Dana Hibah', value: rp(6_150_000) },
      { label: 'Dana Serikat', value: rp(3_800_000) },
      { label: 'Pinjaman Aktif', value: rp(activeLoans) },
    ],
  }
}
