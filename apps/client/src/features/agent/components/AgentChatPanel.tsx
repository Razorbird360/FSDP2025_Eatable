import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Input, Box } from '@chakra-ui/react';
import { X, Send } from 'lucide-react';
import { useAgentChat, Message } from './AgentChatContext';

const logoLight = new URL(
  '../../../assets/logo/logo_light.png',
  import.meta.url
).href;

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isBot = message.role === 'bot';

  return (
    <div className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      {isBot ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#21421B]">
          <img src={logoLight} alt="At-Table" className="h-7 w-7 object-contain" />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6B5B95] text-white font-semibold text-lg">
          R
        </div>
      )}

      {/* Bubble */}
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed
          ${
            isBot
              ? 'bg-white border border-gray-200 text-gray-800 shadow-sm'
              : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function AgentChatPanel() {
  const { isOpen, messages, closeChat, addMessage } = useAgentChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    addMessage({ role: 'user', content: trimmed });
    setInputValue('');

    // Simulate bot response after a delay
    setTimeout(() => {
      addMessage({
        role: 'bot',
        content: "I'm looking into that for you! This is a demo response.",
      });
    }, 1000);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`
        fixed bottom-24 right-6 z-[59]
        w-[450px] max-w-[calc(100vw-48px)]
        rounded-2xl bg-white
        shadow-[0_20px_60px_rgba(0,0,0,0.2)]
        transition-all duration-300 ease-out
        origin-bottom-right
        ${
          isOpen
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0'
        }
      `}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between rounded-t-2xl bg-[#21421B] px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-white">At-Table</h2>
          <p className="text-sm text-white/80">
            Can't find what you need? Ask away!
          </p>
        </div>
        <button
          type="button"
          onClick={closeChat}
          aria-label="Close chat"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="h-[400px] overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 rounded-b-2xl">
        <Box className="relative flex-1">
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            borderRadius="xl"
            border="1px solid"
            borderColor="#E7EEE7"
            bg="#F8F9FA"
            color="#4A554B"
            fontSize="sm"
            height="48px"
            paddingLeft="1rem"
            _placeholder={{ color: '#6d7f68' }}
            _hover={{ bg: 'white', borderColor: '#21421B' }}
            _focus={{ borderColor: '#21421B', boxShadow: 'none', bg: 'white' }}
          />
        </Box>
        <button
          type="button"
          onClick={handleSend}
          aria-label="Send message"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#21421B] text-white transition-colors hover:bg-[#2d5a24]"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
