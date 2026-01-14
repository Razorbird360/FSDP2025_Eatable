import prisma from '../lib/prisma.js';
import { aiTaggingService } from './ai-tagging.service.js';

const normalizeTagLabel = (label) => {
  if (typeof label !== 'string') {
    return '';
  }

  const trimmed = label.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const collapsed = trimmed.replace(/\s+/g, ' ');
  return collapsed.replace(/[.,;:!?]+$/g, '').trim();
};

const dedupeTags = (tags = []) => {
  const byNormalized = new Map();

  for (const tag of tags) {
    const label = typeof tag?.label === 'string' ? tag.label.trim() : '';
    const normalized = normalizeTagLabel(label);
    if (!normalized) {
      continue;
    }

    const confidence = typeof tag?.confidence === 'number' ? tag.confidence : 0;
    const evidenceFrom = Array.isArray(tag?.evidence?.from) ? tag.evidence.from : [];
    const entry = {
      label,
      normalized,
      confidence,
      evidenceFrom,
    };

    const existing = byNormalized.get(normalized);
    if (!existing || entry.confidence > existing.confidence) {
      byNormalized.set(normalized, entry);
    }
  }

  return Array.from(byNormalized.values()).sort((a, b) => b.confidence - a.confidence);
};

const rebuildMenuItemTagAggs = async (tx, menuItemId) => {
  const rows = await tx.uploadTag.findMany({
    where: { upload: { menuItemId } },
    select: { tagId: true, createdAt: true, confidence: true },
  });

  const counts = new Map();
  for (const row of rows) {
    const existing = counts.get(row.tagId);
    if (!existing) {
      counts.set(row.tagId, {
        count: 1,
        lastSeenAt: row.createdAt,
        sumConfidence: typeof row.confidence === 'number' ? row.confidence : 0,
      });
    } else {
      existing.count += 1;
      if (typeof row.confidence === 'number') {
        existing.sumConfidence += row.confidence;
      }
      if (row.createdAt > existing.lastSeenAt) {
        existing.lastSeenAt = row.createdAt;
      }
    }
  }

  await tx.menuItemTagAgg.deleteMany({ where: { menuItemId } });

  if (counts.size === 0) {
    return 0;
  }

  const data = Array.from(counts.entries()).map(([tagId, info]) => ({
    menuItemId,
    tagId,
    count: info.count,
    avgConfidence: info.count > 0 ? info.sumConfidence / info.count : 0,
    lastSeenAt: info.lastSeenAt,
  }));

  await tx.menuItemTagAgg.createMany({ data });
  return data.length;
};

export const taggingService = {
  async getMenuItemTagStats(menuItemId, limit = 20) {
    const rows = await prisma.menuItemTagAgg.findMany({
      where: { menuItemId },
      orderBy: { count: 'desc' },
      take: limit,
      include: {
        tag: {
          select: {
            normalized: true,
            displayLabel: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      label: row.tag.displayLabel,
      normalized: row.tag.normalized,
      count: row.count,
      avgConfidence: row.avgConfidence ?? 0,
      reliabilityPercent: Math.round((row.avgConfidence ?? 0) * 100),
    }));
  },

  async generateAndSaveUploadTags({
    uploadId,
    menuItemId,
    imageUrl,
    caption,
    menuItemName,
  }) {
    const previousTagStats = await taggingService.getMenuItemTagStats(menuItemId, 20);
    const aiResult = await aiTaggingService.generateDishTags({
      caption,
      imageUrl,
      previousTagStats,
    });

    if (!aiResult || aiResult.is_food !== true) {
      return { isFood: false, tags: [] };
    }

    const dedupedTags = dedupeTags(aiResult.tags);
    const normalizedDishName = normalizeTagLabel(menuItemName);
    const filteredTags = normalizedDishName
      ? dedupedTags.filter((tag) => tag.normalized !== normalizedDishName)
      : dedupedTags;

    if (filteredTags.length === 0) {
      return { isFood: true, tags: [] };
    }

    const dishLabel = menuItemName ? `"${menuItemName}"` : `menuItemId=${menuItemId}`;
    console.info(
      `[AI TAGGING] Generated tags for ${dishLabel}:`,
      filteredTags.map((tag) => tag.label)
    );

    await prisma.$transaction(async (tx) => {
      for (const tag of filteredTags) {
        const tagRecord = await tx.tag.upsert({
          where: { normalized: tag.normalized },
          update: { displayLabel: tag.label },
          create: {
            normalized: tag.normalized,
            displayLabel: tag.label,
          },
        });

        await tx.uploadTag.create({
          data: {
            uploadId,
            tagId: tagRecord.id,
            confidence: tag.confidence,
            evidenceFrom: tag.evidenceFrom,
          },
        });
      }

      const aggCount = await rebuildMenuItemTagAggs(tx, menuItemId);
      console.info(
        `[AI TAGGING] Rebuilt ${aggCount} menu item tag aggregates for ${dishLabel}`
      );
    });

    console.info(
      `[AI TAGGING] Saved ${filteredTags.length} tags for ${dishLabel} (uploadId=${uploadId})`
    );

    return { isFood: true, tags: filteredTags };
  },
};
