import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import api from "@lib/api";

export default function QrScanModal({ open, orderId, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const busyRef = useRef(false);
  const successRef = useRef(false);

  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);

  const [err, setErr] = useState(null);

  // keep latest callbacks without restarting scanner
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function start() {
      setErr(null);
      busyRef.current = false;
      successRef.current = false;

      try {
        const video = videoRef.current;
        if (!video) return;

        video.setAttribute("playsinline", "true");
        video.muted = true;

        const scanner = new QrScanner(
          video,
          async (result) => {
            if (successRef.current) return;
            if (busyRef.current) return;
            busyRef.current = true;

            try {
              const raw = String(result?.data || "").trim();
              if (!raw) {
                busyRef.current = false;
                return;
              }

              let qrOrderId = orderId;
              let token = raw;

              // ✅ handle JSON QR payload: { orderId, token }
              try {
                const parsed = JSON.parse(raw);
                if (parsed?.token) token = String(parsed.token).trim();
                if (parsed?.orderId) qrOrderId = String(parsed.orderId).trim();
              } catch (e) {
                // raw token fallback (non-JSON QR)
              }

              if (!qrOrderId || !token) {
                setErr("Invalid QR payload.");
                busyRef.current = false;
                return;
              }

              const res = await api.post(`/hawker/orders/${qrOrderId}/collect`, {
                token,
              });

              // ✅ stop camera/scanner then close modal immediately
              successRef.current = true;

              try {
                const s = scannerRef.current;
                scannerRef.current = null;
                s?.stop();
                s?.destroy();
              } catch (e) {
                // ignore stop/destroy errors
              }

              setErr(null);

              // refresh parent (moves order to history), then close modal
              onSuccessRef.current?.(res.data);
              onCloseRef.current?.();
            } catch (e) {
              setErr(
                e?.response?.data?.error || "Invalid QR / failed to collect."
              );
              busyRef.current = false;
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
      } catch (e) {
        if (!cancelled) setErr("Camera permission denied or not available.");
      }
    }

    start();

    return () => {
      cancelled = true;
      busyRef.current = false;
      successRef.current = false;

      const s = scannerRef.current;
      scannerRef.current = null;

      if (s) {
        try {
          s.stop();
        } catch (e) {
          // ignore
        }
        try {
          s.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [open, orderId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b">
          <div className="font-semibold text-gray-900">Scan Customer QR</div>
          <div className="text-xs text-gray-500 mt-1">
            Point the camera at the customer’s QR code.
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-lg overflow-hidden bg-black relative">
            <video ref={videoRef} className="w-full h-[320px] object-cover" />
          </div>

          {err ? (
            <div className="mt-3 text-sm text-red-600 font-semibold">{err}</div>
          ) : null}

          <button
            type="button"
            className="mt-4 w-full px-4 py-2.5 rounded-lg border border-gray-300 font-semibold"
            onClick={() => onCloseRef.current?.()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
