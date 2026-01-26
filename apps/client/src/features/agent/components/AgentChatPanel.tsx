import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Input, Box } from '@chakra-ui/react';
import { X, Send, Paperclip, XCircle } from 'lucide-react';
import { useAgentChat, Message } from './AgentChatContext';

const logoLight = new URL(
  '../../../assets/logo/logo_light.png',
  import.meta.url
).href;

interface MessageBubbleProps {
  message: Message;
}

function ToolBubble({ message }: MessageBubbleProps) {
  const payload = message.toolPayload as any;
  const toolName = message.toolName || payload?.toolName || 'tool';
  const output = payload?.output;
  const error = payload?.error;
  const uploads = Array.isArray(output)
    ? output
    : Array.isArray(output?.uploads)
      ? output.uploads
      : [];
  const showUploads =
    toolName === 'get_dish_uploads' || toolName === 'get_stall_gallery';
  const searchResults =
    toolName === 'search_entities' && output
      ? {
          hawkerCentres: output.hawkerCentres ?? [],
          stalls: output.stalls ?? [],
          dishes: output.dishes ?? [],
        }
      : null;
  const cartData = toolName === 'get_cart' && output ? output : null;
  const orderSummary =
    toolName === 'create_order_from_cart' && output ? output : null;
  const orderDetails = toolName === 'get_order_by_id' && output ? output : null;

  const qrCode =
    output?.nets?.result?.data?.qr_code ||
    output?.nets?.qr_code ||
    output?.nets?.result?.data?.qrCode ||
    null;

  const qrImage = qrCode ? `data:image/png;base64,${qrCode}` : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tool
        </span>
        <span className="rounded-full bg-[#21421B]/10 px-2 py-1 text-xs font-semibold text-[#21421B]">
          {toolName}
        </span>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <>
          {searchResults && (
            <div className="mt-3 space-y-4">
              {['hawkerCentres', 'stalls', 'dishes'].every(
                (key) => searchResults[key as keyof typeof searchResults].length === 0
              ) ? (
                <p className="text-xs text-gray-500">No results found.</p>
              ) : (
                ([
                  {
                    title: 'Hawker Centres',
                    items: searchResults.hawkerCentres,
                    subtitleKey: 'address',
                  },
                  {
                    title: 'Stalls',
                    items: searchResults.stalls,
                    subtitleKey: 'hawkerCentre',
                  },
                  {
                    title: 'Dishes',
                    items: searchResults.dishes,
                    subtitleKey: null,
                  },
                ] as const).map((section) => (
                  <div key={section.title} className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">{section.title}</p>
                    {section.items.length === 0 ? (
                      <p className="text-xs text-gray-400">No matches.</p>
                    ) : (
                      <div className="space-y-2">
                        {section.items.map((item: any) => {
                          const imageUrl = item.imageUrl || item.image_url || null;
                          const subtitle =
                            section.subtitleKey === 'address'
                              ? item.address
                              : section.subtitleKey === 'hawkerCentre'
                                ? item.hawkerCentre?.name
                                : null;
                          const initials = item.name?.slice(0, 1)?.toUpperCase() ?? '?';

                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2"
                            >
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                                  {initials}
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-700">
                                  {item.name}
                                </p>
                                {subtitle && (
                                  <p className="text-[11px] text-gray-500">{subtitle}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {cartData && (
            <div className="mt-3 space-y-3">
              {Array.isArray(cartData.cart) && cartData.cart.length > 0 ? (
                cartData.cart.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-2"
                  >
                    {item.menuItem?.imageUrl ? (
                      <img
                        src={item.menuItem.imageUrl}
                        alt={item.menuItem.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                        {(item.menuItem?.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {item.menuItem?.name || 'Unknown item'}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Qty: {item.quantity ?? 1}
                        {item.menuItem?.priceCents != null && (
                          <> • ${(item.menuItem.priceCents / 100).toFixed(2)}</>
                        )}
                      </p>
                      {item.request && (
                        <p className="text-[11px] text-gray-400">Note: {item.request}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">Your cart is empty.</p>
              )}
            </div>
          )}
          {orderSummary && (
            <div className="mt-3 space-y-2 rounded-xl border border-gray-100 bg-white p-3">
              <p className="text-xs font-semibold text-gray-500">Order created</p>
              <p className="text-sm font-semibold text-gray-700">
                Order #{orderSummary.order?.orderCode || orderSummary.orderId}
              </p>
              {orderSummary.order?.totalCents != null && (
                <p className="text-xs text-gray-500">
                  Total: ${(orderSummary.order.totalCents / 100).toFixed(2)}
                </p>
              )}
            </div>
          )}
          {orderDetails && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <p className="text-xs font-semibold text-gray-500">Order details</p>
                <p className="text-sm font-semibold text-gray-700">
                  {orderDetails.stall?.name || 'Order'}
                </p>
                {orderDetails.info?.orderCode && (
                  <p className="text-xs text-gray-500">
                    Code: {orderDetails.info.orderCode}
                  </p>
                )}
                {orderDetails.info?.status && (
                  <span className="mt-2 inline-flex rounded-full bg-[#21421B]/10 px-2 py-1 text-[11px] font-semibold text-[#21421B]">
                    {orderDetails.info.status}
                  </span>
                )}
              </div>
              {Array.isArray(orderDetails.items) && orderDetails.items.length > 0 && (
                <div className="space-y-2">
                  {orderDetails.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-2"
                    >
                      {item.menuItem?.imageUrl ? (
                        <img
                          src={item.menuItem.imageUrl}
                          alt={item.menuItem.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                          {(item.menuItem?.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">
                          {item.menuItem?.name || 'Item'}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Qty: {item.quantity}
                          {item.unitCents != null && (
                            <> • ${(item.unitCents / 100).toFixed(2)}</>
                          )}
                        </p>
                        {item.request && (
                          <p className="text-[11px] text-gray-400">Note: {item.request}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {showUploads && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {uploads.length === 0 ? (
                <p className="text-xs text-gray-500">No community photos yet.</p>
              ) : (
                uploads.map((upload: any) => (
                  <div
                    key={upload.id}
                    className="rounded-xl border border-gray-200 bg-white p-2"
                  >
                    {upload.imageUrl ? (
                      <img
                        src={upload.imageUrl}
                        alt={upload.caption || 'Community upload'}
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                        No image
                      </div>
                    )}
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {upload.user?.displayName || 'Community member'}
                      </p>
                      {upload.caption && (
                        <p className="text-xs text-gray-500">{upload.caption}</p>
                      )}
                      <p className="text-[11px] text-gray-400">
                        {upload.upvoteCount ?? 0} upvotes • {upload.downvoteCount ?? 0} downvotes
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {qrImage && (
            <div className="mt-3 flex justify-center">
              <img
                src={qrImage}
                alt="NETS QR code"
                className="h-40 w-40 rounded-lg border border-gray-200 bg-white p-2"
              />
            </div>
          )}
          <details className="mt-3 text-xs text-gray-500">
            <summary className="cursor-pointer select-none text-gray-600">
              View details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-2 text-[11px] text-gray-600">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  if (message.kind === 'tool') {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#21421B]">
          <img src={logoLight} alt="At-Table" className="h-7 w-7 object-contain" />
        </div>
        <ToolBubble message={message} />
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      {isAssistant ? (
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
        {message.attachmentName && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
            Attachment: {message.attachmentName}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentChatPanel() {
  const {
    isOpen,
    messages,
    closeChat,
    sendMessage,
    isStreaming,
    pendingAttachment,
    setPendingAttachment,
  } = useAgentChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed && !pendingAttachment) return;

    const message = trimmed || 'Please upload this photo.';
    setInputValue('');
    await sendMessage(message);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPendingAttachment(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            isDisabled={isStreaming}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAttachmentChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleAttachClick}
          aria-label="Attach photo"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
          disabled={isStreaming}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleSend}
          aria-label="Send message"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#21421B] text-white transition-colors hover:bg-[#2d5a24] disabled:opacity-60"
          disabled={isStreaming}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      {pendingAttachment && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
          <span className="truncate">Ready to upload: {pendingAttachment.name}</span>
          <button
            type="button"
            onClick={() => setPendingAttachment(null)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <XCircle className="h-4 w-4" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
