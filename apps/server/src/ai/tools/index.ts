import { DynamicStructuredTool } from '@langchain/core/tools';
import { createDiscoveryTools } from './discovery.js';
import { createCartTools } from './cart.js';
import type { ToolContext } from './tool-base.js';

export const createToolRegistry = (
  context: ToolContext
): DynamicStructuredTool[] => {
  return [...createDiscoveryTools(context), ...createCartTools(context)];
};

export { buildToolResult, createTool } from './tool-base.js';
export type { ToolContext, ToolDefinition, ToolHandler, ToolResult } from './tool-base.js';
