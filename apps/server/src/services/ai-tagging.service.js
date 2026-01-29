import axios from 'axios';
import Joi from 'joi';

const OPENAI_API_URL =
  process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const TAG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_food', 'tags'],
  properties: {
    is_food: { type: 'boolean' },
    tags: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'confidence', 'evidence'],
        properties: {
          label: {
            type: 'string',
            maxLength: 32,
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          evidence: {
            type: 'object',
            additionalProperties: false,
            required: ['from'],
            properties: {
              from: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'string',
                  enum: ['image', 'caption', 'history'],
                },
              },
            },
          },
        },
      },
    },
  },
};

export const HISTORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['history'],
  properties: {
    history: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'confidence'],
        properties: {
          label: {
            type: 'string',
            maxLength: 32,
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
  },
};

const TagEvidenceSchema = Joi.object({
  from: Joi.array()
    .items(Joi.string().valid('image', 'caption', 'history'))
    .min(1)
    .required(),
})
  .required()
  .unknown(false);

const TagSchema = Joi.object({
  label: Joi.string().max(32).required(),
  confidence: Joi.number().min(0).max(1).required(),
  evidence: TagEvidenceSchema.required(),
})
  .required()
  .unknown(false);

const HistoryTagSchema = Joi.object({
  label: Joi.string().max(32).required(),
  confidence: Joi.number().min(0).max(1).required(),
})
  .required()
  .unknown(false);

const TagResponseSchema = Joi.object({
  is_food: Joi.boolean().required(),
  tags: Joi.array().items(TagSchema).max(3).required(),
})
  .required()
  .unknown(false);

const HistoryResponseSchema = Joi.object({
  history: Joi.array().items(HistoryTagSchema).max(20).required(),
})
  .required()
  .unknown(false);

const validateTagResponse = (payload) => {
  const { error, value } = TagResponseSchema.validate(payload, {
    abortEarly: false,
    allowUnknown: false,
  });
  return error ? null : value;
};

const BASE_INSTRUCTIONS = [
  'You are tagging a dish photo for a menu item upload.',
  'Use the caption as the only source for tags.',
  'Do not use the image to generate tags.',
  'Do not infer taste, texture, or vibe from the image alone.',
  'Avoid generic category/taste tags like "steamed buns", "savory", or "comfort food" unless the caption explicitly says them.',
  'Never include the dish name or the menu item name as a tag.',
  'Include expectation or experience tags (value, portion size, taste, freshness, spice) only when the caption mentions them.',
  'Every tag in "tags" must include "caption" in evidence.from.',
  'When a complaint or praise refers to a specific part (veg, rice, meat, sauce), include that part in the tag.',
  'Example: "vegs smells old" -> "stale vegetables"; "rice too hard" -> "hard rice"; "meat too little" -> "too little meat".',
  'Avoid generic warning tags like "beware of freshness"; be specific about the ingredient or component.',
  'Return freeform tags that are short, punchy, 2-4 words, and <= 32 characters.',
  'No duplicates or near-duplicates.',
  'Return at most 3 tags.',
  'Sort tags by confidence descending.',
  'If the image is not food, set is_food=false and return an empty tags array.',
  'Return only JSON that matches the schema.',
].join(' ');

const HISTORY_INSTRUCTIONS = [
  'You are re-evaluating tag history for a dish.',
  'Inputs: caption text, history JSON (label, count, avgConfidence), and newTags JSON from the current upload.',
  'Each newTags entry includes label, confidence, and evidence (caption).',
  'Use caption as the only signal. History is the baseline to adjust.',
  'Increase confidence for history tags supported by the caption or image.',
  'Decrease confidence for history tags that contradict the caption.',
  'Add new tags from newTags when supported by caption/image.',
  'Merge near-duplicate sentiment/taste tags into a single best label.',
  'Example: "really good", "tasty", "very tasty" should collapse to "delicious" with increased confidence.',
  'Prefer more specific, punchy labels over vague ones (e.g., prefer "delicious" over "really good").',
  'Merge tags that are semantically equivalent or overlapping (synonyms, adjective swaps, ingredient specificity).',
  'Examples: "tender meat" + "tender chicken" -> "tender chicken"; "fresh vegs"/"fresh vegetables"/"fresh cucumbers" -> "fresh vegetables".',
  'When merging duplicates, increase the confidence of the chosen label.',
  'Merge overlapping ingredient descriptors into a single tag.',
  'Example: "tender chicken" + "tender meat" -> keep "tender chicken" (more specific).',
  'Example: "fresh vegetables" + "fresh cucumbers" -> keep "fresh vegetables" (broader ingredient).',
  'Avoid returning multiple tags that mean the same thing.',
  'If a negative tag targets a component (e.g., "stale vegetables"), reduce confidence of any positive counterpart for the same component (e.g., "fresh vegetables").',
  'If history exceeds 20 tags, keep only the 20 highest-confidence tags.',
  'Return ONLY the updated "history" array with label and confidence.',
  'Return JSON that matches the schema.',
].join(' ');

const buildInstructions = (fixSchema) =>
  fixSchema
    ? `${BASE_INSTRUCTIONS} Fix to schema: respond with JSON that strictly matches the schema.`
    : BASE_INSTRUCTIONS;

const buildHistoryInstructions = (fixSchema) =>
  fixSchema
    ? `${HISTORY_INSTRUCTIONS} Fix to schema: respond with JSON that strictly matches the schema.`
    : HISTORY_INSTRUCTIONS;

const extractPayload = (data) => {
  if (data?.output_json) {
    return data.output_json;
  }

  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === 'output_json' && part?.json) {
        return part.json;
      }
      if (
        (part?.type === 'output_text' || part?.type === 'text') &&
        typeof part.text === 'string'
      ) {
        return part.text;
      }
    }
  }

  return null;
};

const parseResponsePayload = (payload) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'object') {
    return payload;
  }

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (error) {
      return null;
    }
  }

  return null;
};

const requestTags = async ({ caption, imageUrl, fixSchema }) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!imageUrl) {
    throw new Error('imageUrl is required for AI tagging');
  }

  const safeCaption =
    typeof caption === 'string'
      ? caption.replace(/[\r\n]+/g, ' ').trim()
      : '';
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-4o-mini',
      instructions: buildInstructions(fixSchema),
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: safeCaption },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'dish_tags',
          strict: true,
          schema: TAG_SCHEMA,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

const payload = extractPayload(response.data);
return parseResponsePayload(payload);
};

const requestHistoryUpdate = async ({
  caption,
  imageUrl,
  previousTagStats,
  newTags,
  fixSchema,
}) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!imageUrl) {
    throw new Error('imageUrl is required for AI tagging');
  }

  const safeCaption =
    typeof caption === 'string'
      ? caption.replace(/[\r\n]+/g, ' ').trim()
      : '';
  const historyText = JSON.stringify(previousTagStats || []);
  const newTagsText = JSON.stringify(newTags || []);

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-4o-mini',
      instructions: buildHistoryInstructions(fixSchema),
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: safeCaption },
            { type: 'input_text', text: historyText },
            { type: 'input_text', text: newTagsText },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'tag_history',
          strict: true,
          schema: HISTORY_SCHEMA,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const payload = extractPayload(response.data);
  return parseResponsePayload(payload);
};

export const aiTaggingService = {
  async generateDishTags({ caption, imageUrl, previousTagStats }) {
    const firstAttempt = await requestTags({
      caption,
      imageUrl,
      fixSchema: false,
    });

    const firstValidation = validateTagResponse(firstAttempt);
    if (firstValidation) {
      return firstValidation;
    }

    const retryAttempt = await requestTags({
      caption,
      imageUrl,
      fixSchema: true,
    });

    const retryValidation = validateTagResponse(retryAttempt);
    if (retryValidation) {
      return retryValidation;
    }

    return null;
  },

  async reevaluateHistory({ caption, imageUrl, previousTagStats, newTags }) {
    const firstAttempt = await requestHistoryUpdate({
      caption,
      imageUrl,
      previousTagStats,
      newTags,
      fixSchema: false,
    });

    const firstValidation = HistoryResponseSchema.validate(firstAttempt, {
      abortEarly: false,
      allowUnknown: false,
    });
    if (!firstValidation.error) {
      return firstValidation.value;
    }

    const retryAttempt = await requestHistoryUpdate({
      caption,
      imageUrl,
      previousTagStats,
      newTags,
      fixSchema: true,
    });

    const retryValidation = HistoryResponseSchema.validate(retryAttempt, {
      abortEarly: false,
      allowUnknown: false,
    });
    if (!retryValidation.error) {
      return retryValidation.value;
    }

    return null;
  },
};
