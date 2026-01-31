import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export type ToolContext = {
  userId: string;
  sessionId?: string | null;
};

export type ToolResult<TOutput = unknown> = {
  toolName: string;
  input: unknown;
  output?: TOutput;
  error?: string;
};

export type ToolHandler<TInput, TOutput> = (
  input: TInput,
  context: ToolContext
) => Promise<TOutput> | TOutput;

export type ToolDefinition<TInput, TOutput> = {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  handler: ToolHandler<TInput, TOutput>;
};

const TOOL_TIMEOUT_MS = Number(process.env.AGENT_TOOL_TIMEOUT_MS ?? 15_000);

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (!message) {
      return 'Tool failed. Please try again.';
    }
    if (message.length > 160) {
      return 'Tool failed. Please try again.';
    }
    return message;
  }
  return 'Tool failed. Please try again.';
};

const logToolEvent = (payload: Record<string, unknown>) => {
  console.info(JSON.stringify(payload));
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Tool timed out. Please try again.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const stripUserFields = (input: unknown) => {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const { userId, sessionId, ...rest } = input as Record<string, unknown>;
  return rest;
};

export const buildToolResult = <TOutput>({
  toolName,
  input,
  output,
  error,
}: ToolResult<TOutput>) => ({
  toolName,
  input,
  output,
  error,
});

export const createTool = <TInput, TOutput>(
  { name, description, schema, handler }: ToolDefinition<TInput, TOutput>,
  context: ToolContext
) =>
  new DynamicStructuredTool({
    name,
    description,
    schema,
    func: async (input) => {
      const safeInput = stripUserFields(input);
      const startedAt = Date.now();
      logToolEvent({
        event: 'tool_start',
        toolName: name,
        userId: context.userId,
      });
      try {
        const output = await withTimeout(
          Promise.resolve(handler(safeInput as TInput, context)),
          TOOL_TIMEOUT_MS
        );
        logToolEvent({
          event: 'tool_end',
          toolName: name,
          userId: context.userId,
          durationMs: Date.now() - startedAt,
          success: true,
        });
        return buildToolResult({
          toolName: name,
          input: safeInput,
          output,
        });
      } catch (error) {
        logToolEvent({
          event: 'tool_end',
          toolName: name,
          userId: context.userId,
          durationMs: Date.now() - startedAt,
          success: false,
        });
        const message = normalizeErrorMessage(error);
        return buildToolResult({
          toolName: name,
          input: safeInput,
          error: message,
        });
      }
    },
  });
