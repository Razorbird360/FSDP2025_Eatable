import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { toaster } from '../../../components/ui/toaster';

const TARGET_RATIO = 1.75;
const FRAME_INTERVAL = 180;
const WS_URL = import.meta.env.VITE_AI_WS_URL || 'ws://localhost:8000/id/ws';

export default function VerificationModal({ isOpen, onClose, onSuccess: _onSuccess }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameTimerRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const uploadFrameRef = useRef(null);
  const statusRef = useRef('SEARCHING');

  const [cameraError, setCameraError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [cardDetected, setCardDetected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('SEARCHING');
  const [statusText, setStatusText] = useState('Show card');
  const [bbox, setBbox] = useState(null);
  const [frameMeta, setFrameMeta] = useState(null);
  const [tooSmall, setTooSmall] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status === 'LOCKED') {
      setStatusText('Captured');
    } else if (status === 'LOCKING') {
      setStatusText('Hold still');
    } else if (tooSmall) {
      setStatusText('Move card closer');
    } else {
      setStatusText('Show card');
    }
  }, [status, tooSmall]);

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
    setCardDetected(false);
    setBbox(null);
    setFrameMeta(null);
    setTooSmall(false);
    sendInFlightRef.current = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('reset');
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

  const sendFrameBlob = useCallback(async (blob) => {
    if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    if (sendInFlightRef.current || statusRef.current === 'LOCKED') {
      return;
    }
    sendInFlightRef.current = true;
    try {
      const buffer = await blob.arrayBuffer();
      wsRef.current.send(buffer);
    } catch (error) {
      sendInFlightRef.current = false;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || statusRef.current === 'LOCKED') {
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
    canvas.toBlob((blob) => {
      if (blob) {
        sendFrameBlob(blob);
      }
    }, 'image/jpeg', 0.75);
  }, [sendFrameBlob, videoReady]);

  const startCaptureLoop = useCallback(() => {
    if (frameTimerRef.current) return;
    captureFrame();
    frameTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL);
  }, [captureFrame]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {};
    ws.onclose = () => {};
    ws.onerror = () => {};
    ws.onmessage = (event) => {
      sendInFlightRef.current = false;
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        return;
      }

      setStatus(payload.state || 'SEARCHING');
      setBbox(payload.bbox || null);
      setFrameMeta(payload.frame || null);
      setTooSmall(Boolean(payload.too_small));

      if (payload.state === 'LOCKED') {
        setCardDetected(true);
        if (payload.crop) {
          setImagePreview(payload.crop);
        }
        setUploadPreview(null);
        stopCaptureLoop();
        stopCamera();
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      sendInFlightRef.current = false;
    };
  }, [isOpen, stopCamera, stopCaptureLoop]);

  useEffect(() => {
    if (!isOpen) return undefined;
    startCamera();

    return () => {
      stopCaptureLoop();
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, stopCaptureLoop]);

  useEffect(() => {
    if (isOpen) return;
    setImagePreview(null);
    setUploadPreview(null);
    uploadFrameRef.current = null;
    resetDetectionState();
  }, [isOpen, resetDetectionState]);

  useEffect(() => {
    if (!isOpen) return;
    if (imagePreview) {
      stopCaptureLoop();
      return;
    }
    if (videoReady || uploadFrameRef.current) {
      startCaptureLoop();
    }
  }, [imagePreview, isOpen, startCaptureLoop, stopCaptureLoop, videoReady]);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toaster.create({ title: 'Invalid file', description: 'Please choose an image', type: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toaster.create({ title: 'File too large', description: 'Max size 5MB', type: 'error' });
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
    startCamera();
  }, [resetDetectionState, startCamera]);

  const handleSubmit = async () => {
    if (!imagePreview || !cardDetected) {
      toaster.create({ title: 'Verification', description: 'Capture a valid ID first', type: 'info' });
      return;
    }
    setSubmitting(true);
    try {
      if (typeof _onSuccess === 'function') {
        await _onSuccess();
      }
      toaster.create({ title: 'Submitted', description: 'Verification sent successfully.', type: 'success' });
    } catch (error) {
      console.error(error);
      toaster.create({ title: 'Submit failed', description: 'Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const previewImage = imagePreview || uploadPreview;

  const overlayStyle = useMemo(() => {
    if (!bbox || !frameMeta || !containerSize.width || !containerSize.height) {
      return null;
    }
    const [x1, y1, x2, y2] = bbox;
    const scale = Math.max(containerSize.width / frameMeta.width, containerSize.height / frameMeta.height);
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
        width={{ base: '100%', sm: '450px', md: '520px' }}
        maxW="520px"
        onClick={(e) => e.stopPropagation()}
        boxShadow="0 24px 45px rgba(0,0,0,0.25)"
      >
        <VStack spacing={4} align="stretch">
          <Text fontSize="xl" fontWeight="bold" color="#21421B">
            Verify Your Identity
          </Text>
          <Text fontSize="sm" color="gray.600">
            Capture a clear photo of your ID. We&apos;ll validate it on our secure server before proceeding.
          </Text>

          <Box
            ref={containerRef}
            position="relative"
            rounded="xl"
            overflow="hidden"
            bg="gray.900"
            width="100%"
            style={{ aspectRatio: TARGET_RATIO }}
          >
            {previewImage ? (
              <img src={previewImage} alt="ID preview" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}

            {overlayStyle && !imagePreview && (
              <Box
                position="absolute"
                left={`${overlayStyle.left}px`}
                top={`${overlayStyle.top}px`}
                width={`${overlayStyle.width}px`}
                height={`${overlayStyle.height}px`}
                border="2px solid"
                borderColor={status === 'LOCKING' ? 'yellow.300' : 'green.300'}
                borderRadius="6px"
                pointerEvents="none"
              />
            )}

            {previewImage && (
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

            {!imagePreview && (
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
                whiteSpace="nowrap"
              >
                {statusText}
              </Box>
            )}

            {cameraError && !previewImage && (
              <Text position="absolute" bottom="3" left="50%" transform="translateX(-50%)" color="white" fontSize="xs">
                {cameraError}
              </Text>
            )}
          </Box>

          <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

          <input type="file" accept="image/*" id="verification-file-input" style={{ display: 'none' }} onChange={handleFileSelect} />

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
                onClick={() => document.getElementById('verification-file-input').click()}
              >
                Upload ID
              </Button>
            </HStack>

            {cardDetected && (
              <Text fontSize="sm" color="green.600" textAlign="center">
                Card detected.
              </Text>
            )}

            {imagePreview && (
              <Button
                rounded="full"
                bg="#21421B"
                color="white"
                _hover={{ bg: '#1A3517' }}
                _active={{ bg: '#142812' }}
                isDisabled={!cardDetected}
                isLoading={submitting}
                onClick={handleSubmit}
              >
                Submit for verification
              </Button>
            )}

            <Button rounded="full" variant="ghost" color="gray.600" onClick={onClose}>
              Cancel
            </Button>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
