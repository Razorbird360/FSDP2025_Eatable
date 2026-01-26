import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export type AgentMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AgentRequest = {
  messages: AgentMessage[];
  userId: string;
  sessionId?: string | null;
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
const DEFAULT_TEMPERATURE = 0.4;

const SYSTEM_PROMPT = [
  'You are the Eatable assistant.',
  'Keep responses concise and ask clarifying questions when needed.',
  'Tool usage will be added; for now, respond directly based on user messages.',
].join(' ');

export const createToolRegistry = () => [];

const createAgentModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
  });
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

export async function* streamAgentResponse({
  messages,
}: AgentRequest): AsyncGenerator<string> {
  const model = createAgentModel();
  const userMessages = messages.filter((message) => message.role !== 'system');
  const payload = [
    new SystemMessage(SYSTEM_PROMPT),
    ...userMessages.map(toLangChainMessage).filter(Boolean),
  ];

  const stream = await model.stream(payload);
  for await (const chunk of stream) {
    const delta = normalizeChunkContent(chunk.content);
    if (delta) {
      yield delta;
    }
  }
}
