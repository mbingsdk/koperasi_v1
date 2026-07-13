import { NextResponse } from 'next/server'

export interface ApiMeta {
  count?: number
  generatedAt?: string
  source?: 'mock' | 'postgres'
}

export function ok<T>(data: T, meta: ApiMeta = {}) {
  return NextResponse.json({
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'postgres',
      ...meta,
    },
  })
}

export function notFound(message = 'Data tidak ditemukan') {
  return NextResponse.json(
    { error: { code: 'not_found', message } },
    { status: 404 }
  )
}

export function badRequest(message = 'Payload tidak valid') {
  return NextResponse.json(
    { error: { code: 'bad_request', message } },
    { status: 400 }
  )
}

export function unauthorized(message = 'Sesi login tidak valid atau sudah berakhir') {
  return NextResponse.json(
    { error: { code: 'unauthorized', message } },
    { status: 401 }
  )
}

export function forbidden(message = 'Akses ditolak untuk role pengguna ini') {
  return NextResponse.json(
    { error: { code: 'forbidden', message } },
    { status: 403 }
  )
}

export function conflict(message = 'Data konflik dengan data yang sudah ada') {
  return NextResponse.json(
    { error: { code: 'conflict', message } },
    { status: 409 }
  )
}

export function serverError(message = 'Terjadi kesalahan server') {
  return NextResponse.json(
    { error: { code: 'server_error', message } },
    { status: 500 }
  )
}
