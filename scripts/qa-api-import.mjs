const baseUrl = (process.env.QA_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.QA_EMAIL ?? 'admin@koperasi.local'
const password = process.env.QA_PASSWORD ?? 'password'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (request.cookie) headers.set('Cookie', request.cookie)

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) request.cookie = setCookie.split(';')[0]
  const payload = await response.json().catch(() => null)

  return { response, payload }
}

async function assertServerReady() {
  try {
    const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' })
    assert(response.status < 500, `Dev server membalas HTTP ${response.status}`)
  } catch (error) {
    throw new Error(
      `Dev server belum siap di ${baseUrl}. Jalankan "npm.cmd run dev" dulu. Detail: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

async function login() {
  const { response, payload } = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  assert(response.ok, `Login QA gagal: HTTP ${response.status} ${JSON.stringify(payload)}`)
}

async function createPreview(name, summary) {
  const { response, payload } = await request('/api/v1/import-batches/preview', {
    method: 'POST',
    body: JSON.stringify({
      originalFileName: name,
      summary,
    }),
  })
  assert(response.ok, `Preview gagal: HTTP ${response.status} ${JSON.stringify(payload)}`)
  assert(payload?.data?.id, 'Preview tidak mengembalikan batch id.')
  return payload.data.id
}

async function simulate(id, body = {}) {
  const { response, payload } = await request(`/api/v1/import-batches/${encodeURIComponent(id)}/commit/simulate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  assert(response.ok, `Simulasi gagal: HTTP ${response.status} ${JSON.stringify(payload)}`)
  return payload.data
}

async function cleanup(id, expectedStatus = 200) {
  const { response, payload } = await request(`/api/v1/import-batches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  assert(response.status === expectedStatus, `Cleanup ${id} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`)
  return payload
}

const validSummary = {
  sheetsDetected: ['QA'],
  membersDetected: 1,
  contributionsDetected: 1,
  transactionsDetected: 0,
  loansDetected: 0,
  warnings: 0,
  errors: 0,
  mappedRows: {
    members: [{ row: 1, name: 'QA Import Flow Member', departmentName: 'QA' }],
    dues: [{ row: 2, memberName: 'QA Import Flow Member', fundCode: 'KOPERASI', periodMonth: '2026-07-01', amountIdr: 10000 }],
    cashTransactions: [],
    loans: [],
  },
}

const invalidSummary = {
  sheetsDetected: ['QA'],
  membersDetected: 0,
  contributionsDetected: 0,
  transactionsDetected: 0,
  loansDetected: 0,
  warnings: 0,
  errors: 0,
}

await assertServerReady()
await login()

const createdIds = []

try {
  const validId = await createPreview('qa-api-import-valid.xlsx', validSummary)
  createdIds.push(validId)
  const validSimulation = await simulate(validId, { groups: ['members', 'dues'] })
  assert(validSimulation.canCommit === true, `Valid simulation harus canCommit=true: ${JSON.stringify(validSimulation)}`)
  assert(validSimulation.totals.ready === 2, `Valid simulation ready harus 2, got ${validSimulation.totals.ready}`)
  assert(validSimulation.groupsToCommit.includes('members'), 'Valid simulation harus include members.')
  assert(validSimulation.groupsToCommit.includes('dues'), 'Valid simulation harus include dues.')
  await cleanup(validId)
  await cleanup(validId, 404)
  createdIds.splice(createdIds.indexOf(validId), 1)

  const invalidId = await createPreview('qa-api-import-invalid.xlsx', invalidSummary)
  createdIds.push(invalidId)
  const invalidSimulation = await simulate(invalidId, { groups: ['members'] })
  assert(invalidSimulation.canCommit === false, `Invalid simulation harus canCommit=false: ${JSON.stringify(invalidSimulation)}`)
  assert(invalidSimulation.issues.some((issue) => issue.includes('Mapping impor belum tersedia')), `Invalid issue tidak sesuai: ${JSON.stringify(invalidSimulation.issues)}`)
  await cleanup(invalidId)
  createdIds.splice(createdIds.indexOf(invalidId), 1)

  console.log('Import API QA: OK')
  console.log(`Base URL: ${baseUrl}`)
  console.log('Covered: login, preview valid, simulate valid, cleanup, cleanup 404, preview invalid, simulate invalid')
} finally {
  for (const id of createdIds) {
    await cleanup(id).catch(() => null)
  }
}
