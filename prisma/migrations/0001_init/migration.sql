-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" VARCHAR(255),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."members" (
    "id" VARCHAR(64) NOT NULL,
    "member_no" VARCHAR(64),
    "name" VARCHAR(180) NOT NULL,
    "normalized_name" VARCHAR(180) NOT NULL,
    "department_id" VARCHAR(64),
    "employee_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "joined_at" DATE,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."funds" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_sources" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contribution_rates" (
    "id" VARCHAR(64) NOT NULL,
    "fund_id" VARCHAR(64) NOT NULL,
    "employee_type" VARCHAR(32) NOT NULL,
    "amount_idr" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member_contributions" (
    "id" VARCHAR(64) NOT NULL,
    "member_id" VARCHAR(64) NOT NULL,
    "fund_id" VARCHAR(64) NOT NULL,
    "period_month" DATE NOT NULL,
    "amount_idr" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_transactions" (
    "id" VARCHAR(64) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "direction" VARCHAR(16) NOT NULL,
    "fund_id" VARCHAR(64),
    "member_id" VARCHAR(64),
    "counterparty_name" VARCHAR(180),
    "category" VARCHAR(120) NOT NULL,
    "amount_idr" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loans" (
    "id" VARCHAR(64) NOT NULL,
    "member_id" VARCHAR(64),
    "counterparty_name" VARCHAR(180),
    "cash_source_id" VARCHAR(64) NOT NULL,
    "principal_amount_idr" INTEGER NOT NULL,
    "paid_amount_idr" INTEGER NOT NULL DEFAULT 0,
    "remaining_amount_idr" INTEGER NOT NULL,
    "loan_date" DATE NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loan_payments" (
    "id" VARCHAR(64) NOT NULL,
    "loan_id" VARCHAR(64) NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount_idr" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_batches" (
    "id" VARCHAR(64) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "summary_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committed_at" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64),
    "user_name" VARCHAR(160) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(64),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "public"."departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_no_key" ON "public"."members"("member_no");

-- CreateIndex
CREATE INDEX "members_department_id_idx" ON "public"."members"("department_id");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "public"."members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "funds_code_key" ON "public"."funds"("code");

-- CreateIndex
CREATE INDEX "contribution_rates_fund_id_idx" ON "public"."contribution_rates"("fund_id");

-- CreateIndex
CREATE INDEX "member_contributions_period_month_idx" ON "public"."member_contributions"("period_month");

-- CreateIndex
CREATE INDEX "member_contributions_fund_id_idx" ON "public"."member_contributions"("fund_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_contributions_member_id_fund_id_period_month_key" ON "public"."member_contributions"("member_id", "fund_id", "period_month");

-- CreateIndex
CREATE INDEX "cash_transactions_transaction_date_idx" ON "public"."cash_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "cash_transactions_fund_id_idx" ON "public"."cash_transactions"("fund_id");

-- CreateIndex
CREATE INDEX "cash_transactions_member_id_idx" ON "public"."cash_transactions"("member_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "public"."loans"("status");

-- CreateIndex
CREATE INDEX "loans_member_id_idx" ON "public"."loans"("member_id");

-- CreateIndex
CREATE INDEX "loans_cash_source_id_idx" ON "public"."loans"("cash_source_id");

-- CreateIndex
CREATE INDEX "loan_payments_loan_id_idx" ON "public"."loan_payments"("loan_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contribution_rates" ADD CONSTRAINT "contribution_rates_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_contributions" ADD CONSTRAINT "member_contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_contributions" ADD CONSTRAINT "member_contributions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_transactions" ADD CONSTRAINT "cash_transactions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_transactions" ADD CONSTRAINT "cash_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loans" ADD CONSTRAINT "loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loans" ADD CONSTRAINT "loans_cash_source_id_fkey" FOREIGN KEY ("cash_source_id") REFERENCES "public"."cash_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_payments" ADD CONSTRAINT "loan_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
