const fs = require('node:fs')
const path = require('node:path')
const { pbkdf2Sync, randomBytes } = require('node:crypto')

const envPath = path.join(__dirname, '..', '.env')

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  const databaseUrl = envFile
    .split(/\r?\n/)
    .find(line => line.trim().startsWith('DATABASE_URL='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim()
    .replace(/^"|"$/g, '')

  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl
  }
}

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const now = new Date()
const date = value => new Date(value)
const demoPassword = process.env.DEMO_PASSWORD || 'password'

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('base64url')
  return `pbkdf2$120000$${salt}$${hash}`
}

const departments = [
  { id: 'd1', name: 'Produksi' },
  { id: 'd2', name: 'Gudang' },
  { id: 'd3', name: 'Kantor' },
]

const funds = [
  { id: 'f1', code: 'koperasi', name: 'Kas Koperasi', isSystem: true },
  { id: 'f2', code: 'dana_hibah', name: 'Dana Hibah', isSystem: true },
  { id: 'f3', code: 'serikat', name: 'Dana Serikat', isSystem: true },
]

const cashSources = [
  { id: 'cs1', name: 'Kas - Jeni' },
  { id: 'cs2', name: 'Kas - Idha' },
]

const users = [
  { id: 'u1', name: 'Siti Bendahara', email: 'bendahara@koperasi.local', role: 'admin', lastLoginAt: date('2026-06-13T09:00:00Z') },
  { id: 'u2', name: 'Admin', email: 'admin@koperasi.local', role: 'super_admin', lastLoginAt: date('2026-06-10T08:00:00Z') },
  { id: 'u3', name: 'Viewer Laporan', email: 'viewer@koperasi.local', role: 'viewer', lastLoginAt: date('2026-06-01T10:00:00Z') },
]

const members = [
  { id: 'm1', memberNo: 'KOP-0001', name: 'Abdul Rahman', normalizedName: 'abdul rahman', departmentId: 'd1', employeeType: 'Bulanan', status: 'active', joinedAt: '2021-06-01' },
  { id: 'm2', memberNo: 'KOP-0002', name: 'Siti Aminah', normalizedName: 'siti aminah', departmentId: 'd3', employeeType: 'Mixed', status: 'active', joinedAt: '2021-06-01' },
  { id: 'm3', memberNo: 'KOP-0003', name: 'Agus Setiawan', normalizedName: 'agus setiawan', departmentId: 'd2', employeeType: 'Harian', status: 'active', joinedAt: '2022-01-10' },
  { id: 'm4', memberNo: 'KOP-0004', name: 'Budi Santoso', normalizedName: 'budi santoso', departmentId: 'd1', employeeType: 'Bulanan', status: 'active', joinedAt: '2020-03-15' },
  { id: 'm5', memberNo: 'KOP-0005', name: 'Dewi Lestari', normalizedName: 'dewi lestari', departmentId: 'd3', employeeType: 'Bulanan', status: 'inactive', joinedAt: '2019-07-20' },
  { id: 'm6', memberNo: 'KOP-0006', name: 'Irfan Hidayat', normalizedName: 'irfan hidayat', departmentId: 'd2', employeeType: 'Harian', status: 'active', joinedAt: '2023-02-01' },
  { id: 'm7', memberNo: 'KOP-0007', name: 'Rina Wulandari', normalizedName: 'rina wulandari', departmentId: 'd1', employeeType: 'Bulanan', status: 'active', joinedAt: '2022-08-15' },
  { id: 'm8', memberNo: 'KOP-0008', name: 'Joko Prasetyo', normalizedName: 'joko prasetyo', departmentId: 'd2', employeeType: 'Mixed', status: 'active', joinedAt: '2021-11-01' },
  { id: 'm9', memberNo: 'KOP-0009', name: 'Maya Kartika', normalizedName: 'maya kartika', departmentId: 'd3', employeeType: 'Bulanan', status: 'active', joinedAt: '2020-05-10' },
  { id: 'm10', memberNo: 'KOP-0010', name: 'Hendra Putra', normalizedName: 'hendra putra', departmentId: 'd1', employeeType: 'Harian', status: 'active', joinedAt: '2023-09-01' },
]

const contributionRates = [
  { id: 'cr1', fundId: 'f1', employeeType: 'Bulanan', amountIdr: 50000 },
  { id: 'cr2', fundId: 'f1', employeeType: 'Harian', amountIdr: 30000 },
  { id: 'cr3', fundId: 'f1', employeeType: 'Mixed', amountIdr: 50000 },
  { id: 'cr4', fundId: 'f2', employeeType: 'Bulanan', amountIdr: 20000 },
  { id: 'cr5', fundId: 'f3', employeeType: 'Bulanan', amountIdr: 10000 },
  { id: 'cr6', fundId: 'f3', employeeType: 'Harian', amountIdr: 5000 },
]

const dues = [
  { id: 'mc1', memberId: 'm1', fundId: 'f1', amountIdr: 50000 },
  { id: 'mc2', memberId: 'm2', fundId: 'f1', amountIdr: 50000 },
  { id: 'mc3', memberId: 'm3', fundId: 'f1', amountIdr: 30000 },
  { id: 'mc4', memberId: 'm4', fundId: 'f1', amountIdr: 50000 },
  { id: 'mc5', memberId: 'm5', fundId: 'f1', amountIdr: 0, note: 'Belum bayar - anggota tidak aktif' },
  { id: 'mc6', memberId: 'm6', fundId: 'f1', amountIdr: 0, note: 'Belum bayar - cuti' },
  { id: 'mc7', memberId: 'm7', fundId: 'f1', amountIdr: 50000 },
  { id: 'mc8', memberId: 'm8', fundId: 'f1', amountIdr: 50000 },
  { id: 'mc9', memberId: 'm9', fundId: 'f1', amountIdr: 50000 },
  { id: 'mc10', memberId: 'm10', fundId: 'f1', amountIdr: 30000 },
]

const loans = [
  { id: 'l1', memberId: 'm1', cashSourceId: 'cs1', principalAmountIdr: 1500000, paidAmountIdr: 500000, remainingAmountIdr: 1000000, loanDate: '2026-04-01', status: 'active' },
  { id: 'l2', memberId: 'm3', cashSourceId: 'cs2', principalAmountIdr: 800000, paidAmountIdr: 800000, remainingAmountIdr: 0, loanDate: '2025-11-01', status: 'paid' },
  { id: 'l3', memberId: 'm7', cashSourceId: 'cs1', principalAmountIdr: 1000000, paidAmountIdr: 200000, remainingAmountIdr: 800000, loanDate: '2026-05-10', status: 'active' },
  { id: 'l4', memberId: 'm8', cashSourceId: 'cs2', principalAmountIdr: 600000, paidAmountIdr: 600000, remainingAmountIdr: 0, loanDate: '2025-08-01', status: 'paid' },
  { id: 'l5', memberId: 'm5', cashSourceId: 'cs1', principalAmountIdr: 2000000, paidAmountIdr: 500000, remainingAmountIdr: 1500000, loanDate: '2026-03-15', status: 'active' },
]

const loanPayments = [
  { id: 'lp1', loanId: 'l1', paymentDate: '2026-05-01', amountIdr: 250000, note: 'Angsuran pertama' },
  { id: 'lp2', loanId: 'l1', paymentDate: '2026-06-01', amountIdr: 250000, note: 'Angsuran kedua' },
  { id: 'lp3', loanId: 'l3', paymentDate: '2026-06-01', amountIdr: 200000, note: 'Angsuran pertama' },
]

const cashTransactions = [
  { id: 'ct1', transactionDate: '2026-06-11', direction: 'outflow', fundId: 'f2', memberId: 'm3', counterpartyName: 'Agus Setiawan', category: 'Dana Hibah', amountIdr: 150000, note: 'Bantuan kesejahteraan' },
  { id: 'ct2', transactionDate: '2026-06-10', direction: 'outflow', fundId: 'f1', category: 'Pengeluaran Koperasi', amountIdr: 320000, note: 'Perlengkapan kantor' },
  { id: 'ct3', transactionDate: '2026-06-09', direction: 'outflow', fundId: 'f1', memberId: 'm2', counterpartyName: 'Siti Aminah', category: 'Penarikan Anggota', amountIdr: 500000, note: 'Penarikan simpanan' },
  { id: 'ct4', transactionDate: '2026-06-08', direction: 'inflow', fundId: 'f1', memberId: 'm4', counterpartyName: 'Budi Santoso', category: 'Angsuran Pinjaman', amountIdr: 250000, note: 'Angsuran kedua' },
  { id: 'ct5', transactionDate: '2026-06-05', direction: 'outflow', fundId: 'f1', memberId: 'm7', counterpartyName: 'Rina Wulandari', category: 'Pencairan Pinjaman', amountIdr: 1000000, note: 'Pinjaman baru' },
  { id: 'ct6', transactionDate: '2026-06-03', direction: 'inflow', fundId: 'f1', counterpartyName: '114 anggota', category: 'Lainnya', amountIdr: 5700000, note: 'Batch iuran Juni' },
  { id: 'ct7', transactionDate: '2026-06-02', direction: 'inflow', fundId: 'f1', category: 'Koreksi Saldo', amountIdr: 75000, note: 'Penyesuaian saldo awal' },
]

const auditLogs = [
  { id: 'al1', userId: 'u1', userName: 'Siti Bendahara', action: 'loan.update', entityType: 'loan', entityId: 'l1', createdAt: '2026-06-13T09:14:00Z' },
  { id: 'al2', userId: 'u1', userName: 'Siti Bendahara', action: 'cash.create', entityType: 'transaction', entityId: 'ct2', createdAt: '2026-06-12T16:02:00Z' },
  { id: 'al3', userId: 'u2', userName: 'Admin', action: 'dues.upsert', entityType: 'contribution', createdAt: '2026-06-11T11:30:00Z' },
  { id: 'al4', userId: 'u2', userName: 'Admin', action: 'import.commit', entityType: 'import_batch', createdAt: '2026-06-10T08:47:00Z' },
  { id: 'al5', userId: 'u1', userName: 'Siti Bendahara', action: 'loan.create', entityType: 'loan', entityId: 'l3', createdAt: '2026-06-09T10:15:00Z' },
  { id: 'al6', userId: 'u1', userName: 'Siti Bendahara', action: 'member.create', entityType: 'member', entityId: 'm10', createdAt: '2026-06-08T09:00:00Z' },
]

async function main() {
  for (const item of departments) {
    await prisma.department.upsert({
      where: { id: item.id },
      update: { name: item.name, isActive: true },
      create: { ...item, isActive: true, createdAt: now, updatedAt: now },
    })
  }

  for (const item of funds) {
    await prisma.fund.upsert({
      where: { id: item.id },
      update: { code: item.code, name: item.name, isSystem: item.isSystem, isActive: true },
      create: { ...item, isActive: true, createdAt: now, updatedAt: now },
    })
  }

  for (const item of cashSources) {
    await prisma.cashSource.upsert({
      where: { id: item.id },
      update: { name: item.name, isActive: true },
      create: { ...item, isActive: true, createdAt: now, updatedAt: now },
    })
  }

  for (const item of users) {
    await prisma.user.upsert({
      where: { id: item.id },
      update: { name: item.name, email: item.email, role: item.role, isActive: true, lastLoginAt: item.lastLoginAt, passwordHash: hashPassword(demoPassword) },
      create: { ...item, isActive: true, passwordHash: hashPassword(demoPassword), createdAt: now, updatedAt: now },
    })
  }

  for (const item of members) {
    await prisma.member.upsert({
      where: { id: item.id },
      update: { ...item, joinedAt: date(item.joinedAt) },
      create: { ...item, joinedAt: date(item.joinedAt), createdAt: now, updatedAt: now },
    })
  }

  for (const item of contributionRates) {
    await prisma.contributionRate.upsert({
      where: { id: item.id },
      update: { ...item, effectiveFrom: date('2024-01-01') },
      create: { ...item, effectiveFrom: date('2024-01-01'), createdAt: now, updatedAt: now },
    })
  }

  for (const item of dues) {
    await prisma.memberContribution.upsert({
      where: { id: item.id },
      update: { ...item, periodMonth: date('2026-06-01') },
      create: { ...item, periodMonth: date('2026-06-01'), createdAt: now, updatedAt: now },
    })
  }

  for (const item of loans) {
    await prisma.loan.upsert({
      where: { id: item.id },
      update: { ...item, loanDate: date(item.loanDate) },
      create: { ...item, loanDate: date(item.loanDate), createdAt: now, updatedAt: now },
    })
  }

  for (const item of loanPayments) {
    await prisma.loanPayment.upsert({
      where: { id: item.id },
      update: { ...item, paymentDate: date(item.paymentDate) },
      create: { ...item, paymentDate: date(item.paymentDate), createdAt: now },
    })
  }

  for (const item of cashTransactions) {
    await prisma.cashTransaction.upsert({
      where: { id: item.id },
      update: { ...item, transactionDate: date(item.transactionDate) },
      create: { ...item, transactionDate: date(item.transactionDate), createdAt: now, updatedAt: now },
    })
  }

  await prisma.importBatch.upsert({
    where: { id: 'ib1' },
    update: {
      fileName: 'koperasi_2026_batch1.xlsx',
      originalFileName: 'koperasi_2026.xlsx',
      status: 'committed',
      committedAt: date('2026-06-10T08:47:00Z'),
    },
    create: {
      id: 'ib1',
      fileName: 'koperasi_2026_batch1.xlsx',
      originalFileName: 'koperasi_2026.xlsx',
      status: 'committed',
      summaryJson: {
        sheetsDetected: ['Koperasi', 'Dahib', 'Serikat', 'Pengeluaran', 'pinjaman kop'],
        membersDetected: 363,
        contributionsDetected: 14000,
        transactionsDetected: 540,
        loansDetected: 190,
        warnings: 12,
        errors: 0,
      },
      createdAt: date('2026-06-10T08:00:00Z'),
      committedAt: date('2026-06-10T08:47:00Z'),
    },
  })

  for (const item of auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: item.id },
      update: { ...item, createdAt: date(item.createdAt) },
      create: { ...item, createdAt: date(item.createdAt) },
    })
  }

  console.log('Seed complete: demo koperasi data inserted into PostgreSQL.')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
