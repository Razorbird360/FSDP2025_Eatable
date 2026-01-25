import { createContext, useContext, useState, ReactNode } from 'react';

// Types
export interface Message {
  id: string;
  role: 'bot' | 'user';
  content: string;
}

interface AgentChatContextType {
  isOpen: boolean;
  messages: Message[];
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
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
  const [messages, setMessages] = useState<Message[]>(sampleMessages);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

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
        messages,
        openChat,
        closeChat,
        toggleChat,
        addMessage,
      }}
    >
      {children}
    </AgentChatContext.Provider>
  );
}
