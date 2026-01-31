import { MessageSquareMore } from 'lucide-react';
import { useAgentChat } from './AgentChatContext';

const logoLight = new URL(
  '../../../assets/logo/logo_light.png',
  import.meta.url
).href;

export default function AgentChatButton() {
  const { isOpen, isEnabled, toggleChat } = useAgentChat();

  if (!isEnabled) return null;

  return (
    <button
      type="button"
      onClick={toggleChat}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
      className="
        fixed bottom-6 right-6 z-[60]
        flex h-14 w-14 items-center justify-center
        rounded-xl bg-[#21421B]
        shadow-[0_10px_30px_rgba(33,66,27,0.25)]
        transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-[0_14px_40px_rgba(33,66,27,0.32)]
      "
    >
      {/* Logo (visible when closed) */}
      <img
        src={logoLight}
        alt="At-Table Assistant"
        className={`
          absolute h-8 w-8 object-contain
          transition-all duration-300 ease-out
          ${isOpen ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}
        `}
      />
      {/* Icon (visible when open) */}
      <MessageSquareMore
        className={`
          absolute h-6 w-6 text-white
          transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}
        `}
      />
    </button>
  );
}
