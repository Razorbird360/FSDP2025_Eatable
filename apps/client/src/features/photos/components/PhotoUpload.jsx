import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft } from 'lucide-react';
import { usePhotoUpload } from "../context/PhotoUploadContext";
import ValidationModal from "../../../components/ValidationModal";
import { toaster } from "../../../components/ui/toaster";

export default function PhotoUpload() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const {
    previewUrl,
    aspectRatio: storedAspectRatio,
    setPhotoData,
    validatePhoto,
    validationStatus,
    validationMessage,
    resetValidation,
    clearPhotoData,
  } = usePhotoUpload();

  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [aspectRatio, setAspectRatioState] = useState(storedAspectRatio || "square");
  const hasPhoto = Boolean(previewUrl);

  const updateAspectRatio = (ratio) => {
    setAspectRatioState(ratio);
    setPhotoData({ aspectRatio: ratio });
  };

  useEffect(() => {
    if (storedAspectRatio && storedAspectRatio !== aspectRatio) {
      setAspectRatioState(storedAspectRatio);
    }
  }, [storedAspectRatio, aspectRatio]);

  useEffect(() => {
    let mounted = true;

    async function initCameras() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported in this browser.");
        return;
      }

      setIsRequestingCamera(true);
      setCameraError(null);

      try {
        const constraints = {
          video: selectedCameraId
            ? { deviceId: { exact: selectedCameraId } }
            : { facingMode: { ideal: "environment" } },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Stop any existing stream before replacing
        setStream((prev) => {
          prev?.getTracks().forEach((track) => track.stop());
          return mediaStream;
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setAvailableCameras(videoInputs);
        if (!selectedCameraId && videoInputs.length > 0) {
          setSelectedCameraId(videoInputs[0].deviceId);
        }
      } catch (error) {
        setCameraError(
          error?.message || "Unable to access the camera. Please try again."
        );
      } finally {
        if (mounted) {
          setIsRequestingCamera(false);
        }
      }
    }

    initCameras();

    return () => {
      mounted = false;
    };
  }, [selectedCameraId]);

  // Ensure the active stream is stopped on unmount or when replaced
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleTakePhoto = async () => {
    if (!videoRef.current) {
      setCameraError("Camera not ready yet.");
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const targetWidth = aspectRatio === "square" ? 1200 : 1280;
      const targetHeight = aspectRatio === "square" ? 1200 : 720;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const file = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Unable to capture photo"));
              return;
            }
            resolve(
              new File([blob], `capture-${Date.now()}.jpg`, {
                type: "image/jpeg",
              })
            );
          },
          "image/jpeg",
          0.95
        );
      });

      const preview = URL.createObjectURL(file);
      setPhotoData({ file, previewUrl: preview, aspectRatio });
      setCameraError(null);

      // Validate the captured photo
      const result = await validatePhoto(file);

      if (result.success) {
        // Show success toast
        toaster.create({
          title: "Food detected!",
          description: "Your photo looks great. Proceeding to details...",
          type: "success",
          duration: 3000,
        });

        // Clear validation state; user can proceed with Next button
        resetValidation();
      } else {
        // Show error toast
        toaster.create({
          title: "No food detected",
          description: result.message || "Please upload a photo of food.",
          type: "error",
          duration: 5000,
        });

        // Clear photo and reset
        resetValidation();
        clearPhotoData();
      }
    } catch (error) {
      setCameraError(error.message || "Failed to capture photo");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPhotoData({ file, previewUrl: preview, aspectRatio });
    event.target.value = "";

    // Validate the uploaded photo
    const result = await validatePhoto(file);

    if (result.success) {
      // Show success toast
      toaster.create({
        title: "Food detected!",
        description: "Your photo looks great. Proceeding to details...",
        type: "success",
        duration: 3000,
      });

      // Clear validation state; user can proceed with Next button
      resetValidation();
    } else {
      // Show error toast
      toaster.create({
        title: "No food detected",
        description: result.message || "Please upload a photo of food.",
        type: "error",
        duration: 5000,
      });

      // Clear photo and reset
      resetValidation();
      clearPhotoData();
    }
  };

  const stopPreview = () => {
    setPhotoData({ file: null, previewUrl: null });
  };

  const handleCancelValidation = () => {
    // Cancel validation and clear photo
    resetValidation();
    clearPhotoData();
  };

  const switchCamera = () => {
    if (availableCameras.length <= 1) return;

    const currentIndex = availableCameras.findIndex(
      (camera) => camera.deviceId === selectedCameraId
    );
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setSelectedCameraId(availableCameras[nextIndex].deviceId);
  };

  return (
    <main className="flex flex-col bg-[#F6FBF2] pt-6 pb-10 min-h-[calc(100vh-4rem)]">
      {/* match onboarding width and spacing */}
      <div className="w-full px-[4vw]">
        {/* header same structure as onboarding */}
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
              Capture or upload a photo to get started
            </p>
          </div>
        </div>

        {/* full width divider under header */}
        <div className="-mx-[4vw]">
          <div className="absolute left-0 right-0 h-px bg-[#E7EEE7] -translate-y-4" />
        </div>

        {/* content area centred */}
        <div className="relative mx-auto mt-6 max-w-6xl">
          {/* left side – camera box */}
          <section className="mx-auto flex w-full flex-col lg:flex-row items-start gap-3 lg:max-w-[780px]">
            {/* Desktop: Aspect Ratio Selection Buttons - Vertical stack to the left */}
            <div className="hidden lg:flex flex-col gap-3">
              <button
                type="button"
                onClick={() => updateAspectRatio("square")}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition ${
                  aspectRatio === "square"
                    ? "border-brand bg-brand"
                    : "border-gray-300 bg-white"
                }`}
                aria-label="Square aspect ratio"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 ${aspectRatio === "square" ? "text-white" : "text-gray-600"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => updateAspectRatio("rectangle")}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition ${
                  aspectRatio === "rectangle"
                    ? "border-brand bg-brand"
                    : "border-gray-300 bg-white"
                }`}
                aria-label="Rectangle aspect ratio"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 ${aspectRatio === "rectangle" ? "text-white" : "text-gray-600"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="7" y="3" width="10" height="18" rx="2" />
                </svg>
              </button>
            </div>

            {/* Main content area */}
            <div className="w-full lg:flex-1 flex flex-col">
              <div
                className={`mb-6 w-full rounded-3xl border border-[#E5E7EB] bg-[#F6FBF2] p-1 ${
                  aspectRatio === "square" ? "aspect-square" : "aspect-[2.6/4]"
                }`}
              >
              {previewUrl ? (
                <div className="relative h-full w-full">
                  <img
                    src={previewUrl}
                    alt="Captured preview"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={stopPreview}
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#111827] shadow-sm hover:bg-white"
                  >
                    Retake
                  </button>
                </div>
              ) : !stream && !isRequestingCamera ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-[#F4F4F4]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-16 w-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="4" y="7" width="16" height="12" rx="2" />
                    <path d="M9 7.5L10.2 5.5H13.8L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Ready to capture?</p>
                    <p className="mt-1 text-xs text-gray-500">Take a photo or upload an existing one</p>
                  </div>
                </div>
              ) : (
                <div className="relative h-full w-full">
                  {cameraError ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#F4F4F4] text-center text-sm text-red-600">
                      <p>{cameraError}</p>
                      <p className="text-xs text-gray-500">
                        Please allow camera access or try another browser.
                      </p>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      playsInline
                      autoPlay
                      muted
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  )}

                  {isRequestingCamera && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                      <div className="flex flex-col items-center gap-2 text-white">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <p className="text-xs uppercase tracking-wide">
                          Accessing camera…
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile: Camera Controls Bar */}
            <div className="flex lg:hidden w-full items-center justify-between mb-6">
              {/* Left: Aspect Ratio Toggle */}
              <button
                type="button"
                onClick={() => updateAspectRatio(aspectRatio === "square" ? "rectangle" : "square")}
                className="flex h-14 w-14 items-center justify-center rounded-lg bg-white border-2 border-gray-300 transition"
                aria-label="Toggle aspect ratio"
              >
                {aspectRatio === "square" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="5" y="5" width="14" height="14" rx="2" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="7" y="3" width="10" height="18" rx="2" />
                  </svg>
                )}
              </button>

              {/* Center: Take Photo Button */}
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={Boolean(cameraError) || isRequestingCamera}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-brand shadow-lg hover:bg-[#1A3517] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                aria-label="Take photo"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="7" width="16" height="12" rx="2" />
                  <path d="M9 7.5L10.2 5.5H13.8L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>

              {/* Right: Camera Switch */}
              <button
                type="button"
                onClick={switchCamera}
                disabled={availableCameras.length <= 1}
                className="flex h-14 w-14 items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Switch camera"
              >
                <ArrowRightLeft className="h-7 w-7 text-[#21421B]" aria-hidden="true" />
              </button>
            </div>

            {/* Desktop: Camera Source Dropdown */}
            {availableCameras.length > 1 && (
              <div className="hidden lg:flex mb-6 w-full flex-col gap-2 text-sm text-[#111827]">
                <label htmlFor="camera-select" className="font-medium">
                  Camera source
                </label>
                <select
                  id="camera-select"
                  className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#21421B]"
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                >
                  {availableCameras.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(-4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Desktop: Action Buttons */}
            <div className="hidden lg:flex w-full flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={Boolean(cameraError) || isRequestingCamera}
                className="flex-1 inline-flex flex-col justify-center rounded-xl bg-[#21421B] px-6 py-4 text-left text-white shadow-[0_8px_18px_rgba(0,0,0,0.25)] hover:bg-[#1A3517] transition disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <rect
                      x="4"
                      y="7"
                      width="16"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                    />
                    <path
                      d="M9 7.5L10.2 5.5H13.8L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="13"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                    />
                  </svg>
                  Take Photo
                </span>
                <span className="mt-1 text-xs text-[#D1FAE5]">
                  {cameraError
                    ? "Camera unavailable"
                    : "Use your camera"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleUploadClick}
                className="flex-1 inline-flex flex-col justify-center rounded-xl border border-[#D1D5DB] bg-white px-6 py-4 text-left text-[#111827] shadow-sm hover:bg-[#F9FAFB] transition"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M12 15V5.5M12 5.5L8.5 9M12 5.5L15.5 9"
                      stroke="#21421B"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 15.5V18.5C5 19.328 5.672 20 6.5 20H17.5C18.328 20 19 19.328 19 18.5V15.5"
                      stroke="#374151"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Upload Photo
                </span>
                <span className="mt-1 text-xs text-gray-500">
                  From your device
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <button
              type="button"
              onClick={handleUploadClick}
              className="flex lg:hidden w-full items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#D1D5DB] bg-white text-[#111827] shadow-sm hover:bg-[#F9FAFB] transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M12 15V5.5M12 5.5L8.5 9M12 5.5L15.5 9"
                  stroke="#21421B"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M5 15.5V18.5C5 19.328 5.672 20 6.5 20H17.5C18.328 20 19 19.328 19 18.5V15.5"
                  stroke="#374151"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Upload Photo</span>
                <span className="text-xs text-gray-500">From your device</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/upload-details")}
              disabled={!hasPhoto}
              className="flex lg:hidden w-full items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-medium text-white shadow-[0_4px_12px_rgba(33,66,27,0.25)] hover:bg-[#1A3517] transition mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
            </div>
          </section>

          {/* right side tips - Desktop only */}
          <aside
            className="
              hidden
              lg:block
              mt-8
              lg:mt-0
              lg:absolute
              lg:right-0
              lg:translate-x-[100px]
              lg:top-0
              lg:w-[260px]
              flex-shrink-0
            "
          >
            <div className="rounded-2xl bg-white px-6 py-5 shadow-sm border border-[#E5E7EB]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E6F4EA]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#21421B]" aria-hidden="true">
                    <rect
                      x="4"
                      y="5"
                      width="16"
                      height="14"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M9 11L11.2 13.5L15 9.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#111827]">
                  Photography Tips
                </span>
              </div>

              <ul className="space-y-2 text-xs text-gray-600">
                <li>Use natural lightning avoid direct sunlight</li>
                <li>Focus on one item per picture</li>
                <li>Make sure the dish fills 70% of the frame</li>
                <li>Dont block others while you take your photo</li>
              </ul>
            </div>

            {/* Desktop: Next Button */}
            <button
              type="button"
              onClick={() => navigate("/upload-details")}
              disabled={!hasPhoto}
              className="mt-4 w-full rounded-lg bg-brand px-8 py-2.5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(33,66,27,0.25)] hover:bg-[#1A3517] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </aside>
        </div>
      </div>

      <ValidationModal
        isOpen={validationStatus === "validating"}
        message={validationMessage}
        onCancel={handleCancelValidation}
      />
    </main>
  );
}
