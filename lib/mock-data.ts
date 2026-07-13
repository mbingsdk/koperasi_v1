import type {
  User, Department, Member, Fund, CashSource, ContributionRate,
  MemberContribution, CashTransaction, Loan, LoanPayment,
  ImportBatch, AuditLog,
} from './types'

export const DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Produksi' },
  { id: 'd2', name: 'Gudang' },
  { id: 'd3', name: 'Kantor' },
]

export const FUNDS: Fund[] = [
  { id: 'f1', code: 'koperasi',  name: 'Kas Koperasi', isSystem: true, isActive: true },
  { id: 'f2', code: 'dana_hibah', name: 'Dana Hibah',   isSystem: true, isActive: true },
  { id: 'f3', code: 'serikat',   name: 'Dana Serikat',  isSystem: true, isActive: true },
]

export const CASH_SOURCES: CashSource[] = [
  { id: 'cs1', name: 'Kas - Jeni',  isActive: true },
  { id: 'cs2', name: 'Kas - Idha', isActive: true },
]

export const MEMBERS: Member[] = [
  { id: 'm1', memberNo: 'KOP-0001', name: 'Abdul Rahman',   normalizedName: 'abdul rahman',   department: DEPARTMENTS[0], employeeType: 'Bulanan', status: 'active',   joinedAt: '2021-06-01' },
  { id: 'm2', memberNo: 'KOP-0002', name: 'Siti Aminah',    normalizedName: 'siti aminah',    department: DEPARTMENTS[2], employeeType: 'Mixed',   status: 'active',   joinedAt: '2021-06-01' },
  { id: 'm3', memberNo: 'KOP-0003', name: 'Agus Setiawan',  normalizedName: 'agus setiawan',  department: DEPARTMENTS[1], employeeType: 'Harian',  status: 'active',   joinedAt: '2022-01-10' },
  { id: 'm4', memberNo: 'KOP-0004', name: 'Budi Santoso',   normalizedName: 'budi santoso',   department: DEPARTMENTS[0], employeeType: 'Bulanan', status: 'active',   joinedAt: '2020-03-15' },
  { id: 'm5', memberNo: 'KOP-0005', name: 'Dewi Lestari',   normalizedName: 'dewi lestari',   department: DEPARTMENTS[2], employeeType: 'Bulanan', status: 'inactive', joinedAt: '2019-07-20' },
  { id: 'm6', memberNo: 'KOP-0006', name: 'Irfan Hidayat',  normalizedName: 'irfan hidayat',  department: DEPARTMENTS[1], employeeType: 'Harian',  status: 'active',   joinedAt: '2023-02-01' },
  { id: 'm7', memberNo: 'KOP-0007', name: 'Rina Wulandari', normalizedName: 'rina wulandari', department: DEPARTMENTS[0], employeeType: 'Bulanan', status: 'active',   joinedAt: '2022-08-15' },
  { id: 'm8', memberNo: 'KOP-0008', name: 'Joko Prasetyo',  normalizedName: 'joko prasetyo',  department: DEPARTMENTS[1], employeeType: 'Mixed',   status: 'active',   joinedAt: '2021-11-01' },
  { id: 'm9', memberNo: 'KOP-0009', name: 'Maya Kartika',   normalizedName: 'maya kartika',   department: DEPARTMENTS[2], employeeType: 'Bulanan', status: 'active',   joinedAt: '2020-05-10' },
  { id: 'm10', memberNo: 'KOP-0010', name: 'Hendra Putra',  normalizedName: 'hendra putra',   department: DEPARTMENTS[0], employeeType: 'Harian',  status: 'active',   joinedAt: '2023-09-01' },
]

export const CONTRIBUTION_RATES: ContributionRate[] = [
  { id: 'cr1', fund: FUNDS[0], employeeType: 'Bulanan', amountIdr: 50000, effectiveFrom: '2024-01-01' },
  { id: 'cr2', fund: FUNDS[0], employeeType: 'Harian',  amountIdr: 30000, effectiveFrom: '2024-01-01' },
  { id: 'cr3', fund: FUNDS[0], employeeType: 'Mixed',   amountIdr: 50000, effectiveFrom: '2024-01-01' },
  { id: 'cr4', fund: FUNDS[1], employeeType: 'Bulanan', amountIdr: 20000, effectiveFrom: '2024-01-01' },
  { id: 'cr5', fund: FUNDS[2], employeeType: 'Bulanan', amountIdr: 10000, effectiveFrom: '2024-01-01' },
  { id: 'cr6', fund: FUNDS[2], employeeType: 'Harian',  amountIdr: 5000,  effectiveFrom: '2024-01-01' },
]

export const DUES_JUNE: MemberContribution[] = [
  { id: 'mc1',  member: MEMBERS[0], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 50000 },
  { id: 'mc2',  member: MEMBERS[1], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 50000 },
  { id: 'mc3',  member: MEMBERS[2], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 30000 },
  { id: 'mc4',  member: MEMBERS[3], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 50000 },
  { id: 'mc5',  member: MEMBERS[4], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 0, note: 'Belum bayar - anggota tidak aktif' },
  { id: 'mc6',  member: MEMBERS[5], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 0, note: 'Belum bayar - cuti' },
  { id: 'mc7',  member: MEMBERS[6], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 50000 },
  { id: 'mc8',  member: MEMBERS[7], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 50000 },
  { id: 'mc9',  member: MEMBERS[8], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 50000 },
  { id: 'mc10', member: MEMBERS[9], fund: FUNDS[0], periodMonth: '2026-06-01', amountIdr: 30000 },
]

const LOAN_PAYMENTS_1: LoanPayment[] = [
  { id: 'lp1', loanId: 'l1', paymentDate: '2026-05-01', amountIdr: 250000, note: 'Angsuran pertama' },
  { id: 'lp2', loanId: 'l1', paymentDate: '2026-06-01', amountIdr: 250000, note: 'Angsuran kedua' },
]

const LOAN_PAYMENTS_3: LoanPayment[] = [
  { id: 'lp3', loanId: 'l3', paymentDate: '2026-06-01', amountIdr: 200000, note: 'Angsuran pertama' },
]

export const LOANS: Loan[] = [
  { id: 'l1', member: MEMBERS[0], cashSource: CASH_SOURCES[0], principalAmountIdr: 1500000, paidAmountIdr: 500000,  remainingAmountIdr: 1000000, loanDate: '2026-04-01', status: 'active',  payments: LOAN_PAYMENTS_1 },
  { id: 'l2', member: MEMBERS[2], cashSource: CASH_SOURCES[1], principalAmountIdr: 800000,  paidAmountIdr: 800000,  remainingAmountIdr: 0,       loanDate: '2025-11-01', status: 'paid',    payments: [] },
  { id: 'l3', member: MEMBERS[6], cashSource: CASH_SOURCES[0], principalAmountIdr: 1000000, paidAmountIdr: 200000,  remainingAmountIdr: 800000,  loanDate: '2026-05-10', status: 'active',  payments: LOAN_PAYMENTS_3 },
  { id: 'l4', member: MEMBERS[7], cashSource: CASH_SOURCES[1], principalAmountIdr: 600000,  paidAmountIdr: 600000,  remainingAmountIdr: 0,       loanDate: '2025-08-01', status: 'paid',    payments: [] },
  { id: 'l5', member: MEMBERS[4], cashSource: CASH_SOURCES[0], principalAmountIdr: 2000000, paidAmountIdr: 500000,  remainingAmountIdr: 1500000, loanDate: '2026-03-15', status: 'active',  payments: [] },
]

export const CASH_TRANSACTIONS: CashTransaction[] = [
  { id: 'ct1', transactionDate: '2026-06-11', direction: 'outflow', fund: FUNDS[1], member: MEMBERS[2], counterpartyName: 'Agus Setiawan',  category: 'Dana Hibah',             amountIdr: 150000,  note: 'Bantuan kesejahteraan', createdAt: '2026-06-11T09:00:00Z' },
  { id: 'ct2', transactionDate: '2026-06-10', direction: 'outflow', fund: FUNDS[0], counterpartyName: undefined,                              category: 'Pengeluaran Koperasi',   amountIdr: 320000,  note: 'Perlengkapan kantor',   createdAt: '2026-06-10T14:30:00Z' },
  { id: 'ct3', transactionDate: '2026-06-09', direction: 'outflow', fund: FUNDS[0], member: MEMBERS[1], counterpartyName: 'Siti Aminah',     category: 'Penarikan Anggota',      amountIdr: 500000,  note: 'Penarikan simpanan',    createdAt: '2026-06-09T10:00:00Z' },
  { id: 'ct4', transactionDate: '2026-06-08', direction: 'inflow',  fund: FUNDS[0], member: MEMBERS[3], counterpartyName: 'Budi Santoso',    category: 'Angsuran Pinjaman',      amountIdr: 250000,  note: 'Angsuran kedua',        createdAt: '2026-06-08T08:00:00Z' },
  { id: 'ct5', transactionDate: '2026-06-05', direction: 'outflow', fund: FUNDS[0], member: MEMBERS[6], counterpartyName: 'Rina Wulandari',  category: 'Pencairan Pinjaman',     amountIdr: 1000000, note: 'Pinjaman baru',        createdAt: '2026-06-05T11:00:00Z' },
  { id: 'ct6', transactionDate: '2026-06-03', direction: 'inflow',  fund: FUNDS[0], counterpartyName: '114 anggota',                          category: 'Lainnya',                amountIdr: 5700000, note: 'Batch iuran Juni',     createdAt: '2026-06-03T09:00:00Z' },
  { id: 'ct7', transactionDate: '2026-06-02', direction: 'inflow',  fund: FUNDS[0], counterpartyName: undefined,                              category: 'Koreksi Saldo',          amountIdr: 75000,   note: 'Penyesuaian saldo awal', createdAt: '2026-06-02T08:00:00Z' },
]

export const AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', user: { id: 'u1', name: 'Siti Bendahara' }, action: 'loan.update',     entityType: 'loan',        entityId: 'l1', createdAt: '2026-06-13T09:14:00Z' },
  { id: 'al2', user: { id: 'u1', name: 'Siti Bendahara' }, action: 'cash.create',     entityType: 'transaction', entityId: 'ct2', createdAt: '2026-06-12T16:02:00Z' },
  { id: 'al3', user: { id: 'u2', name: 'Admin'          }, action: 'dues.upsert',     entityType: 'contribution', createdAt: '2026-06-11T11:30:00Z' },
  { id: 'al4', user: { id: 'u2', name: 'Admin'          }, action: 'import.commit',   entityType: 'import_batch', createdAt: '2026-06-10T08:47:00Z' },
  { id: 'al5', user: { id: 'u1', name: 'Siti Bendahara' }, action: 'loan.create',     entityType: 'loan',        entityId: 'l3', createdAt: '2026-06-09T10:15:00Z' },
  { id: 'al6', user: { id: 'u1', name: 'Siti Bendahara' }, action: 'member.create',   entityType: 'member',      entityId: 'm10', createdAt: '2026-06-08T09:00:00Z' },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Siti Bendahara', email: 'bendahara@koperasi.local', role: 'admin',       isActive: true, lastLoginAt: '2026-06-13T09:00:00Z', createdAt: '2021-01-01' },
  { id: 'u2', name: 'Admin',          email: 'admin@koperasi.local',     role: 'super_admin', isActive: true, lastLoginAt: '2026-06-10T08:00:00Z', createdAt: '2021-01-01' },
  { id: 'u3', name: 'Viewer Laporan', email: 'viewer@koperasi.local',    role: 'viewer',      isActive: true, lastLoginAt: '2026-06-01T10:00:00Z', createdAt: '2022-04-01' },
]

export const IMPORT_BATCHES: ImportBatch[] = [
  {
    id: 'ib1',
    fileName: 'koperasi_2026_batch1.xlsx',
    originalFileName: 'koperasi_2026.xlsx',
    status: 'committed',
    summary: {
      sheetsDetected: ['Koperasi', 'Dahib', 'Serikat', 'Pengeluaran', 'pinjaman kop'],
      membersDetected: 363,
      contributionsDetected: 14000,
      transactionsDetected: 540,
      loansDetected: 190,
      warnings: 12,
      errors: 0,
    },
    createdAt: '2026-06-10T08:00:00Z',
    committedAt: '2026-06-10T08:47:00Z',
  },
]
