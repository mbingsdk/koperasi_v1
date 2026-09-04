export type Role = 'super_admin' | 'admin' | 'viewer'
export type EmployeeType = 'Bulanan' | 'Harian' | 'Mixed' | 'Unknown'
export type MemberStatus = 'active' | 'inactive'
export type LoanStatus = 'active' | 'paid' | 'cancelled'
export type TransactionDirection = 'inflow' | 'outflow'
export type ImportStatus = 'uploaded' | 'previewed' | 'committed' | 'failed' | 'cancelled'
export type ImportRowGroup = 'members' | 'dues' | 'cashTransactions' | 'loans'
export type ImportRowRef = string | number
export type ImportSkippedRows = Partial<Record<ImportRowGroup, ImportRowRef[]>>
export type ImportDuplicateRows = Partial<Record<ImportRowGroup, ImportRowRef[]>>
export type ImportConflictRows = Partial<Record<ImportRowGroup, ImportRowRef[]>>
export type ImportDuplicateGroups = Partial<Record<ImportRowGroup, Array<{
  key: string
  rows: ImportRowRef[]
}>>>
export type AuditAction =
  | 'login' | 'logout'
  | 'member.create' | 'member.update' | 'member.deactivate'
  | 'dues.upsert'
  | 'cash.create' | 'cash.update' | 'cash.delete'
  | 'loan.create' | 'loan.update' | 'loan.delete'
  | 'loan_payment.create' | 'loan_payment.delete'
  | 'import.commit' | 'import.partial_commit'
  | 'report.export'
  | 'user.create' | 'user.update' | 'user.deactivate'
  | 'department.create' | 'department.update' | 'department.deactivate'
  | 'fund.create' | 'fund.update' | 'fund.deactivate'
  | 'cash_source.create' | 'cash_source.update' | 'cash_source.deactivate'
  | 'contribution_rate.create' | 'contribution_rate.update' | 'contribution_rate.deactivate'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface Department {
  id: string
  name: string
}

export interface Member {
  id: string
  memberNo?: string
  name: string
  normalizedName: string
  department?: Department
  employeeType: EmployeeType
  status: MemberStatus
  joinedAt?: string
  note?: string
}

export interface Fund {
  id: string
  code: string
  name: string
  isSystem: boolean
  isActive: boolean
}

export interface CashSource {
  id: string
  name: string
  isActive: boolean
}

export interface ContributionRate {
  id: string
  fund: Fund
  employeeType: EmployeeType
  amountIdr: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface MemberContribution {
  id: string
  member: Member
  fund: Fund
  periodMonth: string  // YYYY-MM-DD (first of month)
  amountIdr: number
  note?: string
}

export interface CashTransaction {
  id: string
  transactionDate: string
  direction: TransactionDirection
  fund?: Fund
  member?: Member
  counterpartyName?: string
  category: string
  amountIdr: number
  note?: string
  createdAt: string
}

export interface Loan {
  id: string
  member?: Member
  counterpartyName?: string
  cashSource: CashSource
  principalAmountIdr: number
  paidAmountIdr: number
  remainingAmountIdr: number
  loanDate: string
  status: LoanStatus
  note?: string
  payments: LoanPayment[]
}

export interface LoanPayment {
  id: string
  loanId: string
  paymentDate: string
  amountIdr: number
  note?: string
}

export interface ImportBatch {
  id: string
  fileName: string
  originalFileName: string
  status: ImportStatus
  summary?: {
    sourceFiles?: string[]
    sheetsDetected: string[]
    membersDetected: number
    contributionsDetected: number
    transactionsDetected: number
    loansDetected: number
    warnings: number
    errors: number
    warningDetails?: Array<{
      sheet: string
      row?: number
      col?: string
      msg: string
    }>
    mappedRows?: {
      members: Array<{
        importKey?: string
        row: number
        sourceFile?: string
        sourceSheet?: string
        memberNo?: string
        name: string
        departmentName?: string
        employeeType?: EmployeeType
        joinedAt?: string
      }>
      dues: Array<{
        importKey?: string
        row: number
        sourceFile?: string
        sourceSheet?: string
        memberName: string
        fundCode: string
        periodMonth: string
        amountIdr: number
        note?: string
      }>
      cashTransactions: Array<{
        importKey?: string
        row: number
        sourceFile?: string
        sourceSheet?: string
        transactionDate: string
        direction: TransactionDirection
        fundCode?: string
        counterpartyName?: string
        category: string
        amountIdr: number
        note?: string
      }>
      loans: Array<{
        importKey?: string
        row: number
        sourceFile?: string
        sourceSheet?: string
        borrowerName: string
        cashSourceName?: string
        principalAmountIdr: number
        paidAmountIdr?: number
        loanDate: string
        note?: string
      }>
    }
    duplicateRows?: ImportDuplicateRows
    duplicateGroups?: ImportDuplicateGroups
    conflictRows?: ImportConflictRows
    skippedRows?: ImportSkippedRows
    committedGroups?: Partial<Record<ImportRowGroup, boolean>>
    committedCounts?: {
      members: number
      contributions: number
      transactions: number
      loans: number
    }
  }
  createdAt: string
  committedAt?: string
}

export interface AuditLog {
  id: string
  user: Pick<User, 'id' | 'name'>
  action: AuditAction
  entityType: string
  entityId?: string
  ipAddress?: string
  createdAt: string
}
