export type Role = 'super_admin' | 'admin' | 'viewer'
export type EmployeeType = 'Bulanan' | 'Harian' | 'Mixed' | 'Unknown'
export type MemberStatus = 'active' | 'inactive'
export type LoanStatus = 'active' | 'paid' | 'cancelled'
export type TransactionDirection = 'inflow' | 'outflow'
export type ImportStatus = 'uploaded' | 'previewed' | 'committed' | 'failed' | 'cancelled'
export type AuditAction =
  | 'login' | 'logout'
  | 'member.create' | 'member.update' | 'member.deactivate'
  | 'dues.upsert'
  | 'cash.create' | 'cash.update' | 'cash.delete'
  | 'loan.create' | 'loan.update' | 'loan.delete'
  | 'loan_payment.create' | 'loan_payment.delete'
  | 'import.commit'
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
