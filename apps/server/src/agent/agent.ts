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
const UPLOAD_TOOL_FALLBACK = 'Here are the community uploads below.';
const UPLOAD_TOOL_EMPTY_FALLBACK = 'No community uploads yet.';
const NETS_TOOL_NAMES = new Set([
  'checkout_and_pay',
  'request_nets_qr',
  'query_nets_qr_status',
]);
const EMPTY_RESPONSE_FALLBACK =
  'Sorry, I did not catch that. Could you rephrase?';
const LIST_TOOL_NAMES = new Set([
  'search_entities',
  'list_hawker_centres',
  'list_stalls',
  'get_hawker_stalls',
  'get_popular_stalls',
  'get_hawker_dishes',
  'get_top_voted_menu_items',
  'get_featured_menu_items_by_cuisine',
]);
const LIST_TOOL_FALLBACK =
  'Here are the results below. Tap "Show details" to view them and reply with a number or name.';

const BASE_SYSTEM_PROMPT = [
  'You are the Eatable assistant.',
  'Keep responses concise and ask clarifying questions when needed.',
  'Use available tools to fetch up-to-date menu, stall, cart, and order data.',
  'Never ask the user for an order id. Use the available tools and context instead.',
  'If the user wants to browse without a specific name, use list_stalls to show options.',
  'If the user wants to browse hawker centres, use list_hawker_centres.',
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

const stripQrPayload = (text: string) => {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const base64Regex = /(iVBORw0KGgo[0-9A-Za-z+/=]+|data:image\/png;base64,[0-9A-Za-z+/=]+)/g;
  if (base64Regex.test(trimmed)) {
    return 'Scan the QR code below to complete payment.';
  }
  return text;
};

const extractExplicitUploadRequest = (content: string) => {
  if (!content) return null;
  const stallMatch = content.match(/stallId\s+([0-9a-fA-F-]{16,})/i);
  if (stallMatch) {
    return {
      toolName: 'get_stall_gallery',
      input: { stallId: stallMatch[1] },
    };
  }
  const menuItemMatch = content.match(/menuItemId\s+([0-9a-fA-F-]{16,})/i);
  if (menuItemMatch) {
    return {
      toolName: 'get_dish_uploads',
      input: { menuItemId: menuItemMatch[1] },
    };
  }
  return null;
};

const extractExplicitListRequest = (content: string) => {
  if (!content) return null;
  const lowered = content.toLowerCase();
  if (/(top[-\s]?voted|most voted|popular)\s+(dishes|dish|menu items|items)/.test(lowered)) {
    return {
      toolName: 'get_top_voted_menu_items',
      input: { limit: 5 },
    };
  }
  if (/(popular|top)\s+stalls/.test(lowered)) {
    return {
      toolName: 'get_popular_stalls',
      input: { limit: 5 },
    };
  }
  return null;
};

const extractAddToCartRequest = (content: string) => {
  if (!content) return null;
  const lowered = content.toLowerCase();
  if (!/\b(add|order|buy)\b/.test(lowered) || !/\bcart\b/.test(lowered)) {
    return null;
  }
  const qtyMatch = lowered.match(/\b(\d+)\b/);
  const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;
  const cleaned = lowered
    .replace(/\b(add|order|buy|please|can you|could you|cart|to|my)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return { query: cleaned, qty };
};

const extractStallRequest = (content: string) => {
  if (!content) return null;
  const lowered = content.toLowerCase();
  if (!/\bstall\b/.test(lowered)) return null;
  const wantsGallery = /\b(upload|uploads|gallery|photo|photos)\b/.test(lowered);
  const cleaned = lowered
    .replace(/\b(show|see|details|menu|info|about|stall|uploads|upload|gallery|photo|photos|for|of|the|please|can you|could you)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return {
    query: cleaned,
    toolName: wantsGallery ? 'get_stall_gallery' : 'get_stall_details',
  };
};

const extractHawkerRequest = (content: string) => {
  if (!content) return null;
  const lowered = content.toLowerCase();
  if (!/\bhawker\b/.test(lowered)) return null;

  const wantsList = /\b(all|list|show|what|which|available|any)\b/.test(lowered);
  const cleaned = lowered
    .replace(
      /\b(hawker|centre|center|info|information|details|about|show|list|what|which|please|can you|could you|some|any|available|me|are|is|there|the|a|an)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (wantsList && !cleaned) {
    return { mode: 'list' as const };
  }
  if (cleaned) {
    return { mode: 'search' as const, query: cleaned };
  }
  return wantsList ? { mode: 'list' as const } : null;
};

const getUploadItems = (output: unknown) => {
  if (Array.isArray(output)) return output;
  if (output && typeof output === 'object') {
    if (Array.isArray(output.uploads)) {
      return output.uploads;
    }
    if (Array.isArray(output.output)) {
      return output.output;
    }
    if (output.output && typeof output.output === 'object' && Array.isArray(output.output.uploads)) {
      return output.output.uploads;
    }
  }
  return [];
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

const buildListSummary = (
  toolName: string,
  output: unknown,
  options: { preferHawkers?: boolean } = {}
) => {
  if (!output || typeof output !== 'object') {
    return LIST_TOOL_FALLBACK;
  }

  const buildOptionList = (items: any[], getLabel: (item: any) => string) =>
    items
      .slice(0, 5)
      .map((item, index) => `${index + 1}. ${getLabel(item)}`)
      .join('\n');

  const buildFollowUp = (items: any[], labelBuilder: (item: any) => string) => {
    if (!items.length) {
      return 'I could not find any matches. Try a more specific name or another keyword.';
    }
    const list = buildOptionList(items, labelBuilder);
    return `Here are a few options:\n${list}\nReply with a number or name.`;
  };

  if (toolName === 'search_entities') {
    const hawkers = Array.isArray((output as any).hawkerCentres)
      ? (output as any).hawkerCentres
      : [];
    const stalls = Array.isArray((output as any).stalls)
      ? (output as any).stalls
      : [];
    const dishes = Array.isArray((output as any).dishes)
      ? (output as any).dishes
      : [];

    if (options.preferHawkers && hawkers.length) {
      return buildFollowUp(hawkers, (centre) =>
        centre.subtitle ? `${centre.name} — ${centre.subtitle}` : centre.name
      );
    }
    if (stalls.length) {
      return buildFollowUp(stalls, (stall) =>
        stall.subtitle ? `${stall.name} — ${stall.subtitle}` : stall.name
      );
    }
    if (dishes.length) {
      return buildFollowUp(dishes, (dish) => dish.name);
    }
    if (hawkers.length) {
      return buildFollowUp(hawkers, (centre) =>
        centre.subtitle ? `${centre.name} — ${centre.subtitle}` : centre.name
      );
    }
    return 'I could not find any matches. Try a more specific name or another keyword.';
  }

  if (Array.isArray(output)) {
    if (toolName === 'list_hawker_centres') {
      return buildFollowUp(output, (centre) =>
        centre.address ? `${centre.name} — ${centre.address}` : centre.name
      );
    }
    if (toolName === 'get_top_voted_menu_items') {
      return buildFollowUp(output, (item) =>
        item.stall?.name ? `${item.name} — ${item.stall.name}` : item.name
      );
    }
    if (toolName === 'get_featured_menu_items_by_cuisine') {
      return buildFollowUp(output, (entry) => {
        const itemName = entry?.menuItem?.name ?? 'Menu item';
        const stallName = entry?.stall?.name;
        return stallName ? `${itemName} — ${stallName}` : itemName;
      });
    }
    if (toolName === 'get_hawker_dishes') {
      return buildFollowUp(output, (item) => item.name);
    }
    return buildFollowUp(output, (item) => item.name ?? 'Item');
  }

  return LIST_TOOL_FALLBACK;
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
  let lastUploadHadResults: boolean | null = null;
  let lastToolName: string | null = null;
  let lastToolOutput: unknown = null;
  let explicitHandled = false;
  let preferHawkerResults = false;

  const lastUserMessage = userMessages[userMessages.length - 1];
  if (lastUserMessage?.role === 'user') {
    const explicitUpload = extractExplicitUploadRequest(lastUserMessage.content);
    if (explicitUpload) {
      const tool = toolMap.get(explicitUpload.toolName);
      if (tool) {
        let output: unknown;
        try {
          output = await tool.invoke(explicitUpload.input);
          conversation.push(
            new ToolMessage({
              content: JSON.stringify(output),
              name: explicitUpload.toolName,
              tool_call_id: randomUUID(),
              status: output?.error ? 'error' : 'success',
            })
          );
          yield { type: 'tool', payload: output };

          lastToolName = explicitUpload.toolName;
          lastToolOutput = output?.output ?? output;
          forceUploadResponse = true;
          const uploadItems = getUploadItems(output);
          lastUploadHadResults = uploadItems.length > 0;
          explicitHandled = true;
        } catch (error) {
          const payload = {
            toolName: explicitUpload.toolName,
            input: explicitUpload.input,
            error: normalizeToolError(error),
          };
          conversation.push(
            new ToolMessage({
              content: JSON.stringify(payload),
              name: explicitUpload.toolName,
              tool_call_id: randomUUID(),
              status: 'error',
            })
          );
          yield { type: 'tool', payload };
          lastToolName = explicitUpload.toolName;
          lastToolOutput = payload;
          explicitHandled = true;
        }
      }
    }

    const explicitList = extractExplicitListRequest(lastUserMessage.content);
    if (!explicitHandled && explicitList) {
      const tool = toolMap.get(explicitList.toolName);
      if (tool) {
        try {
          const output = await tool.invoke(explicitList.input);
          conversation.push(
            new ToolMessage({
              content: JSON.stringify(output),
              name: explicitList.toolName,
              tool_call_id: randomUUID(),
              status: output?.error ? 'error' : 'success',
            })
          );
          yield { type: 'tool', payload: output };
          lastToolName = explicitList.toolName;
          lastToolOutput = output?.output ?? output;
          explicitHandled = true;
        } catch (error) {
          const payload = {
            toolName: explicitList.toolName,
            input: explicitList.input,
            error: normalizeToolError(error),
          };
          conversation.push(
            new ToolMessage({
              content: JSON.stringify(payload),
              name: explicitList.toolName,
              tool_call_id: randomUUID(),
              status: 'error',
            })
          );
          yield { type: 'tool', payload };
          lastToolName = explicitList.toolName;
          lastToolOutput = payload;
          explicitHandled = true;
        }
      }
    }

    const hawkerRequest = extractHawkerRequest(lastUserMessage.content);
    if (!explicitHandled && hawkerRequest) {
      if (hawkerRequest.mode === 'list') {
        const listTool = toolMap.get('list_hawker_centres');
        const infoTool = toolMap.get('get_hawker_info');
        if (listTool) {
          try {
            const output = await listTool.invoke({ limit: 10 });
            conversation.push(
              new ToolMessage({
                content: JSON.stringify(output),
                name: 'list_hawker_centres',
                tool_call_id: randomUUID(),
                status: output?.error ? 'error' : 'success',
              })
            );
            yield { type: 'tool', payload: output };
            lastToolName = 'list_hawker_centres';
            lastToolOutput = output?.output ?? output;
            const listItems = Array.isArray(output?.output ?? output)
              ? (output?.output ?? output)
              : [];
            if (listItems.length === 1 && infoTool) {
              const infoOutput = await infoTool.invoke({
                hawkerId: listItems[0].id,
              });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(infoOutput),
                  name: 'get_hawker_info',
                  tool_call_id: randomUUID(),
                  status: infoOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: infoOutput };
              lastToolName = 'get_hawker_info';
              lastToolOutput = infoOutput?.output ?? infoOutput;
            }
            explicitHandled = true;
          } catch (error) {
            const payload = {
              toolName: 'list_hawker_centres',
              input: { limit: 10 },
              error: normalizeToolError(error),
            };
            conversation.push(
              new ToolMessage({
                content: JSON.stringify(payload),
                name: 'list_hawker_centres',
                tool_call_id: randomUUID(),
                status: 'error',
              })
            );
            yield { type: 'tool', payload };
            lastToolName = 'list_hawker_centres';
            lastToolOutput = payload;
            explicitHandled = true;
          }
        }
      } else if (hawkerRequest.mode === 'search') {
        const searchTool = toolMap.get('search_entities');
        const infoTool = toolMap.get('get_hawker_info');
        const listTool = toolMap.get('list_hawker_centres');
        if (searchTool) {
          try {
            const searchOutput = await searchTool.invoke({
              query: hawkerRequest.query,
              limit: 5,
            });
            const searchData = searchOutput?.output ?? searchOutput;
            const hawkerCentres = Array.isArray(searchData?.hawkerCentres)
              ? searchData.hawkerCentres
              : [];
            const hawkerOnly = {
              hawkerCentres,
              stalls: [],
              dishes: [],
            };
            const payload = {
              ...searchOutput,
              output: hawkerOnly,
            };
            conversation.push(
              new ToolMessage({
                content: JSON.stringify(payload),
                name: 'search_entities',
                tool_call_id: randomUUID(),
                status: searchOutput?.error ? 'error' : 'success',
              })
            );
            yield { type: 'tool', payload };
            lastToolName = 'search_entities';
            lastToolOutput = hawkerOnly;
            preferHawkerResults = true;

            if (hawkerCentres.length === 0 && listTool) {
              const listOutput = await listTool.invoke({ limit: 10 });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(listOutput),
                  name: 'list_hawker_centres',
                  tool_call_id: randomUUID(),
                  status: listOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: listOutput };
              lastToolName = 'list_hawker_centres';
              lastToolOutput = listOutput?.output ?? listOutput;
            } else if (hawkerCentres.length === 1 && infoTool) {
              const infoOutput = await infoTool.invoke({
                hawkerId: hawkerCentres[0].id,
              });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(infoOutput),
                  name: 'get_hawker_info',
                  tool_call_id: randomUUID(),
                  status: infoOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: infoOutput };
              lastToolName = 'get_hawker_info';
              lastToolOutput = infoOutput?.output ?? infoOutput;
            }
            explicitHandled = true;
          } catch (error) {
            const payload = {
              toolName: 'search_entities',
              input: { query: hawkerRequest.query, limit: 5 },
              error: normalizeToolError(error),
            };
            conversation.push(
              new ToolMessage({
                content: JSON.stringify(payload),
                name: 'search_entities',
                tool_call_id: randomUUID(),
                status: 'error',
              })
            );
            yield { type: 'tool', payload };
            lastToolName = 'search_entities';
            lastToolOutput = payload;
            preferHawkerResults = true;
            explicitHandled = true;
          }
        }
      }
    }

    const addToCartRequest = extractAddToCartRequest(lastUserMessage.content);
    if (!explicitHandled && addToCartRequest) {
      const searchTool = toolMap.get('search_entities');
      const cartTool = toolMap.get('add_to_cart');
      if (searchTool && cartTool) {
        try {
          const searchOutput = await searchTool.invoke({
            query: addToCartRequest.query,
            limit: 5,
          });
          conversation.push(
            new ToolMessage({
              content: JSON.stringify(searchOutput),
              name: 'search_entities',
              tool_call_id: randomUUID(),
              status: searchOutput?.error ? 'error' : 'success',
            })
          );
          yield { type: 'tool', payload: searchOutput };
          const searchData = searchOutput?.output ?? searchOutput;
          lastToolName = 'search_entities';
          lastToolOutput = searchData;
          const dishes = Array.isArray(searchData?.dishes) ? searchData.dishes : [];
          if (dishes.length === 1) {
            const cartOutput = await cartTool.invoke({
              menuItemId: dishes[0].id,
              qty: addToCartRequest.qty,
            });
            conversation.push(
              new ToolMessage({
                content: JSON.stringify(cartOutput),
                name: 'add_to_cart',
                tool_call_id: randomUUID(),
                status: cartOutput?.error ? 'error' : 'success',
              })
            );
            yield { type: 'tool', payload: cartOutput };
            lastToolName = 'add_to_cart';
            lastToolOutput = cartOutput?.output ?? cartOutput;
            explicitHandled = true;
          } else {
            explicitHandled = true;
          }
        } catch (error) {
          lastToolName = 'search_entities';
          lastToolOutput = { error: normalizeToolError(error) };
          explicitHandled = true;
        }
      }
    }

    const stallRequest = extractStallRequest(lastUserMessage.content);
    if (!explicitHandled && stallRequest) {
      const searchTool = toolMap.get('search_entities');
      const stallTool = toolMap.get(stallRequest.toolName);
      if (searchTool && stallTool) {
        try {
          const searchOutput = await searchTool.invoke({
            query: stallRequest.query,
            limit: 5,
          });
          conversation.push(
            new ToolMessage({
              content: JSON.stringify(searchOutput),
              name: 'search_entities',
              tool_call_id: randomUUID(),
              status: searchOutput?.error ? 'error' : 'success',
            })
          );
          yield { type: 'tool', payload: searchOutput };
          const searchData = searchOutput?.output ?? searchOutput;
          lastToolName = 'search_entities';
          lastToolOutput = searchData;
          const stalls = Array.isArray(searchData?.stalls) ? searchData.stalls : [];
          if (stalls.length === 1) {
            const stallOutput = await stallTool.invoke({
              stallId: stalls[0].id,
            });
            conversation.push(
              new ToolMessage({
                content: JSON.stringify(stallOutput),
                name: stallRequest.toolName,
                tool_call_id: randomUUID(),
                status: stallOutput?.error ? 'error' : 'success',
              })
            );
            yield { type: 'tool', payload: stallOutput };
            lastToolName = stallRequest.toolName;
            lastToolOutput = stallOutput?.output ?? stallOutput;
            if (stallRequest.toolName === 'get_stall_gallery') {
              const uploads = getUploadItems(stallOutput);
              forceUploadResponse = true;
              lastUploadHadResults = uploads.length > 0;
            }
            explicitHandled = true;
          } else {
            explicitHandled = true;
          }
        } catch (error) {
          lastToolName = stallRequest.toolName;
          lastToolOutput = { error: normalizeToolError(error) };
          explicitHandled = true;
        }
      }
    }
  }

  const maxIterations = explicitHandled ? 1 : MAX_TOOL_ITERATIONS;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const response = await model.invoke(conversation);
    const toolCalls = explicitHandled ? [] : extractToolCalls(response);

    if (!toolCalls.length) {
      let responseText = normalizeMessageContent(response);
      if (forceUploadResponse) {
        responseText =
          lastUploadHadResults === false
            ? UPLOAD_TOOL_EMPTY_FALLBACK
            : UPLOAD_TOOL_FALLBACK;
      } else if (lastToolName && NETS_TOOL_NAMES.has(lastToolName)) {
        responseText =
          lastToolName === 'query_nets_qr_status'
            ? 'Checking payment status...'
            : 'Scan the QR code shown above to complete payment.';
      } else if (lastToolName && LIST_TOOL_NAMES.has(lastToolName)) {
        responseText = buildListSummary(lastToolName, lastToolOutput, {
          preferHawkers: preferHawkerResults,
        });
      } else {
        const stripped = stripExternalUrls(responseText);
        responseText = stripQrPayload(stripped || responseText);
        if (!responseText.trim()) {
          responseText = forceUploadResponse
            ? UPLOAD_TOOL_FALLBACK
            : EMPTY_RESPONSE_FALLBACK;
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
            name: call.name,
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
            name: call.name,
            tool_call_id: toolCallId,
            status: 'error',
          })
        );
        yield { type: 'tool', payload };
        continue;
      }
      const outputHasError =
        output && typeof output === 'object' && 'error' in output
          ? Boolean(output.error)
          : false;
      if (!outputHasError) {
        lastToolName = call.name;
        lastToolOutput = output?.output ?? output;
      }

      if (UPLOAD_TOOL_NAMES.has(call.name) && !outputHasError) {
        forceUploadResponse = true;
        const resultArray = getUploadItems(output);
        lastUploadHadResults = resultArray.length > 0;
      }
      conversation.push(
        new ToolMessage({
          content: JSON.stringify(output),
          name: call.name,
          tool_call_id: toolCallId,
          status: output?.error ? 'error' : 'success',
        })
      );
      yield { type: 'tool', payload: output };

      if (!outputHasError) {
        const outputData = output?.output ?? output;
        if (call.name === 'list_stalls') {
          const listItems = Array.isArray(outputData) ? outputData : [];
          if (listItems.length === 1) {
            const stallTool = toolMap.get('get_stall_details');
            if (stallTool) {
              const followOutput = await stallTool.invoke({
                stallId: listItems[0].id,
              });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(followOutput),
                  name: 'get_stall_details',
                  tool_call_id: randomUUID(),
                  status: followOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: followOutput };
              lastToolName = 'get_stall_details';
              lastToolOutput = followOutput?.output ?? followOutput;
            }
          }
        }

        if (call.name === 'list_hawker_centres') {
          const listItems = Array.isArray(outputData) ? outputData : [];
          if (listItems.length === 1) {
            const infoTool = toolMap.get('get_hawker_info');
            if (infoTool) {
              const followOutput = await infoTool.invoke({
                hawkerId: listItems[0].id,
              });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(followOutput),
                  name: 'get_hawker_info',
                  tool_call_id: randomUUID(),
                  status: followOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: followOutput };
              lastToolName = 'get_hawker_info';
              lastToolOutput = followOutput?.output ?? followOutput;
            }
          }
        }

        if (call.name === 'search_entities') {
          const hawkers = Array.isArray(outputData?.hawkerCentres)
            ? outputData.hawkerCentres
            : [];
          const stalls = Array.isArray(outputData?.stalls) ? outputData.stalls : [];
          const dishes = Array.isArray(outputData?.dishes) ? outputData.dishes : [];
          if (stalls.length === 1 && hawkers.length === 0 && dishes.length === 0) {
            const stallTool = toolMap.get('get_stall_details');
            if (stallTool) {
              const followOutput = await stallTool.invoke({
                stallId: stalls[0].id,
              });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(followOutput),
                  name: 'get_stall_details',
                  tool_call_id: randomUUID(),
                  status: followOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: followOutput };
              lastToolName = 'get_stall_details';
              lastToolOutput = followOutput?.output ?? followOutput;
            }
          }
          if (hawkers.length === 1 && stalls.length === 0 && dishes.length === 0) {
            const infoTool = toolMap.get('get_hawker_info');
            if (infoTool) {
              const followOutput = await infoTool.invoke({
                hawkerId: hawkers[0].id,
              });
              conversation.push(
                new ToolMessage({
                  content: JSON.stringify(followOutput),
                  name: 'get_hawker_info',
                  tool_call_id: randomUUID(),
                  status: followOutput?.error ? 'error' : 'success',
                })
              );
              yield { type: 'tool', payload: followOutput };
              lastToolName = 'get_hawker_info';
              lastToolOutput = followOutput?.output ?? followOutput;
            }
          }
        }
      }
    }
  }

  yield {
    type: 'error',
    error: 'Agent reached tool limit. Please try again with a narrower request.',
  };
}
