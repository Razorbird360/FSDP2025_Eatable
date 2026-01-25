import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const CHAT_ENABLED_KEY = 'eatable:agentChatEnabled';

// Types
export interface Message {
  id: string;
  role: 'bot' | 'user';
  content: string;
}

interface AgentChatContextType {
  isOpen: boolean;
  isEnabled: boolean;
  messages: Message[];
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setEnabled: (enabled: boolean) => void;
  addMessage: (message: Omit<Message, 'id'>) => void;
}

// Sample messages for demonstration
const sampleMessages: Message[] = [
  {
    id: '1',
    role: 'bot',
    content: 'Hello! 👋 What are you hungry for today?',
  },
  {
    id: '2',
    role: 'user',
    content: 'What are the most popular stalls at Tiong Bahru hawker centre?',
  },
  {
    id: '3',
    role: 'bot',
    content:
      'Xin Lu Traditional TeoChew Handmade Fishball Noodle is a must try! Would you like to check out the dish?',
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
  const [messages, setMessages] = useState<Message[]>(sampleMessages);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_ENABLED_KEY, String(isEnabled));
    } catch {
      // ignore
    }
  }, [isEnabled]);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setIsOpen(false);
    }
  };

  const addMessage = (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <AgentChatContext.Provider
      value={{
        isOpen,
        isEnabled,
        messages,
        openChat,
        closeChat,
        toggleChat,
        setEnabled,
        addMessage,
      }}
    >
      {children}
    </AgentChatContext.Provider>
  );
}
