import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
} from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { UserRound } from 'lucide-react';
import { toaster } from '../../../components/ui/toaster';
import api from '@lib/api';

const TARGET_RATIO = 1.75;
const FACE_RATIO = 2 / 3;
const FRAME_INTERVAL = 180;
const WS_URL = import.meta.env.VITE_AI_WS_URL || 'ws://localhost:8000/id/ws';
const ZOOM_ANIMATION_DURATION = 800; // ms
const FACE_HIGHLIGHT_DURATION = 1000; // ms

// Keyframe animation for the card zoom effect
const zoomPulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
    border-width: 2px;
    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }
  30% {
    transform: scale(1.05);
    border-width: 3px;
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
  }
  60% {
    transform: scale(1.1);
    border-width: 4px;
    box-shadow: 0 0 30px rgba(34, 197, 94, 0.7);
  }
  100% {
    transform: scale(1.15);
    opacity: 0;
    border-width: 4px;
    box-shadow: 0 0 40px rgba(34, 197, 94, 0.9);
  }
`;

// Keyframe animation for the final image fade in
const fadeInScale = keyframes`
  0% {
    opacity: 0;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

const facePulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(255, 193, 7, 0.0);
  }
  60% {
    transform: scale(1.08);
    box-shadow: 0 0 18px rgba(255, 193, 7, 0.5);
  }
  100% {
    transform: scale(1.12);
    box-shadow: 0 0 26px rgba(255, 193, 7, 0.65);
  }
`;

const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

// Type definitions
interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

interface FrameMeta {
  width: number;
  height: number;
}

interface ContainerSize {
  width: number;
  height: number;
}

interface OverlayStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

type BoundingBox = [number, number, number, number];

type DetectionStatus = 'SEARCHING' | 'LOCKING' | 'LOCKED' | 'FACE_VALIDATION';

interface WebSocketPayload {
  state?: DetectionStatus;
  bbox?: BoundingBox;
  frame?: FrameMeta;
  too_small?: boolean;
  crop?: string;
  face_crop?: string;
  face_bbox?: [number, number, number, number];
  face_similarity?: number;
  best_similarity?: number;
  confidence?: number;
  face_detected?: boolean;
  matched?: boolean;
  validation_done?: boolean;
  validation_failed?: boolean;
}

export default function VerificationModal({
  isOpen,
  onClose,
  onSuccess: _onSuccess,
}: VerificationModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendInFlightRef = useRef<boolean>(false);
  const uploadFrameRef = useRef<File | null>(null);
  const faceStageRef = useRef<boolean>(false);
  const freezeFrameRef = useRef<boolean>(false);
  const lockHandledRef = useRef<boolean>(false);
  const faceLogRef = useRef<number>(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [wsReady, setWsReady] = useState<boolean>(false);
  const [hasReceivedPayload, setHasReceivedPayload] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [status, setStatus] = useState<DetectionStatus>('SEARCHING');
  const [statusText, setStatusText] = useState<string>('Show card');
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [frameMeta, setFrameMeta] = useState<FrameMeta | null>(null);
  const [tooSmall, setTooSmall] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState<ContainerSize>({
    width: 0,
    height: 0,
  });
  const [isZoomAnimating, setIsZoomAnimating] = useState<boolean>(false);
  const [showFinalImage, setShowFinalImage] = useState<boolean>(false);
  const [lockedBbox, setLockedBbox] = useState<BoundingBox | null>(null);
  const [lockedFrameMeta, setLockedFrameMeta] = useState<FrameMeta | null>(
    null
  );
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [cardCrop, setCardCrop] = useState<string | null>(null);
  const [cardFaceCrop, setCardFaceCrop] = useState<string | null>(null);
  const [cardFaceBbox, setCardFaceBbox] = useState<
    [number, number, number, number] | null
  >(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [faceMatched, setFaceMatched] = useState<boolean>(false);
  const [freezeFrame, setFreezeFrame] = useState<boolean>(false);
  const [faceFrame, setFaceFrame] = useState<string | null>(null);
  const [faceMatchedText, setFaceMatchedText] = useState<string>('');
  const [faceStageActive, setFaceStageActive] = useState<boolean>(false);
  const [facePreviewRotation, setFacePreviewRotation] = useState<number>(0);
  const [showFaceIntro, setShowFaceIntro] = useState<boolean>(false);
  const [fadeFaceIntro, setFadeFaceIntro] = useState<boolean>(false);
  const [faceValidationDone, setFaceValidationDone] = useState<boolean>(false);
  const [faceValidationFailed, setFaceValidationFailed] = useState<boolean>(false);
  const [showFaceOverlay, setShowFaceOverlay] = useState<boolean>(true);
  const [initDots, setInitDots] = useState<number>(0);
  const [showIdPreview, setShowIdPreview] = useState<boolean>(false);
  // Live face detection state for overlay during FACE_VALIDATION
  const [liveFaceBbox, setLiveFaceBbox] = useState<
    [number, number, number, number] | null
  >(null);
  const [liveFaceSimilarity, setLiveFaceSimilarity] = useState<number | null>(
    null
  );
  // Track if card was locked but no face was found on the ID
  const [noFaceOnCard, setNoFaceOnCard] = useState<boolean>(false);

  useEffect(() => {
    faceStageRef.current = faceStageActive;
  }, [faceStageActive]);

  useEffect(() => {
    freezeFrameRef.current = freezeFrame;
  }, [freezeFrame]);

  useEffect(() => {
    if (!isOpen || !faceStageActive) {
      setShowFaceIntro(false);
      setFadeFaceIntro(false);
      return undefined;
    }

    setShowFaceIntro(true);
    setFadeFaceIntro(false);
    const fadeTimer = setTimeout(() => setFadeFaceIntro(true), 1500);
    const hideTimer = setTimeout(() => setShowFaceIntro(false), 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [faceStageActive, isOpen]);

  useEffect(() => {
    if (status === 'FACE_VALIDATION') {
      if (faceValidationDone && faceValidationFailed) {
        setStatusText('Validation failed');
      } else if (faceValidationDone && faceMatched) {
        setStatusText(faceMatchedText || 'Face validation successful');
      } else if (faceValidationFailed) {
        setStatusText('Validation failed');
      } else if (noFaceOnCard) {
        setStatusText('No face on ID - retake photo');
      } else if (faceDetected) {
        setStatusText('Hold still');
      } else {
        setStatusText('Show face');
      }
      return;
    }
    if (status === 'LOCKED') {
      setStatusText('Card detected');
    } else if (status === 'LOCKING') {
      setStatusText('Hold still');
    } else if (tooSmall) {
      setStatusText('Move card closer');
    } else {
      setStatusText('Show card');
    }
  }, [
    faceDetected,
    faceMatched,
    faceMatchedText,
    faceValidationDone,
    faceValidationFailed,
    noFaceOnCard,
    status,
    tooSmall,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setVideoReady(false);
      return undefined;
    }
    const video = videoRef.current;
    if (!video) return undefined;
    const handleLoaded = () => setVideoReady(true);
    video.addEventListener('loadeddata', handleLoaded);
    return () => {
      video.removeEventListener('loadeddata', handleLoaded);
      setVideoReady(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [isOpen]);

  const stopCaptureLoop = useCallback(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetDetectionState = useCallback(() => {
    setStatus('SEARCHING');
    setBbox(null);
    setFrameMeta(null);
    setTooSmall(false);
    setIsZoomAnimating(false);
    setShowFinalImage(false);
    setLockedBbox(null);
    setLockedFrameMeta(null);
    setFrozenFrame(null);
    setCardCrop(null);
    setCardFaceCrop(null);
    setCardFaceBbox(null);
    setFaceDetected(false);
    setFaceMatched(false);
    setFaceMatchedText('');
    setFreezeFrame(false);
    setFaceFrame(null);
    setFaceStageActive(false);
    setFacePreviewRotation(0);
    setFaceValidationDone(false);
    setFaceValidationFailed(false);
    setLiveFaceBbox(null);
    setLiveFaceSimilarity(null);
    setNoFaceOnCard(false);
    sendInFlightRef.current = false;
    lockHandledRef.current = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('reset');
    }
  }, []);

  const startCamera = useCallback(async (mode: 'card' | 'face' = 'card') => {
    try {
      if (mediaStreamRef.current) {
        return;
      }
      const isFace = mode === 'face';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: isFace ? 'user' : 'environment' },
          width: { ideal: isFace ? 720 : 1280 },
          height: { ideal: isFace ? 1080 : 720 },
        },
      });
      setCameraError(null);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera init error:', error);
      setCameraError('Unable to access camera');
    }
  }, []);

  const sendFrameBlob = useCallback(async (blob: Blob | File) => {
    if (
      !blob ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    if (sendInFlightRef.current) {
      return;
    }
    sendInFlightRef.current = true;
    try {
      const buffer = await blob.arrayBuffer();
      wsRef.current.send(buffer);
    } catch {
      sendInFlightRef.current = false;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      freezeFrameRef.current
    ) {
      return;
    }

    if (uploadFrameRef.current) {
      sendFrameBlob(uploadFrameRef.current);
      return;
    }

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !videoReady || video.readyState < 2) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    if (faceStageRef.current) {
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setFaceFrame(frameDataUrl);
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          sendFrameBlob(blob);
        }
      },
      'image/jpeg',
      0.75
    );
  }, [sendFrameBlob, videoReady]);

  const startCaptureLoop = useCallback(() => {
    if (frameTimerRef.current) return;
    captureFrame();
    frameTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL);
  }, [captureFrame]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setWsReady(false);
    setHasReceivedPayload(false);
    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setWsReady(true);
    };
    ws.onclose = () => {
      setWsReady(false);
      setHasReceivedPayload(false);
    };
    ws.onerror = () => {
      setWsReady(false);
    };
    ws.onmessage = (event: MessageEvent) => {
      sendInFlightRef.current = false;
      let payload: WebSocketPayload;
      try {
        payload = JSON.parse(event.data as string);
      } catch {
        return;
      }
      setHasReceivedPayload(true);

      setStatus(payload.state || 'SEARCHING');
      setBbox(payload.bbox || null);
      setFrameMeta(payload.frame || null);
      setTooSmall(Boolean(payload.too_small));

      if (payload.face_detected !== undefined) {
        setFaceDetected(Boolean(payload.face_detected));
      }

      // Update live face detection state during FACE_VALIDATION
      if (payload.state === 'FACE_VALIDATION') {
        setLiveFaceBbox(payload.face_bbox || null);
        setLiveFaceSimilarity(
          payload.face_similarity !== undefined ? payload.face_similarity : null
        );
        const now = Date.now();
        if (now - faceLogRef.current > 500) {
          const similarity =
            payload.best_similarity ?? payload.face_similarity ?? null;
          console.log(
            `[Face] conf=${(payload.confidence ?? 0).toFixed(2)} sim=${
              similarity !== null ? similarity.toFixed(3) : 'n/a'
            }`
          );
          faceLogRef.current = now;
        }
      }

      if (payload.validation_done !== undefined) {
        setFaceValidationDone(Boolean(payload.validation_done));
      }
      if (payload.validation_failed !== undefined) {
        setFaceValidationFailed(Boolean(payload.validation_failed));
      }

      if (payload.matched !== undefined) {
        setFaceMatched(Boolean(payload.matched));
      }

      if (payload.validation_done) {
        setFreezeFrame(true);
        setFaceStageActive(false);
        setFaceMatchedText(
          payload.matched ? 'Face validation successful' : 'Validation failed'
        );
        stopCaptureLoop();
        stopCamera();
        sendInFlightRef.current = false;
      }

      if (payload.state === 'LOCKED' && !lockHandledRef.current) {
        lockHandledRef.current = true;
        setLockedBbox(payload.bbox || null);
        setLockedFrameMeta(payload.frame || null);
        setCardCrop(payload.crop || null);
        setCardFaceCrop(payload.face_crop || null);
        setCardFaceBbox(payload.face_bbox || null);
        // Check if no face was detected on the card
        setNoFaceOnCard(!payload.face_crop);

        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        if (video && canvas && video.readyState >= 2) {
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (width && height) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const frameDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              setFrozenFrame(frameDataUrl);
            }
          }
        }

        setIsZoomAnimating(true);
        stopCaptureLoop();
        stopCamera();
        sendInFlightRef.current = false;
        setUploadPreview(null);

        // After pop animation, immediately proceed to face validation
        setTimeout(() => {
          setIsZoomAnimating(false);
          setShowFinalImage(false);
          setImagePreview(null);
          setFrozenFrame(null);
          setFaceStageActive(true);
          setFreezeFrame(false);
          sendInFlightRef.current = false;
          lockHandledRef.current = false;
          startCamera('face');
          startCaptureLoop();
          setStatus('FACE_VALIDATION');
          setFaceMatchedText('');
        }, ZOOM_ANIMATION_DURATION);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      sendInFlightRef.current = false;
      setWsReady(false);
      setHasReceivedPayload(false);
    };
  }, [isOpen, startCamera, startCaptureLoop, stopCaptureLoop, stopCamera]);

  useEffect(() => {
    if (!isOpen || !wsReady) return undefined;
    startCamera('card');

    return () => {
      stopCaptureLoop();
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, stopCaptureLoop, wsReady]);

  useEffect(() => {
    if (isOpen) return;
    setImagePreview(null);
    setUploadPreview(null);
    uploadFrameRef.current = null;
    setWsReady(false);
    setHasReceivedPayload(false);
    resetDetectionState();
  }, [isOpen, resetDetectionState]);

  useEffect(() => {
    if (!isOpen) return;
    if (!wsReady || imagePreview || freezeFrame) {
      stopCaptureLoop();
      return;
    }
    if (videoReady || uploadFrameRef.current) {
      startCaptureLoop();
    }
  }, [
    freezeFrame,
    imagePreview,
    isOpen,
    startCaptureLoop,
    stopCaptureLoop,
    videoReady,
    wsReady,
  ]);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toaster.create({
        title: 'Invalid file',
        description: 'Please choose an image',
        type: 'error',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toaster.create({
        title: 'File too large',
        description: 'Max size 5MB',
        type: 'error',
      });
      return;
    }

    const previewUrl = await fileToDataUrl(file);
    uploadFrameRef.current = file;
    setUploadPreview(previewUrl);
    setImagePreview(null);
    resetDetectionState();
    stopCamera();
    startCaptureLoop();
  };

  const handleRetake = useCallback(() => {
    setImagePreview(null);
    setUploadPreview(null);
    uploadFrameRef.current = null;
    resetDetectionState();
    stopCaptureLoop();
    startCamera('card');
  }, [resetDetectionState, startCamera, stopCaptureLoop]);

  const handleRetryFaceValidation = useCallback(() => {
    setFreezeFrame(false);
    setFaceStageActive(true);
    setFaceMatched(false);
    setFaceValidationDone(false);
    setFaceValidationFailed(false);
    setFaceMatchedText('');
    setFaceFrame(null);
    setLiveFaceBbox(null);
    setLiveFaceSimilarity(null);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('retry_face');
    }
    startCamera('face');
    startCaptureLoop();
    setStatus('FACE_VALIDATION');
  }, [startCamera, startCaptureLoop]);

  const handleFacePreviewLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (!img.naturalWidth || !img.naturalHeight) return;
      setFacePreviewRotation(img.naturalWidth > img.naturalHeight ? 90 : 0);
    },
    []
  );

  const handleSubmit = async () => {
    if (!faceMatched) {
      toaster.create({
        title: 'Verification',
        description: 'Please complete face validation first',
        type: 'info',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/verification/submit');
      if (typeof _onSuccess === 'function') {
        await _onSuccess();
      }
      toaster.create({
        title: 'Verified',
        description: 'Verification successful.',
        type: 'success',
      });
    } catch (error) {
      console.error(error);
      toaster.create({
        title: 'Submit failed',
        description: 'Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const previewImage = imagePreview || uploadPreview;
  const showFaceLayout = faceStageActive || freezeFrame;
  const facePreviewImage = cardFaceCrop || cardCrop;
  const isInitializing =
    !cameraError &&
    !previewImage &&
    !freezeFrame &&
    (!wsReady || !videoReady || !hasReceivedPayload);
  const descriptionText = showFaceLayout
    ? "Align your face in the frame so we can match it to your ID."
    : "Capture a clear photo of your ID. We&apos;ll validate it on our secure server before proceeding.";

  useEffect(() => {
    if (!showFaceLayout) {
      setShowIdPreview(false);
    }
  }, [showFaceLayout]);

  const liveFaceOval = useMemo(() => {
    if (!liveFaceBbox) return null;
    const [x1, y1, x2, y2] = liveFaceBbox;
    const width = x2 - x1;
    const height = y2 - y1;
    const extraX = width * 0.2;
    const extraY = height * 0.15;
    const nx1 = Math.max(0, x1 - extraX);
    const ny1 = Math.max(0, y1 - extraY);
    const nx2 = Math.min(1, x2 + extraX);
    const ny2 = Math.min(1, y2 + extraY);
    return [nx1, ny1, nx2, ny2] as const;
  }, [liveFaceBbox]);

  useEffect(() => {
    if (!isInitializing) {
      setInitDots(0);
      return undefined;
    }

    const pattern = [0, 1, 2, 3, 3];
    let index = 0;
    const interval = setInterval(() => {
      setInitDots(pattern[index]);
      index = (index + 1) % pattern.length;
    }, 350);

    return () => clearInterval(interval);
  }, [isInitializing]);

  const overlayStyle = useMemo((): OverlayStyle | null => {
    if (!bbox || !frameMeta || !containerSize.width || !containerSize.height) {
      return null;
    }
    const [x1, y1, x2, y2] = bbox;
    const scale = Math.max(
      containerSize.width / frameMeta.width,
      containerSize.height / frameMeta.height
    );
    const displayWidth = frameMeta.width * scale;
    const displayHeight = frameMeta.height * scale;
    const offsetX = (containerSize.width - displayWidth) / 2;
    const offsetY = (containerSize.height - displayHeight) / 2;

    return {
      left: x1 * scale + offsetX,
      top: y1 * scale + offsetY,
      width: (x2 - x1) * scale,
      height: (y2 - y1) * scale,
    };
  }, [bbox, containerSize, frameMeta]);

  // Compute the overlay style for the locked/animating bounding box
  const lockedOverlayStyle = useMemo((): OverlayStyle | null => {
    if (
      !lockedBbox ||
      !lockedFrameMeta ||
      !containerSize.width ||
      !containerSize.height
    ) {
      return null;
    }
    const [x1, y1, x2, y2] = lockedBbox;
    const scale = Math.max(
      containerSize.width / lockedFrameMeta.width,
      containerSize.height / lockedFrameMeta.height
    );
    const displayWidth = lockedFrameMeta.width * scale;
    const displayHeight = lockedFrameMeta.height * scale;
    const offsetX = (containerSize.width - displayWidth) / 2;
    const offsetY = (containerSize.height - displayHeight) / 2;

    return {
      left: x1 * scale + offsetX,
      top: y1 * scale + offsetY,
      width: (x2 - x1) * scale,
      height: (y2 - y1) * scale,
    };
  }, [lockedBbox, containerSize, lockedFrameMeta]);

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex="9999"
      bg="rgba(0,0,0,0.55)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={onClose}
      px={{ base: 4, md: 0 }}
    >
      <Box
        bg="white"
        rounded="2xl"
        p={{ base: 6, md: 8 }}
        width={{
          base: '100%',
          sm: showFaceLayout ? '520px' : '450px',
          md: showFaceLayout ? '720px' : '520px',
        }}
        maxW={showFaceLayout ? '720px' : '520px'}
        maxH={{ base: '92vh', md: 'unset' }}
        overflowY={{ base: 'auto', md: 'visible' }}
        onClick={(e) => e.stopPropagation()}
        boxShadow="0 24px 45px rgba(0,0,0,0.25)"
      >
        <VStack spacing={4} align="stretch">
          <Text fontSize="xl" fontWeight="bold" color="#21421B">
            Verify Your Identity
          </Text>
          <Text fontSize="sm" color="gray.600">
            {descriptionText}
          </Text>

          <Box
            display="grid"
            gridTemplateColumns={{
              base: '1fr',
              md: showFaceLayout ? '1.2fr 0.8fr' : '1fr',
            }}
            gap={{ base: 4, md: 5 }}
            alignItems="start"
          >
            <Box
              ref={containerRef}
              position="relative"
              rounded="xl"
              overflow="hidden"
              bg="gray.900"
              width="100%"
              style={{
                aspectRatio:
                  faceStageActive || freezeFrame ? FACE_RATIO : TARGET_RATIO,
              }}
            >
              {/* Base layer: frozen frame during animation, video, or upload preview */}
              {frozenFrame ? (
                <img
                  src={frozenFrame}
                  alt="Frozen frame"
                  className="h-full w-full object-cover"
                />
              ) : showFinalImage && cardCrop ? (
                <img
                  src={cardCrop}
                  alt="Card preview"
                  className="h-full w-full object-cover"
                />
              ) : freezeFrame && faceFrame ? (
                <img
                  src={faceFrame}
                  alt="Face frame"
                  className="h-full w-full object-cover"
                />
              ) : faceStageActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : uploadPreview && !showFinalImage ? (
                <img
                  src={uploadPreview}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              )}

              {isInitializing && (
                <Box
                  position="absolute"
                  inset="0"
                  bg="gray.900"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  px={6}
                >
                  <Text color="white" fontSize="sm" fontWeight="semibold">
                    Initializing camera &amp; websocket connection
                    {'.'.repeat(initDots)}
                  </Text>
                </Box>
              )}

              {showFaceIntro && faceStageActive && (
                <Box
                  position="absolute"
                  inset="0"
                  bg="rgba(0,0,0,0.5)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  pointerEvents="none"
                  zIndex={3}
                  overflow="hidden"
                  animation={
                    fadeFaceIntro ? `${fadeOut} 800ms ease-out forwards` : undefined
                  }
                >
                  <UserRound
                    strokeWidth={0.35}
                    color="white"
                    style={{ width: '100%', height: '100%', transform: 'scale(1.4)' }}
                  />
                </Box>
              )}

              {overlayStyle &&
                status !== 'FACE_VALIDATION' &&
                !imagePreview &&
                !isInitializing &&
                !isZoomAnimating && (
                  <Box
                    position="absolute"
                    left={`${overlayStyle.left}px`}
                    top={`${overlayStyle.top}px`}
                    width={`${overlayStyle.width}px`}
                    height={`${overlayStyle.height}px`}
                    border="2px solid"
                    borderColor={
                      status === 'LOCKING' ? 'yellow.300' : 'green.300'
                    }
                    borderRadius="6px"
                    pointerEvents="none"
                  />
                )}

              {/* Live face detection overlay during FACE_VALIDATION */}
              {status === 'FACE_VALIDATION' &&
                faceStageActive &&
                liveFaceOval &&
                !isInitializing &&
                showFaceOverlay &&
                !freezeFrame && (
                  <Box
                    position="absolute"
                    left={`${liveFaceOval[0] * 100}%`}
                    top={`${liveFaceOval[1] * 100}%`}
                    width={`${(liveFaceOval[2] - liveFaceOval[0]) * 100}%`}
                    height={`${(liveFaceOval[3] - liveFaceOval[1]) * 100}%`}
                    border="2px solid"
                    borderColor={
                      liveFaceSimilarity !== null && liveFaceSimilarity >= 0.35
                        ? 'green.400'
                        : faceDetected
                          ? 'yellow.300'
                          : 'orange.300'
                    }
                    borderRadius="9999px"
                    pointerEvents="none"
                  />
                )}

              {/* Zoom animation overlay when card is locked */}
              {isZoomAnimating && lockedOverlayStyle && (
                <Box
                  position="absolute"
                  left={`${lockedOverlayStyle.left}px`}
                  top={`${lockedOverlayStyle.top}px`}
                  width={`${lockedOverlayStyle.width}px`}
                  height={`${lockedOverlayStyle.height}px`}
                  border="2px solid"
                  borderColor="green.400"
                  borderRadius="6px"
                  pointerEvents="none"
                  transformOrigin="center center"
                  animation={`${zoomPulse} ${ZOOM_ANIMATION_DURATION}ms ease-out forwards`}
                />
              )}

              {previewImage && showFinalImage && !faceStageActive && (
                <Box
                  position="absolute"
                  inset="0"
                  animation={`${fadeInScale} 400ms ease-out forwards`}
                >
                  <img
                    src={previewImage}
                    alt="ID preview"
                    className="h-full w-full object-cover"
                  />
                </Box>
              )}

              {showFinalImage && cardFaceCrop && cardFaceBbox && (
                <Box
                  position="absolute"
                  left={`${cardFaceBbox[0] * 100}%`}
                  top={`${cardFaceBbox[1] * 100}%`}
                  width={`${Math.max(cardFaceBbox[2] - cardFaceBbox[0], 0) * 100}%`}
                  height={`${Math.max(cardFaceBbox[3] - cardFaceBbox[1], 0) * 100}%`}
                  pointerEvents="none"
                  transformOrigin="center center"
                  animation={`${facePulse} ${FACE_HIGHLIGHT_DURATION}ms ease-out forwards`}
                >
                  <img
                    src={cardFaceCrop}
                    alt="Face highlight"
                    className="h-full w-full object-cover"
                  />
                </Box>
              )}

              {previewImage &&
                showFinalImage &&
                !faceStageActive &&
                !faceMatched && (
                  <Button
                    size="sm"
                    rounded="full"
                    position="absolute"
                    top="3"
                    right="3"
                    px={4}
                    bg="#ffffff"
                    color="#21421B"
                    fontWeight="semibold"
                    _hover={{ bg: '#F6FBF2' }}
                    onClick={handleRetake}
                  >
                    Retake
                  </Button>
                )}

              {!imagePreview && !isInitializing && (
                <Box
                  position="absolute"
                  bottom="3"
                  left="50%"
                  transform="translateX(-50%)"
                  px={4}
                  py={1.5}
                  bg="rgba(0,0,0,0.6)"
                  color="white"
                  rounded="full"
                  fontSize="xs"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                  whiteSpace="normal"
                  textAlign="center"
                  maxW="calc(100% - 24px)"
                  wordBreak="break-word"
                >
                  {freezeFrame ? 'Face validation successful' : statusText}
                </Box>
              )}

              {cameraError && !previewImage && (
                <Text
                  position="absolute"
                  bottom="3"
                  left="50%"
                  transform="translateX(-50%)"
                  color="white"
                  fontSize="xs"
                >
                  {cameraError}
                </Text>
              )}
            </Box>

            {showFaceLayout && (
              <VStack spacing={3} align="stretch" display={{ base: 'none', md: 'flex' }}>
                <Box
                  rounded="xl"
                  overflow="hidden"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="gray.50"
                  display={{ base: 'none', md: 'block' }}
                >
                  <Box
                    px={4}
                    py={3}
                    borderBottom="1px solid"
                    borderColor="gray.200"
                    bg="white"
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.600"
                    textTransform="uppercase"
                    letterSpacing="0.08em"
                  >
                    ID Face Preview
                  </Box>

                  {facePreviewImage ? (
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      bg="gray.900"
                    >
                      <img
                        src={facePreviewImage}
                        alt="ID face preview"
                        onLoad={handleFacePreviewLoad}
                        className="h-full w-full"
                        style={{
                          aspectRatio: '1 / 1.2',
                          objectFit: 'contain',
                          transform: facePreviewRotation
                            ? 'rotate(90deg)'
                            : 'none',
                        }}
                      />
                    </Box>
                  ) : (
                    <Box
                      px={4}
                      py={6}
                      textAlign="center"
                      fontSize="sm"
                      color={noFaceOnCard ? 'red.500' : 'gray.500'}
                    >
                      {noFaceOnCard ? 'No face detected on ID' : 'Face preview'}
                    </Box>
                  )}
                </Box>

                {faceMatched && (
                  <Button
                    rounded="full"
                    bg="#21421B"
                    color="white"
                    _hover={{ bg: '#1A3517' }}
                    _active={{ bg: '#142812' }}
                    isDisabled={!faceMatched}
                    isLoading={submitting}
                    onClick={handleSubmit}
                  >
                    Complete validation
                  </Button>
                )}

                {faceValidationFailed && (
                  <Button
                    rounded="full"
                    bg="#21421B"
                    color="white"
                    _hover={{ bg: '#1A3517' }}
                    _active={{ bg: '#142812' }}
                    onClick={handleRetryFaceValidation}
                  >
                    Retry validation
                  </Button>
                )}

                <Button
                  rounded="full"
                  variant="ghost"
                  color="gray.600"
                  onClick={onClose}
                >
                  Cancel
                </Button>

                <Box
                  display={{ base: 'none', md: 'flex' }}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  border="1px solid"
                  borderColor={
                    showFaceOverlay ? '#21421B' : 'rgba(33, 66, 27, 0.2)'
                  }
                  rounded="full"
                  px={5}
                  h="40px"
                  width="100%"
                  bg={showFaceOverlay ? '#21421B' : '#F8FDF3'}
                  cursor="pointer"
                  transition="background-color 160ms ease, border-color 160ms ease"
                  onClick={() => setShowFaceOverlay((prev) => !prev)}
                >
                  <Text
                    fontSize="sm"
                    color={showFaceOverlay ? 'white' : '#21421B'}
                    fontWeight="medium"
                    transition="color 160ms ease"
                  >
                    Face overlay
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color={showFaceOverlay ? '#E5F3D9' : '#4A6351'}
                    transition="color 160ms ease"
                  >
                    {showFaceOverlay ? 'On' : 'Off'}
                  </Text>
                </Box>
              </VStack>
            )}

            {showFaceLayout && (
              <VStack
                spacing={3}
                align="stretch"
                display={{ base: 'flex', md: 'none' }}
              >
                {faceMatched && (
                  <Button
                    rounded="full"
                    bg="#21421B"
                    color="white"
                    _hover={{ bg: '#1A3517' }}
                    _active={{ bg: '#142812' }}
                    isDisabled={!faceMatched}
                    isLoading={submitting}
                    onClick={handleSubmit}
                  >
                    Complete validation
                  </Button>
                )}

                {faceValidationFailed && (
                  <Button
                    rounded="full"
                    bg="#21421B"
                    color="white"
                    _hover={{ bg: '#1A3517' }}
                    _active={{ bg: '#142812' }}
                    onClick={handleRetryFaceValidation}
                  >
                    Retry validation
                  </Button>
                )}

                <Button
                  rounded="full"
                  variant="ghost"
                  color="gray.600"
                  onClick={onClose}
                >
                  Cancel
                </Button>

                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  border="1px solid"
                  borderColor={
                    showFaceOverlay ? '#21421B' : 'rgba(33, 66, 27, 0.2)'
                  }
                  rounded="full"
                  px={5}
                  h="40px"
                  width="100%"
                  bg={showFaceOverlay ? '#21421B' : '#F8FDF3'}
                  cursor="pointer"
                  transition="background-color 160ms ease, border-color 160ms ease"
                  onClick={() => setShowFaceOverlay((prev) => !prev)}
                >
                  <Text
                    fontSize="sm"
                    color={showFaceOverlay ? 'white' : '#21421B'}
                    fontWeight="medium"
                    transition="color 160ms ease"
                  >
                    Face overlay
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color={showFaceOverlay ? '#E5F3D9' : '#4A6351'}
                    transition="color 160ms ease"
                  >
                    {showFaceOverlay ? 'On' : 'Off'}
                  </Text>
                </Box>

                <Button
                  rounded="full"
                  variant="outline"
                  borderColor="#21421B"
                  borderWidth="1px"
                  color="#21421B"
                  onClick={() => setShowIdPreview((prev) => !prev)}
                >
                  {showIdPreview ? 'Hide ID preview' : 'Show ID preview'}
                </Button>

                {showIdPreview && (
                  <Box
                    rounded="xl"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="gray.200"
                    bg="gray.50"
                  >
                    <Box
                      px={4}
                      py={3}
                      borderBottom="1px solid"
                      borderColor="gray.200"
                      bg="white"
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.600"
                      textTransform="uppercase"
                      letterSpacing="0.08em"
                    >
                      ID Face Preview
                    </Box>

                    {facePreviewImage ? (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg="gray.900"
                      >
                        <img
                          src={facePreviewImage}
                          alt="ID face preview"
                          onLoad={handleFacePreviewLoad}
                          className="h-full w-full"
                          style={{
                            aspectRatio: '1 / 1.2',
                            objectFit: 'contain',
                            transform: facePreviewRotation
                              ? 'rotate(90deg)'
                              : 'none',
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        px={4}
                        py={6}
                        textAlign="center"
                        fontSize="sm"
                        color={noFaceOnCard ? 'red.500' : 'gray.500'}
                      >
                        {noFaceOnCard
                          ? 'No face detected on ID'
                          : 'Face preview'}
                      </Box>
                    )}
                  </Box>
                )}
              </VStack>
            )}
          </Box>

          <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

          <input
            type="file"
            accept="image/*"
            id="verification-file-input"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {!showFaceLayout && (
            <VStack spacing={3} align="stretch">
              <HStack spacing={3} flexWrap="wrap">
                <Button
                  flex={1}
                  minW="130px"
                  rounded="full"
                  variant="outline"
                  borderColor="#21421B"
                  borderWidth="1px"
                  color="#21421B"
                  onClick={() =>
                    document.getElementById('verification-file-input')?.click()
                  }
                >
                  Upload ID
                </Button>
              </HStack>

              {faceMatched && (
                <Button
                  rounded="full"
                  bg="#21421B"
                  color="white"
                  _hover={{ bg: '#1A3517' }}
                  _active={{ bg: '#142812' }}
                  isDisabled={!faceMatched}
                  isLoading={submitting}
                  onClick={handleSubmit}
                >
                  Complete validation
                </Button>
              )}

              <Button
                rounded="full"
                variant="ghost"
                color="gray.600"
                onClick={onClose}
              >
                Cancel
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>
    </Box>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
