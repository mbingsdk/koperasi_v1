# Koperasi Ledger

Buku kas digital koperasi dengan pengalaman **mobile-first ledger modern**. Frontend sudah responsif dari HP sampai desktop besar, dan backend awal sudah tersambung ke PostgreSQL via Prisma untuk workflow ledger utama.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3
- IBM Plex Sans + IBM Plex Mono (via Google Fonts)
- Frontend state: `useReducer` dengan bootstrap PostgreSQL dan fallback `localStorage`
- Backend: Next API routes + Prisma + PostgreSQL
- Auth: cookie session HTTP-only untuk login demo PostgreSQL
- Permission UI: tombol mutasi mengikuti role session aktif
- Import parser: `exceljs` untuk membaca dan memetakan workbook Excel di API

## Getting Started

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Login demo:

```txt
Super admin: admin@koperasi.local / password
Admin ledger: bendahara@koperasi.local / password
```

## Frontend Scope

- Dashboard aksi harian: catat iuran, kas masuk, kas keluar, pinjaman baru, summary dari API PostgreSQL.
- Anggota: directory mobile, tambah/edit/nonaktifkan, catatan internal, detail profil, write ke PostgreSQL.
- Iuran: input massal, isi tarif default, catatan, simpan batch ke PostgreSQL.
- Buku Kas: transaksi masuk/keluar, saldo berjalan, edit/hapus ke PostgreSQL.
- Pinjaman: tambah pinjaman, catat angsuran ke PostgreSQL, validasi tidak melebihi sisa, status lunas otomatis.
- Laporan: laporan bulanan, buku kas, tunggakan, pinjaman, summary API PostgreSQL, ekspor XLSX.
- Import: upload Excel dibaca backend, sheet dihitung, warning parser ditampilkan, preview batch disimpan ke PostgreSQL, lalu commit atomik mengisi anggota, iuran, kas, pinjaman, dan audit log.
- Pengaturan: pengguna, departemen, dana, sumber kas, tarif iuran sudah CRUD ke PostgreSQL; audit log dan reset demo PostgreSQL tersedia.
- Permission hints: viewer mendapat UI read-only; admin bisa mutasi ledger/master data; super admin bisa kelola pengguna dan reset demo.

## Project Structure

```txt
app/
  login/                    Halaman login session PostgreSQL
  (app)/                    Authenticated route group
    layout.tsx              Store provider + app shell
    dashboard/              Ringkasan operasional + aksi harian
    members/                Buku anggota + detail [id]
    dues/                   Input iuran bulanan
    cash/                   Buku kas
    loans/                  Manajemen pinjaman + detail [id]
    reports/                Laporan + ekspor XLSX
    import/                 Wizard impor Excel
    settings/               Indeks pengaturan + master data

components/
  layout/                   AppShell, Sidebar, PageHeader
  ui/                       Field, AmountInput, Drawer, Toast, ConfirmDialog,
                            ResponsiveLedger, EmptyState, MetricCard, Stamp

lib/
  store.tsx                 Local data layer, reducer, hooks, derived reports
  types.ts                  Domain types
  format.ts                 Rupiah / date formatters
  mock-data.ts              Seed demo data
  cn.ts                     Minimal className helper
```

## Design Language

Desain mempertahankan karakter buku kas koperasi Indonesia, tetapi dibuat lebih cepat dipakai di HP.

- Mobile-first: topbar ringkas, bottom nav, drawer sebagai bottom sheet di HP.
- Desktop: sidebar penuh, konten lega, max-width nyaman untuk `1440px+`.
- Tabel ledger tetap dipakai di desktop; di HP berubah menjadi card/list yang mudah disentuh.
- Paper tones (`#FBFAF5` / `#F0EDE2`) untuk rasa buku kerja.
- Aksen merah dipakai sebagai garis pendek halaman dan status risiko, bukan pemisah sidebar.
- IBM Plex Mono untuk angka, kode, saldo, dan nomor anggota.
- Status memakai stamp-style badge.
- Outflow dan sisa pinjaman penting ditandai merah.

## Data Layer

Saat app dibuka, `KoperasiStoreProvider` mengambil bootstrap data dari:

```txt
/api/v1/bootstrap
```

Jika API tidak tersedia, app memakai fallback `localStorage` dengan key:

```txt
koperasi-ledger:v2
```

Entry point store ada di `lib/store.tsx`, sedangkan client API ada di `lib/api-client.ts`:

- `KoperasiStoreProvider`
- `useKoperasiStore()`
- `useMembers()`
- `useDues()`
- `useCashLedger()`
- `useLoans()`
- `useReports()`
- `downloadCsv()` fallback teknis untuk format ringan
- `downloadXlsx()`
- `dashboardMetrics()`

Tombol **Reset data demo** di Pengaturan mengembalikan PostgreSQL ke seed dari `lib/mock-data.ts`, lalu state frontend ikut disegarkan.

## Verification

Jalankan sebelum lanjut backend:

```bash
npm run qa:all
```

Atau jalankan per tahap:

```bash
npm run typecheck
npm run qa:api-import
npm run qa:responsive
npm run build
```

Script QA ini butuh dev server aktif di `http://localhost:3000` dan login demo `admin@koperasi.local / password`. `qa:responsive` juga butuh file contoh `untuk kk mbek*.xlsx` di root repo. Untuk file lain, set `QA_IMPORT_FILES="file1.xlsx;file2.xlsx"`.

Smoke test route utama:

```txt
/dashboard
/members
/dues
/cash
/loans
/reports
/import
/settings
```

Breakpoint manual yang ditargetkan:

```txt
360x800
390x844
430x932
768x1024
1024x768
1280x800
1440x900
1536x960
```

## Frontend Readiness Checklist

- [x] App shell mobile-first dan desktop sidebar.
- [x] Store lokal berbasis reducer dan localStorage.
- [x] CRUD lokal untuk anggota, kas, pinjaman, dan pengaturan utama.
- [x] Input iuran massal dengan tarif default.
- [x] Derived summary untuk dashboard, laporan, saldo, tunggakan, dan pinjaman.
- [x] Audit log lokal untuk aksi penting.
- [x] Toast sukses/error dan dialog konfirmasi.
- [x] XLSX export untuk laporan utama.
- [x] Reset demo data dengan konfirmasi.
- [x] Mobile cards untuk tabel utama.
- [x] Build dan typecheck bersih.
- [x] QA responsive import otomatis untuk 360 sampai 1536px.
- [x] UI permission hints berdasarkan role session aktif.

## Backend Handoff Notes

Backend sudah dimulai. Sisa migrasi dari reducer/localStorage ke API dilakukan bertahap:

- Role enforcement endpoint API sudah aktif untuk mutasi data.
- API transaksi: members, dues, cash ledger, loans, dan loan payments sudah tersambung dari frontend.
- API reports summary sudah tersambung; export XLSX server-side bisa ditambahkan bila file besar.
- API import parser untuk Excel, mapping baris domain, dan commit batch ke tabel ledger.

Types di `lib/types.ts` sudah bisa dijadikan kontrak awal response API.

## API Foundation

Fondasi API awal sudah tersedia dan endpoint utama sudah membaca/menulis PostgreSQL via Prisma:

```txt
/api/v1/health
/api/v1/auth/login            POST login + set cookie session
/api/v1/auth/me               GET user session aktif
/api/v1/auth/logout           POST clear cookie session
/api/v1/bootstrap              PostgreSQL
/api/v1/import-batches/preview POST preview batch impor Excel
/api/v1/import-batches/maintenance DELETE cleanup preview lama
/api/v1/import-batches/:id     DELETE cleanup satu preview
/api/v1/import-batches/:id/commit/simulate POST simulasi commit read-only
/api/v1/import-batches/:id/commit POST commit batch impor
/api/v1/members                GET, POST
/api/v1/members/:id            GET, PATCH, DELETE soft-deactivate
/api/v1/dues                   PostgreSQL
/api/v1/dues/batch             POST upsert batch
/api/v1/cash-transactions      GET, POST
/api/v1/cash-transactions/:id  PATCH, DELETE
/api/v1/loans                  GET, POST
/api/v1/loans/:id              PATCH, DELETE
/api/v1/loans/:id/payments     POST
/api/v1/reports/summary        PostgreSQL
/api/v1/users                  POST
/api/v1/users/:id              PATCH, DELETE soft-deactivate
/api/v1/departments            POST
/api/v1/departments/:id        PATCH
/api/v1/funds                  POST
/api/v1/funds/:id              PATCH, DELETE soft-deactivate
/api/v1/cash-sources           POST
/api/v1/cash-sources/:id       PATCH, DELETE soft-deactivate
/api/v1/contribution-rates     POST
/api/v1/contribution-rates/:id PATCH
/api/v1/demo/reset              POST reset PostgreSQL ke seed demo
```

Role guard API:

- `super_admin`: akses semua mutasi, termasuk manajemen pengguna dan reset demo.
- `admin`: mutasi ledger dan master data operasional.
- `viewer`: baca data saja.

Frontend workflow utama sudah membaca/menulis PostgreSQL lewat API. `localStorage` dipertahankan sebagai fallback kompatibilitas sementara sampai strategi offline dan auth final stabil.

Catatan import: parser XLSX membaca sheet, membuat warning header/nominal, memetakan baris domain utama, menyimpan ringkasan/grup duplikat per baris, menandai konflik dengan data PostgreSQL, menyediakan ekspor XLSX hasil review, mendukung opsi auto-skip duplikat saat preview, lalu commit batch menulis data ke anggota, iuran, buku kas, dan pinjaman dalam satu transaksi database.

Dokumen lanjutan:

- `docs/backend-contract.md`
- `docs/database-schema.sql`

## PostgreSQL + Prisma

Backend database diarahkan ke PostgreSQL dengan Prisma.

File penting:

```txt
prisma/schema.prisma
docker-compose.yml
.env.example
lib/prisma.ts
```

Jalankan Postgres lokal:

```bash
docker compose up -d postgres
```

Generate Prisma Client:

```bash
npm run db:generate
```

Push schema ke PostgreSQL lokal:

```bash
npm run db:push
```

Isi data demo awal:

```bash
npm run db:seed
```

Jika `db:push` bermasalah di mesin lokal, migration SQL awal juga tersedia di:

```txt
prisma/migrations/0001_init/migration.sql
```
