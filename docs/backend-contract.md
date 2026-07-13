# Backend Contract - Koperasi Ledger

Dokumen ini adalah pegangan awal untuk mengganti store `localStorage` menjadi backend sungguhan.

Status saat ini:

- API read route utama `/api/v1/*` sudah membaca PostgreSQL via Prisma.
- API write route utama untuk anggota, iuran batch, buku kas, pinjaman, dan angsuran sudah menulis ke PostgreSQL.
- Auth session dasar sudah tersedia lewat cookie HTTP-only.
- Auth guard dan role enforcement sudah aktif untuk endpoint mutasi.
- Import preview/commit batch sudah tersedia server-side.
- Prisma schema PostgreSQL tersedia di `prisma/schema.prisma`.
- Docker Compose Postgres lokal tersedia di `docker-compose.yml`.
- Response shape dibuat konsisten: `{ data, meta }` atau `{ error }`.
- Parser XLSX awal sudah membaca nama sheet, jumlah baris domain, dan warning header/nominal.
- Belum ada commit data hasil mapping ke tabel ledger.

## Response Shape

Sukses:

```json
{
  "data": {},
  "meta": {
    "generatedAt": "2026-07-12T00:00:00.000Z",
    "source": "postgres",
    "count": 10
  }
}
```

Error:

```json
{
  "error": {
    "code": "not_found",
    "message": "Data tidak ditemukan"
  }
}
```

## Implemented Read Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Health check API + database status |
| GET | `/api/v1/auth/me` | User aktif dari cookie session |
| GET | `/api/v1/bootstrap` | Full PostgreSQL state for migration/testing |
| GET | `/api/v1/members` | List anggota dengan filter |
| GET | `/api/v1/members/:id` | Profil anggota + iuran/pinjaman/transaksi |
| GET | `/api/v1/dues` | List iuran dengan filter periode/dana/departemen/status bayar |
| GET | `/api/v1/cash-transactions` | Buku kas dengan saldo berjalan |
| GET | `/api/v1/loans` | List pinjaman dengan filter status/sumber/tanggal |
| GET | `/api/v1/reports/summary` | Summary kas/iuran/pinjaman |

## Implemented Write Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Login, validasi password, set cookie session |
| POST | `/api/v1/auth/logout` | Logout dan clear cookie session |
| POST | `/api/v1/import-batches/preview` | Buat preview batch impor dari JSON/FormData file |
| POST | `/api/v1/import-batches/:id/commit` | Tandai batch impor committed dan buat audit log |
| POST | `/api/v1/members` | Tambah anggota |
| PATCH | `/api/v1/members/:id` | Edit anggota |
| DELETE | `/api/v1/members/:id` | Nonaktifkan anggota |
| POST | `/api/v1/dues/batch` | Upsert iuran massal |
| POST | `/api/v1/cash-transactions` | Tambah transaksi kas |
| PATCH | `/api/v1/cash-transactions/:id` | Edit transaksi kas |
| DELETE | `/api/v1/cash-transactions/:id` | Hapus transaksi kas |
| POST | `/api/v1/loans` | Tambah pinjaman |
| PATCH | `/api/v1/loans/:id` | Edit pinjaman |
| DELETE | `/api/v1/loans/:id` | Hapus pinjaman dan pembayaran terkait |
| POST | `/api/v1/loans/:id/payments` | Catat angsuran dan auto-lunas |
| POST | `/api/v1/users` | Tambah pengguna |
| PATCH | `/api/v1/users/:id` | Edit pengguna |
| DELETE | `/api/v1/users/:id` | Nonaktifkan pengguna |
| POST | `/api/v1/departments` | Tambah departemen |
| PATCH | `/api/v1/departments/:id` | Edit departemen |
| POST | `/api/v1/funds` | Tambah dana |
| PATCH | `/api/v1/funds/:id` | Edit dana |
| DELETE | `/api/v1/funds/:id` | Nonaktifkan dana |
| POST | `/api/v1/cash-sources` | Tambah sumber kas |
| PATCH | `/api/v1/cash-sources/:id` | Edit sumber kas |
| DELETE | `/api/v1/cash-sources/:id` | Nonaktifkan sumber kas |
| POST | `/api/v1/contribution-rates` | Tambah tarif iuran |
| PATCH | `/api/v1/contribution-rates/:id` | Edit tarif iuran |
| POST | `/api/v1/demo/reset` | Reset PostgreSQL ke seed demo |

## Query Parameters

### `GET /api/v1/members`

- `search`
- `departmentId`
- `employeeType`: `Bulanan | Harian | Mixed | Unknown | all`
- `status`: `active | inactive | all`

### `GET /api/v1/dues`

- `period`: `YYYY-MM-01`
- `fundId`
- `departmentId`
- `paymentStatus`: `paid | unpaid | all`

### `GET /api/v1/cash-transactions`

- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`
- `fundId`
- `direction`: `inflow | outflow | all`
- `category`

### `GET /api/v1/loans`

- `status`: `active | paid | cancelled | all`
- `cashSourceId`
- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`

### `GET /api/v1/reports/summary`

- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`

## Write Endpoints To Add Next

Prioritas berikutnya:

1. Mapping isi sheet XLSX ke payload ledger terstruktur
2. Commit hasil mapping impor ke tabel ledger
3. Server-side CSV export endpoints for large datasets

## Role Guard

- `super_admin`: semua mutasi, termasuk `/api/v1/users/*` dan `/api/v1/demo/reset`.
- `admin`: mutasi ledger dan master data operasional.
- `viewer`: read-only.

Mutasi tanpa session mengembalikan `401 unauthorized`; session aktif dengan role tidak cukup mengembalikan `403 forbidden`.

## Frontend Migration Plan

1. Keep `KoperasiStoreProvider` as compatibility layer.
2. Use API client functions under `lib/api-client.ts`.
3. Current frontend migration:
   - Bootstrap store -> `/api/v1/bootstrap`
   - Members create/update/deactivate -> backend API
   - Member notes -> backend API
   - Cash create/update/delete -> backend API
   - Dues save all -> `/api/v1/dues/batch`
   - Loans create/update/delete/payment -> `/api/v1/loans/*`
   - Dashboard summary -> `/api/v1/reports/summary`
   - Reports monthly summary -> `/api/v1/reports/summary`
   - Settings users/departments/funds/cash-sources/contribution-rates -> backend API
   - Demo reset -> `/api/v1/demo/reset`
   - Login/logout -> `/api/v1/auth/*`
   - API mutation auth guard dan role enforcement
   - UI permission hints berdasarkan role session aktif
   - Import preview/commit batch -> `/api/v1/import-batches/*`
4. Next frontend migration:
   - CSV export -> optional server-side export endpoint for large datasets
   - Mapping XLSX detail -> backend parser endpoints
5. Remove localStorage only after auth and offline strategy are stable.

## PostgreSQL Setup

Local database URL:

```txt
postgresql://koperasi:koperasi@127.0.0.1:55432/koperasi_ledger?schema=public
```

Commands:

```bash
docker compose up -d postgres
npm run db:generate
npm run db:push
npm run db:seed
```

Current Prisma status:

- `prisma/schema.prisma` maps tables to snake_case names.
- Initial migration SQL is available at `prisma/migrations/0001_init/migration.sql`.
- Demo seed command is available through `npm run db:seed`.
- Prisma Client is exposed from `lib/prisma.ts`.
- Existing read/write API routes use Prisma/PostgreSQL for core ledger workflows.
- Demo reset API is available at `/api/v1/demo/reset`.
