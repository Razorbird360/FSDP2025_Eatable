const normalizeTagLabel = (label) => {
  if (!label || typeof label !== "string") return "";
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "");
};

const CONFLICT_GROUPS = [
  {
    positive: ["worth the money", "great value", "value for money"],
    negative: ["not worth it", "overpriced", "poor value"],
  },
  {
    positive: ["generous fillings", "big portion", "large portion", "huge serving"],
    negative: ["small portion", "tiny portion", "skimpy fillings"],
  },
  {
    positive: ["fresh", "fresh ingredients"],
    negative: ["stale", "not fresh"],
  },
];

export const resolveTagConflicts = (
  tagAggs = [],
  totalUploads = 0,
  maxTags = 3,
  options = {}
) => {
  const captionAggs = Array.isArray(options.captionAggs)
    ? options.captionAggs
    : [];
  const captionWeight =
    typeof options.captionWeight === "number" ? options.captionWeight : 1;
  const stats = new Map();
  const captionStats = new Map();

  captionAggs.forEach((agg) => {
    const label = agg?.label;
    if (!label) return;
    const normalized = normalizeTagLabel(label);
    if (!normalized) return;
    const count = typeof agg.count === "number" ? agg.count : 0;
    const avgConfidence =
      typeof agg.avgConfidence === "number" ? agg.avgConfidence : 0;
    captionStats.set(normalized, {
      label,
      normalized,
      count,
      avgConfidence,
    });
  });

  tagAggs.forEach((agg) => {
    const label = agg.tag?.displayLabel || agg.tag?.normalized;
    if (!label) return;
    const normalized = normalizeTagLabel(label);
    if (!normalized) return;
    const count = typeof agg.count === "number" ? agg.count : 0;
    const avgConfidence =
      typeof agg.avgConfidence === "number" ? agg.avgConfidence : 0;
    const captionCount = captionStats.get(normalized)?.count ?? 0;
    const weightedCount = count + captionCount * captionWeight;
    const score = weightedCount * avgConfidence;
    const share =
      totalUploads > 0 ? count / totalUploads : count > 0 ? 1 : 0;
    const reliabilityBase =
      avgConfidence > 0 ? avgConfidence : Math.min(Math.max(share, 0), 1);
    stats.set(normalized, {
      label,
      normalized,
      count,
      avgConfidence,
      score,
      share,
      weightedCount,
      reliabilityPercent: Math.round(
        Math.min(Math.max(reliabilityBase, 0), 1) * 100
      ),
    });
  });

  captionStats.forEach((captionTag, normalized) => {
    if (stats.has(normalized)) return;
    const count = captionTag.count;
    const avgConfidence = captionTag.avgConfidence;
    const weightedCount = count + count * captionWeight;
    const score = weightedCount * avgConfidence;
    const share =
      totalUploads > 0 ? count / totalUploads : count > 0 ? 1 : 0;
    const reliabilityBase =
      avgConfidence > 0 ? avgConfidence : Math.min(Math.max(share, 0), 1);
    stats.set(normalized, {
      label: captionTag.label,
      normalized,
      count,
      avgConfidence,
      score,
      share,
      weightedCount,
      reliabilityPercent: Math.round(
        Math.min(Math.max(reliabilityBase, 0), 1) * 100
      ),
    });
  });

  const picked = new Map(stats);

  CONFLICT_GROUPS.forEach((group) => {
    const positives = group.positive
      .map((label) => picked.get(normalizeTagLabel(label)))
      .filter(Boolean);
    const negatives = group.negative
      .map((label) => picked.get(normalizeTagLabel(label)))
      .filter(Boolean);

    if (positives.length === 0 && negatives.length === 0) return;

    const posScore = positives.reduce(
      (sum, tag) => sum + (tag.weightedCount ?? tag.count) * tag.avgConfidence,
      0
    );
    const negScore = negatives.reduce(
      (sum, tag) => sum + (tag.weightedCount ?? tag.count) * tag.avgConfidence,
      0
    );
    const posCount = positives.reduce((sum, tag) => sum + tag.count, 0);
    const negCount = negatives.reduce((sum, tag) => sum + tag.count, 0);
    const shareBase = totalUploads > 0 ? totalUploads : posCount + negCount;
    const posShare = shareBase > 0 ? posCount / shareBase : 0;
    const negShare = shareBase > 0 ? negCount / shareBase : 0;

    let winnerType = posScore >= negScore ? "positive" : "negative";
    if (negShare >= 0.5 && negCount >= 3) {
      winnerType = "negative";
    } else {
      winnerType = "positive";
    }

    const winnerPool = winnerType === "positive" ? positives : negatives;
    const winner = winnerPool.sort(
      (a, b) =>
        (b.weightedCount ?? b.count) * b.avgConfidence -
        (a.weightedCount ?? a.count) * a.avgConfidence
    )[0];

    const reliabilityPercent =
      shareBase > 0
        ? Math.round((winnerType === "positive" ? posShare : negShare) * 100)
        : 0;

    [...positives, ...negatives].forEach((tag) => {
      picked.delete(tag.normalized);
    });

    if (winner) {
      picked.set(winner.normalized, {
        ...winner,
        reliabilityPercent,
      });
    }
  });

  return Array.from(picked.values())
    .sort(
      (a, b) =>
        (b.weightedCount ?? b.count) * b.avgConfidence -
          (a.weightedCount ?? a.count) * a.avgConfidence ||
        b.reliabilityPercent - a.reliabilityPercent ||
        b.count - a.count
    )
    .slice(0, maxTags)
    .map((tag) => ({
      label: tag.label,
      reliabilityPercent: tag.reliabilityPercent,
    }));
};
