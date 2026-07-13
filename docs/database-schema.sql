-- Initial PostgreSQL schema draft for Koperasi Ledger.
-- The executable Prisma migration lives in prisma/migrations/0001_init/migration.sql.

create table users (
  id varchar(64) primary key,
  name varchar(160) not null,
  email varchar(190) not null unique,
  role varchar(32) not null,
  is_active boolean not null default true,
  password_hash varchar(255),
  last_login_at timestamp,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table departments (
  id varchar(64) primary key,
  name varchar(120) not null unique,
  is_active boolean not null default true,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table members (
  id varchar(64) primary key,
  member_no varchar(64) unique,
  name varchar(180) not null,
  normalized_name varchar(180) not null,
  department_id varchar(64) references departments(id),
  employee_type varchar(32) not null,
  status varchar(32) not null,
  joined_at date,
  note text,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table funds (
  id varchar(64) primary key,
  code varchar(80) not null unique,
  name varchar(140) not null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table cash_sources (
  id varchar(64) primary key,
  name varchar(140) not null,
  is_active boolean not null default true,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table contribution_rates (
  id varchar(64) primary key,
  fund_id varchar(64) not null references funds(id),
  employee_type varchar(32) not null,
  amount_idr integer not null check (amount_idr >= 0),
  effective_from date not null,
  effective_to date,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table member_contributions (
  id varchar(64) primary key,
  member_id varchar(64) not null references members(id),
  fund_id varchar(64) not null references funds(id),
  period_month date not null,
  amount_idr integer not null check (amount_idr >= 0),
  note text,
  created_at timestamp not null,
  updated_at timestamp not null,
  unique (member_id, fund_id, period_month)
);

create table cash_transactions (
  id varchar(64) primary key,
  transaction_date date not null,
  direction varchar(16) not null,
  fund_id varchar(64) references funds(id),
  member_id varchar(64) references members(id),
  counterparty_name varchar(180),
  category varchar(120) not null,
  amount_idr integer not null check (amount_idr > 0),
  note text,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table loans (
  id varchar(64) primary key,
  member_id varchar(64) references members(id),
  counterparty_name varchar(180),
  cash_source_id varchar(64) not null references cash_sources(id),
  principal_amount_idr integer not null check (principal_amount_idr > 0),
  paid_amount_idr integer not null default 0 check (paid_amount_idr >= 0),
  remaining_amount_idr integer not null check (remaining_amount_idr >= 0),
  loan_date date not null,
  status varchar(32) not null,
  note text,
  created_at timestamp not null,
  updated_at timestamp not null
);

create table loan_payments (
  id varchar(64) primary key,
  loan_id varchar(64) not null references loans(id),
  payment_date date not null,
  amount_idr integer not null check (amount_idr > 0),
  note text,
  created_at timestamp not null
);

create table import_batches (
  id varchar(64) primary key,
  file_name varchar(255) not null,
  original_file_name varchar(255) not null,
  status varchar(32) not null,
  summary_json jsonb,
  created_at timestamp not null,
  committed_at timestamp
);

create table audit_logs (
  id varchar(64) primary key,
  user_id varchar(64) references users(id),
  user_name varchar(160) not null,
  action varchar(80) not null,
  entity_type varchar(80) not null,
  entity_id varchar(64),
  ip_address varchar(64),
  created_at timestamp not null
);

create index idx_members_department on members(department_id);
create index idx_members_status on members(status);
create index idx_contributions_period on member_contributions(period_month);
create index idx_cash_transactions_date on cash_transactions(transaction_date);
create index idx_cash_transactions_fund on cash_transactions(fund_id);
create index idx_loans_status on loans(status);
create index idx_loans_member on loans(member_id);
create index idx_audit_logs_created_at on audit_logs(created_at);
