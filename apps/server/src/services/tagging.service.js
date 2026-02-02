import prisma from '../lib/prisma.js';
import { aiTaggingService } from './ai-tagging.service.js';

const TAG_HISTORY_LIMIT = 20;
const HISTORY_SIMILARITY_THRESHOLD = 0.85;
const TOKEN_ALIASES = new Map([
  ['veg', 'vegetables'],
  ['vegs', 'vegetables'],
  ['veggie', 'vegetables'],
  ['veggies', 'vegetables'],
]);
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'with',
  'without',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'to',
  'of',
  'for',
  'in',
  'on',
  'at',
  'by',
  'from',
  'this',
  'that',
  'these',
  'those',
  'very',
  'really',
  'super',
  'quite',
  'just',
  'so',
  'too',
  'its',
  "it's",
]);

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

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripDishNameFromCaption = (caption, dishName) => {
  if (!caption || !dishName) return caption;
  const variants = new Set();
  variants.add(dishName);
  const stripped = dishName.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped) variants.add(stripped);

  let result = caption;
  variants.forEach((variant) => {
    if (!variant) return;
    const pattern = new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'gi');
    result = result.replace(pattern, ' ');
  });

  return result.replace(/\s+/g, ' ').trim();
};

const getDishNameVariants = (name) => {
  if (!name || typeof name !== 'string') return new Set();
  const stripped = name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const variants = new Set();
  const normalizedOriginal = normalizeTagLabel(name);
  const normalizedStripped = normalizeTagLabel(stripped);
  if (normalizedOriginal) variants.add(normalizedOriginal);
  if (normalizedStripped) variants.add(normalizedStripped);
  return variants;
};

const clampConfidence = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const tokenizeForSimilarity = (label) =>
  normalizeTagLabel(label)
    .split(' ')
    .map((token) => TOKEN_ALIASES.get(token) || token)
    .filter((token) => token && !STOPWORDS.has(token));

const isTagDerivedFromDishName = (tagLabel, dishName) => {
  if (!dishName || !tagLabel) return false;
  const dishTokens = new Set(tokenizeForSimilarity(dishName));
  const tagTokens = tokenizeForSimilarity(tagLabel);
  if (tagTokens.length === 0 || dishTokens.size === 0) return false;
  return tagTokens.every((token) => dishTokens.has(token));
};

const getSimilarityScore = (aTokens, bTokens) => {
  if (!aTokens.length || !bTokens.length) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let intersection = 0;
  aSet.forEach((token) => {
    if (bSet.has(token)) intersection += 1;
  });
  const union = aSet.size + bSet.size - intersection;
  return union > 0 ? intersection / union : 0;
};

const areLabelsSimilar = (labelA, labelB) => {
  const normalizedA = normalizeTagLabel(labelA);
  const normalizedB = normalizeTagLabel(labelB);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return true;
  }
  const tokensA = tokenizeForSimilarity(normalizedA);
  const tokensB = tokenizeForSimilarity(normalizedB);
  return getSimilarityScore(tokensA, tokensB) >= HISTORY_SIMILARITY_THRESHOLD;
};

const normalizeHistory = (history = []) => {
  const byNormalized = new Map();
  const merged = [];

  history.forEach((entry) => {
    const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
    const normalized = normalizeTagLabel(label);
    if (!normalized) return;

    const confidence = clampConfidence(
      typeof entry?.confidence === 'number' ? entry.confidence : 0
    );

    const existing = byNormalized.get(normalized);
    if (!existing || confidence > existing.confidence) {
      byNormalized.set(normalized, { label, normalized, confidence });
    }
  });

  const sorted = Array.from(byNormalized.values()).sort(
    (a, b) => b.confidence - a.confidence
  );

  sorted.forEach((entry) => {
    const alreadyMerged = merged.some((existing) =>
      areLabelsSimilar(existing.label, entry.label)
    );
    if (!alreadyMerged) {
      merged.push(entry);
    }
  });

  return merged;
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
    if (!existing) {
      byNormalized.set(normalized, entry);
      continue;
    }

    const hasStrongEvidence = (sources = []) =>
      sources.includes('caption') || sources.includes('image');
    const existingStrong = hasStrongEvidence(existing.evidenceFrom);
    const entryStrong = hasStrongEvidence(entry.evidenceFrom);

    if (entryStrong && !existingStrong) {
      byNormalized.set(normalized, entry);
      continue;
    }

    if (entryStrong === existingStrong && entry.confidence > existing.confidence) {
      byNormalized.set(normalized, entry);
    }
  }

  return Array.from(byNormalized.values()).sort((a, b) => b.confidence - a.confidence);
};

export const taggingService = {
  async getMenuItemTagStats(menuItemId, limit = 20) {
    const rows = await prisma.menuItemTagAgg.findMany({
      where: { menuItemId },
      orderBy: [{ avgConfidence: 'desc' }, { count: 'desc' }],
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
    const rawCaption = typeof caption === 'string' ? caption : '';
    const captionForAi = stripDishNameFromCaption(rawCaption, menuItemName);
    const previousAggRows = await prisma.menuItemTagAgg.findMany({
      where: { menuItemId },
      include: {
        tag: {
          select: {
            normalized: true,
            displayLabel: true,
          },
        },
      },
    });
    const previousTagStats = previousAggRows.map((row) => ({
      label: row.tag.displayLabel,
      normalized: row.tag.normalized,
      count: row.count,
      avgConfidence: row.avgConfidence ?? 0,
    }));
    const aiResult = await aiTaggingService.generateDishTags({
      caption: captionForAi,
      imageUrl,
      previousTagStats,
    });

    if (!aiResult || aiResult.is_food !== true) {
      return { isFood: false, tags: [] };
    }

    const safeCaption = typeof rawCaption === 'string' ? rawCaption.trim() : '';
    console.info('[AI TAGGING] Caption (raw):', safeCaption);
    console.info('[AI TAGGING] Caption (sent):', captionForAi);

    const dedupedTags = dedupeTags(aiResult.tags);
    const dishNameVariants = getDishNameVariants(menuItemName);
    const filteredTags = dishNameVariants.size > 0
      ? dedupedTags.filter((tag) =>
        !dishNameVariants.has(tag.normalized) &&
        !isTagDerivedFromDishName(tag.label, menuItemName)
      )
      : dedupedTags;

    const supportedTags = filteredTags.filter((tag) => {
      const evidenceFrom = tag.evidenceFrom;
      return evidenceFrom.includes('caption');
    });

    const byNormalized = new Map();
    for (const tag of supportedTags) {
      const existing = byNormalized.get(tag.normalized);
      if (!existing || tag.confidence > existing.confidence) {
        byNormalized.set(tag.normalized, tag);
      }
    }
    const finalTags = Array.from(byNormalized.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    const dishLabel = menuItemName ? `"${menuItemName}"` : `menuItemId=${menuItemId}`;
    console.info(
      `[AI TAGGING] Generated tags for ${dishLabel}:`,
      finalTags.map((tag) => tag.label)
    );

    console.info(
      `[AI TAGGING] History sent for ${dishLabel}:`,
      previousTagStats.map((tag) => ({
        label: tag.label,
        avgConfidence: tag.avgConfidence ?? 0,
        count: tag.count ?? 0,
      }))
    );

    const fallbackHistory = previousTagStats.map((entry) => ({
      label: entry.label,
      confidence: entry.avgConfidence ?? 0,
      normalized: entry.normalized,
    }));
    const historyEval = await aiTaggingService.reevaluateHistory({
      caption: captionForAi,
      imageUrl,
      previousTagStats,
      newTags: finalTags.map((tag) => ({
        label: tag.label,
        confidence: clampConfidence(tag.confidence),
        evidence: tag.evidenceFrom,
      })),
    });
    const historyFromAi = Array.isArray(historyEval?.history)
      ? historyEval.history
      : [];
    const previousNormalized = new Set(
      previousTagStats
        .map((tag) => tag.normalized || normalizeTagLabel(tag.label))
        .filter(Boolean)
    );
    const enforcedHistory = historyFromAi.map((tag) => {
      const label = typeof tag?.label === 'string' ? tag.label : '';
      const normalized = normalizeTagLabel(label);
      if (!normalized) return tag;
      if (!previousNormalized.has(normalized)) {
        return { ...tag, confidence: 0.5 };
      }
      return tag;
    });

    console.info(
      `[AI TAGGING] History returned for ${dishLabel}:`,
      historyFromAi.map((tag) => ({
        label: tag.label,
        confidence: clampConfidence(tag.confidence),
      }))
    );
    const historyList = normalizeHistory(
      enforcedHistory.length > 0 ? enforcedHistory : fallbackHistory
    );
    const historyMap = new Map(historyList.map((tag) => [tag.normalized, tag]));
    for (const tag of finalTags) {
      if (!historyMap.has(tag.normalized)) {
        historyMap.set(tag.normalized, {
          label: tag.label,
          normalized: tag.normalized,
          confidence: clampConfidence(tag.confidence),
        });
      }
    }
    if (dishNameVariants.size > 0) {
      dishNameVariants.forEach((variant) => historyMap.delete(variant));
    }
    Array.from(historyMap.values()).forEach((tag) => {
      if (isTagDerivedFromDishName(tag.label, menuItemName)) {
        historyMap.delete(tag.normalized);
      }
    });
    const updatedHistory = Array.from(historyMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, TAG_HISTORY_LIMIT);

    const updatedHistoryMap = new Map(
      updatedHistory.map((tag) => [tag.normalized, tag])
    );
    const normalizedFinalTags = finalTags.map((tag) => ({
      label: tag.label,
      normalized: tag.normalized,
      confidence: clampConfidence(tag.confidence),
    }));

    normalizedFinalTags.forEach((tag) => {
      if (updatedHistoryMap.has(tag.normalized)) {
        return;
      }

      if (updatedHistory.length < TAG_HISTORY_LIMIT) {
        const normalizedTag = previousNormalized.has(tag.normalized)
          ? tag
          : { ...tag, confidence: 0.5 };
        updatedHistory.push(normalizedTag);
        updatedHistoryMap.set(normalizedTag.normalized, normalizedTag);
        return;
      }

      const removable = updatedHistory
        .filter((entry) => !normalizedFinalTags.some((t) => t.normalized === entry.normalized))
        .sort((a, b) => a.confidence - b.confidence)[0];

      if (removable) {
        const index = updatedHistory.findIndex(
          (entry) => entry.normalized === removable.normalized
        );
        if (index >= 0) {
          const normalizedTag = previousNormalized.has(tag.normalized)
            ? tag
            : { ...tag, confidence: 0.5 };
          updatedHistory.splice(index, 1, normalizedTag);
          updatedHistoryMap.delete(removable.normalized);
          updatedHistoryMap.set(normalizedTag.normalized, normalizedTag);
        }
      }
    });

    updatedHistory.sort((a, b) => b.confidence - a.confidence);

    await prisma.$transaction(async (tx) => {
      for (const tag of finalTags) {
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
            confidence: clampConfidence(tag.confidence),
            evidenceFrom: tag.evidenceFrom,
          },
        });
      }

      const existingAggByNormalized = new Map(
        previousAggRows.map((row) => [
          row.tag.normalized,
          { count: row.count ?? 0, lastSeenAt: row.lastSeenAt },
        ])
      );
      const uploadTagSet = new Set(finalTags.map((tag) => tag.normalized));
      const now = new Date();
      const historyRecords = [];

      for (const tag of updatedHistory) {
        const tagRecord = await tx.tag.upsert({
          where: { normalized: tag.normalized },
          update: { displayLabel: tag.label },
          create: {
            normalized: tag.normalized,
            displayLabel: tag.label,
          },
        });

        const existing = existingAggByNormalized.get(tag.normalized);
        const previousCount = existing?.count ?? 0;
        const count = uploadTagSet.has(tag.normalized)
          ? previousCount + 1
          : Math.max(previousCount, 1);
        const lastSeenAt = uploadTagSet.has(tag.normalized)
          ? now
          : existing?.lastSeenAt ?? now;

        historyRecords.push({
          menuItemId,
          tagId: tagRecord.id,
          count,
          avgConfidence: clampConfidence(tag.confidence),
          lastSeenAt,
        });
      }

      await tx.menuItemTagAgg.deleteMany({ where: { menuItemId } });
      if (historyRecords.length > 0) {
        await tx.menuItemTagAgg.createMany({ data: historyRecords });
      }
    });

    console.info(
      `[AI TAGGING] Saved ${finalTags.length} tags for ${dishLabel} (uploadId=${uploadId})`
    );

    return { isFood: true, tags: finalTags };
  },
};
