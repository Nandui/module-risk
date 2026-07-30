-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "hazard_category" AS ENUM ('Physical', 'Chemical', 'Biological', 'Ergonomic', 'Psychosocial', 'Environmental');

-- CreateEnum
CREATE TYPE "person_at_risk" AS ENUM ('Staff', 'Customers', 'Children', 'Contractors', 'Visitors');

-- CreateEnum
CREATE TYPE "assessment_status" AS ENUM ('draft', 'in_review', 'signed_off', 'archived');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('assessor', 'manager', 'hs_lead');

-- CreateEnum
CREATE TYPE "library_review_state" AS ENUM ('approved', 'pending_review', 'rejected');

-- CreateTable
CREATE TABLE "profile" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'assessor',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centre" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "centre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centre_member" (
    "centre_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,

    CONSTRAINT "centre_member_pkey" PRIMARY KEY ("centre_id","profile_id")
);

-- CreateTable
CREATE TABLE "hazard" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "category" "hazard_category" NOT NULL,
    "guidance" TEXT,
    "review_state" "library_review_state" NOT NULL DEFAULT 'approved',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_measure" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "category" "hazard_category" NOT NULL,
    "review_state" "library_review_state" NOT NULL DEFAULT 'approved',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "hazard_category" NOT NULL,
    "hazard_ids" UUID[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "centre_id" UUID NOT NULL,
    "template_id" UUID,
    "title" TEXT NOT NULL,
    "status" "assessment_status" NOT NULL DEFAULT 'draft',
    "assessor_id" UUID,
    "reviewed_by" UUID,
    "review_frequency_months" INTEGER NOT NULL DEFAULT 12,
    "review_due_at" TIMESTAMPTZ(6),
    "signed_off_at" TIMESTAMPTZ(6),
    "signed_off_by" UUID,
    "scope_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "hazard_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "likelihood" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "control_measure_ids" UUID[],
    "residual_likelihood" INTEGER NOT NULL,
    "residual_severity" INTEGER NOT NULL,
    "persons_at_risk" "person_at_risk"[],
    "notes" TEXT,
    "photo_ids" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action" (
    "id" UUID NOT NULL,
    "finding_id" UUID NOT NULL,
    "centre_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "owner_id" UUID,
    "due_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "closed_by" UUID,
    "closure_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "centre_id" UUID NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_email_key" ON "profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "centre_code_key" ON "centre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hazard_label_category_key" ON "hazard"("label", "category");

-- CreateIndex
CREATE UNIQUE INDEX "control_measure_label_key" ON "control_measure"("label");

-- CreateIndex
CREATE UNIQUE INDEX "template_name_key" ON "template"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_reference_key" ON "assessment"("reference");

-- CreateIndex
CREATE INDEX "assessment_centre_id_idx" ON "assessment"("centre_id");

-- CreateIndex
CREATE INDEX "assessment_status_idx" ON "assessment"("status");

-- CreateIndex
CREATE INDEX "assessment_review_due_at_idx" ON "assessment"("review_due_at");

-- CreateIndex
CREATE INDEX "assessment_assessor_id_idx" ON "assessment"("assessor_id");

-- CreateIndex
CREATE INDEX "finding_assessment_id_idx" ON "finding"("assessment_id");

-- CreateIndex
CREATE INDEX "finding_hazard_id_idx" ON "finding"("hazard_id");

-- CreateIndex
CREATE UNIQUE INDEX "finding_assessment_id_hazard_id_key" ON "finding"("assessment_id", "hazard_id");

-- CreateIndex
CREATE INDEX "action_centre_id_idx" ON "action"("centre_id");

-- CreateIndex
CREATE INDEX "action_finding_id_idx" ON "action"("finding_id");

-- CreateIndex
CREATE INDEX "revision_assessment_id_revision_no_idx" ON "revision"("assessment_id", "revision_no");

-- CreateIndex
CREATE UNIQUE INDEX "revision_assessment_id_revision_no_key" ON "revision"("assessment_id", "revision_no");

-- AddForeignKey
ALTER TABLE "centre_member" ADD CONSTRAINT "centre_member_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centre_member" ADD CONSTRAINT "centre_member_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard" ADD CONSTRAINT "hazard_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_measure" ADD CONSTRAINT "control_measure_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_signed_off_by_fkey" FOREIGN KEY ("signed_off_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding" ADD CONSTRAINT "finding_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding" ADD CONSTRAINT "finding_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "hazard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action" ADD CONSTRAINT "action_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

