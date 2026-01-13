import axios from 'axios';
import { z } from 'zod';

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses';
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

const TagEvidenceSchema = z.object({
  from: z.array(z.enum(['image', 'caption', 'history'])).min(1),
}).strict();

const TagSchema = z.object({
  label: z.string().max(32),
  confidence: z.number().min(0).max(1),
  evidence: TagEvidenceSchema,
}).strict();

const TagResponseSchema = z.object({
  is_food: z.boolean(),
  tags: z.array(TagSchema).max(3),
}).strict();

const BASE_INSTRUCTIONS = [
  'You are tagging a dish photo for a menu item upload.',
  'Use the caption as the primary source; history is only a weak hint.',
  'Only add image-based tags when the visual evidence is unambiguous (visible ingredients or preparation).',
  'Do not infer taste, texture, or vibe from the image alone.',
  'Avoid generic category/taste tags like "steamed buns", "savory", or "comfort food" unless the caption explicitly says them.',
  'Never include the dish name or the menu item name as a tag.',
  'Include expectation or experience tags (value, portion size, taste, freshness, spice) only when the caption mentions them.',
  'When a tag is supported by the caption, include "caption" in evidence.from; use "image" only when it is visually clear.',
  'Return freeform tags that are short, punchy, 2-4 words, and <= 32 characters.',
  'No duplicates or near-duplicates.',
  'Return at most 3 tags.',
  'Sort tags by confidence descending.',
  'If the image is not food, set is_food=false and return an empty tags array.',
  'Return only JSON that matches the schema.',
].join(' ');

const buildInstructions = (fixSchema) => (
  fixSchema
    ? `${BASE_INSTRUCTIONS} Fix to schema: respond with JSON that strictly matches the schema.`
    : BASE_INSTRUCTIONS
);

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
      if ((part?.type === 'output_text' || part?.type === 'text') && typeof part.text === 'string') {
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

const requestTags = async ({ caption, imageUrl, previousTagStats, fixSchema }) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!imageUrl) {
    throw new Error('imageUrl is required for AI tagging');
  }

  const safeCaption = typeof caption === 'string' ? caption : '';
  const historyText = JSON.stringify(previousTagStats || []);

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
            { type: 'input_text', text: historyText },
            { type: 'input_image', image_url: imageUrl },
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

export const aiTaggingService = {
  async generateDishTags({ caption, imageUrl, previousTagStats }) {
    const firstAttempt = await requestTags({
      caption,
      imageUrl,
      previousTagStats,
      fixSchema: false,
    });

    const firstValidation = TagResponseSchema.safeParse(firstAttempt);
    if (firstValidation.success) {
      return firstValidation.data;
    }

    const retryAttempt = await requestTags({
      caption,
      imageUrl,
      previousTagStats,
      fixSchema: true,
    });

    const retryValidation = TagResponseSchema.safeParse(retryAttempt);
    if (retryValidation.success) {
      return retryValidation.data;
    }

    return null;
  },
};
