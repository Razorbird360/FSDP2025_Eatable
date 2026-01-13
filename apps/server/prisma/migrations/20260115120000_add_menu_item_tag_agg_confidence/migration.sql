ALTER TABLE "menu_item_tag_aggs"
ADD COLUMN "avg_confidence" DOUBLE PRECISION;

UPDATE "menu_item_tag_aggs" AS agg
SET "avg_confidence" = stats.avg_confidence
FROM (
  SELECT
    mu."menu_item_id" AS menu_item_id,
    ut."tag_id" AS tag_id,
    AVG(ut."confidence") AS avg_confidence
  FROM "upload_tags" ut
  JOIN "media_uploads" mu ON mu."id" = ut."upload_id"
  GROUP BY mu."menu_item_id", ut."tag_id"
) AS stats
WHERE agg."menu_item_id" = stats.menu_item_id
  AND agg."tag_id" = stats.tag_id;
