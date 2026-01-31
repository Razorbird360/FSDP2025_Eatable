import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@lib/api";
import { usePhotoUpload } from "../context/PhotoUploadContext";
import ValidationModal from "../../../components/ValidationModal";
import { toaster } from "../../../components/ui/toaster";

export default function UploadDetails() {
  const navigate = useNavigate();
  const {
    file: photoFile,
    previewUrl,
    aspectRatio,
    clearPhotoData,
  } = usePhotoUpload();

  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");

  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [validationStatus, setValidationStatus] = useState(null);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!photoFile) {
      navigate("/photo-upload", { replace: true });
    }
  }, [photoFile, navigate]);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const res = await api.get("/orders/my");
        if (active) {
          const list = Array.isArray(res.data?.orders) ? res.data.orders : [];
          setOrders(list);
          if (list.length > 0) {
            setSelectedOrderId(list[0].id);
            const firstDish = list[0].orderItems?.[0]?.menuItem?.id ?? "";
            setSelectedMenuItemId(firstDish);
          }
        }
      } catch (error) {
        if (active) {
          setOrdersError(
            error.response?.data?.error || "Failed to load your recent orders."
          );
        }
      } finally {
        if (active) {
          setOrdersLoading(false);
        }
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const selectedDish = useMemo(() => {
    if (!selectedOrder || !selectedMenuItemId) return null;
    return (selectedOrder.orderItems || []).find(
      (item) => item.menuItem?.id === selectedMenuItemId
    )?.menuItem;
  }, [selectedOrder, selectedMenuItemId]);

  useEffect(() => {
    if (selectedOrder?.orderItems?.length) {
      setSelectedMenuItemId(selectedOrder.orderItems[0].menuItem?.id || "");
    } else {
      setSelectedMenuItemId("");
    }
  }, [selectedOrder]);

  const handlePost = async () => {
    if (!photoFile) {
      setSubmitError("Please capture or upload a photo in the previous step.");
      return;
    }
    if (!selectedMenuItemId || selectedMenuItemId.trim() === "") {
      setSubmitError("Please select a dish to tag this photo to.");
      return;
    }
    if (!caption.trim()) {
      setSubmitError("Please provide a title for your photo.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    setValidationStatus("validating");
    setValidationMessage(`Verifying this is ${selectedDish?.name || "the correct dish"}...`);

    try {
      const formData = new FormData();
      formData.append("image", photoFile);
      formData.append("menuItemId", selectedMenuItemId.trim());
      formData.append("aspectRatio", aspectRatio || "square");

      const trimmedTitle = caption.trim();
      const trimmedDesc = description.trim();
      const combinedCaption = trimmedDesc
        ? `${trimmedTitle || "Untitled"} — ${trimmedDesc}`
        : trimmedTitle;

      if (combinedCaption) {
        formData.append("caption", combinedCaption);
      }

      const res = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 35000, // 35 seconds to account for AI validation
      });

      const serverStatus = res.data?.upload?.validationStatus || "pending";

      if (serverStatus !== "approved") {
        toaster.create({
          title: "Upload received but not approved",
          description:
            "Our reviewers will take a closer look. You can check back later.",
          type: "warning",
          duration: 5000,
        });
      } else {
        toaster.create({
          title: "Photo approved",
          description: "Your photo passed AI validation.",
          type: "success",
          duration: 3500,
        });
      }

      // Success - clear state and navigate
      setValidationStatus(null);
      clearPhotoData();
      setCaption("");
      setDescription("");
      navigate("/home", {
        replace: true,
        state: { photoUploaded: true },
      });
    } catch (error) {
      setValidationStatus(null);

      // Check if it's a validation error (400 with specific message)
      if (error.response?.status === 400 && error.response?.data?.message) {
        toaster.create({
          title: "Validation failed",
          description: error.response.data.message,
          type: "error",
          duration: 5000,
        });

        // Navigate back to photo upload after showing toast
        setTimeout(() => {
          navigate("/photo-upload");
        }, 1500);
      } else {
        setSubmitError(
          error.response?.data?.error ||
            error.message ||
            "Failed to upload photo. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelValidation = () => {
    // Cancel upload validation
    setValidationStatus(null);
    setValidationMessage("");
    setIsSubmitting(false);
  };

  return (
    <main className="flex flex-col bg-[#F6FBF2] pt-6 pb-10 min-h-[calc(100vh-4rem)]">
      <div className="w-full px-[4vw]">
        <div className="relative flex items-center justify-center mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-2 top-4 md:top-2 text-brand md:left-0 md:ml-[2px] md:mt-[0px]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M15 18L9 12L15 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex flex-col items-center pt-1 md:pt-0 md:-translate-y-[6px]">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-600">
                Share Your Dish
              </p>
              <span className="inline-flex items-center rounded-full bg-[#F9F1E5] px-3 py-1 text-xs font-medium text-gray-700">
                Step 2 of 2
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Add details before you post your photo
            </p>
          </div>
        </div>

        <div className="-mx-[4vw]">
          <div className="absolute left-0 right-0 h-px bg-[#E7EEE7] -translate-y-4" />
        </div>

        <div className="mt-10 flex justify-center">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-20">
            <section className="w-full max-w-[800px]">
              <div className="rounded-3xl bg-[#F9FAFB] border border-[#E5E7EB] px-10 pt-5 pb-6 shadow-sm">
                <p className="mb-3 text-xm font-medium text-gray-800">
                  Preview
                </p>

                <div className={`overflow-hidden rounded-2xl bg-white border border-[#E5E7EB] ${aspectRatio === "square" ? "aspect-square" : "aspect-[16/9]"}`}>
                  <div className="w-full h-full bg-[#F3F4F6] flex items-center justify-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Dish preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <p className="text-sm text-gray-500">No photo selected.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="w-full lg:max-w-[460px]">
              <div className="rounded-3xl bg-white border border-[#E5E7EB] px-6 py-5 shadow-sm">
                <h2 className="text-xm font-semibold text-gray-900 mb-4">
                  Photo Details
                </h2>

                {ordersError && (
                  <p className="mb-3 text-xs text-red-500">{ordersError}</p>
                )}

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Select Order
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 pr-10 py-3 text-sm shadow-sm focus:border-brand focus:ring-1 focus:ring-brand"
                    value={selectedOrderId}
                    onChange={(event) => setSelectedOrderId(event.target.value)}
                    disabled={ordersLoading || orders.length === 0}
                  >
                    <option value="">
                      {ordersLoading
                        ? "Loading orders..."
                        : orders.length === 0
                        ? "No recent orders found"
                        : "Choose an order"}
                    </option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.stall?.name || "Unknown Stall"} •
                        {" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Select Dish
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 pr-10 py-3 text-sm shadow-sm focus:border-brand focus:ring-1 focus:ring-brand"
                    value={selectedMenuItemId}
                    onChange={(event) => setSelectedMenuItemId(event.target.value)}
                    disabled={!selectedOrder || (selectedOrder.orderItems ?? []).length === 0}
                  >
                    <option value="">
                      {selectedOrder
                        ? (selectedOrder.orderItems ?? []).length > 0
                          ? "Choose a dish"
                          : "No dishes in this order"
                        : "Select an order first"}
                    </option>
                    {(selectedOrder?.orderItems ?? []).map((item) => (
                      <option key={item.id} value={item.menuItem?.id || ""}>
                        {item.menuItem?.name || "Dish"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Photo Title
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder="E.g. Signature Claypot Sesame Chicken"
                    className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-3 text-sm shadow-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Share something about this dish..."
                    className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-3 text-sm shadow-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>

                {submitError && (
                  <p className="mb-3 text-xs text-red-500">{submitError}</p>
                )}

                <button
                  type="button"
                  onClick={handlePost}
                  disabled={isSubmitting || !photoFile}
                  className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(33,66,27,0.2)] hover:bg-[#1A3517] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Posting…" : "Post Photo"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Validation Modal - Only shows during loading */}
      <ValidationModal
        isOpen={validationStatus === "validating"}
        message={validationMessage}
        onCancel={handleCancelValidation}
      />
    </main>
  );
}
