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
      try {
        const output = await handler(safeInput as TInput, context);
        return buildToolResult({
          toolName: name,
          input: safeInput,
          output,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tool failed';
        return buildToolResult({
          toolName: name,
          input: safeInput,
          error: message,
        });
      }
    },
  });

export const createToolRegistry = (
  context: ToolContext
): DynamicStructuredTool[] => {
  return [];
};
