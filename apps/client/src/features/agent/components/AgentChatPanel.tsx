import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Input, Box } from '@chakra-ui/react';
import { X, Send } from 'lucide-react';
import { useAgentChat, Message } from './AgentChatContext';
import { getSessionAccessToken } from '../../auth/sessionCache';

const logoLight = new URL(
  '../../../assets/logo/logo_light.png',
  import.meta.url
).href;

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

function UploadToolCard({ uploadInfo }: { uploadInfo: any }) {
  const { uploadPhoto } = useAgentChat();
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setStatus('idle');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadInfo || status === 'uploading') return;
    setStatus('uploading');
    const success = await uploadPhoto(uploadInfo, selectedFile);
    setStatus(success ? 'done' : 'error');
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-xs font-semibold text-gray-500">Upload a dish photo</p>
      <div className="overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50">
        {previewUrl ? (
          <img src={previewUrl} alt="Selected upload" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-gray-400">
            No photo selected
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleChoose}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === 'uploading'}
        >
          Choose photo
        </button>
        <button
          type="button"
          onClick={handleUpload}
          className="flex-1 rounded-lg bg-[#21421B] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2d5a24] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedFile || status === 'uploading'}
        >
          {status === 'uploading' ? 'Uploading…' : 'Upload photo'}
        </button>
      </div>
      {status === 'done' && (
        <p className="text-xs font-semibold text-emerald-600">Upload complete.</p>
      )}
      {status === 'error' && (
        <p className="text-xs font-semibold text-red-600">Upload failed. Try again.</p>
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

    timer = setInterval(async () => {
      if (!active) return;
      elapsed += intervalMs;
      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (elapsed >= timeoutMs) {
        await pollStatus(true);
        clearInterval(timer);
        return;
      }
      await pollStatus(false);
    }, intervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [payment]);

  const qrImage = payment?.qrCode ? `data:image/png;base64,${payment.qrCode}` : null;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-xs font-semibold text-gray-500">Checkout & Pay</p>
      {qrImage ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={qrImage}
            alt="NETS QR code"
            className="h-40 w-40 rounded-lg border border-gray-200 bg-white p-2"
          />
          <p className="text-xs text-gray-500">
            Scan to pay. Waiting for confirmation…
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">QR code unavailable.</p>
      )}
      {status === 'pending' && (
        <p className="text-xs text-gray-500">
          Time remaining: {Math.floor(secondsLeft / 60)}:
          {String(secondsLeft % 60).padStart(2, '0')}
        </p>
      )}
      {status === 'success' && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-600">Payment received.</p>
          {order?.orderCode && (
            <p className="text-xs text-gray-600">Order code: {order.orderCode}</p>
          )}
        </div>
      )}
      {status === 'fail' && (
        <p className="text-xs font-semibold text-red-600">
          {errorMessage || 'Payment timed out. Please try again.'}
        </p>
      )}
    </div>
  );
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
  const topVoted = toolName === 'get_top_voted_menu_items' && output ? output : null;
  const featured = toolName === 'get_featured_menu_items_by_cuisine' && output ? output : null;
  const hawkerInfo = toolName === 'get_hawker_info' && output ? output : null;
  const hawkerStalls = toolName === 'get_hawker_stalls' && output ? output : null;
  const hawkerDishes = toolName === 'get_hawker_dishes' && output ? output : null;
  const stallDetails = toolName === 'get_stall_details' && output ? output : null;
  const budgetInfo =
    (toolName === 'get_monthly_budget' ||
      toolName === 'update_monthly_budget' ||
      toolName === 'set_budget_notified') &&
    output
      ? output.budget ?? output
      : null;

  const qrCode =
    output?.nets?.result?.data?.qr_code ||
    output?.nets?.qr_code ||
    output?.nets?.result?.data?.qrCode ||
    null;

  const qrImage = qrCode ? `data:image/png;base64,${qrCode}` : null;
  const uploadInfo = toolName === 'prepare_upload_photo' ? output?.upload : null;
  const checkoutOrder = toolName === 'checkout_and_pay' ? output?.order : null;
  const checkoutPayment = toolName === 'checkout_and_pay' ? output?.payment : null;

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
          {checkoutPayment && (
            <NetsCheckoutCard order={checkoutOrder} payment={checkoutPayment} />
          )}
          {uploadInfo && <UploadToolCard uploadInfo={uploadInfo} />}
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
          {hawkerStalls && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Stalls</p>
              {Array.isArray(hawkerStalls) && hawkerStalls.length > 0 ? (
                <div className="space-y-2">
                  {hawkerStalls.map((stall: any) => (
                    <div
                      key={stall.id}
                      className="rounded-xl border border-gray-100 bg-white p-2"
                    >
                      <p className="text-xs font-semibold text-gray-700">{stall.name}</p>
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
        </>
      )}
    </div>
  );
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  const renderInline = (text: string) => {
    const parts = text.split('**');
    if (parts.length === 1) {
      return text;
    }
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={`bold-${index}`} className="font-semibold text-gray-900">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const formatMessageContent = (text: string) => {
    const normalized = text.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const blocks: Array<{ type: 'p'; text: string } | { type: 'list'; items: string[] }> =
      [];
    let paragraph: string[] = [];
    let listItems: string[] | null = null;

    const flushParagraph = () => {
      if (paragraph.length) {
        blocks.push({ type: 'p', text: paragraph.join(' ') });
        paragraph = [];
      }
    };

    const flushList = () => {
      if (listItems && listItems.length) {
        blocks.push({ type: 'list', items: listItems });
      }
      listItems = null;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      const bulletMatch = /^[-*]\s+(.*)/.exec(trimmed);
      if (bulletMatch) {
        flushParagraph();
        if (!listItems) {
          listItems = [];
        }
        listItems.push(bulletMatch[1]);
        return;
      }

      if (listItems) {
        flushList();
      }
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();

    const hasList = blocks.some((block) => block.type === 'list');
    if (!hasList && normalized.includes(' * ')) {
      const parts = normalized.split(/\s\*\s+/);
      if (parts.length > 1) {
        const prefix = parts.shift()?.trim();
        const items = parts.map((item) => item.trim()).filter(Boolean);
        blocks.length = 0;
        if (prefix) {
          blocks.push({ type: 'p', text: prefix });
        }
        if (items.length) {
          blocks.push({ type: 'list', items });
        }
      }
    }

    return (
      <div className="space-y-2">
        {blocks.map((block, index) => {
          if (block.type === 'list') {
            return (
              <ul key={`list-${index}`} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={`item-${index}-${itemIndex}`}>{renderInline(item)}</li>
                ))}
              </ul>
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

  const isTyping = message.status === 'streaming' && !message.content;

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
          formatMessageContent(message.content)
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
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            disabled={isStreaming}
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
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#21421B] text-white transition-colors hover:bg-[#2d5a24] disabled:opacity-60"
          disabled={isStreaming}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
