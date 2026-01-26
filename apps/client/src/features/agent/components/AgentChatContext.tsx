import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getSessionAccessToken } from '../../auth/sessionCache';

const CHAT_ENABLED_KEY = 'eatable:agentChatEnabled';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export type MessageKind = 'text' | 'tool';

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  kind: MessageKind;
  content: string;
  toolName?: string;
  toolPayload?: unknown;
  attachmentName?: string | null;
  status?: 'streaming' | 'done' | 'error';
}

interface AgentChatContextType {
  isOpen: boolean;
  isEnabled: boolean;
  isStreaming: boolean;
  messages: Message[];
  pendingAttachment: File | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setEnabled: (enabled: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  setPendingAttachment: (file: File | null) => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAT_ENABLED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const messagesRef = useRef<Message[]>(initialMessages);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_ENABLED_KEY, String(isEnabled));
    } catch {
      // ignore
    }
  }, [isEnabled]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

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

    appendMessage({
      role: 'assistant',
      kind: 'text',
      content: 'Photo uploaded successfully. Thanks for sharing!',
      status: 'done',
    });
    return true;
  };

  const handleToolEvent = async (payload: any) => {
    const toolMessageId = appendMessage({
      role: 'assistant',
      kind: 'tool',
      content: '',
      toolName: payload?.toolName,
      toolPayload: payload,
      status: payload?.error ? 'error' : 'done',
    });

    if (payload?.toolName === 'prepare_upload_photo' && pendingAttachment) {
      const uploaded = await uploadAttachment(payload?.output?.upload, pendingAttachment);
      if (uploaded) {
        setPendingAttachment(null);
      }
      updateMessage(toolMessageId, { status: 'done' });
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
      const text = await response.text();
      throw new Error(text || 'Agent request failed.');
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
            void handleToolEvent(payload);
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

  const sendMessage = async (content: string) => {
    if (isStreaming) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const attachmentName = pendingAttachment?.name ?? null;
    const userMessage: Message = {
      id: createMessageId(),
      role: 'user',
      kind: 'text',
      content: trimmed,
      attachmentName,
      status: 'done',
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
    }
  };

  return (
    <AgentChatContext.Provider
      value={{
        isOpen,
        isEnabled,
        isStreaming,
        messages,
        pendingAttachment,
        openChat,
        closeChat,
        toggleChat,
        setEnabled,
        sendMessage,
        setPendingAttachment,
      }}
    >
      {children}
    </AgentChatContext.Provider>
  );
}
