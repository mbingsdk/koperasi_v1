# PRD Koperasi Web App

## 1. Nama Produk

Nama sementara: **Koperasi Ledger**

Alternatif nama:

* KopData
* Koperasi Manager
* Buku Kas Koperasi
* SDK Koperasi System
* Ledger Koperasi

## 2. Ringkasan Produk

Koperasi Ledger adalah aplikasi web untuk mengelola data koperasi yang sebelumnya dikerjakan lewat Excel. Aplikasi ini dibuat untuk menyederhanakan pekerjaan admin koperasi, terutama dalam mencatat iuran bulanan, dana hibah, serikat, pengeluaran, pencairan koperasi, dan pinjaman anggota.

Fokus utama produk ini bukan membuat Excel versi browser, tetapi membuat **buku kas digital koperasi** yang mudah dipahami, mudah diinput, dan tetap punya struktur data yang rapi di belakang.

## 3. Latar Belakang

Saat ini data koperasi dikelola dengan file Excel yang memiliki beberapa sheet utama:

1. `Koperasi`
2. `Dahib`
3. `Serikat`
4. `Pengeluaran`
5. `pinjaman kop`

Masalah utama dari format Excel saat ini:

* Data iuran dibuat melebar berdasarkan bulan.
* Setiap tahun atau bulan baru harus menambah kolom baru.
* Total bergantung pada rumus Excel.
* Nama anggota bisa berulang atau tidak konsisten.
* Data transaksi dan anggota belum benar-benar terpisah.
* Sulit melihat riwayat satu anggota secara cepat.
* Sulit audit siapa yang mengubah data.
* Risiko salah input besar.
* Sulit membuat laporan bulanan otomatis.
* Pengguna baru bisa bingung karena tampilan Excel terlalu padat.

Karena itu, sistem baru harus memisahkan data menjadi:

* Anggota
* Departemen
* Jenis dana
* Iuran bulanan
* Transaksi kas
* Pinjaman
* Pembayaran pinjaman
* Laporan
* Import Excel
* Audit log

## 4. Tujuan Produk

Tujuan utama aplikasi:

1. Mengubah pengelolaan koperasi dari Excel manual menjadi sistem web.
2. Membuat input iuran lebih mudah.
3. Membuat catatan pengeluaran dan pinjaman lebih rapi.
4. Membuat laporan otomatis.
5. Memudahkan pencarian riwayat anggota.
6. Meminimalkan salah input.
7. Menyediakan import data lama dari Excel.
8. Menyediakan export laporan ke Excel.
9. Menyediakan sistem role user.
10. Menyediakan audit log untuk perubahan penting.

## 5. Non-Goals

Fitur yang tidak dikerjakan pada MVP awal:

* Aplikasi mobile native.
* Payment gateway.
* Integrasi bank otomatis.
* Notifikasi WhatsApp.
* Akuntansi lengkap seperti software akuntansi profesional.
* Multi-cabang kompleks.
* Approval bertingkat.
* Slip digital anggota.
* Tanda tangan digital.
* OCR nota.
* Integrasi payroll.

Fitur tersebut bisa dikerjakan setelah versi dasar stabil.

## 6. Target Pengguna

### 6.1 Super Admin

Pengguna dengan akses tertinggi.

Akses:

* Kelola user.
* Import Excel.
* Kelola anggota.
* Kelola iuran.
* Kelola transaksi.
* Kelola pinjaman.
* Lihat laporan.
* Export laporan.
* Lihat audit log.
* Kelola pengaturan sistem.

### 6.2 Admin Koperasi

Pengguna operasional harian.

Akses:

* Kelola anggota.
* Input iuran.
* Catat pengeluaran.
* Catat pencairan.
* Catat pinjaman.
* Catat pembayaran pinjaman.
* Lihat laporan.
* Export laporan.

Tidak bisa:

* Kelola user.
* Hapus permanen data.
* Mengubah audit log.

### 6.3 Viewer

Pengguna baca saja.

Akses:

* Lihat dashboard.
* Lihat data anggota.
* Lihat laporan.
* Export laporan jika diizinkan.

Tidak bisa:

* Input data.
* Edit data.
* Hapus data.
* Import Excel.

## 7. Prinsip UI/UX

Aplikasi ini tidak dibuat seperti dashboard enterprise yang penuh grafik dan menu. Aplikasi dibuat seperti **buku kas digital**.

Prinsip utama UI:

1. Satu halaman untuk satu pekerjaan utama.
2. Menu sedikit.
3. Input dibuat bertahap.
4. Fitur lanjutan disembunyikan di pengaturan atau halaman detail.
5. Admin tidak dipaksa melihat tabel besar dari awal.
6. Tabel besar hanya untuk melihat data, bukan wajib untuk input utama.
7. Tampilan harus nyaman untuk orang yang terbiasa Excel, tapi tidak meniru semua keribetan Excel.
8. Aksi utama harus terlihat jelas.

Menu utama MVP:

```txt
Dashboard
Anggota
Input Iuran
Kas
Pinjaman
Laporan
Import Excel
```

Menu pengaturan:

```txt
User
Departemen
Nominal Iuran
Jenis Dana
Sumber Cash
Audit Log
```

## 8. Modul Produk

# 8.1 Dashboard

## Deskripsi

Dashboard adalah halaman ringkasan. Tujuannya bukan memamerkan grafik banyak, tapi membantu admin tahu kondisi kas dengan cepat.

## Komponen

Kartu ringkasan:

* Saldo Koperasi
* Saldo Dana Hibah
* Saldo Serikat
* Total Pinjaman Aktif
* Total Pengeluaran Bulan Ini
* Anggota Belum Bayar Bulan Ini

Aksi cepat:

* Input Iuran Bulan Ini
* Catat Pengeluaran
* Catat Pinjaman
* Lihat Laporan

Daftar ringkas:

* Transaksi terakhir
* Pinjaman terbaru
* Anggota yang belum bayar

## Filter

* Bulan
* Tahun

## Acceptance Criteria

* Admin bisa melihat ringkasan utama di satu layar.
* Dashboard tidak boleh terlalu ramai.
* Dashboard menampilkan angka dari database, bukan angka manual.
* Dashboard berubah otomatis setelah data baru masuk.

# 8.2 Anggota

## Deskripsi

Modul untuk mengelola data anggota koperasi.

## Field

* Nomor anggota, opsional
* Nama
* Nama normalisasi
* Departemen
* Type anggota
* Status
* Tanggal bergabung
* Catatan

## Type Anggota

* Bulanan
* Harian
* Mixed
* Unknown

## Status

* Aktif
* Nonaktif

## Fitur

* Tambah anggota.
* Edit anggota.
* Nonaktifkan anggota.
* Cari anggota.
* Filter departemen.
* Filter status.
* Filter type.
* Lihat detail anggota.
* Lihat riwayat iuran.
* Lihat riwayat pinjaman.
* Lihat riwayat transaksi anggota.

## Tampilan halaman

```txt
Anggota

Cari nama anggota...
Filter: Departemen | Type | Status

Nama            Departemen       Type       Status
Abdul Rahman    Produksi         Bulanan    Aktif
Agus            Gudang           Harian     Aktif
Sitti           Office           Mixed      Nonaktif
```

## Detail anggota

Tab detail:

* Ringkasan
* Iuran
* Pinjaman
* Transaksi
* Catatan

## Acceptance Criteria

* Admin bisa mencari anggota.
* Anggota tidak dihapus permanen jika sudah punya transaksi.
* Nama anggota yang sama tetap bisa dibedakan dengan departemen/type/nomor anggota.
* Anggota nonaktif tetap muncul di laporan lama.

# 8.3 Input Iuran

## Deskripsi

Modul ini menggantikan sheet:

* `Koperasi`
* `Dahib`
* `Serikat`

Namun UI tidak langsung dibuat seperti spreadsheet tahunan. MVP memakai input sederhana per bulan.

## Alur input

```txt
1. Pilih bulan
2. Pilih jenis dana
3. Pilih departemen, opsional
4. Sistem tampilkan daftar anggota
5. Admin isi nominal
6. Admin klik Simpan Semua
```

## Jenis Dana

* Koperasi
* Dana Hibah
* Serikat

## Tampilan

```txt
Input Iuran

Bulan: April 2026
Jenis Dana: Koperasi
Departemen: Semua

Cari anggota...

Abdul Rahman       Rp 50.000
Agus               Rp 50.000
Sitti              Rp 50.000
Irfan              Rp 0

[ Simpan Semua ]
```

## Fitur

* Input per bulan.
* Input per jenis dana.
* Bulk save.
* Auto-format Rupiah.
* Nominal 0 diperbolehkan untuk belum bayar.
* Catatan per anggota.
* Filter departemen.
* Filter type.
* Search nama anggota.
* Copy nominal default ke semua anggota.
* Tandai belum bayar.
* Lihat histori iuran anggota.

## Fitur ditunda

* Matrix tahunan full edit.
* Keyboard navigation seperti Excel.
* Paste dari Excel.
* Cell formula.
* Editable grid kompleks.

## Acceptance Criteria

* Admin bisa input iuran satu bulan tanpa melihat seluruh tahun.
* Admin bisa menyimpan banyak anggota dalam satu tombol.
* Sistem mencegah nominal negatif.
* Sistem mencegah duplikat data iuran pada anggota, dana, dan bulan yang sama.
* Data hasil import Excel lama tetap bisa ditampilkan.

# 8.4 Kas

## Deskripsi

Modul Kas adalah buku kas digital untuk mencatat uang masuk dan uang keluar.

Modul ini menggantikan sebagian besar sheet `Pengeluaran`.

## Jenis transaksi

* Uang Masuk
* Uang Keluar

## Kategori transaksi

* Pengeluaran Koperasi
* Dana Hibah
* Serikat
* Lainnya
* Pencairan Koperasi
* Koreksi Saldo
* Pinjaman Koperasi
* Pembayaran Pinjaman

## Tampilan

```txt
Kas

[ + Catat Uang Masuk ]
[ + Catat Uang Keluar ]

Tanggal       Jenis          Kategori              Nama        Nominal
12/04/2026    Keluar         Dana Hibah             Agus        Rp 100.000
13/04/2026    Keluar         Pengeluaran Koperasi   -           Rp 250.000
14/04/2026    Keluar         Pencairan Koperasi     Sitti       Rp 500.000
```

## Field transaksi

* Tanggal
* Arah transaksi
* Jenis dana
* Kategori
* Anggota, opsional
* Nama pihak terkait, opsional
* Nominal
* Keterangan
* Bukti transaksi, opsional

## Acceptance Criteria

* Admin bisa mencatat uang masuk.
* Admin bisa mencatat uang keluar.
* Transaksi bisa difilter berdasarkan tanggal.
* Transaksi bisa difilter berdasarkan dana.
* Transaksi bisa difilter berdasarkan kategori.
* Transaksi tidak boleh bernilai negatif.
* Transaksi yang sudah dibuat bisa diedit dengan audit log.
* Transaksi penting tidak dihapus permanen, hanya soft delete.

# 8.5 Pinjaman

## Deskripsi

Modul untuk mengelola pinjaman koperasi anggota.

Sumber data awal dari sheet `pinjaman kop`.

## Sumber cash awal

* Cash Jeni
* Cash Kak Idha

## Field pinjaman

* Anggota
* Nama pihak terkait
* Sumber cash
* Tanggal pinjaman
* Nominal pokok
* Total dibayar
* Sisa pinjaman
* Status
* Keterangan

## Status pinjaman

* Aktif
* Lunas
* Dibatalkan

## Fitur

* Tambah pinjaman.
* Edit pinjaman.
* Catat pembayaran.
* Lihat sisa pinjaman.
* Tandai otomatis lunas jika sisa 0.
* Filter status.
* Filter sumber cash.
* Filter anggota.
* Export laporan pinjaman.

## Tampilan

```txt
Pinjaman

[ + Tambah Pinjaman ]

Nama            Sumber Cash      Pokok          Dibayar        Sisa          Status
Abdul Rahman    Cash Jeni        Rp 1.500.000   Rp 500.000     Rp 1.000.000  Aktif
Agus            Cash Kak Idha    Rp 800.000     Rp 800.000     Rp 0          Lunas
```

## Acceptance Criteria

* Sistem menghitung sisa pinjaman otomatis.
* Pembayaran tidak boleh lebih kecil atau sama dengan 0.
* Pinjaman otomatis berubah menjadi lunas jika sisa pinjaman 0.
* Admin bisa melihat semua pembayaran per pinjaman.
* Pinjaman yang dibatalkan tidak ikut hitungan aktif.

# 8.6 Laporan

## Deskripsi

Laporan dibuat sederhana. Admin memilih jenis laporan dan periode.

## Jenis laporan MVP

* Laporan Bulanan
* Laporan Anggota
* Laporan Koperasi
* Laporan Dana Hibah
* Laporan Serikat
* Laporan Pinjaman
* Laporan Pengeluaran
* Laporan Tunggakan Iuran

## Tampilan

```txt
Laporan

Pilih Laporan:
[ Laporan Bulanan ]

Periode:
Dari: 01/04/2026
Sampai: 30/04/2026

[ Tampilkan ]
[ Export Excel ]
```

## Fitur

* Filter periode.
* Filter dana.
* Filter departemen.
* Filter anggota.
* Export Excel.
* Print view sederhana.

## Acceptance Criteria

* Admin bisa membuat laporan tanpa rumus manual.
* Total laporan harus konsisten dengan data transaksi.
* Laporan bisa diexport ke Excel.
* Viewer bisa melihat laporan tanpa edit data.

# 8.7 Import Excel

## Deskripsi

Modul untuk memasukkan data lama dari Excel ke database.

## Sheet yang didukung

* `Koperasi`
* `Dahib`
* `Serikat`
* `Pengeluaran`
* `pinjaman kop`

## Alur import sederhana

```txt
1. Upload file Excel
2. Sistem membaca sheet
3. Sistem menampilkan ringkasan
4. Sistem menampilkan warning/error
5. Admin review
6. Admin commit import
7. Data masuk ke database
```

## Ringkasan import

* Jumlah sheet terdeteksi
* Jumlah anggota terdeteksi
* Jumlah iuran terdeteksi
* Jumlah transaksi terdeteksi
* Jumlah pinjaman terdeteksi
* Jumlah warning
* Jumlah error

## Validasi

* File harus `.xlsx`.
* Sheet harus dikenali.
* Nama anggota wajib ada.
* Tanggal wajib valid untuk transaksi.
* Nominal harus angka.
* Baris total tidak boleh ikut masuk.
* Data kosong dilewati.
* Nama duplikat diberi warning.
* Error berat mencegah commit.
* Warning tidak selalu mencegah commit.

## Mapping sheet iuran

Sheet `Koperasi`, `Dahib`, dan `Serikat` masuk ke tabel `member_contributions`.

Mapping:

```txt
Koperasi -> fund koperasi
Dahib    -> fund dana_hibah
Serikat  -> fund serikat
```

Kolom:

```txt
NAMA       -> members.name
DEPARTEMEN -> departments.name
Type       -> members.employee_type
Bulan      -> member_contributions.period_month
Nominal    -> member_contributions.amount_idr
```

## Mapping sheet Pengeluaran

Sheet `Pengeluaran` masuk ke `cash_transactions`.

Kolom:

```txt
Tanggal             -> transaction_date
Nama                -> member/counterparty
Pinjaman Koperasi   -> kategori pinjaman
Dana Hibah          -> dana_hibah
Serikat             -> serikat
Lainnya             -> lainnya
Pencairan Koperasi  -> pencairan koperasi
Keterangan          -> note
```

## Mapping sheet pinjaman kop

Sheet `pinjaman kop` masuk ke `loans`.

Kolom:

```txt
Tanggal                         -> loan_date
Nama                            -> member/counterparty
Pinjaman Koperasi Cash Jeni     -> cash_source Cash Jeni
Pinjaman Koperasi Cash Kak Idha -> cash_source Cash Kak Idha
Keterangan                      -> note
```

## Acceptance Criteria

* Admin bisa upload Excel.
* Admin bisa lihat preview import.
* Admin bisa lihat error/warning.
* Admin bisa commit import.
* Data import memiliki `import_batch_id`.
* Import bisa diaudit.
* Jika format Excel berubah, sistem memberi error yang jelas.

# 8.8 Pengaturan

## Deskripsi

Halaman pengaturan disembunyikan dari menu utama agar UI tidak ramai.

## Submenu

* User
* Departemen
* Jenis Dana
* Nominal Iuran
* Sumber Cash
* Audit Log

## Acceptance Criteria

* Super Admin bisa mengelola user.
* Admin bisa mengelola departemen jika diberi akses.
* Jenis dana bawaan tidak boleh dihapus jika sudah punya transaksi.
* Audit log hanya bisa dilihat Super Admin.

## 9. Struktur Database

## 9.1 Prinsip Database

1. Jangan menyimpan bulan sebagai kolom.
2. Simpan nominal uang sebagai `BIGINT amount_idr`.
3. Gunakan UUID sebagai primary key.
4. Gunakan soft delete untuk data penting.
5. Gunakan foreign key untuk menjaga relasi.
6. Semua import memiliki batch ID.
7. Semua mutation penting masuk audit log.
8. Iuran unik berdasarkan anggota + dana + periode.
9. Pinjaman dan pembayaran dipisah.
10. Transaksi kas menjadi sumber laporan.

## 9.2 Schema SQL Draft

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_no TEXT UNIQUE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    department_id UUID REFERENCES departments(id),
    employee_type TEXT NOT NULL DEFAULT 'Unknown'
        CHECK (employee_type IN ('Bulanan', 'Harian', 'Mixed', 'Unknown')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    joined_at DATE,
    note TEXT,
    source_import_batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_members_name ON members(normalized_name);
CREATE INDEX idx_members_department ON members(department_id);
CREATE INDEX idx_members_status ON members(status);

CREATE TABLE funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO funds (code, name, is_system) VALUES
('koperasi', 'Koperasi', TRUE),
('dana_hibah', 'Dana Hibah', TRUE),
('serikat', 'Serikat', TRUE);

CREATE TABLE contribution_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID NOT NULL REFERENCES funds(id),
    employee_type TEXT NOT NULL CHECK (employee_type IN ('Bulanan', 'Harian', 'Mixed', 'Unknown')),
    amount_idr BIGINT NOT NULL CHECK (amount_idr >= 0),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'previewed', 'committed', 'failed', 'cancelled')),
    summary_json JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMPTZ
);

CREATE TABLE import_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    sheet_name TEXT,
    row_number INT,
    column_name TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
    message TEXT NOT NULL,
    raw_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE member_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    fund_id UUID NOT NULL REFERENCES funds(id),
    period_month DATE NOT NULL,
    amount_idr BIGINT NOT NULL CHECK (amount_idr >= 0),
    note TEXT,
    import_batch_id UUID REFERENCES import_batches(id),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, fund_id, period_month)
);

CREATE INDEX idx_contributions_member ON member_contributions(member_id);
CREATE INDEX idx_contributions_fund_period ON member_contributions(fund_id, period_month);
CREATE INDEX idx_contributions_period ON member_contributions(period_month);

CREATE TABLE cash_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cash_sources (name) VALUES
('Cash Jeni'),
('Cash Kak Idha');

CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow')),
    fund_id UUID REFERENCES funds(id),
    member_id UUID REFERENCES members(id),
    counterparty_name TEXT,
    category TEXT NOT NULL,
    amount_idr BIGINT NOT NULL CHECK (amount_idr > 0),
    note TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'import', 'loan', 'loan_payment', 'contribution', 'adjustment')),
    source_id UUID,
    import_batch_id UUID REFERENCES import_batches(id),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX idx_cash_transactions_fund ON cash_transactions(fund_id);
CREATE INDEX idx_cash_transactions_member ON cash_transactions(member_id);
CREATE INDEX idx_cash_transactions_direction ON cash_transactions(direction);
CREATE INDEX idx_cash_transactions_category ON cash_transactions(category);

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id),
    counterparty_name TEXT,
    cash_source_id UUID REFERENCES cash_sources(id),
    principal_amount_idr BIGINT NOT NULL CHECK (principal_amount_idr > 0),
    loan_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paid', 'cancelled')),
    note TEXT,
    import_batch_id UUID REFERENCES import_batches(id),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_cash_source ON loans(cash_source_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_date ON loans(loan_date);

CREATE TABLE loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    payment_date DATE NOT NULL,
    amount_idr BIGINT NOT NULL CHECK (amount_idr > 0),
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX idx_loan_payments_date ON loan_payments(payment_date);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    before_json JSONB,
    after_json JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## 9.3 View untuk laporan pinjaman

```sql
CREATE VIEW loan_summaries AS
SELECT
    l.id AS loan_id,
    l.member_id,
    l.counterparty_name,
    l.cash_source_id,
    l.principal_amount_idr,
    COALESCE(SUM(lp.amount_idr) FILTER (WHERE lp.deleted_at IS NULL), 0) AS paid_amount_idr,
    l.principal_amount_idr - COALESCE(SUM(lp.amount_idr) FILTER (WHERE lp.deleted_at IS NULL), 0) AS remaining_amount_idr,
    l.status,
    l.loan_date
FROM loans l
LEFT JOIN loan_payments lp ON lp.loan_id = l.id
WHERE l.deleted_at IS NULL
GROUP BY l.id;
```

## 9.4 View saldo dana

```sql
CREATE VIEW fund_balances AS
SELECT
    f.id AS fund_id,
    f.code,
    f.name,
    COALESCE(SUM(CASE WHEN ct.direction = 'inflow' THEN ct.amount_idr ELSE 0 END), 0) AS total_inflow,
    COALESCE(SUM(CASE WHEN ct.direction = 'outflow' THEN ct.amount_idr ELSE 0 END), 0) AS total_outflow,
    COALESCE(SUM(CASE WHEN ct.direction = 'inflow' THEN ct.amount_idr ELSE -ct.amount_idr END), 0) AS balance
FROM funds f
LEFT JOIN cash_transactions ct ON ct.fund_id = f.id AND ct.deleted_at IS NULL
GROUP BY f.id, f.code, f.name;
```

## 10. API Design

Base URL:

```txt
/api/v1
```

Format response sukses:

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": null
}
```

Format response error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "fields": {
      "amount_idr": "Nominal wajib diisi"
    }
  }
}
```

## 10.1 Auth API

### POST `/auth/login`

Login user.

Request:

```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "super_admin"
    }
  }
}
```

### POST `/auth/logout`

Logout user.

Response:

```json
{
  "success": true,
  "message": "Berhasil logout"
}
```

### GET `/auth/me`

Ambil user aktif.

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "super_admin"
  }
}
```

## 10.2 Users API

### GET `/users`

Query:

```txt
q
role
is_active
page
limit
```

### POST `/users`

Request:

```json
{
  "name": "Bendahara",
  "email": "bendahara@example.com",
  "password": "secret",
  "role": "admin"
}
```

### GET `/users/{id}`

Detail user.

### PATCH `/users/{id}`

Request:

```json
{
  "name": "Bendahara Utama",
  "role": "viewer",
  "is_active": true
}
```

### DELETE `/users/{id}`

Nonaktifkan user.

## 10.3 Departments API

### GET `/departments`

Ambil daftar departemen.

### POST `/departments`

Request:

```json
{
  "name": "Produksi"
}
```

### PATCH `/departments/{id}`

Request:

```json
{
  "name": "Produksi Pipa"
}
```

### DELETE `/departments/{id}`

Hapus departemen jika belum dipakai.

## 10.4 Members API

### GET `/members`

Query:

```txt
q
department_id
employee_type
status
page
limit
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "member_no": "KOP-0001",
      "name": "Abdul Rahman",
      "department": {
        "id": "uuid",
        "name": "Produksi"
      },
      "employee_type": "Bulanan",
      "status": "active"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120
  }
}
```

### POST `/members`

Request:

```json
{
  "member_no": "KOP-0001",
  "name": "Abdul Rahman",
  "department_id": "uuid",
  "employee_type": "Bulanan",
  "joined_at": "2021-06-01",
  "note": ""
}
```

### GET `/members/{id}`

Detail anggota.

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "member_no": "KOP-0001",
    "name": "Abdul Rahman",
    "department": {
      "id": "uuid",
      "name": "Produksi"
    },
    "employee_type": "Bulanan",
    "status": "active",
    "joined_at": "2021-06-01",
    "note": "",
    "summary": {
      "total_koperasi": 500000,
      "total_dana_hibah": 100000,
      "total_serikat": 20000,
      "active_loan_total": 1000000
    }
  }
}
```

### PATCH `/members/{id}`

Edit anggota.

### DELETE `/members/{id}`

Soft delete anggota.

### GET `/members/{id}/contributions`

Riwayat iuran anggota.

Query:

```txt
fund_id
from
to
```

### GET `/members/{id}/loans`

Riwayat pinjaman anggota.

### GET `/members/{id}/transactions`

Riwayat transaksi anggota.

## 10.5 Funds API

### GET `/funds`

Ambil daftar dana.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "koperasi",
      "name": "Koperasi"
    },
    {
      "id": "uuid",
      "code": "dana_hibah",
      "name": "Dana Hibah"
    },
    {
      "id": "uuid",
      "code": "serikat",
      "name": "Serikat"
    }
  ]
}
```

### POST `/funds`

Tambah jenis dana baru.

Request:

```json
{
  "code": "lainnya",
  "name": "Dana Lainnya",
  "description": ""
}
```

### PATCH `/funds/{id}`

Edit jenis dana.

## 10.6 Contribution Rates API

### GET `/contribution-rates`

Query:

```txt
fund_id
employee_type
active_only
```

### POST `/contribution-rates`

Request:

```json
{
  "fund_id": "uuid",
  "employee_type": "Bulanan",
  "amount_idr": 50000,
  "effective_from": "2026-01-01"
}
```

### PATCH `/contribution-rates/{id}`

Request:

```json
{
  "amount_idr": 60000,
  "effective_to": null
}
```

## 10.7 Contributions API

### GET `/contributions/monthly`

Untuk halaman Input Iuran.

Query:

```txt
fund_id
period_month
department_id
employee_type
q
```

Contoh:

```txt
GET /api/v1/contributions/monthly?fund_id=uuid&period_month=2026-04-01
```

Response:

```json
{
  "success": true,
  "data": {
    "period_month": "2026-04-01",
    "fund": {
      "id": "uuid",
      "name": "Koperasi"
    },
    "items": [
      {
        "member_id": "uuid",
        "member_name": "Abdul Rahman",
        "department_name": "Produksi",
        "employee_type": "Bulanan",
        "contribution_id": "uuid",
        "amount_idr": 50000,
        "note": ""
      }
    ]
  }
}
```

### POST `/contributions/bulk-upsert`

Simpan banyak iuran sekaligus.

Request:

```json
{
  "fund_id": "uuid",
  "period_month": "2026-04-01",
  "items": [
    {
      "member_id": "uuid",
      "amount_idr": 50000,
      "note": ""
    },
    {
      "member_id": "uuid",
      "amount_idr": 0,
      "note": "Belum bayar"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "created": 10,
    "updated": 25,
    "skipped": 2
  }
}
```

### GET `/contributions/summary`

Ringkasan iuran.

Query:

```txt
fund_id
period_month
department_id
```

Response:

```json
{
  "success": true,
  "data": {
    "expected_members": 120,
    "paid_members": 110,
    "unpaid_members": 10,
    "total_amount_idr": 5500000
  }
}
```

### GET `/contributions/matrix`

Opsional untuk MVP 2.

Query:

```txt
fund_id
year
department_id
```

## 10.8 Cash Transactions API

### GET `/cash-transactions`

Query:

```txt
from
to
direction
fund_id
category
member_id
q
page
limit
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transaction_date": "2026-04-12",
      "direction": "outflow",
      "fund": {
        "id": "uuid",
        "name": "Dana Hibah"
      },
      "category": "Dana Hibah",
      "member_name": "Agus",
      "counterparty_name": "Agus",
      "amount_idr": 100000,
      "note": "Bantuan"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### POST `/cash-transactions`

Request:

```json
{
  "transaction_date": "2026-04-12",
  "direction": "outflow",
  "fund_id": "uuid",
  "member_id": "uuid",
  "counterparty_name": "Agus",
  "category": "Dana Hibah",
  "amount_idr": 100000,
  "note": "Bantuan"
}
```

### GET `/cash-transactions/{id}`

Detail transaksi.

### PATCH `/cash-transactions/{id}`

Edit transaksi.

### DELETE `/cash-transactions/{id}`

Soft delete transaksi.

## 10.9 Cash Sources API

### GET `/cash-sources`

Ambil daftar sumber cash.

### POST `/cash-sources`

Request:

```json
{
  "name": "Cash Jeni",
  "description": ""
}
```

### PATCH `/cash-sources/{id}`

Edit sumber cash.

### DELETE `/cash-sources/{id}`

Nonaktifkan sumber cash.

## 10.10 Loans API

### GET `/loans`

Query:

```txt
q
member_id
status
cash_source_id
from
to
page
limit
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "member_name": "Abdul Rahman",
      "cash_source_name": "Cash Jeni",
      "principal_amount_idr": 1500000,
      "paid_amount_idr": 500000,
      "remaining_amount_idr": 1000000,
      "loan_date": "2026-04-01",
      "status": "active"
    }
  ]
}
```

### POST `/loans`

Request:

```json
{
  "member_id": "uuid",
  "counterparty_name": "Abdul Rahman",
  "cash_source_id": "uuid",
  "principal_amount_idr": 1500000,
  "loan_date": "2026-04-01",
  "note": ""
}
```

### GET `/loans/{id}`

Detail pinjaman.

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "member": {
      "id": "uuid",
      "name": "Abdul Rahman"
    },
    "cash_source": {
      "id": "uuid",
      "name": "Cash Jeni"
    },
    "principal_amount_idr": 1500000,
    "paid_amount_idr": 500000,
    "remaining_amount_idr": 1000000,
    "loan_date": "2026-04-01",
    "status": "active",
    "payments": [
      {
        "id": "uuid",
        "payment_date": "2026-05-01",
        "amount_idr": 500000,
        "note": "Cicilan pertama"
      }
    ]
  }
}
```

### PATCH `/loans/{id}`

Edit pinjaman.

### DELETE `/loans/{id}`

Batalkan atau soft delete pinjaman.

### POST `/loans/{id}/payments`

Tambah pembayaran pinjaman.

Request:

```json
{
  "payment_date": "2026-05-01",
  "amount_idr": 500000,
  "note": "Cicilan pertama"
}
```

### DELETE `/loan-payments/{id}`

Soft delete pembayaran pinjaman.

## 10.11 Import API

### POST `/imports/excel`

Upload Excel.

Content-Type:

```txt
multipart/form-data
```

Field:

```txt
file
```

Response:

```json
{
  "success": true,
  "data": {
    "import_batch_id": "uuid",
    "status": "uploaded"
  }
}
```

### POST `/imports/{id}/preview`

Baca file dan tampilkan preview.

Response:

```json
{
  "success": true,
  "data": {
    "summary": {
      "sheets_detected": [
        "Koperasi",
        "Dahib",
        "Serikat",
        "Pengeluaran",
        "pinjaman kop"
      ],
      "members_detected": 363,
      "contributions_detected": 14000,
      "transactions_detected": 540,
      "loans_detected": 190,
      "warnings": 12,
      "errors": 0
    },
    "warnings": [],
    "errors": []
  }
}
```

### POST `/imports/{id}/commit`

Commit hasil import.

Response:

```json
{
  "success": true,
  "data": {
    "members_created": 300,
    "members_updated": 63,
    "contributions_created": 14000,
    "transactions_created": 540,
    "loans_created": 190
  }
}
```

### GET `/imports`

Histori import.

### GET `/imports/{id}`

Detail import.

### GET `/imports/{id}/errors`

Daftar error/warning import.

### POST `/imports/{id}/cancel`

Batalkan import sebelum commit.

## 10.12 Reports API

### GET `/reports/dashboard`

Query:

```txt
month
year
```

Response:

```json
{
  "success": true,
  "data": {
    "period": "2026-04",
    "balances": {
      "koperasi": 20000000,
      "dana_hibah": 5000000,
      "serikat": 3000000
    },
    "loans": {
      "active_total": 50000000,
      "paid_this_month": 10000000
    },
    "contributions": {
      "paid_members": 110,
      "unpaid_members": 10
    },
    "expense_this_month": 2500000
  }
}
```

### GET `/reports/monthly`

Laporan bulanan.

Query:

```txt
month
year
department_id
```

### GET `/reports/members/{id}`

Laporan detail anggota.

Query:

```txt
from
to
```

### GET `/reports/funds/{fund_code}`

Laporan dana tertentu.

Contoh:

```txt
GET /api/v1/reports/funds/koperasi?from=2026-01-01&to=2026-04-30
```

### GET `/reports/loans`

Laporan pinjaman.

Query:

```txt
status
cash_source_id
from
to
```

### GET `/reports/expenses`

Laporan pengeluaran.

Query:

```txt
from
to
fund_id
category
```

### GET `/reports/arrears`

Laporan tunggakan iuran.

Query:

```txt
fund_id
period_month
department_id
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "member_id": "uuid",
      "member_name": "Abdul Rahman",
      "department_name": "Produksi",
      "employee_type": "Bulanan",
      "expected_amount_idr": 50000,
      "paid_amount_idr": 0
    }
  ]
}
```

### GET `/reports/export`

Export laporan ke Excel.

Query:

```txt
type
from
to
fund_id
department_id
member_id
```

Contoh:

```txt
GET /api/v1/reports/export?type=monthly&from=2026-04-01&to=2026-04-30
```

## 10.13 Audit Logs API

### GET `/audit-logs`

Query:

```txt
user_id
action
entity_type
from
to
page
limit
```

Hanya Super Admin.

## 11. Frontend Pages

## 11.1 Auth

```txt
/login
```

## 11.2 Main App

```txt
/dashboard
/members
/members/[id]
/contributions
/cash
/loans
/loans/[id]
/reports
/imports
/imports/[id]
```

## 11.3 Settings

```txt
/settings
/settings/users
/settings/departments
/settings/funds
/settings/contribution-rates
/settings/cash-sources
/settings/audit-logs
```

## 12. Struktur Folder Project

```txt
koperasi-ledger/
  apps/
    web/
      app/
        login/
        dashboard/
        members/
        contributions/
        cash/
        loans/
        reports/
        imports/
        settings/
      components/
        ui/
        layout/
        forms/
        tables/
      features/
        auth/
        members/
        contributions/
        cash/
        loans/
        reports/
        imports/
      lib/
        api.ts
        format.ts
        auth.ts
      package.json

    api/
      cmd/
        api/
          main.go
      internal/
        auth/
        users/
        members/
        departments/
        funds/
        contributions/
        cash/
        loans/
        imports/
        reports/
        audit/
        database/
        middleware/
        response/
        validation/
      migrations/
      queries/
      docs/
      go.mod

  docs/
    PRD.md
    DATABASE.md
    API.md
    IMPORT_MAPPING.md
```

## 13. Backend Architecture

Pola backend:

```txt
handler -> service -> repository -> database
```

## Handler

Tugas:

* Menerima request.
* Decode JSON.
* Validasi input dasar.
* Memanggil service.
* Mengirim response.

## Service

Tugas:

* Business logic.
* Validasi aturan koperasi.
* Mengatur database transaction.
* Membuat audit log.
* Menghubungkan beberapa repository.

## Repository

Tugas:

* Query database.
* Insert/update/delete.
* Mapping row database ke struct Go.

## 14. Business Rules

1. Nominal tidak boleh negatif.
2. Nominal uang disimpan dalam Rupiah sebagai integer.
3. Iuran boleh 0 untuk menandai belum bayar.
4. Transaksi kas tidak boleh 0.
5. Pinjaman tidak boleh 0.
6. Pembayaran pinjaman tidak boleh 0.
7. Pembayaran pinjaman tidak boleh membuat sisa pinjaman negatif kecuali Super Admin mengizinkan koreksi.
8. Anggota yang sudah punya transaksi tidak boleh dihapus permanen.
9. Data penting memakai soft delete.
10. Import Excel wajib preview dulu sebelum commit.
11. Commit import harus atomic.
12. Jika commit import gagal, semua data import harus rollback.
13. Semua perubahan penting harus masuk audit log.
14. User viewer tidak boleh melakukan mutation.
15. Dana sistem seperti Koperasi, Dana Hibah, dan Serikat tidak boleh dihapus jika sudah dipakai.
16. Baris total dari Excel harus dilewati saat import.
17. Nama anggota duplikat harus diberi warning.
18. Tanggal Excel harus dikonversi dengan benar.
19. Semua endpoint list harus punya pagination jika data bisa besar.
20. Export laporan harus mengikuti filter yang dipilih user.

## 15. Security Requirements

## 15.1 Auth

* Login menggunakan email dan password.
* Password disimpan dalam bentuk hash.
* Session disimpan di server.
* Cookie harus HTTP-only.
* Logout harus revoke session.
* Session memiliki expired time.

## 15.2 Authorization

Role matrix:

| Fitur               | Super Admin | Admin | Viewer   |
| ------------------- | ----------- | ----- | -------- |
| Dashboard           | Ya          | Ya    | Ya       |
| Lihat Anggota       | Ya          | Ya    | Ya       |
| Tambah/Edit Anggota | Ya          | Ya    | Tidak    |
| Input Iuran         | Ya          | Ya    | Tidak    |
| Catat Kas           | Ya          | Ya    | Tidak    |
| Kelola Pinjaman     | Ya          | Ya    | Tidak    |
| Import Excel        | Ya          | Ya    | Tidak    |
| Laporan             | Ya          | Ya    | Ya       |
| Export Laporan      | Ya          | Ya    | Opsional |
| Kelola User         | Ya          | Tidak | Tidak    |
| Audit Log           | Ya          | Tidak | Tidak    |

## 15.3 Audit

Audit log dibuat untuk:

* Login
* Logout
* Tambah anggota
* Edit anggota
* Nonaktifkan anggota
* Input iuran
* Edit iuran
* Tambah transaksi kas
* Edit transaksi kas
* Hapus transaksi kas
* Tambah pinjaman
* Edit pinjaman
* Hapus pinjaman
* Tambah pembayaran pinjaman
* Hapus pembayaran pinjaman
* Upload import
* Commit import
* Export laporan
* Tambah user
* Edit user
* Nonaktifkan user

## 16. Import Algorithm

## 16.1 Import Sheet Iuran

Sheet:

* Koperasi
* Dahib
* Serikat

Pseudo flow:

```txt
For each sheet in [Koperasi, Dahib, Serikat]:
  Determine fund by sheet name

  Read header rows
  Detect member columns:
    - name
    - department
    - employee type

  Detect month columns

  For each data row:
    If row is empty: skip
    If row is total row: skip

    Normalize member name
    Upsert department
    Find or create member using:
      normalized_name + department + employee_type

    For each month column:
      Read amount
      If amount empty: skip or set 0 based on config
      If amount valid:
        Upsert member_contribution
```

## 16.2 Import Sheet Pengeluaran

```txt
For each row in Pengeluaran:
  If row is total row: skip

  Read date
  Read name
  Match member by normalized name

  For each money column:
    If amount > 0:
      Create cash_transaction
```

## 16.3 Import Sheet Pinjaman

```txt
For each row in pinjaman kop:
  If row is total row: skip

  Read date
  Read name
  Match member by normalized name

  For each cash source column:
    If amount > 0:
      Create loan
      Create cash_transaction with source_type = loan
```

## 17. MVP Roadmap

## Sprint 1: Foundation

Deliverables:

* Setup monorepo.
* Setup Next.js.
* Setup Go API.
* Setup PostgreSQL.
* Setup migrations.
* Setup auth.
* Login/logout.
* Seed Super Admin.
* Basic layout.
* Dashboard kosong.

## Sprint 2: Master Data

Deliverables:

* Departments CRUD.
* Members CRUD.
* Funds seed.
* Cash sources seed.
* Contribution rates.
* Role middleware.

## Sprint 3: Import Excel

Deliverables:

* Upload Excel.
* Preview import.
* Import error log.
* Import anggota.
* Import iuran.
* Import pengeluaran.
* Import pinjaman.
* Commit import.
* Rollback on error.

## Sprint 4: Input Iuran

Deliverables:

* Halaman Input Iuran.
* Filter bulan.
* Filter dana.
* Filter departemen.
* Bulk upsert.
* Ringkasan belum bayar.
* Riwayat iuran anggota.

## Sprint 5: Kas

Deliverables:

* Halaman Kas.
* Tambah uang masuk.
* Tambah uang keluar.
* Edit transaksi.
* Soft delete transaksi.
* Filter kas.
* Ringkasan kas.

## Sprint 6: Pinjaman

Deliverables:

* Halaman Pinjaman.
* Tambah pinjaman.
* Detail pinjaman.
* Catat pembayaran.
* Hitung sisa otomatis.
* Status lunas otomatis.
* Filter pinjaman.

## Sprint 7: Laporan

Deliverables:

* Dashboard summary.
* Laporan bulanan.
* Laporan anggota.
* Laporan dana.
* Laporan pinjaman.
* Laporan pengeluaran.
* Laporan tunggakan.
* Export Excel.

## Sprint 8: Audit dan Production

Deliverables:

* Audit log.
* Permission hardening.
* Backup guide.
* Deployment guide.
* Error handling.
* Logging.
* Final polish UI.

## 18. Acceptance Criteria MVP

MVP selesai jika:

1. Super Admin bisa login.
2. Admin bisa import Excel lama.
3. Admin bisa preview import sebelum commit.
4. Data anggota hasil import muncul.
5. Data iuran koperasi/dana hibah/serikat hasil import muncul.
6. Admin bisa input iuran bulanan.
7. Admin bisa catat transaksi kas.
8. Admin bisa catat pinjaman.
9. Admin bisa catat pembayaran pinjaman.
10. Dashboard menampilkan saldo utama.
11. Laporan bulanan bisa dibuka.
12. Laporan anggota bisa dibuka.
13. Laporan pinjaman bisa dibuka.
14. Laporan bisa diexport ke Excel.
15. Viewer tidak bisa edit data.
16. Semua perubahan penting masuk audit log.
17. Data penting tidak hilang permanen saat dihapus dari UI.

## 19. Prioritas Fitur

## Must Have

* Login
* Role user
* Data anggota
* Import Excel
* Input iuran bulanan
* Kas
* Pinjaman
* Laporan
* Export Excel
* Audit log

## Should Have

* Ringkasan belum bayar
* Detail riwayat anggota
* Upload bukti transaksi
* Soft delete
* Import warning/error detail

## Could Have

* Matrix iuran tahunan
* Paste dari Excel
* Print laporan
* Approval transaksi
* Backup otomatis
* Notifikasi WhatsApp

## Won’t Have di MVP

* Payment gateway
* Mobile app native
* OCR nota
* Integrasi bank
* Akuntansi lengkap
* Multi-koperasi kompleks

## 20. Technical Stack

## Frontend

* Next.js App Router
* TypeScript
* Tailwind CSS
* TanStack Query
* React Hook Form
* Zod
* TanStack Table

## Backend

* Go
* chi atau Gin
* PostgreSQL
* sqlc atau pgx
* golang-migrate
* Excelize
* bcrypt atau argon2 untuk password hash
* Secure cookie session

## Database

* PostgreSQL
* UUID primary key
* BIGINT untuk nominal Rupiah
* JSONB untuk audit/import summary
* Foreign key untuk relasi penting

## 21. Design Direction Final

Desain final MVP:

```txt
Sederhana
Cepat
Tidak banyak menu
Tidak banyak grafik
Input bertahap
Buku kas digital
Bukan ERP
Bukan Excel 2.0
```

Kalimat arah produk:

> Sistem ini harus terasa seperti buku kas koperasi digital yang punya laporan otomatis, bukan dashboard rumit yang memaksa admin belajar sistem baru dari nol.

## 22. Definisi Selesai

Satu fitur dianggap selesai jika:

1. API selesai.
2. UI selesai.
3. Validasi backend selesai.
4. Role permission aktif.
5. Error state ada.
6. Loading state ada.
7. Empty state ada.
8. Audit log dibuat untuk mutation penting.
9. Data masuk database dengan benar.
10. Minimal testing service utama dibuat.
11. Dokumentasi endpoint diperbarui.
