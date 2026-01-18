import pkg from '@prisma/client';
import prisma from '../lib/prisma.js';

const { Prisma } = pkg;

const normalizeDate = (value) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export const analyticsJobsService = {
  async rebuildItemStatsDaily({ startDate } = {}) {
    const normalizedStartDate = normalizeDate(startDate);

    if (normalizedStartDate) {
      await prisma.$executeRaw(
        Prisma.sql`DELETE FROM item_stats_daily WHERE date >= ${normalizedStartDate}`
      );
    } else {
      await prisma.$executeRaw(Prisma.sql`TRUNCATE TABLE item_stats_daily`);
    }

    if (normalizedStartDate) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO item_stats_daily (
          date,
          item_id,
          views,
          clicks,
          adds,
          orders,
          ctr,
          conversion,
          updated_at
        )
        SELECT
          DATE(e."timestamp") AS date,
          e.item_id,
          COUNT(*) FILTER (WHERE e.event_type = 'view') AS views,
          COUNT(*) FILTER (WHERE e.event_type = 'click') AS clicks,
          COUNT(*) FILTER (WHERE e.event_type = 'add_to_cart') AS adds,
          COUNT(*) FILTER (WHERE e.event_type = 'order') AS orders,
          CASE
            WHEN COUNT(*) FILTER (WHERE e.event_type = 'view') = 0
            THEN 0
            ELSE COUNT(*) FILTER (WHERE e.event_type = 'click')::float
              / COUNT(*) FILTER (WHERE e.event_type = 'view')
          END AS ctr,
          CASE
            WHEN COUNT(*) FILTER (WHERE e.event_type = 'click') = 0
            THEN 0
            ELSE COUNT(*) FILTER (WHERE e.event_type = 'order')::float
              / COUNT(*) FILTER (WHERE e.event_type = 'click')
          END AS conversion,
          NOW()
        FROM events e
        WHERE e."timestamp" >= ${normalizedStartDate}
        GROUP BY DATE(e."timestamp"), e.item_id
      `);
    } else {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO item_stats_daily (
          date,
          item_id,
          views,
          clicks,
          adds,
          orders,
          ctr,
          conversion,
          updated_at
        )
        SELECT
          DATE(e."timestamp") AS date,
          e.item_id,
          COUNT(*) FILTER (WHERE e.event_type = 'view') AS views,
          COUNT(*) FILTER (WHERE e.event_type = 'click') AS clicks,
          COUNT(*) FILTER (WHERE e.event_type = 'add_to_cart') AS adds,
          COUNT(*) FILTER (WHERE e.event_type = 'order') AS orders,
          CASE
            WHEN COUNT(*) FILTER (WHERE e.event_type = 'view') = 0
            THEN 0
            ELSE COUNT(*) FILTER (WHERE e.event_type = 'click')::float
              / COUNT(*) FILTER (WHERE e.event_type = 'view')
          END AS ctr,
          CASE
            WHEN COUNT(*) FILTER (WHERE e.event_type = 'click') = 0
            THEN 0
            ELSE COUNT(*) FILTER (WHERE e.event_type = 'order')::float
              / COUNT(*) FILTER (WHERE e.event_type = 'click')
          END AS conversion,
          NOW()
        FROM events e
        GROUP BY DATE(e."timestamp"), e.item_id
      `);
    }
  },

  async rebuildItemSimilarity() {
    await prisma.$executeRaw(Prisma.sql`TRUNCATE TABLE item_similarity`);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO item_similarity (
        item_id,
        similar_item_id,
        score,
        updated_at
      )
      SELECT
        oi1.menu_item_id AS item_id,
        oi2.menu_item_id AS similar_item_id,
        COUNT(*)::float AS score,
        NOW()
      FROM order_items oi1
      JOIN order_items oi2
        ON oi1.order_id = oi2.order_id
        AND oi1.menu_item_id <> oi2.menu_item_id
      GROUP BY oi1.menu_item_id, oi2.menu_item_id
    `);
  },
};
