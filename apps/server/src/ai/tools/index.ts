import { DynamicStructuredTool } from '@langchain/core/tools';
import { createDiscoveryTools } from './discovery.js';
import type { ToolContext } from './tool-base.js';

export const createToolRegistry = (
  context: ToolContext
): DynamicStructuredTool[] => {
  return [...createDiscoveryTools(context)];
};

export { buildToolResult, createTool } from './tool-base.js';
export type { ToolContext, ToolDefinition, ToolHandler, ToolResult } from './tool-base.js';
