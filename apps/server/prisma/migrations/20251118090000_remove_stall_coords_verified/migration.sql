-- Drop unused location columns from stalls
ALTER TABLE "stalls"
  DROP COLUMN IF EXISTS "latitude",
  DROP COLUMN IF EXISTS "longitude",
  DROP COLUMN IF EXISTS "is_verified";
