import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getSessionAccessToken } from '../../auth/sessionCache';
import { useCart } from '../../orders/components/CartContext.jsx';
import { useAuth } from '../../auth/useAuth';

const CHAT_ENABLED_KEY = 'eatable:agentChatEnabled';
const CHAT_HISTORY_KEY = 'eatable:agentChatHistory';
const CHAT_SESSION_KEY = 'eatable:agentChatSessionId';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export type MessageKind = 'text' | 'tool';

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  kind: MessageKind;
  content: string;
  toolName?: string;
  toolPayload?: unknown;
  status?: 'streaming' | 'done' | 'error';
  hidden?: boolean;
  displayContent?: string;
}

interface AgentChatContextType {
  isOpen: boolean;
  isEnabled: boolean;
  isStreaming: boolean;
  messages: Message[];
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setEnabled: (enabled: boolean) => void;
  sendMessage: (content: string, options?: { silent?: boolean }) => Promise<void>;
  uploadPhoto: (uploadInfo: any, file: File) => Promise<boolean>;
  clearHistory: () => void;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    kind: 'text',
    content: 'Hello! 👋 What are you hungry for today?',
  },
];

const AgentChatContext = createContext<AgentChatContextType | null>(null);

export function useAgentChat(): AgentChatContextType {
  const context = useContext(AgentChatContext);
  if (!context) {
    throw new Error('useAgentChat must be used within an AgentChatProvider');
  }
  return context;
}

interface AgentChatProviderProps {
  children: ReactNode;
}

export function AgentChatProvider({ children }: AgentChatProviderProps) {
  const { profile, status } = useAuth();
  const { refreshCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAT_ENABLED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!raw) return initialMessages;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return initialMessages;
      return parsed.map((message) => ({
        ...message,
        role: message.role === 'bot' ? 'assistant' : message.role,
        kind: message.kind ?? 'text',
      }));
    } catch {
      return initialMessages;
    }
  });
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHAT_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesRef = useRef<Message[]>(initialMessages);
  const streamingAssistantRef = useRef<string | null>(null);
  const lastSelectionRef = useRef<{
    type: 'stall';
    items: Array<{ id: string; label: string }>;
  } | null>(null);
  const isCustomer =
    status === 'authenticated' && profile?.role === 'user' && Boolean(profile?.id);
  const isEnabledEffective = isCustomer && isEnabled;

  useEffect(() => {
    if (!isCustomer && isOpen) {
      setIsOpen(false);
    }
  }, [isCustomer, isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_ENABLED_KEY, String(isEnabled));
    } catch {
      // ignore
    }
  }, [isEnabled]);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (sessionId) {
        localStorage.setItem(CHAT_SESSION_KEY, sessionId);
      } else {
        localStorage.removeItem(CHAT_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  const openChat = () => {
    if (!isCustomer) return;
    setIsOpen(true);
  };
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => {
    if (!isCustomer) return;
    setIsOpen((prev) => !prev);
  };

  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setIsOpen(false);
    }
  };

  const createMessageId = () =>
    `${Date.now().toString()}-${Math.random().toString(16).slice(2)}`;

  const appendMessage = (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: createMessageId(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, ...updates } : message))
    );
  };

  const appendDelta = (id: string, delta: string) => {
    if (!delta) return;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? { ...message, content: `${message.content}${delta}` }
          : message
      )
    );
  };

  const buildAgentPayload = (messageList: Message[]) =>
    messageList
      .filter((message) => message.kind === 'text')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }));

  const buildApiUrl = (path: string) => {
    if (path.startsWith('http')) {
      return path;
    }

    if (path.startsWith('/api')) {
      return `${API_BASE_URL}${path.replace(/^\/api/, '')}`;
    }

    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const uploadAttachment = async (uploadInfo: any, file: File) => {
    if (!uploadInfo?.url || !uploadInfo?.method || !uploadInfo?.fileField) {
      return false;
    }

    const formData = new FormData();
    formData.append(uploadInfo.fileField, file);

    const fields = uploadInfo.fields ?? {};
    Object.entries(fields).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      formData.append(key, String(value));
    });

    const token = getSessionAccessToken();
    const response = await fetch(buildApiUrl(uploadInfo.url), {
      method: uploadInfo.method,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!response.ok) {
      let message = 'Upload failed. Please try again.';
      try {
        const data = await response.json();
        message = data?.error || data?.message || message;
      } catch {
        // ignore
      }
      appendMessage({
        role: 'assistant',
        kind: 'text',
        content: message,
        status: 'error',
      });
      return false;
    }

    return true;
  };

  const insertToolMessage = (payload: any, assistantId?: string | null) => {
    const toolMessage: Message = {
      id: createMessageId(),
      role: 'assistant',
      kind: 'tool',
      content: '',
      toolName: payload?.toolName,
      toolPayload: payload,
      status: payload?.error ? 'error' : 'done',
    };

    setMessages((prev) => {
      const anchorId = assistantId ?? streamingAssistantRef.current;
      if (!anchorId) {
        return [...prev, toolMessage];
      }
      const assistantIndex = prev.findIndex((message) => message.id === anchorId);
      if (assistantIndex === -1) {
        return [...prev, toolMessage];
      }
      const next = [...prev];
      next.splice(assistantIndex, 0, toolMessage);
      return next;
    });
  };

  const buildStallOptions = (items: any[]) =>
    items
      .map((stall) => {
        if (!stall?.id || !stall?.name) return null;
        const parts = [stall.name];
        if (stall.location) {
          parts.push(stall.location);
        } else if (stall.hawkerCentre?.name) {
          parts.push(stall.hawkerCentre.name);
        }
        return {
          id: stall.id,
          label: parts.filter(Boolean).join(' • '),
        };
      })
      .filter(Boolean) as Array<{ id: string; label: string }>;

  const updateSelectionContext = (payload: any) => {
    if (!payload || payload?.error) return;
    const toolName = payload?.toolName;
    const output = payload?.output;

    if (toolName === 'search_entities' && output?.stalls) {
      const options = buildStallOptions(output.stalls);
      if (options.length) {
        lastSelectionRef.current = { type: 'stall', items: options };
      }
      return;
    }

    if (
      toolName === 'list_stalls' ||
      toolName === 'get_hawker_stalls' ||
      toolName === 'get_popular_stalls'
    ) {
      if (Array.isArray(output)) {
        const options = buildStallOptions(output);
        if (options.length) {
          lastSelectionRef.current = { type: 'stall', items: options };
        }
      }
    }
  };

  const handleToolEvent = async (payload: any, assistantId?: string) => {
    insertToolMessage(payload, assistantId);
    updateSelectionContext(payload);
    const toolName = payload?.toolName;
    if (
      toolName === 'get_cart' ||
      toolName === 'add_to_cart' ||
      toolName === 'update_cart_item' ||
      toolName === 'remove_cart_item' ||
      toolName === 'clear_cart'
    ) {
      void refreshCart();
    }
  };

  const streamAgent = async ({
    agentMessages,
    assistantId,
  }: {
    agentMessages: { role: 'user' | 'assistant'; content: string }[];
    assistantId: string;
  }) => {
    const token = getSessionAccessToken();
    const response = await fetch(buildApiUrl('/agent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        messages: agentMessages,
        sessionId,
      }),
    });

    if (!response.ok || !response.body) {
      let message = 'Agent request failed.';
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          message = data?.error || data?.message || message;
        } catch {
          // ignore JSON parse errors
        }
      } else {
        const text = await response.text();
        message = text || message;
      }

      if (response.status === 401) {
        message = 'Please log in to use the assistant.';
      } else if (response.status === 503) {
        message = message || 'Service temporarily unavailable.';
      }

      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      chunks.forEach((chunk) => {
        const lines = chunk.split('\n');
        let eventType = 'message';
        let data = '';

        lines.forEach((line) => {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          }
          if (line.startsWith('data:')) {
            data += line.slice(5).trim();
          }
        });

        if (!data) return;

        try {
          const payload = JSON.parse(data);
          if (eventType === 'meta') {
            setSessionId(payload?.sessionId ?? null);
          } else if (eventType === 'delta') {
            appendDelta(assistantId, payload?.delta ?? payload?.content ?? '');
          } else if (eventType === 'tool' || eventType === 'tool_result') {
            void handleToolEvent(payload, assistantId);
          } else if (eventType === 'error') {
            updateMessage(assistantId, {
              content: payload?.error || 'Something went wrong.',
              status: 'error',
            });
          }
        } catch (parseError) {
          // ignore malformed chunks
        }
      });
    }
  };

  const sendMessage = async (content: string, options?: { silent?: boolean }) => {
    if (isStreaming) return;
    if (!isCustomer) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    let payloadContent = trimmed;
    let displayContent: string | undefined;
    const selection = lastSelectionRef.current;
    if (/^\d+$/.test(trimmed) && selection?.items?.length) {
      const index = Number(trimmed) - 1;
      const selected = selection.items[index];
      if (selected) {
        payloadContent = `Selected stall: ${selected.label} (stallId: ${selected.id}).`;
        displayContent = trimmed;
      }
    }

    const userMessage: Message = {
      id: createMessageId(),
      role: 'user',
      kind: 'text',
      content: payloadContent,
      status: 'done',
      hidden: options?.silent ?? false,
      displayContent,
    };

    const assistantId = createMessageId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      kind: 'text',
      content: '',
      status: 'streaming',
    };

    const nextMessages = [...messagesRef.current, userMessage];
    setMessages([...nextMessages, assistantMessage]);
    setIsStreaming(true);
    streamingAssistantRef.current = assistantId;

    try {
      await streamAgent({
        agentMessages: buildAgentPayload(nextMessages),
        assistantId,
      });
      updateMessage(assistantId, { status: 'done' });
    } catch (error) {
      updateMessage(assistantId, {
        content: error instanceof Error ? error.message : 'Something went wrong.',
        status: 'error',
      });
    } finally {
      setIsStreaming(false);
      streamingAssistantRef.current = null;
    }
  };

  const clearHistory = () => {
    setMessages(initialMessages);
    setSessionId(null);
    streamingAssistantRef.current = null;
    try {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      localStorage.removeItem(CHAT_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <AgentChatContext.Provider
      value={{
        isOpen,
        isEnabled: isEnabledEffective,
        isStreaming,
        messages,
        openChat,
        closeChat,
        toggleChat,
        setEnabled,
        sendMessage,
        uploadPhoto: uploadAttachment,
        clearHistory,
      }}
    >
      {children}
    </AgentChatContext.Provider>
  );
}
