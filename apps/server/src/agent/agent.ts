import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createToolRegistry } from './tools/index.js';
import { randomUUID } from 'crypto';

export type AgentMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AgentRequest = {
  messages: AgentMessage[];
  userId: string;
  sessionId?: string | null;
};

export type AgentStreamEvent =
  | { type: 'delta'; delta: string }
  | { type: 'tool'; payload: unknown }
  | { type: 'error'; error: string };

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const DEFAULT_TEMPERATURE = 0.4;
const MAX_TOOL_ITERATIONS = Number(process.env.AGENT_MAX_TOOL_ITERATIONS ?? 4);
const DELTA_CHUNK_SIZE = 160;
const UPLOAD_TOOL_NAMES = new Set(['get_stall_gallery', 'get_dish_uploads']);
const UPLOAD_TOOL_FALLBACK =
  'Here are the community uploads below.';

const BASE_SYSTEM_PROMPT = [
  'You are the Eatable assistant.',
  'Keep responses concise and ask clarifying questions when needed.',
  'Use available tools to fetch up-to-date menu, stall, cart, and order data.',
  'If the user wants to browse without a specific name, use list_stalls to show options.',
  'If the user asks for popular stalls, use get_popular_stalls.',
  'If the user asks for stalls from top-voted dishes, prefer get_popular_stalls over listing dishes.',
  'When using prepare_upload_photo, do not list raw upload fields. Ask the user to upload via the UI card.',
  'When using get_dish_uploads or get_stall_gallery, do not say you cannot show images. Tell the user to see the uploads below.',
  'When a user wants to checkout or pay, use checkout_and_pay to create the order and show payment QR.',
  'After tool responses, summarize in a friendly, structured reply.',
].join(' ');

export type AgentCapabilities = {
  geminiConfigured: boolean;
  netsEnabled: boolean;
};

export const getAgentCapabilities = (): AgentCapabilities => ({
  geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  netsEnabled: Boolean(
    process.env.NETS_SANDBOX_API_KEY && process.env.NETS_SANDBOX_PROJECT_ID
  ),
});

const buildSystemPrompt = (capabilities: AgentCapabilities) => {
  const lines = [BASE_SYSTEM_PROMPT];
  if (!capabilities.netsEnabled) {
    lines.push(
      'NETS payment is currently unavailable. Inform the user and avoid payment tools.'
    );
  }
  return lines.join(' ');
};

const createAgentModel = ({ tools = [] } = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
  });

  if (tools.length > 0 && typeof model.bindTools === 'function') {
    return model.bindTools(tools);
  }

  return model;
};

const toLangChainMessage = (message: AgentMessage) => {
  if (message.role === 'user') {
    return new HumanMessage(message.content);
  }

  if (message.role === 'assistant') {
    return new AIMessage(message.content);
  }

  if (message.role === 'system') {
    return new SystemMessage(message.content);
  }

  return null;
};

const normalizeChunkContent = (content: unknown) => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === 'string' ? item : item?.text))
      .filter(Boolean)
      .join('');
  }

  return '';
};

const normalizeMessageContent = (message: AIMessage) => {
  return normalizeChunkContent(message.content);
};

const stripExternalUrls = (text: string) =>
  text.replace(/https?:\/\/\S+/gi, '').replace(/\s{2,}/g, ' ').trim();

const extractToolCalls = (message: AIMessage) => {
  const direct = (message as AIMessage & { tool_calls?: unknown }).tool_calls;
  if (Array.isArray(direct)) {
    return direct as Array<{
      id?: string;
      name: string;
      args: unknown;
    }>;
  }

  const fallback = (message as AIMessage & { additional_kwargs?: any })
    .additional_kwargs?.tool_calls;
  if (Array.isArray(fallback)) {
    return fallback as Array<{
      id?: string;
      name: string;
      args: unknown;
    }>;
  }

  return [];
};

const normalizeToolInput = (args: unknown) => {
  if (args && typeof args === 'object') {
    return args;
  }

  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }

  return {};
};

const normalizeToolError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.name === 'ZodError') {
      return 'Invalid tool arguments. Please try again.';
    }
    const message = error.message?.trim();
    if (!message || message.length > 160) {
      return 'Tool failed. Please try again.';
    }
    return message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'Tool failed. Please try again.';
};

const chunkText = (text: string, size = DELTA_CHUNK_SIZE) => {
  const chunks: string[] = [];
  if (!text) {
    return chunks;
  }
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
};

export async function* streamAgentResponse({
  messages,
  userId,
  sessionId,
}: AgentRequest): AsyncGenerator<AgentStreamEvent> {
  const capabilities = getAgentCapabilities();
  if (!capabilities.geminiConfigured) {
    yield {
      type: 'error',
      error: 'AI service is not configured. Please set GEMINI_API_KEY.',
    };
    return;
  }

  const tools = createToolRegistry(
    { userId, sessionId },
    { netsEnabled: capabilities.netsEnabled }
  );
  const model = createAgentModel({ tools });
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  const userMessages = messages.filter((message) => message.role !== 'system');
  const conversation = [
    new SystemMessage(buildSystemPrompt(capabilities)),
    ...userMessages.map(toLangChainMessage).filter(Boolean),
  ];
  let forceUploadResponse = false;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await model.invoke(conversation);
    const toolCalls = extractToolCalls(response);

    if (!toolCalls.length) {
      let responseText = normalizeMessageContent(response);
      if (forceUploadResponse) {
        responseText = UPLOAD_TOOL_FALLBACK;
      } else {
        const stripped = stripExternalUrls(responseText);
        responseText = stripped || responseText;
        if (!responseText.trim()) {
          responseText = UPLOAD_TOOL_FALLBACK;
        }
      }
      const chunks = chunkText(responseText);
      if (chunks.length === 0) {
        yield { type: 'delta', delta: '' };
      } else {
        for (const delta of chunks) {
          yield { type: 'delta', delta };
        }
      }
      return;
    }

    conversation.push(response);

    for (const call of toolCalls) {
      const toolCallId = call.id ?? randomUUID();
      const tool = toolMap.get(call.name);
      const input = normalizeToolInput(call.args);

      if (!tool) {
        const payload = {
          toolName: call.name,
          input,
          error: 'Tool unavailable.',
        };
        conversation.push(
          new ToolMessage({
            content: JSON.stringify(payload),
            tool_call_id: toolCallId,
            status: 'error',
          })
        );
        yield { type: 'tool', payload };
        continue;
      }

      let output: unknown;
      try {
        output = await tool.invoke(input);
      } catch (error) {
        const payload = {
          toolName: call.name,
          input,
          error: normalizeToolError(error),
        };
        conversation.push(
          new ToolMessage({
            content: JSON.stringify(payload),
            tool_call_id: toolCallId,
            status: 'error',
          })
        );
        yield { type: 'tool', payload };
        continue;
      }
      if (UPLOAD_TOOL_NAMES.has(call.name)) {
        forceUploadResponse = true;
      }
      conversation.push(
        new ToolMessage({
          content: JSON.stringify(output),
          tool_call_id: toolCallId,
          status: output?.error ? 'error' : 'success',
        })
      );
      yield { type: 'tool', payload: output };
    }
  }

  yield {
    type: 'error',
    error: 'Agent reached tool limit. Please try again with a narrower request.',
  };
}
