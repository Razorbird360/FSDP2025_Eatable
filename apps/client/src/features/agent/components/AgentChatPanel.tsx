import { useState, useRef, useEffect, useMemo, KeyboardEvent, ChangeEvent } from 'react';
import { Input, Box } from '@chakra-ui/react';
import { X, Send, ChevronDown, ImagePlus } from 'lucide-react';
import { useAgentChat, Message } from './AgentChatContext';
import { getSessionAccessToken } from '../../auth/sessionCache';

const logoLight = new URL(
  '../../../assets/logo/logo_light.png',
  import.meta.url
).href;

const TOOL_LABELS: Record<string, string> = {
  search_entities: 'Search',
  list_hawker_centres: 'Hawker centres list',
  list_stalls: 'Stalls list',
  get_hawker_info: 'Hawker centre info',
  get_hawker_stalls: 'Hawker centre stalls',
  get_hawker_dishes: 'Hawker centre dishes',
  get_stall_details: 'Stall details',
  get_stall_gallery: 'Stall gallery',
  get_top_voted_menu_items: 'Top voted items',
  get_featured_menu_items_by_cuisine: 'Featured items by cuisine',
  get_cart: 'View cart',
  add_to_cart: 'Add to cart',
  update_cart_item: 'Update cart item',
  remove_cart_item: 'Remove cart item',
  clear_cart: 'Clear cart',
  request_nets_qr: 'Request NETS QR',
  query_nets_qr_status: 'Check NETS payment',
  get_dish_uploads: 'Dish uploads',
  create_order_from_cart: 'Create order',
  checkout_and_pay: 'Checkout & pay',
  get_order_by_id: 'Order details',
  get_my_orders: 'Order history',
};

const formatToolLabel = (name: string) => {
  if (!name) return 'Tool';
  if (TOOL_LABELS[name]) return TOOL_LABELS[name];
  return name
    .split('_')
    .map((segment) =>
      segment ? segment[0].toUpperCase() + segment.slice(1) : segment
    )
    .join(' ');
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const buildApiUrl = (path: string) => {
  if (path.startsWith('http')) {
    return path;
  }

  if (path.startsWith('/api')) {
    return `${API_BASE_URL}${path.replace(/^\/api/, '')}`;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

interface MessageBubbleProps {
  message: Message;
  introTyping?: boolean;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 text-gray-500">
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
        style={{ animationDelay: '120ms' }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
        style={{ animationDelay: '240ms' }}
      />
    </div>
  );
}

function UploadGrid({ uploads }: { uploads: any[] }) {
  if (!uploads || uploads.length === 0) {
    return <p className="text-xs text-gray-500">No community uploads yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {uploads.map((upload: any) => (
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
      ))}
    </div>
  );
}

function UploadToolCard({ uploadInfo }: { uploadInfo: any }) {
  const { uploadPhoto, sendMessage } = useAgentChat();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [selectedFile]);

  const handleChoose = () => {
    if (status === 'uploading') return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || status === 'uploading') {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }
    setSelectedFile(file);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (!uploadInfo) return;
    setStatus('uploading');
    const success = await uploadPhoto(uploadInfo, file);
    setStatus(success ? 'done' : 'error');
    if (success) {
      const menuItemId =
        uploadInfo?.menuItemId || uploadInfo?.fields?.menuItemId || 'unknown';
      const aspectRatio = uploadInfo?.fields?.aspectRatio || 'square';
      await sendMessage(
        `Photo uploaded for menuItemId ${menuItemId} (aspectRatio: ${aspectRatio}).`,
        { silent: true }
      );
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-xs font-semibold text-gray-500">Upload a dish photo</p>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleChoose}
          disabled={status === 'uploading'}
          className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected upload"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-xs">
              <ImagePlus className="h-6 w-6" />
              <span>Upload photo</span>
            </div>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {status === 'done' && (
        <p className="text-xs font-semibold text-emerald-600">Upload complete.</p>
      )}
      {status === 'error' && (
        <p className="text-xs font-semibold text-red-600">Upload failed. Try again.</p>
      )}
      {status === 'uploading' && (
        <p className="text-xs font-semibold text-gray-500">Uploading…</p>
      )}
    </div>
  );
}

function NetsCheckoutCard({
  order,
  payment,
}: {
  order: any;
  payment: any;
}) {
  const [status, setStatus] = useState<'pending' | 'success' | 'fail'>('pending');
  const [secondsLeft, setSecondsLeft] = useState<number>(
    Number(payment?.polling?.timeoutSeconds ?? 300)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!payment?.txnRetrievalRef || !payment?.polling?.url) {
      return;
    }

    let active = true;
    const ensureOrderExists = async () => {
      if (!order?.id) return true;
      const token = getSessionAccessToken();
      try {
        const response = await fetch(buildApiUrl(`/orders/getOrder/${order.id}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!response.ok) return false;
        const data = await response.json();
        return Boolean(data);
      } catch {
        return false;
      }
    };
    let elapsed = 0;
    const intervalMs = Number(payment.polling.intervalMs ?? 5000);
    const timeoutMs = Number(payment.polling.timeoutSeconds ?? 300) * 1000;
    let timer: ReturnType<typeof setInterval> | null = null;

    const pollStatus = async (isFinal = false) => {
      const token = getSessionAccessToken();
      try {
        const response = await fetch(buildApiUrl(payment.polling.url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            txn_retrieval_ref: payment.txnRetrievalRef,
            frontend_timeout_status: isFinal ? 1 : 0,
          }),
        });

        if (!response.ok) {
          throw new Error('Payment status request failed.');
        }

        const data = await response.json();
        const result = data?.result?.data ?? {};
        const isSuccess = result.response_code === '00' && Number(result.txn_status) === 1;

        if (isSuccess) {
          if (active) {
            setStatus('success');
          }
          if (timer) {
            clearInterval(timer);
          }
          return true;
        }

        if (isFinal && active) {
          setStatus('fail');
        }
        return false;
      } catch (error) {
        if (isFinal && active) {
          setStatus('fail');
          setErrorMessage('Payment status failed. Please try again.');
        }
        return false;
      }
    };

    const startPolling = async () => {
      const exists = await ensureOrderExists();
      if (!exists) {
        if (active) {
          setStatus('fail');
          setErrorMessage('Payment session expired. Please start checkout again.');
        }
        return;
      }

      timer = setInterval(async () => {
        if (!active) return;
        elapsed += intervalMs;
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setSecondsLeft(remaining);
        if (elapsed >= timeoutMs) {
          await pollStatus(true);
          if (timer) clearInterval(timer);
          return;
        }
        await pollStatus(false);
      }, intervalMs);
    };

    void startPolling();

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [payment, order?.id]);

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-xs font-semibold text-gray-500">Checkout & Pay</p>
      <p className="text-xs text-gray-500">Waiting for payment confirmation…</p>
      {status === 'pending' && (
        <p className="text-xs text-gray-500">
          Time remaining: {Math.floor(secondsLeft / 60)}:
          {String(secondsLeft % 60).padStart(2, '0')}
        </p>
      )}
      {errorMessage && (
        <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
      )}
      {status === 'success' && (
        <p className="text-xs font-semibold text-emerald-600">
          Payment successful.
        </p>
      )}
      {status === 'fail' && !errorMessage && (
        <p className="text-xs font-semibold text-red-600">Payment failed.</p>
      )}
    </div>
  );
}

function ToolBubble({ message }: MessageBubbleProps) {
  const payload = message.toolPayload as any;
  const toolName = message.toolName || payload?.toolName || 'tool';
  const [showDetails, setShowDetails] = useState(false);
  const toolLabel = formatToolLabel(toolName);
  const output = payload?.output ?? payload;
  const error = payload?.error;
  const uploads = Array.isArray(output)
    ? output
    : Array.isArray(output?.uploads)
      ? output.uploads
      : Array.isArray(output?.output)
        ? output.output
        : Array.isArray(output?.output?.uploads)
          ? output.output.uploads
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
  const cartData =
    ['get_cart', 'add_to_cart', 'update_cart_item', 'remove_cart_item', 'clear_cart'].includes(
      toolName
    ) && output
      ? output
      : null;
  const orderSummary =
    toolName === 'create_order_from_cart' && output ? output : null;
  const orderDetails = toolName === 'get_order_by_id' && output ? output : null;
  const topVoted = toolName === 'get_top_voted_menu_items' && output ? output : null;
  const featured = toolName === 'get_featured_menu_items_by_cuisine' && output ? output : null;
  const hawkerInfo = toolName === 'get_hawker_info' && output ? output : null;
  const hawkerList = toolName === 'list_hawker_centres' && output ? output : null;
  const stallsList =
    (toolName === 'get_hawker_stalls' ||
      toolName === 'list_stalls' ||
      toolName === 'get_popular_stalls') &&
    output
      ? output
      : null;
  const hawkerDishes = toolName === 'get_hawker_dishes' && output ? output : null;
  const stallDetails = toolName === 'get_stall_details' && output ? output : null;
  const budgetInfo =
    (toolName === 'get_monthly_budget' ||
      toolName === 'update_monthly_budget' ||
      toolName === 'set_budget_notified') &&
    output
      ? output.budget ?? output
      : null;

  const uploadInfo =
    toolName === 'prepare_upload_photo' && output?.upload
      ? {
          ...output.upload,
          menuItemId: output.menuItemId ?? output.upload?.fields?.menuItemId ?? null,
        }
      : null;
  const checkoutOrder = toolName === 'checkout_and_pay' ? output?.order : null;
  const checkoutPayment = toolName === 'checkout_and_pay' ? output?.payment : null;
  const canToggleDetails = !error && !uploadInfo;

  const detailsWrapperClass = showDetails
    ? 'w-full max-w-[560px]'
    : 'w-[260px] max-w-[75%]';

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm ${detailsWrapperClass}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tool
        </span>
        <div className="flex items-center gap-2">
          <span
            className="max-w-[150px] truncate rounded-full bg-[#21421B]/10 px-2 py-1 text-xs font-semibold text-[#21421B]"
            title={toolLabel}
          >
            {toolLabel}
          </span>
        </div>
      </div>
      {canToggleDetails && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-700"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          {showDetails ? 'Hide details' : 'Show details'}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              showDetails ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <>
          {uploadInfo && <UploadToolCard uploadInfo={uploadInfo} />}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showDetails ? 'max-h-[2200px] opacity-100' : 'max-h-0 opacity-0'
            }`}
            aria-hidden={!showDetails}
          >
            <div className={showDetails ? 'mt-2' : ''}>
          {showUploads && (
            <div className="mt-3">
              <UploadGrid uploads={uploads} />
            </div>
          )}
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
                        {section.items.map((item: any, idx: number) => {
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
                              {section.title === 'Stalls' && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#21421B]/10 text-[11px] font-semibold text-[#21421B]">
                                  {idx + 1}
                                </div>
                              )}
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
          {hawkerList && (
            <div className="mt-3 space-y-2">
              {Array.isArray(hawkerList) && hawkerList.length > 0 ? (
                hawkerList.map((centre: any, idx: number) => (
                  <div
                    key={centre.id ?? `${centre.name}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#21421B]/10 text-[11px] font-semibold text-[#21421B]">
                      {idx + 1}
                    </div>
                    {centre.imageUrl ? (
                      <img
                        src={centre.imageUrl}
                        alt={centre.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                        {(centre.name ?? '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700">{centre.name}</p>
                      {centre.address && (
                        <p className="text-xs text-gray-500">{centre.address}</p>
                      )}
                      {centre.postalCode && (
                        <p className="text-[11px] text-gray-400">{centre.postalCode}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No hawker centres found.</p>
              )}
            </div>
          )}
          {checkoutPayment && (
            <NetsCheckoutCard order={checkoutOrder} payment={checkoutPayment} />
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
              {orderSummary.order?.orderCode && (
                <p className="text-sm font-semibold text-gray-700">
                  Order #{orderSummary.order.orderCode}
                </p>
              )}
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
          {topVoted && (
            <div className="mt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500">Top voted</p>
              {Array.isArray(topVoted) && topVoted.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {topVoted.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-100 bg-white p-2"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-28 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                          No image
                        </div>
                      )}
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-700">{item.name}</p>
                        {item.priceCents != null && (
                          <p className="text-[11px] text-gray-500">
                            ${(item.priceCents / 100).toFixed(2)}
                          </p>
                        )}
                        {item.stall?.name && (
                          <p className="text-[11px] text-gray-400">{item.stall.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No top picks yet.</p>
              )}
            </div>
          )}
          {featured && (
            <div className="mt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500">Featured by cuisine</p>
              {Array.isArray(featured) && featured.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {featured.map((item: any) => (
                    <div
                      key={item.cuisineType}
                      className="rounded-xl border border-gray-100 bg-white p-2"
                    >
                      <p className="text-[11px] font-semibold text-gray-500">
                        {item.cuisineType}
                      </p>
                      {item.menuItem ? (
                        <>
                          {item.menuItem.imageUrl ? (
                            <img
                              src={item.menuItem.imageUrl}
                              alt={item.menuItem.name}
                              className="mt-2 h-24 w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                              No image
                            </div>
                          )}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700">
                              {item.menuItem.name}
                            </p>
                            {item.menuItem.priceCents != null && (
                              <p className="text-[11px] text-gray-500">
                                ${(item.menuItem.priceCents / 100).toFixed(2)}
                              </p>
                            )}
                            {item.stall?.name && (
                              <p className="text-[11px] text-gray-400">
                                {item.stall.name}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">No match yet.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No featured dishes yet.</p>
              )}
            </div>
          )}
          {hawkerInfo && (
            <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3">
              <p className="text-xs font-semibold text-gray-500">Hawker centre</p>
              <p className="text-sm font-semibold text-gray-700">{hawkerInfo.name}</p>
              {hawkerInfo.address && (
                <p className="text-xs text-gray-500">{hawkerInfo.address}</p>
              )}
              {hawkerInfo.postalCode && (
                <p className="text-[11px] text-gray-400">{hawkerInfo.postalCode}</p>
              )}
            </div>
          )}
          {stallsList && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Stalls</p>
              {Array.isArray(stallsList) && stallsList.length > 0 ? (
                <div className="space-y-2">
                  {stallsList.map((stall: any, idx: number) => (
                    <div
                      key={stall.id}
                      className="rounded-xl border border-gray-100 bg-white p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#21421B]/10 text-[11px] font-semibold text-[#21421B]">
                          {idx + 1}
                        </div>
                      <p className="text-xs font-semibold text-gray-700">{stall.name}</p>
                      </div>
                      {stall.cuisineType && (
                        <p className="text-[11px] text-gray-500">{stall.cuisineType}</p>
                      )}
                      {stall.location && (
                        <p className="text-[11px] text-gray-400">{stall.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No stalls found.</p>
              )}
            </div>
          )}
          {hawkerDishes && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Dishes</p>
              {Array.isArray(hawkerDishes) && hawkerDishes.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {hawkerDishes.map((dish: any) => (
                    <div
                      key={dish.id}
                      className="rounded-xl border border-gray-100 bg-white p-2"
                    >
                      {dish.imageUrl ? (
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="h-24 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                          No image
                        </div>
                      )}
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-700">{dish.name}</p>
                        {dish.priceCents != null && (
                          <p className="text-[11px] text-gray-500">
                            ${(dish.priceCents / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No dishes found.</p>
              )}
            </div>
          )}
          {stallDetails && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <p className="text-xs font-semibold text-gray-500">Stall</p>
                <p className="text-sm font-semibold text-gray-700">
                  {stallDetails.name}
                </p>
                {stallDetails.cuisineType && (
                  <p className="text-xs text-gray-500">{stallDetails.cuisineType}</p>
                )}
                {stallDetails.location && (
                  <p className="text-[11px] text-gray-400">{stallDetails.location}</p>
                )}
              </div>
              {Array.isArray(stallDetails.menuItems) && stallDetails.menuItems.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {stallDetails.menuItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-100 bg-white p-2"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-24 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                          No image
                        </div>
                      )}
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-700">{item.name}</p>
                        {item.priceCents != null && (
                          <p className="text-[11px] text-gray-500">
                            ${(item.priceCents / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {budgetInfo && (
            <div className="mt-3 space-y-2 rounded-xl border border-gray-100 bg-white p-3">
              <p className="text-xs font-semibold text-gray-500">Monthly budget</p>
              <p className="text-sm font-semibold text-gray-700">
                ${(budgetInfo.budgetCents / 100).toFixed(2)}
              </p>
              <p className="text-[11px] text-gray-500">
                Alert at {budgetInfo.alertAtPercent ?? 80}%
              </p>
            </div>
          )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessageBubble({ message, introTyping = false }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  const isTyping =
    introTyping || (message.status === 'streaming' && !message.content);

  const renderBoldSegments = (segment: string, keyPrefix: string) => {
    const parts = segment.split('**');
    if (parts.length === 1) {
      return [segment];
    }
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={`${keyPrefix}-bold-${index}`} className="font-semibold text-gray-900">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const renderInline = (text: string) => {
    if (!text.includes('`')) {
      const rendered = renderBoldSegments(text, 'inline');
      return rendered.length === 1 ? rendered[0] : rendered;
    }

    const parts = text.split('`');
    return parts.flatMap((part, index) => {
      if (index % 2 === 1) {
        return (
          <span
            key={`code-${index}`}
            className="font-semibold font-mono text-gray-900"
          >
            {part}
          </span>
        );
      }
      return renderBoldSegments(part, `inline-${index}`);
    });
  };

  const formatMessageContent = (text: string) => {
    const normalized = text.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const blocks: Array<
      | { type: 'p'; text: string }
      | { type: 'list'; items: string[]; ordered: boolean }
    > = [];
    let paragraph: string[] = [];
    let listItems: string[] | null = null;
    let listOrdered = false;

    const flushParagraph = () => {
      if (paragraph.length) {
        blocks.push({ type: 'p', text: paragraph.join(' ') });
        paragraph = [];
      }
    };

    const flushList = () => {
      if (listItems && listItems.length) {
        blocks.push({ type: 'list', items: listItems, ordered: listOrdered });
      }
      listItems = null;
      listOrdered = false;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      const bulletMatch = /^[-*]\s+(.*)/.exec(trimmed);
      const numberMatch = /^\d+\.\s+(.*)/.exec(trimmed);
      if (bulletMatch) {
        flushParagraph();
        if (listItems && listOrdered) {
          flushList();
        }
        if (!listItems) listItems = [];
        listOrdered = false;
        listItems.push(bulletMatch[1]);
        return;
      }
      if (numberMatch) {
        flushParagraph();
        if (listItems && !listOrdered) {
          flushList();
        }
        if (!listItems) listItems = [];
        listOrdered = true;
        listItems.push(numberMatch[1]);
        return;
      }

      // Handle inline bullet pattern (e.g., "text: * item1 * item2")
      if (!listItems && trimmed.includes(' * ') && !paragraph.length) {
        const inlineBullets = trimmed.split(/\s\*\s+/);
        if (inlineBullets.length > 1) {
          const firstPart = inlineBullets[0];
          if (firstPart && !firstPart.endsWith(':')) {
            // Not an inline bullet pattern, treat as regular text
            paragraph.push(trimmed);
            return;
          }
          // This is a list prefixed with text like "category: * item1 * item2"
          if (firstPart) {
            blocks.push({ type: 'p', text: firstPart + ':' });
          }
          const items = inlineBullets.slice(1).filter(Boolean);
          if (items.length) {
            blocks.push({ type: 'list', items, ordered: false });
          }
          return;
        }
      }

      if (listItems) {
        flushList();
      }
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();

    return (
      <div className="space-y-2">
        {blocks.map((block, index) => {
          if (block.type === 'list') {
            const ListTag = block.ordered ? 'ol' : 'ul';
            const listClass = block.ordered
              ? 'list-decimal space-y-1 pl-5'
              : 'list-disc space-y-1 pl-5';
            return (
              <ListTag key={`list-${index}`} className={listClass}>
                {block.items.map((item, itemIndex) => (
                  <li key={`item-${index}-${itemIndex}`}>{renderInline(item)}</li>
                ))}
              </ListTag>
            );
          }
          return <p key={`p-${index}`}>{renderInline(block.text)}</p>;
        })}
      </div>
    );
  };

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

  if (message.kind === 'gallery') {
    const uploads = Array.isArray(message.galleryItems) ? message.galleryItems : [];
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#21421B]">
          <img src={logoLight} alt="At-Table" className="h-7 w-7 object-contain" />
        </div>
        <div className="max-w-[75%] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
          <UploadGrid uploads={uploads} />
        </div>
      </div>
    );
  }

  if (message.kind === 'qr') {
    const qrImage = message.qrImage;
    if (!qrImage) {
      return null;
    }
    const qrStatus = message.qrStatus ?? 'pending';
    const grayscale =
      qrStatus === 'success' ? 'grayscale opacity-60' : '';
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#21421B]">
          <img src={logoLight} alt="At-Table" className="h-7 w-7 object-contain" />
        </div>
        <div className="max-w-[75%] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <img
            src={qrImage}
            alt="NETS QR code"
            className={`h-48 w-48 rounded-xl border border-gray-200 bg-white p-2 ${grayscale}`}
          />
        </div>
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
          bg-white border border-gray-200 text-gray-800 shadow-sm
          ${isTyping ? 'h-12 py-0 flex items-center' : ''}
        `}
      >
        {isTyping ? (
          <TypingDots />
        ) : (
          formatMessageContent(message.displayContent ?? message.content)
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
  } = useAgentChat();
  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.hidden),
    [messages]
  );
  const [inputValue, setInputValue] = useState('');
  const [introPhase, setIntroPhase] = useState<'idle' | 'typing' | 'reveal'>(
    'idle'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  useEffect(() => {
    if (!isOpen) {
      setIntroPhase('idle');
      return;
    }

    const firstMessage = visibleMessages[0];
    const introMessage =
      visibleMessages.length === 1 &&
      firstMessage?.role === 'assistant' &&
      firstMessage?.content === 'Hello! 👋 What are you hungry for today?';

    if (!introMessage) {
      setIntroPhase('idle');
      return;
    }

    setIntroPhase('typing');
    const timer = window.setTimeout(() => {
      setIntroPhase('reveal');
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    visibleMessages.length,
    visibleMessages[0]?.role,
    visibleMessages[0]?.content,
  ]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setInputValue('');
    await sendMessage(trimmed);
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
        {visibleMessages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            introTyping={introPhase === 'typing' && index === 0}
          />
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
            disabled={isStreaming}
            borderRadius="xl"
            border="1px solid"
            borderColor="#E7EEE7"
            bg="#F8F9FA"
            color="#4A554B"
            fontSize="sm"
            height="48px"
            paddingX="1rem"
            _placeholder={{ color: '#6d7f68' }}
            _hover={{ bg: 'white', borderColor: '#21421B' }}
            _focus={{ borderColor: '#21421B', boxShadow: 'none', bg: 'white' }}
          />
        </Box>
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
    </div>
  );
}
