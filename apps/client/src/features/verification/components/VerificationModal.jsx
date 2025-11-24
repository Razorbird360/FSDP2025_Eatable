import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { toaster } from '../../../components/ui/toaster';

const TARGET_RATIO = 1.75;
const FRAME_INTERVAL = 200;

export default function VerificationModal({ isOpen, onClose, onSuccess: _onSuccess }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const workerRef = useRef(null);
  const workerReadyRef = useRef(false);
  const frameTimerRef = useRef(null);
  const previewActiveRef = useRef(false);
  const imagePreviewValueRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [cardDetected, setCardDetected] = useState(false);
  const [lastDetectionSource, setLastDetectionSource] = useState(null);
  useEffect(() => {
    previewActiveRef.current = Boolean(imagePreview);
    imagePreviewValueRef.current = imagePreview;
  }, [imagePreview]);

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

  const clearOverlay = useCallback(() => {
    setCardDetected(false);
    setLastDetectionSource(null);
  }, []);

  const stopLiveProcessing = useCallback(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }, []);

  const startLiveProcessing = useCallback(() => {
    if (frameTimerRef.current || !workerRef.current || !workerReadyRef.current) {
      return;
    }
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const captureFrame = () => {
      if (!workerRef.current || !videoRef.current || previewActiveRef.current) {
        return;
      }
      const currentVideo = videoRef.current;
      if (!currentVideo || currentVideo.readyState < 2) {
        return;
      }
      const { videoWidth: width, videoHeight: height } = currentVideo;
      if (!width || !height) {
        return;
      }
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.drawImage(currentVideo, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const payload = { type: 'frame', width, height, buffer: imageData.data.buffer };
      workerRef.current.postMessage(payload, [payload.buffer]);
    };

    captureFrame();
    frameTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL);
  }, []);

  const runImageDetection = useCallback((dataUrl) => {
    if (!dataUrl || !workerRef.current || !workerReadyRef.current || !captureCanvasRef.current) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = captureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const payload = { type: 'image', width: canvas.width, height: canvas.height, buffer: imageData.data.buffer };
      workerRef.current.postMessage(payload, [payload.buffer]);
    };
    img.onerror = () => console.error('Unable to load uploaded image for detection');
    img.src = dataUrl;
  }, []);

  useEffect(() => {
    if (!isOpen || !workerReadyRef.current) {
      stopLiveProcessing();
      return;
    }
    if (imagePreview) {
      stopLiveProcessing();
      runImageDetection(imagePreview);
    } else if (videoReady) {
      startLiveProcessing();
    }
  }, [imagePreview, isOpen, videoReady, runImageDetection, startLiveProcessing, stopLiveProcessing]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const worker = new Worker(new URL('../workers/idWorker.js', import.meta.url));
    workerRef.current = worker;

    const handleMessage = (event) => {
      const { type, points, width, height, coverage } = event.data;
      if (type === 'ready') {
        workerReadyRef.current = true;
        if (imagePreviewValueRef.current) {
          runImageDetection(imagePreviewValueRef.current);
        } else {
          startLiveProcessing();
        }
      } else if (type === 'detection') {
        const detected = Boolean(points && points.length === 4);
        setCardDetected(detected);
        setLastDetectionSource(previewActiveRef.current ? 'upload' : 'camera');
        if (!detected && previewActiveRef.current) {
          toaster.create({ title: 'No card detected', description: 'Try adjusting lighting or framing.', type: 'info' });
        }
        if (coverage && coverage >= 0.5) {
          console.log(`[ID Overlay] high-coverage detection ${(coverage * 100).toFixed(1)}%`);
        }
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    };
  }, [isOpen, runImageDetection, startLiveProcessing]);

  useEffect(() => {
    let localStream;
    const startCamera = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: 640,
            height: 480,
          },
        });
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (error) {
        console.error('Camera init error:', error);
        setCameraError('Unable to access camera');
      }
    };

    if (isOpen) {
      startCamera();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      stopLiveProcessing();
      clearOverlay();
      setImagePreview(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, stopLiveProcessing, clearOverlay]);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toaster.create({ title: 'Invalid file', description: 'Please choose an image', type: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toaster.create({ title: 'File too large', description: 'Max size 5MB', type: 'error' });
      return;
    }
    const dataUrl = await cropDataUrl(await fileToDataUrl(file));
    clearOverlay();
    setImagePreview(dataUrl);
  };

  const handleRetake = useCallback(() => {
    setImagePreview(null);
    clearOverlay();
    if (workerReadyRef.current) {
      startLiveProcessing();
    }
  }, [clearOverlay, startLiveProcessing]);

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
            {imagePreview ? (
              <img src={imagePreview} alt="ID preview" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
            {imagePreview && (
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
                Center your ID
              </Box>
            )}
            {cameraError && !imagePreview && (
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

            {imagePreview && cardDetected && (
              <Text fontSize="sm" color="green.600" textAlign="center">
                Card detected. Ready to submit.
              </Text>
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


function cropDataUrl(dataUrl) {
  const img = document.createElement('img');
  return new Promise((resolve) => {
    img.onload = () => {
      const targetRatio = TARGET_RATIO;
      let cropWidth = img.width;
      let cropHeight = img.height;
      let offsetX = 0;
      let offsetY = 0;
      const currentRatio = img.width / img.height;
      if (currentRatio > targetRatio) {
        cropWidth = img.height * targetRatio;
        offsetX = (img.width - cropWidth) / 2;
      } else {
        cropHeight = img.width / targetRatio;
        offsetY = (img.height - cropHeight) / 2;
      }
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, offsetX, offsetY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
