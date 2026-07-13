import { prisma } from '@/lib/prisma'
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
} from '@/lib/mock-data'
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from '@/lib/server/auth'
import type {
  AuditAction,
  CashSource,
  CashTransaction,
  ContributionRate,
  Department,
  EmployeeType,
  Fund,
  ImportBatch,
  Loan,
  LoanPayment,
  LoanStatus,
  Member,
  MemberContribution,
  MemberStatus,
  Role,
  TransactionDirection,
  User,
} from '@/lib/types'

const OPENING_BALANCE_IDR = 37_055_000
const SYSTEM_USER_NAME = 'System'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'password'

function asDate(value?: string | null) {
  return value ? new Date(value) : null
}

function toDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : undefined
}

function toDateTime(value?: Date | null) {
  return value?.toISOString()
}

function fromDateInput(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} wajib format YYYY-MM-DD.`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} tidak valid.`)
  }
  return date
}

function positiveNumber(value: unknown, fieldName: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} wajib lebih dari 0.`)
  }
  return Math.round(amount)
}

function nonNegativeNumber(value: unknown, fieldName: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${fieldName} tidak boleh negatif.`)
  }
  return Math.round(amount)
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value: unknown) {
  const next = text(value)
  return next || null
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function makeAudit(action: AuditAction, entityType: string, entityId?: string | null) {
  return prisma.auditLog.create({
    data: {
      userName: SYSTEM_USER_NAME,
      action,
      entityType,
      entityId: entityId ?? null,
    },
  })
}

function demoPasswordHash() {
  return hashPassword(DEMO_PASSWORD)
}

function clean<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  ) as T
}

function mapDepartment(department?: { id: string; name: string } | null): Department | undefined {
  if (!department) return undefined
  return {
    id: department.id,
    name: department.name,
  }
}

function mapFund(fund?: {
  id: string
  code: string
  name: string
  isSystem: boolean
  isActive: boolean
} | null): Fund | undefined {
  if (!fund) return undefined
  return {
    id: fund.id,
    code: fund.code,
    name: fund.name,
    isSystem: fund.isSystem,
    isActive: fund.isActive,
  }
}

function mapCashSource(source: {
  id: string
  name: string
  isActive: boolean
}): CashSource {
  return {
    id: source.id,
    name: source.name,
    isActive: source.isActive,
  }
}

function mapUser(user: {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}): User {
  return clean({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    isActive: user.isActive,
    lastLoginAt: toDateTime(user.lastLoginAt),
    createdAt: toDateTime(user.createdAt)!,
  })
}

function mapRate(rate: {
  id: string
  fund: NonNullable<Parameters<typeof mapFund>[0]>
  employeeType: string
  amountIdr: number
  effectiveFrom: Date
  effectiveTo: Date | null
}): ContributionRate {
  return clean({
    id: rate.id,
    fund: mapFund(rate.fund)!,
    employeeType: rate.employeeType as EmployeeType,
    amountIdr: rate.amountIdr,
    effectiveFrom: toDate(rate.effectiveFrom)!,
    effectiveTo: toDate(rate.effectiveTo),
  })
}

function mapMember(member?: {
  id: string
  memberNo: string | null
  name: string
  normalizedName: string
  department?: { id: string; name: string } | null
  employeeType: string
  status: string
  joinedAt: Date | null
  note: string | null
} | null): Member | undefined {
  if (!member) return undefined
  return clean({
    id: member.id,
    memberNo: member.memberNo ?? undefined,
    name: member.name,
    normalizedName: member.normalizedName,
    department: mapDepartment(member.department),
    employeeType: member.employeeType as EmployeeType,
    status: member.status as MemberStatus,
    joinedAt: toDate(member.joinedAt),
    note: member.note ?? undefined,
  })
}

function mapContribution(contribution: {
  id: string
  member: NonNullable<Parameters<typeof mapMember>[0]>
  fund: NonNullable<Parameters<typeof mapFund>[0]>
  periodMonth: Date
  amountIdr: number
  note: string | null
}): MemberContribution {
  return clean({
    id: contribution.id,
    member: mapMember(contribution.member)!,
    fund: mapFund(contribution.fund)!,
    periodMonth: toDate(contribution.periodMonth)!,
    amountIdr: contribution.amountIdr,
    note: contribution.note ?? undefined,
  })
}

function mapCashTransaction(transaction: {
  id: string
  transactionDate: Date
  direction: string
  fund?: NonNullable<Parameters<typeof mapFund>[0]> | null
  member?: NonNullable<Parameters<typeof mapMember>[0]> | null
  counterpartyName: string | null
  category: string
  amountIdr: number
  note: string | null
  createdAt: Date
}): CashTransaction {
  return clean({
    id: transaction.id,
    transactionDate: toDate(transaction.transactionDate)!,
    direction: transaction.direction as TransactionDirection,
    fund: mapFund(transaction.fund),
    member: mapMember(transaction.member),
    counterpartyName: transaction.counterpartyName ?? undefined,
    category: transaction.category,
    amountIdr: transaction.amountIdr,
    note: transaction.note ?? undefined,
    createdAt: toDateTime(transaction.createdAt)!,
  })
}

function mapLoanPayment(payment: {
  id: string
  loanId: string
  paymentDate: Date
  amountIdr: number
  note: string | null
}): LoanPayment {
  return clean({
    id: payment.id,
    loanId: payment.loanId,
    paymentDate: toDate(payment.paymentDate)!,
    amountIdr: payment.amountIdr,
    note: payment.note ?? undefined,
  })
}

function mapLoan(loan: {
  id: string
  member?: NonNullable<Parameters<typeof mapMember>[0]> | null
  counterpartyName: string | null
  cashSource: Parameters<typeof mapCashSource>[0]
  principalAmountIdr: number
  paidAmountIdr: number
  remainingAmountIdr: number
  loanDate: Date
  status: string
  note: string | null
  payments: Parameters<typeof mapLoanPayment>[0][]
}): Loan {
  return clean({
    id: loan.id,
    member: mapMember(loan.member),
    counterpartyName: loan.counterpartyName ?? undefined,
    cashSource: mapCashSource(loan.cashSource),
    principalAmountIdr: loan.principalAmountIdr,
    paidAmountIdr: loan.paidAmountIdr,
    remainingAmountIdr: loan.remainingAmountIdr,
    loanDate: toDate(loan.loanDate)!,
    status: loan.status as LoanStatus,
    note: loan.note ?? undefined,
    payments: loan.payments.map(mapLoanPayment),
  })
}

function mapImportBatch(batch: {
  id: string
  fileName: string
  originalFileName: string
  status: string
  summaryJson: unknown
  createdAt: Date
  committedAt: Date | null
}): ImportBatch {
  return clean({
    id: batch.id,
    fileName: batch.fileName,
    originalFileName: batch.originalFileName,
    status: batch.status as ImportBatch['status'],
    summary: batch.summaryJson as ImportBatch['summary'],
    createdAt: toDateTime(batch.createdAt)!,
    committedAt: toDateTime(batch.committedAt),
  })
}

const DEFAULT_IMPORT_SHEETS = ['Koperasi', 'Dahib', 'Serikat', 'Pengeluaran', 'pinjaman kop']

function countLike(value: unknown, fallback: number) {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? Math.round(count) : fallback
}

function importSummary(input: Record<string, unknown>): NonNullable<ImportBatch['summary']> {
  const source = input.summary && typeof input.summary === 'object' && !Array.isArray(input.summary)
    ? input.summary as Record<string, unknown>
    : input
  const sheetsDetected = Array.isArray(source.sheetsDetected)
    ? source.sheetsDetected.map(item => text(item)).filter(Boolean)
    : DEFAULT_IMPORT_SHEETS

  return {
    sheetsDetected: sheetsDetected.length > 0 ? sheetsDetected : DEFAULT_IMPORT_SHEETS,
    membersDetected: countLike(source.membersDetected, 363),
    contributionsDetected: countLike(source.contributionsDetected, 14000),
    transactionsDetected: countLike(source.transactionsDetected, 540),
    loansDetected: countLike(source.loansDetected, 190),
    warnings: countLike(source.warnings, 12),
    errors: countLike(source.errors, 0),
  }
}

function importFileName(originalFileName: string) {
  const safe = originalFileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '_')
  return `import_${Date.now()}_${safe || 'koperasi.xlsx'}`
}

export async function getBootstrapState() {
  const [
    departments,
    funds,
    cashSources,
    members,
    contributionRates,
    dues,
    cashTransactions,
    loans,
    users,
    importBatches,
    auditLogs,
  ] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.fund.findMany({ orderBy: { name: 'asc' } }),
    prisma.cashSource.findMany({ orderBy: { name: 'asc' } }),
    prisma.member.findMany({ include: { department: true }, orderBy: { name: 'asc' } }),
    prisma.contributionRate.findMany({ include: { fund: true }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.memberContribution.findMany({
      include: { member: { include: { department: true } }, fund: true },
      orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.cashTransaction.findMany({
      include: { fund: true, member: { include: { department: true } } },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.loan.findMany({
      include: {
        cashSource: true,
        member: { include: { department: true } },
        payments: { orderBy: { paymentDate: 'asc' } },
      },
      orderBy: [{ loanDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.importBatch.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
  ])

  return {
    departments: departments.map(mapDepartment).filter(Boolean),
    funds: funds.map(item => mapFund(item)!),
    cashSources: cashSources.map(mapCashSource),
    members: members.map(item => mapMember(item)!),
    contributionRates: contributionRates.map(mapRate),
    dues: dues.map(mapContribution),
    cashTransactions: cashTransactions.map(mapCashTransaction),
    loans: loans.map(mapLoan),
    users: users.map(mapUser),
    importBatches: importBatches.map(mapImportBatch),
    auditLogs: auditLogs.map(log => clean({
      id: log.id,
      user: {
        id: log.user?.id ?? log.userId ?? 'system',
        name: log.user?.name ?? log.userName,
      },
      action: log.action as AuditAction,
      entityType: log.entityType,
      entityId: log.entityId ?? undefined,
      ipAddress: log.ipAddress ?? undefined,
      createdAt: toDateTime(log.createdAt)!,
    })),
  }
}

export async function resetDemoDatabase() {
  await prisma.$transaction(async tx => {
    await tx.auditLog.deleteMany()
    await tx.importBatch.deleteMany()
    await tx.loanPayment.deleteMany()
    await tx.loan.deleteMany()
    await tx.cashTransaction.deleteMany()
    await tx.memberContribution.deleteMany()
    await tx.contributionRate.deleteMany()
    await tx.member.deleteMany()
    await tx.user.deleteMany()
    await tx.cashSource.deleteMany()
    await tx.fund.deleteMany()
    await tx.department.deleteMany()

    await tx.department.createMany({
      data: DEPARTMENTS.map(department => ({
        id: department.id,
        name: department.name,
        isActive: true,
      })),
    })

    await tx.fund.createMany({
      data: FUNDS.map(fund => ({
        id: fund.id,
        code: fund.code,
        name: fund.name,
        isSystem: fund.isSystem,
        isActive: fund.isActive,
      })),
    })

    await tx.cashSource.createMany({
      data: CASH_SOURCES.map(source => ({
        id: source.id,
        name: source.name,
        isActive: source.isActive,
      })),
    })

    await tx.user.createMany({
      data: USERS.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        passwordHash: demoPasswordHash(),
        lastLoginAt: asDate(user.lastLoginAt),
        createdAt: asDate(user.createdAt) ?? new Date(),
        updatedAt: new Date(),
      })),
    })

    await tx.member.createMany({
      data: MEMBERS.map(member => ({
        id: member.id,
        memberNo: member.memberNo ?? null,
        name: member.name,
        normalizedName: member.normalizedName,
        departmentId: member.department?.id ?? null,
        employeeType: member.employeeType,
        status: member.status,
        joinedAt: asDate(member.joinedAt),
        note: member.note ?? null,
      })),
    })

    await tx.contributionRate.createMany({
      data: CONTRIBUTION_RATES.map(rate => ({
        id: rate.id,
        fundId: rate.fund.id,
        employeeType: rate.employeeType,
        amountIdr: rate.amountIdr,
        effectiveFrom: asDate(rate.effectiveFrom) ?? new Date(),
        effectiveTo: asDate(rate.effectiveTo),
      })),
    })

    await tx.memberContribution.createMany({
      data: DUES_JUNE.map(due => ({
        id: due.id,
        memberId: due.member.id,
        fundId: due.fund.id,
        periodMonth: asDate(due.periodMonth) ?? new Date(),
        amountIdr: due.amountIdr,
        note: due.note ?? null,
      })),
    })

    await tx.loan.createMany({
      data: LOANS.map(loan => ({
        id: loan.id,
        memberId: loan.member?.id ?? null,
        counterpartyName: loan.counterpartyName ?? null,
        cashSourceId: loan.cashSource.id,
        principalAmountIdr: loan.principalAmountIdr,
        paidAmountIdr: loan.paidAmountIdr,
        remainingAmountIdr: loan.remainingAmountIdr,
        loanDate: asDate(loan.loanDate) ?? new Date(),
        status: loan.status,
        note: loan.note ?? null,
      })),
    })

    const payments = LOANS.flatMap(loan => loan.payments)
    await tx.loanPayment.createMany({
      data: payments.map(payment => ({
        id: payment.id,
        loanId: payment.loanId,
        paymentDate: asDate(payment.paymentDate) ?? new Date(),
        amountIdr: payment.amountIdr,
        note: payment.note ?? null,
      })),
    })

    await tx.cashTransaction.createMany({
      data: CASH_TRANSACTIONS.map(transaction => ({
        id: transaction.id,
        transactionDate: asDate(transaction.transactionDate) ?? new Date(),
        direction: transaction.direction,
        fundId: transaction.fund?.id ?? null,
        memberId: transaction.member?.id ?? null,
        counterpartyName: transaction.counterpartyName ?? null,
        category: transaction.category,
        amountIdr: transaction.amountIdr,
        note: transaction.note ?? null,
        createdAt: asDate(transaction.createdAt) ?? new Date(),
        updatedAt: new Date(),
      })),
    })

    await tx.importBatch.createMany({
      data: IMPORT_BATCHES.map(batch => ({
        id: batch.id,
        fileName: batch.fileName,
        originalFileName: batch.originalFileName,
        status: batch.status,
        summaryJson: batch.summary ?? undefined,
        createdAt: asDate(batch.createdAt) ?? new Date(),
        committedAt: asDate(batch.committedAt),
      })),
    })

    await tx.auditLog.createMany({
      data: AUDIT_LOGS.map(log => ({
        id: log.id,
        userId: log.user.id,
        userName: log.user.name,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? null,
        ipAddress: log.ipAddress ?? null,
        createdAt: asDate(log.createdAt) ?? new Date(),
      })),
    })
  })

  return getBootstrapState()
}

export async function authenticateUser(input: Record<string, unknown>) {
  const email = text(input.email).toLowerCase()
  const password = text(input.password)
  if (!email || !password) throw new Error('Email dan kata sandi wajib diisi.')

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) throw new Error('Email atau kata sandi tidak sesuai.')

  const passwordOk = verifyPassword(password, user.passwordHash) || (!user.passwordHash && password === DEMO_PASSWORD)
  if (!passwordOk) throw new Error('Email atau kata sandi tidak sesuai.')

  const passwordHash = user.passwordHash || hashPassword(password)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      lastLoginAt: new Date(),
    },
  })

  await makeAudit('login', 'user', updated.id)

  return {
    user: mapUser(updated),
    token: createSessionToken(updated.id),
  }
}

export async function getUserFromSession(token?: string | null) {
  const session = verifySessionToken(token)
  if (!session) return null

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.isActive) return null

  return mapUser(user)
}

export async function recordLogout(token?: string | null) {
  const session = verifySessionToken(token)
  if (!session) return

  await makeAudit('logout', 'user', session.userId)
}

export async function createImportPreview(input: Record<string, unknown>) {
  const originalFileName = text(input.originalFileName) || text(input.fileName)
  if (!originalFileName) throw new Error('Nama file impor wajib diisi.')
  if (!/\.(xlsx|xls)$/i.test(originalFileName)) {
    throw new Error('Format file impor wajib .xlsx atau .xls.')
  }

  const batch = await prisma.importBatch.create({
    data: {
      id: text(input.id) || undefined,
      fileName: text(input.fileName) || importFileName(originalFileName),
      originalFileName,
      status: 'previewed',
      summaryJson: importSummary(input),
    },
  })

  return mapImportBatch(batch)
}

export async function commitImportBatch(id: string) {
  const existing = await prisma.importBatch.findUnique({ where: { id } })
  if (!existing) return null

  if (existing.status === 'committed') {
    return mapImportBatch(existing)
  }

  const batch = await prisma.$transaction(async tx => {
    const saved = await tx.importBatch.update({
      where: { id },
      data: {
        status: 'committed',
        committedAt: new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        userName: SYSTEM_USER_NAME,
        action: 'import.commit',
        entityType: 'import_batch',
        entityId: id,
      },
    })

    return saved
  })

  return mapImportBatch(batch)
}

export async function createUser(input: Record<string, unknown>) {
  const name = text(input.name)
  const email = text(input.email).toLowerCase()
  if (!name || !email.includes('@')) throw new Error('Nama dan email valid wajib diisi.')

  const user = await prisma.user.create({
    data: {
      id: text(input.id) || undefined,
      name,
      email,
      role: text(input.role) || 'admin',
      isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    },
  })

  await makeAudit('user.create', 'user', user.id)
  return mapUser(user)
}

export async function updateUser(id: string, input: Record<string, unknown>) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return null

  const name = input.name === undefined ? undefined : text(input.name)
  const email = input.email === undefined ? undefined : text(input.email).toLowerCase()
  if (name === '' || email === '') throw new Error('Nama dan email valid wajib diisi.')

  const user = await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role: input.role === undefined ? undefined : text(input.role),
      isActive: input.isActive === undefined ? undefined : Boolean(input.isActive),
    },
  })

  await makeAudit(user.isActive ? 'user.update' : 'user.deactivate', 'user', user.id)
  return mapUser(user)
}

export async function createDepartment(input: Record<string, unknown>) {
  const name = text(input.name)
  if (!name) throw new Error('Nama departemen wajib diisi.')

  const department = await prisma.department.create({
    data: {
      id: text(input.id) || undefined,
      name,
      isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    },
  })

  await makeAudit('department.create', 'department', department.id)
  return mapDepartment(department)!
}

export async function updateDepartment(id: string, input: Record<string, unknown>) {
  const existing = await prisma.department.findUnique({ where: { id } })
  if (!existing) return null

  const department = await prisma.department.update({
    where: { id },
    data: {
      name: input.name === undefined ? undefined : text(input.name),
      isActive: input.isActive === undefined ? undefined : Boolean(input.isActive),
    },
  })

  await makeAudit(department.isActive ? 'department.update' : 'department.deactivate', 'department', department.id)
  return mapDepartment(department)!
}

export async function createFund(input: Record<string, unknown>) {
  const code = text(input.code)
  const name = text(input.name)
  if (!code || !name) throw new Error('Kode dan nama dana wajib diisi.')

  const fund = await prisma.fund.create({
    data: {
      id: text(input.id) || undefined,
      code,
      name,
      isSystem: Boolean(input.isSystem),
      isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    },
  })

  await makeAudit('fund.create', 'fund', fund.id)
  return mapFund(fund)!
}

export async function updateFund(id: string, input: Record<string, unknown>) {
  const existing = await prisma.fund.findUnique({ where: { id } })
  if (!existing) return null

  const fund = await prisma.fund.update({
    where: { id },
    data: {
      code: existing.isSystem ? undefined : input.code === undefined ? undefined : text(input.code),
      name: input.name === undefined ? undefined : text(input.name),
      isActive: input.isActive === undefined ? undefined : Boolean(input.isActive),
    },
  })

  await makeAudit(fund.isActive ? 'fund.update' : 'fund.deactivate', 'fund', fund.id)
  return mapFund(fund)!
}

export async function createCashSource(input: Record<string, unknown>) {
  const name = text(input.name)
  if (!name) throw new Error('Nama sumber kas wajib diisi.')

  const cashSource = await prisma.cashSource.create({
    data: {
      id: text(input.id) || undefined,
      name,
      isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    },
  })

  await makeAudit('cash_source.create', 'cash_source', cashSource.id)
  return mapCashSource(cashSource)
}

export async function updateCashSource(id: string, input: Record<string, unknown>) {
  const existing = await prisma.cashSource.findUnique({ where: { id } })
  if (!existing) return null

  const cashSource = await prisma.cashSource.update({
    where: { id },
    data: {
      name: input.name === undefined ? undefined : text(input.name),
      isActive: input.isActive === undefined ? undefined : Boolean(input.isActive),
    },
  })

  await makeAudit(cashSource.isActive ? 'cash_source.update' : 'cash_source.deactivate', 'cash_source', cashSource.id)
  return mapCashSource(cashSource)
}

export async function createContributionRate(input: Record<string, unknown>) {
  const fundId = text(input.fundId)
  if (!fundId) throw new Error('Dana wajib diisi.')

  const rate = await prisma.contributionRate.create({
    data: {
      id: text(input.id) || undefined,
      fundId,
      employeeType: text(input.employeeType) || 'Bulanan',
      amountIdr: positiveNumber(input.amountIdr, 'Jumlah tarif'),
      effectiveFrom: fromDateInput(input.effectiveFrom, 'Tanggal berlaku dari'),
      effectiveTo: input.effectiveTo ? fromDateInput(input.effectiveTo, 'Tanggal berlaku sampai') : null,
    },
    include: { fund: true },
  })

  await makeAudit('contribution_rate.create', 'contribution_rate', rate.id)
  return mapRate(rate)
}

export async function updateContributionRate(id: string, input: Record<string, unknown>) {
  const existing = await prisma.contributionRate.findUnique({ where: { id } })
  if (!existing) return null

  const rate = await prisma.contributionRate.update({
    where: { id },
    data: {
      fundId: input.fundId === undefined ? undefined : text(input.fundId),
      employeeType: input.employeeType === undefined ? undefined : text(input.employeeType),
      amountIdr: input.amountIdr === undefined ? undefined : positiveNumber(input.amountIdr, 'Jumlah tarif'),
      effectiveFrom: input.effectiveFrom === undefined ? undefined : fromDateInput(input.effectiveFrom, 'Tanggal berlaku dari'),
      effectiveTo: input.effectiveTo === undefined
        ? undefined
        : input.effectiveTo
          ? fromDateInput(input.effectiveTo, 'Tanggal berlaku sampai')
          : null,
    },
    include: { fund: true },
  })

  await makeAudit('contribution_rate.update', 'contribution_rate', rate.id)
  return mapRate(rate)
}

export async function listMembers(filters: {
  search?: string
  departmentId?: string
  employeeType?: EmployeeType | 'all'
  status?: MemberStatus | 'all'
}) {
  const query = filters.search?.trim()
  const members = await prisma.member.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { memberNo: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.departmentId && filters.departmentId !== 'all' ? { departmentId: filters.departmentId } : {}),
      ...(filters.employeeType && filters.employeeType !== 'all' ? { employeeType: filters.employeeType } : {}),
      ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
    },
    include: { department: true },
    orderBy: { name: 'asc' },
  })

  return members.map(item => mapMember(item)!)
}

export async function createMember(input: Record<string, unknown>) {
  const name = text(input.name)
  if (!name) throw new Error('Nama anggota wajib diisi.')

  const member = await prisma.member.create({
    data: {
      id: text(input.id) || undefined,
      memberNo: optionalText(input.memberNo),
      name,
      normalizedName: normalizeName(name),
      departmentId: optionalText(input.departmentId),
      employeeType: text(input.employeeType) || 'Bulanan',
      status: text(input.status) || 'active',
      joinedAt: input.joinedAt ? fromDateInput(input.joinedAt, 'Tanggal bergabung') : null,
      note: optionalText(input.note),
    },
    include: { department: true },
  })

  await makeAudit('member.create', 'member', member.id)
  return mapMember(member)!
}

export async function updateMember(id: string, input: Record<string, unknown>) {
  const existing = await prisma.member.findUnique({ where: { id } })
  if (!existing) return null

  const name = input.name === undefined ? existing.name : text(input.name)
  if (!name) throw new Error('Nama anggota wajib diisi.')

  const member = await prisma.member.update({
    where: { id },
    data: {
      memberNo: input.memberNo === undefined ? undefined : optionalText(input.memberNo),
      name,
      normalizedName: normalizeName(name),
      departmentId: input.departmentId === undefined ? undefined : optionalText(input.departmentId),
      employeeType: input.employeeType === undefined ? undefined : text(input.employeeType),
      status: input.status === undefined ? undefined : text(input.status),
      joinedAt: input.joinedAt === undefined
        ? undefined
        : input.joinedAt
          ? fromDateInput(input.joinedAt, 'Tanggal bergabung')
          : null,
      note: input.note === undefined ? undefined : optionalText(input.note),
    },
    include: { department: true },
  })

  await makeAudit(member.status === 'inactive' ? 'member.deactivate' : 'member.update', 'member', member.id)
  return mapMember(member)!
}

export async function deactivateMember(id: string) {
  return updateMember(id, { status: 'inactive' })
}

export async function getMemberProfile(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: { department: true },
  })
  if (!member) return null

  const [dues, loans, cashTransactions] = await Promise.all([
    prisma.memberContribution.findMany({
      where: { memberId: id },
      include: { member: { include: { department: true } }, fund: true },
      orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.loan.findMany({
      where: { memberId: id },
      include: {
        cashSource: true,
        member: { include: { department: true } },
        payments: { orderBy: { paymentDate: 'asc' } },
      },
      orderBy: [{ loanDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.cashTransaction.findMany({
      where: { memberId: id },
      include: { fund: true, member: { include: { department: true } } },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return {
    member: mapMember(member)!,
    dues: dues.map(mapContribution),
    loans: loans.map(mapLoan),
    cashTransactions: cashTransactions.map(mapCashTransaction),
    summary: {
      duesTotalIdr: dues.reduce((sum, item) => sum + item.amountIdr, 0),
      unpaidDues: dues.filter(item => item.amountIdr === 0).length,
      activeLoanRemainingIdr: loans
        .filter(item => item.status === 'active')
        .reduce((sum, item) => sum + item.remainingAmountIdr, 0),
      transactionCount: cashTransactions.length,
    },
  }
}

export async function listCashTransactions(filters: {
  from?: string
  to?: string
  fundId?: string
  direction?: TransactionDirection | 'all'
  category?: string
}) {
  const transactions = await prisma.cashTransaction.findMany({
    include: { fund: true, member: { include: { department: true } } },
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
  })

  let running = OPENING_BALANCE_IDR
  return transactions
    .map(transaction => {
      const mapped = mapCashTransaction(transaction)
      const balance = running
      running = mapped.direction === 'inflow'
        ? running - mapped.amountIdr
        : running + mapped.amountIdr
      return { ...mapped, balance }
    })
    .filter(transaction => {
      if (filters.from && transaction.transactionDate < filters.from) return false
      if (filters.to && transaction.transactionDate > filters.to) return false
      if (filters.fundId && filters.fundId !== 'all' && transaction.fund?.id !== filters.fundId) return false
      if (filters.direction && filters.direction !== 'all' && transaction.direction !== filters.direction) return false
      if (filters.category && filters.category !== 'all' && transaction.category !== filters.category) return false
      return true
    })
}

export async function createCashTransaction(input: Record<string, unknown>) {
  const direction = text(input.direction)
  if (direction !== 'inflow' && direction !== 'outflow') {
    throw new Error('Arah transaksi wajib inflow atau outflow.')
  }

  const transaction = await prisma.cashTransaction.create({
    data: {
      id: text(input.id) || undefined,
      transactionDate: fromDateInput(input.transactionDate, 'Tanggal transaksi'),
      direction,
      fundId: optionalText(input.fundId),
      memberId: optionalText(input.memberId),
      counterpartyName: optionalText(input.counterpartyName),
      category: text(input.category) || 'Lainnya',
      amountIdr: positiveNumber(input.amountIdr, 'Jumlah transaksi'),
      note: optionalText(input.note),
    },
    include: { fund: true, member: { include: { department: true } } },
  })

  await makeAudit('cash.create', 'cash_transaction', transaction.id)
  return mapCashTransaction(transaction)
}

export async function updateCashTransaction(id: string, input: Record<string, unknown>) {
  const existing = await prisma.cashTransaction.findUnique({ where: { id } })
  if (!existing) return null

  const direction = input.direction === undefined ? undefined : text(input.direction)
  if (direction && direction !== 'inflow' && direction !== 'outflow') {
    throw new Error('Arah transaksi wajib inflow atau outflow.')
  }

  const transaction = await prisma.cashTransaction.update({
    where: { id },
    data: {
      transactionDate: input.transactionDate === undefined
        ? undefined
        : fromDateInput(input.transactionDate, 'Tanggal transaksi'),
      direction,
      fundId: input.fundId === undefined ? undefined : optionalText(input.fundId),
      memberId: input.memberId === undefined ? undefined : optionalText(input.memberId),
      counterpartyName: input.counterpartyName === undefined ? undefined : optionalText(input.counterpartyName),
      category: input.category === undefined ? undefined : text(input.category),
      amountIdr: input.amountIdr === undefined ? undefined : positiveNumber(input.amountIdr, 'Jumlah transaksi'),
      note: input.note === undefined ? undefined : optionalText(input.note),
    },
    include: { fund: true, member: { include: { department: true } } },
  })

  await makeAudit('cash.update', 'cash_transaction', transaction.id)
  return mapCashTransaction(transaction)
}

export async function deleteCashTransaction(id: string) {
  const existing = await prisma.cashTransaction.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.cashTransaction.delete({ where: { id } })
  await makeAudit('cash.delete', 'cash_transaction', id)
  return true
}

export async function listDues(filters: {
  period?: string
  fundId?: string
  departmentId?: string
  paymentStatus?: 'all' | 'paid' | 'unpaid'
}) {
  const dues = await prisma.memberContribution.findMany({
    where: {
      ...(filters.period ? { periodMonth: new Date(filters.period) } : {}),
      ...(filters.fundId && filters.fundId !== 'all' ? { fundId: filters.fundId } : {}),
      ...(filters.departmentId && filters.departmentId !== 'all'
        ? { member: { departmentId: filters.departmentId } }
        : {}),
      ...(filters.paymentStatus === 'paid' ? { amountIdr: { gt: 0 } } : {}),
      ...(filters.paymentStatus === 'unpaid' ? { amountIdr: 0 } : {}),
    },
    include: { member: { include: { department: true } }, fund: true },
    orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
  })

  return dues.map(mapContribution)
}

export async function upsertDuesBatch(input: Record<string, unknown>) {
  const rows = Array.isArray(input.dues) ? input.dues : []
  if (rows.length === 0) throw new Error('Daftar iuran wajib diisi.')

  const results = await prisma.$transaction(async tx => {
    const saved = []
    for (const row of rows) {
      if (!row || typeof row !== 'object') throw new Error('Baris iuran tidak valid.')
      const item = row as Record<string, unknown>
      const memberId = text(item.memberId)
      const fundId = text(item.fundId)
      if (!memberId || !fundId) throw new Error('Anggota dan dana wajib diisi.')

      const periodMonth = fromDateInput(item.periodMonth, 'Periode iuran')
      const contribution = await tx.memberContribution.upsert({
        where: {
          memberId_fundId_periodMonth: {
            memberId,
            fundId,
            periodMonth,
          },
        },
        update: {
          amountIdr: nonNegativeNumber(item.amountIdr, 'Nominal iuran'),
          note: optionalText(item.note),
        },
        create: {
          id: text(item.id) || undefined,
          memberId,
          fundId,
          periodMonth,
          amountIdr: nonNegativeNumber(item.amountIdr, 'Nominal iuran'),
          note: optionalText(item.note),
        },
        include: { member: { include: { department: true } }, fund: true },
      })
      saved.push(contribution)
    }

    await tx.auditLog.create({
      data: {
        userName: SYSTEM_USER_NAME,
        action: 'dues.upsert',
        entityType: 'member_contribution',
      },
    })

    return saved
  })

  return results.map(mapContribution)
}

export async function listLoans(filters: {
  status?: LoanStatus | 'all'
  cashSourceId?: string
  from?: string
  to?: string
}) {
  const loans = await prisma.loan.findMany({
    where: {
      ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.cashSourceId && filters.cashSourceId !== 'all' ? { cashSourceId: filters.cashSourceId } : {}),
      ...(filters.from || filters.to
        ? {
            loanDate: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    include: {
      cashSource: true,
      member: { include: { department: true } },
      payments: { orderBy: { paymentDate: 'asc' } },
    },
    orderBy: [{ loanDate: 'desc' }, { createdAt: 'desc' }],
  })

  return loans.map(mapLoan)
}

export async function createLoan(input: Record<string, unknown>) {
  const principalAmountIdr = positiveNumber(input.principalAmountIdr, 'Pokok pinjaman')
  const paidAmountIdr = Math.min(nonNegativeNumber(input.paidAmountIdr ?? 0, 'Jumlah terbayar'), principalAmountIdr)
  const remainingAmountIdr = Math.max(principalAmountIdr - paidAmountIdr, 0)
  const memberId = optionalText(input.memberId)
  const counterpartyName = optionalText(input.counterpartyName)

  if (!memberId && !counterpartyName) {
    throw new Error('Anggota atau nama peminjam wajib diisi.')
  }
  if (!text(input.cashSourceId)) {
    throw new Error('Sumber kas wajib diisi.')
  }

  const loan = await prisma.loan.create({
    data: {
      id: text(input.id) || undefined,
      memberId,
      counterpartyName,
      cashSourceId: text(input.cashSourceId),
      principalAmountIdr,
      paidAmountIdr,
      remainingAmountIdr,
      loanDate: fromDateInput(input.loanDate, 'Tanggal pinjaman'),
      status: remainingAmountIdr === 0 ? 'paid' : (text(input.status) || 'active'),
      note: optionalText(input.note),
    },
    include: {
      cashSource: true,
      member: { include: { department: true } },
      payments: { orderBy: { paymentDate: 'asc' } },
    },
  })

  await makeAudit('loan.create', 'loan', loan.id)
  return mapLoan(loan)
}

export async function updateLoan(id: string, input: Record<string, unknown>) {
  const existing = await prisma.loan.findUnique({ where: { id } })
  if (!existing) return null

  const principalAmountIdr = input.principalAmountIdr === undefined
    ? existing.principalAmountIdr
    : positiveNumber(input.principalAmountIdr, 'Pokok pinjaman')
  const paidAmountIdr = input.paidAmountIdr === undefined
    ? existing.paidAmountIdr
    : Math.min(nonNegativeNumber(input.paidAmountIdr, 'Jumlah terbayar'), principalAmountIdr)
  const remainingAmountIdr = Math.max(principalAmountIdr - paidAmountIdr, 0)
  const status = remainingAmountIdr === 0
    ? 'paid'
    : input.status === undefined
      ? existing.status
      : text(input.status)

  const loan = await prisma.loan.update({
    where: { id },
    data: {
      memberId: input.memberId === undefined ? undefined : optionalText(input.memberId),
      counterpartyName: input.counterpartyName === undefined ? undefined : optionalText(input.counterpartyName),
      cashSourceId: input.cashSourceId === undefined ? undefined : text(input.cashSourceId),
      principalAmountIdr,
      paidAmountIdr,
      remainingAmountIdr,
      loanDate: input.loanDate === undefined ? undefined : fromDateInput(input.loanDate, 'Tanggal pinjaman'),
      status,
      note: input.note === undefined ? undefined : optionalText(input.note),
    },
    include: {
      cashSource: true,
      member: { include: { department: true } },
      payments: { orderBy: { paymentDate: 'asc' } },
    },
  })

  await makeAudit('loan.update', 'loan', loan.id)
  return mapLoan(loan)
}

export async function deleteLoan(id: string) {
  const existing = await prisma.loan.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.$transaction([
    prisma.loanPayment.deleteMany({ where: { loanId: id } }),
    prisma.loan.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        userName: SYSTEM_USER_NAME,
        action: 'loan.delete',
        entityType: 'loan',
        entityId: id,
      },
    }),
  ])

  return true
}

export async function createLoanPayment(loanId: string, input: Record<string, unknown>) {
  const amountIdr = positiveNumber(input.amountIdr, 'Jumlah pembayaran')

  const loan = await prisma.$transaction(async tx => {
    const existing = await tx.loan.findUnique({ where: { id: loanId } })
    if (!existing) return null
    if (existing.status !== 'active') throw new Error('Pinjaman sudah tidak aktif.')
    if (amountIdr > existing.remainingAmountIdr) throw new Error('Pembayaran tidak boleh melebihi sisa pinjaman.')

    const paidAmountIdr = existing.paidAmountIdr + amountIdr
    const remainingAmountIdr = Math.max(existing.remainingAmountIdr - amountIdr, 0)

    await tx.loanPayment.create({
      data: {
        id: text(input.id) || undefined,
        loanId,
        paymentDate: fromDateInput(input.paymentDate, 'Tanggal pembayaran'),
        amountIdr,
        note: optionalText(input.note),
      },
    })

    await tx.loan.update({
      where: { id: loanId },
      data: {
        paidAmountIdr,
        remainingAmountIdr,
        status: remainingAmountIdr === 0 ? 'paid' : 'active',
      },
    })

    await tx.auditLog.create({
      data: {
        userName: SYSTEM_USER_NAME,
        action: 'loan_payment.create',
        entityType: 'loan_payment',
        entityId: loanId,
      },
    })

    return tx.loan.findUnique({
      where: { id: loanId },
      include: {
        cashSource: true,
        member: { include: { department: true } },
        payments: { orderBy: { paymentDate: 'asc' } },
      },
    })
  })

  return loan ? mapLoan(loan) : null
}

export async function getReportSummary(filters: { from?: string; to?: string }) {
  const cashTransactions = await listCashTransactions(filters)
  const dues = await prisma.memberContribution.findMany()
  const loans = await prisma.loan.findMany({ where: { status: 'active' } })

  const cashIn = cashTransactions
    .filter(item => item.direction === 'inflow')
    .reduce((sum, item) => sum + item.amountIdr, 0)
  const cashOut = cashTransactions
    .filter(item => item.direction === 'outflow')
    .reduce((sum, item) => sum + item.amountIdr, 0)
  const duesTotal = dues.reduce((sum, item) => sum + item.amountIdr, 0)
  const unpaid = dues.filter(item => item.amountIdr === 0)
  const activeLoans = loans.reduce((sum, item) => sum + item.remainingAmountIdr, 0)

  return {
    cashIn,
    cashOut,
    balance: OPENING_BALANCE_IDR + cashIn - cashOut,
    duesTotal,
    unpaidCount: unpaid.length,
    activeLoans,
    period: {
      from: filters.from ?? null,
      to: filters.to ?? null,
    },
  }
}
