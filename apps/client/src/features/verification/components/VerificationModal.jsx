import { useEffect, useRef, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { toaster } from '../../../components/ui/toaster';
import api from '../../../lib/api';

export default function VerificationModal({ isOpen, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const initCamera = async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported on this device. You can still upload a photo.');
        return;
      }
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        console.error('Camera init error:', error);
        setCameraError('Unable to access the camera. Please allow camera permissions or upload a photo.');
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const TARGET_RATIO = 1.75; // width:height

  const cropToRatio = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          const currentRatio = width / height;
          let cropWidth = width;
          let cropHeight = height;
          let offsetX = 0;
          let offsetY = 0;

          if (currentRatio > TARGET_RATIO) {
            cropWidth = height * TARGET_RATIO;
            offsetX = (width - cropWidth) / 2;
          } else {
            cropHeight = width / TARGET_RATIO;
            offsetY = (height - cropHeight) / 2;
          }

          const canvas = document.createElement('canvas');
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, offsetX, offsetY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to process image.'));
              return;
            }
            const croppedFile = new File([blob], file.name, { type: file.type });
            resolve({ file: croppedFile, previewUrl: canvas.toDataURL(file.type) });
          }, file.type);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toaster.create({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG)',
        type: 'error',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toaster.create({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        type: 'error',
      });
      return;
    }

    try {
      const { file: cropped, previewUrl } = await cropToRatio(file);
      setSelectedFile(cropped);
      setPreview(previewUrl);
    } catch (error) {
      console.error('Cropping error:', error);
      toaster.create({
        title: 'Processing error',
        description: 'Unable to process the selected image. Please try another photo.',
        type: 'error',
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toaster.create({
        title: 'No document attached',
        description: 'Please upload a clear photo of your ID/permit.',
        type: 'error',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      await api.post('/verification/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toaster.create({
        title: 'Verification submitted',
        description: 'Thanks! We will review your document shortly.',
        type: 'success',
      });

      onSuccess();
    } catch (error) {
      console.error('Verification upload error:', error);
      toaster.create({
        title: 'Upload failed',
        description: error.response?.data?.error || 'Failed to submit verification',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    document.getElementById('verification-file-input')?.click();
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreview(null);
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
        width={{ base: '100%', sm: '440px', md: '520px' }}
        maxW="520px"
        onClick={(e) => e.stopPropagation()}
        boxShadow="0 24px 45px rgba(0,0,0,0.25)"
      >
        <VStack spacing={5} align="stretch">
          <Text fontSize="xl" fontWeight="bold" color="#21421B">
            Verify Your Identity
          </Text>

          <Text fontSize="sm" color="gray.600">
            Align your hawker permit or ID within the frame. Ensure photo ID and name is included in the ID.
          </Text>

          <Box
            position="relative"
            rounded="xl"
            overflow="hidden"
            bg="gray.900"
            height={{ base: '260px', sm: '320px' }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Uploaded document"
                  className="h-full w-full object-cover"
                />
                <Button
                  position="absolute"
                  top="3"
                  right="3"
                  size="sm"
                  rounded="full"
                  bg="rgba(0,0,0,0.65)"
                  color="white"
                  _hover={{ bg: 'rgba(0,0,0,0.8)' }}
                  onClick={handleRetake}
                >
                  Retake
                </Button>
              </>
            ) : cameraError ? (
              <VStack w="full" h="full" justify="center" spacing={3} px={6}>
                <Text textAlign="center" color="white" fontWeight="medium">
                  {cameraError}
                </Text>
              </VStack>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <Box
                  position="absolute"
                  inset={{ base: 6, md: 8 }}
                  border="2px solid rgba(255,255,255,0.95)"
                  rounded="lg"
                  style={{
                    boxShadow: '0 0 40px rgba(0,0,0,0.4) inset',
                  }}
                />
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
                >
                  Center your document here
                </Box>
              </>
            )}
          </Box>

          <input
            type="file"
            accept="image/*"
            id="verification-file-input"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <VStack spacing={3} align="stretch">
            <HStack spacing={3} flexWrap="wrap">
              <Button
                flex={1}
                minW="120px"
                rounded="full"
                variant="outline"
                borderColor="#21421B"
                borderWidth="1px"
                color="#21421B"
                onClick={triggerFileSelect}
              >
                Upload ID
              </Button>
              <Button
                flex={1}
                minW="120px"
                rounded="full"
                bg="#21421B"
                color="white"
                _hover={{ bg: '#1A3517' }}
                _active={{ bg: '#142812' }}
                isDisabled={!selectedFile || uploading}
                isLoading={uploading}
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </HStack>
            <Button
              rounded="full"
              variant="ghost"
              color="gray.600"
              onClick={onClose}
            >
              Cancel
            </Button>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
