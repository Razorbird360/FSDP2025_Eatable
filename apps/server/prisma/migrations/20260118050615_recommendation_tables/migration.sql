-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "anon_id" TEXT,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "item_id" UUID NOT NULL,
    "category_id" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_stats_daily" (
    "date" DATE NOT NULL,
    "item_id" UUID NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "adds" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "item_stats_daily_pkey" PRIMARY KEY ("date","item_id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "anon_id" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "category_scores" JSONB NOT NULL,
    "tag_scores" JSONB NOT NULL,
    "recent_items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_pref_min" INTEGER,
    "price_pref_max" INTEGER,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_similarity" (
    "item_id" UUID NOT NULL,
    "similar_item_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "item_similarity_pkey" PRIMARY KEY ("item_id","similar_item_id")
);

-- CreateIndex
CREATE INDEX "events_user_id_timestamp_idx" ON "events"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "events_anon_id_timestamp_idx" ON "events"("anon_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "events_item_id_timestamp_idx" ON "events"("item_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "events_event_type_timestamp_idx" ON "events"("event_type", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_id_key" ON "user_profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_anon_id_key" ON "user_profile"("anon_id");

-- CreateIndex
CREATE INDEX "item_similarity_similar_item_id_idx" ON "item_similarity"("similar_item_id");
