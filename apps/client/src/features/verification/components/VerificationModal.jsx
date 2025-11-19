import { useEffect, useRef, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { toaster } from '../../../components/ui/toaster';

const TARGET_RATIO = 1.75;
const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export default function VerificationModal({ isOpen, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState(null);

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
        setStream(localStream);
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
      setStream(null);
      setImagePreview(null);
      setImageFile(null);
      setAnalysis(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen]);

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = await cropDataUrl(canvas.toDataURL('image/jpeg', 0.92));
    setImagePreview(dataUrl);
    setImageFile(null);
    setAnalysis(null);
  };

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
    setImagePreview(dataUrl);
    setImageFile(file);
    setAnalysis(null);
  };

  const handleSubmit = async () => {
    if (!imagePreview && !imageFile) {
      toaster.create({ title: 'No image selected', description: 'Capture or upload your ID first', type: 'error' });
      return;
    }

    const formData = new FormData();
    if (imageFile) {
      formData.append('image', imageFile, imageFile.name);
    } else if (imagePreview) {
      const blob = await dataUrlToBlob(imagePreview);
      formData.append('image', blob, 'captured-id.jpg');
    }

    setSubmitting(true);
    setAnalysis(null);
    try {
      const response = await fetch(`${AI_BASE_URL}/id/validate`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      const result = await response.json();
      setAnalysis(result);
      if (result.ready) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toaster.create({ title: 'Verification failed', description: error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

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

          <Box position="relative" rounded="xl" overflow="hidden" bg="gray.900" height={{ base: '260px', sm: '320px' }}>
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
                bg="rgba(0,0,0,0.65)"
                color="white"
                _hover={{ bg: 'rgba(0,0,0,0.8)' }}
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                  setAnalysis(null);
                }}
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

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <Box bg="#F6FBF2" rounded="xl" p={3} border="1px solid #E3F0D9">
            <Text fontSize="sm" fontWeight="semibold" color="#21421B">
              {analysis?.ready ? 'ID validated successfully' : 'Awaiting verification'}
            </Text>
            {analysis?.feedback?.map((line) => (
              <Text key={line} fontSize="xs" color="#3a3a3a">
                {line}
              </Text>
            ))}
          </Box>

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
              <Button
                flex={1}
                minW="130px"
                rounded="full"
                bg="#21421B"
                color="white"
                _hover={{ bg: '#1A3517' }}
                _active={{ bg: '#142812' }}
                onClick={captureFromCamera}
                disabled={!!cameraError}
              >
                Capture from camera
              </Button>
            </HStack>

            {(imagePreview || imageFile) && (
              <Button
                rounded="full"
                bg="#21421B"
                color="white"
                _hover={{ bg: '#1A3517' }}
                _active={{ bg: '#142812' }}
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

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
