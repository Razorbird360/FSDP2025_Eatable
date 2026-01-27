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

const SYSTEM_PROMPT = [
  'You are the Eatable assistant.',
  'Keep responses concise and ask clarifying questions when needed.',
  'Use available tools to fetch up-to-date menu, stall, cart, and order data.',
  'After tool responses, summarize in a friendly, structured reply.',
].join(' ');

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
  const tools = createToolRegistry({ userId, sessionId });
  const model = createAgentModel({ tools });
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  const userMessages = messages.filter((message) => message.role !== 'system');
  const conversation = [
    new SystemMessage(SYSTEM_PROMPT),
    ...userMessages.map(toLangChainMessage).filter(Boolean),
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await model.invoke(conversation);
    const toolCalls = extractToolCalls(response);

    if (!toolCalls.length) {
      const responseText = normalizeMessageContent(response);
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

      const output = await tool.invoke(input);
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
