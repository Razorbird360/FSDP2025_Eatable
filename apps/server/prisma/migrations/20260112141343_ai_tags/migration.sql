-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "normalized" TEXT NOT NULL,
    "display_label" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_tags" (
    "id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence_from" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_tag_aggs" (
    "id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_tag_aggs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_normalized_key" ON "tags"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_tag_aggs_menu_item_id_tag_id_key" ON "menu_item_tag_aggs"("menu_item_id", "tag_id");

-- AddForeignKey
ALTER TABLE "upload_tags" ADD CONSTRAINT "upload_tags_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "media_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_tags" ADD CONSTRAINT "upload_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_tag_aggs" ADD CONSTRAINT "menu_item_tag_aggs_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_tag_aggs" ADD CONSTRAINT "menu_item_tag_aggs_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
