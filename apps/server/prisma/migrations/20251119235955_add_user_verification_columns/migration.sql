ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verification_photo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_submitted_at" TIMESTAMPTZ;
