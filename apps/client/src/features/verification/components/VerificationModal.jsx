import { useEffect, useRef, useState } from 'react';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { toaster } from '../../../components/ui/toaster';
import api from '../../../lib/api';
import { loadOpenCv } from '../utils/loadOpenCv';

const TARGET_RATIO = 1.75;
const READY_COVERAGE = 0.7;
const MIN_BRIGHTNESS = 65;
const MIN_SHARPNESS = 80;
const MAX_TILT = 15;

const DEFAULT_FEEDBACK = {
  ready: false,
  message: 'Align your ID',
  feedback: ['Move card closer until it fills the frame'],
};

function orderPoints(points) {
  const rect = new Array(4);
  const sums = points.map((p) => p.x + p.y);
  const diffs = points.map((p) => p.x - p.y);
  rect[0] = points[sums.indexOf(Math.min(...sums))]; // tl
  rect[2] = points[sums.indexOf(Math.max(...sums))]; // br
  rect[1] = points[diffs.indexOf(Math.min(...diffs))]; // tr
  rect[3] = points[diffs.indexOf(Math.max(...diffs))]; // bl
  return rect;
}

export default function VerificationModal({ isOpen, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const previewImgRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cvReady, setCvReady] = useState(false);
  const [cvRequested, setCvRequested] = useState(false);
  const [detection, setDetection] = useState(DEFAULT_FEEDBACK);

  useEffect(() => {
    if (!isOpen || cvReady || cvRequested) {
      return undefined;
    }

    let cancelled = false;
    setCvRequested(true);
    loadOpenCv()
      .then(() => {
        if (!cancelled) {
          setCvReady(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load OpenCV:', err);
        if (!cancelled) {
          setCvRequested(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, cvReady, cvRequested]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let stream;
    const startCamera = async () => {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Camera init error:', error);
        setCameraError('Unable to access the camera. Upload an ID instead.');
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setDetection(DEFAULT_FEEDBACK);
    };
  }, [isOpen]);

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
      const dataUrl = await cropToRatio(file);
      setSelectedFile(file);
      setPreview(dataUrl);
    } catch (error) {
      console.error('Cropping error:', error);
      toaster.create({
        title: 'Processing error',
        description: 'Unable to process the selected image. Try another photo.',
        type: 'error',
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

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

  const clearPreview = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  useEffect(() => {
    if (!isOpen || !cvReady) return undefined;
    const interval = setInterval(() => {
      runDetection();
    }, 220);

    return () => {
      clearInterval(interval);
      if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
    };
  }, [isOpen, cvReady, preview, cameraError]);

  const runDetection = () => {
    const cv = window.cv;
    const sourceEl = preview ? previewImgRef.current : videoRef.current;
    if (!cv || !sourceEl) return;

    const width = sourceEl.videoWidth || sourceEl.naturalWidth;
    const height = sourceEl.videoHeight || sourceEl.naturalHeight;
    if (!width || !height) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    canvas.width = width;
    canvas.height = height;
    overlay.width = width;
    overlay.height = height;

    const ctx2d = canvas.getContext('2d');
    ctx2d.drawImage(sourceEl, 0, 0, width, height);

    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    const blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    const edges = new cv.Mat();
    cv.Canny(blur, edges, 50, 150);
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);
    cv.erode(edges, edges, kernel);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best = null;
    let bestScore = 0;

    for (let i = 0; i < contours.size(); i += 1) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows !== 4) {
        approx.delete();
        continue;
      }

      const area = cv.contourArea(approx);
      if (area < 0.12 * width * height) {
        approx.delete();
        continue;
      }

      const raw = approx.data32S;
      const points = [
        { x: raw[0], y: raw[1] },
        { x: raw[2], y: raw[3] },
        { x: raw[4], y: raw[5] },
        { x: raw[6], y: raw[7] },
      ];
      const rect = orderPoints(points);
      const w = Math.hypot(rect[1].x - rect[0].x, rect[1].y - rect[0].y);
      const h = Math.hypot(rect[3].x - rect[0].x, rect[3].y - rect[0].y);
      if (h === 0) {
        approx.delete();
        continue;
      }

      const ratio = w / h;
      const invRatio = h / w;
      if (!(ratio >= 1.3 && ratio <= 2.2) && !(invRatio >= 1.3 && invRatio <= 2.2)) {
        approx.delete();
        continue;
      }

      const coverage = area / (width * height);
      const { brightness, sharpness } = evaluateQuality(cv, gray, rect);
      const { direction, slope } = analyzeOrientation(rect);

      const feedback = [];
      let ready = true;
      if (coverage < READY_COVERAGE) {
        ready = false;
        feedback.push('Move card closer to the camera');
      }
      if (direction) {
        ready = false;
        feedback.push(direction);
      }
      if (brightness < MIN_BRIGHTNESS) {
        ready = false;
        feedback.push('Increase lighting');
      }
      if (sharpness < MIN_SHARPNESS) {
        ready = false;
        feedback.push('Hold steady - image is blurry');
      }

      if (!feedback.length) {
        feedback.push('Card detected and aligned');
      }

      const score = ready ? coverage : coverage * 0.8;
      if (score > bestScore) {
        bestScore = score;
        best = { quad: rect, ready, coverage, brightness, sharpness, feedback, slope };
      }

      approx.delete();
    }

    drawOverlay(overlay, best);

    if (best) {
      setDetection({
        ready: best.ready,
        message: best.ready ? 'Card detected - ready to capture' : 'Adjust your ID',
        feedback: best.feedback,
      });
    } else if (cameraError) {
      setDetection({ ready: false, message: 'Camera unavailable', feedback: [cameraError] });
    } else {
      setDetection(DEFAULT_FEEDBACK);
    }

    src.delete();
    gray.delete();
    blur.delete();
    edges.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
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
        width={{ base: '100%', sm: '450px', md: '540px' }}
        maxW="540px"
        onClick={(e) => e.stopPropagation()}
        boxShadow="0 24px 45px rgba(0,0,0,0.25)"
      >
        <VStack spacing={5} align="stretch">
          <Text fontSize="xl" fontWeight="bold" color="#21421B">
            Verify Your Identity
          </Text>

          <Text fontSize="sm" color="gray.600">
            Align your ID within the frame. The system checks for size, tilt, and clarity automatically.
          </Text>

          <Box position="relative" rounded="xl" overflow="hidden" bg="gray.900" height={{ base: '260px', sm: '320px' }}>
            {preview ? (
              <img ref={previewImgRef} src={preview} alt="Uploaded document" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
            <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
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
            {preview && (
              <Button
                position="absolute"
                top="3"
                right="3"
                size="sm"
                rounded="full"
                bg="rgba(0,0,0,0.65)"
                color="white"
                _hover={{ bg: 'rgba(0,0,0,0.8)' }}
                onClick={clearPreview}
              >
                Retake
              </Button>
            )}
          </Box>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <Box bg="#F6FBF2" rounded="xl" p={3} border="1px solid #E3F0D9">
            <Text fontSize="sm" fontWeight="semibold" color={detection.ready ? '#1f8a2f' : '#8a4c00'}>
              {detection.message}
            </Text>
            {detection.feedback.map((line) => (
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
                onClick={triggerFileSelect}
              >
                Upload ID
              </Button>
              {selectedFile && (
                <Button
                  flex={1}
                  minW="130px"
                  rounded="full"
                  bg="#21421B"
                  color="white"
                  _hover={{ bg: '#1A3517' }}
                  _active={{ bg: '#142812' }}
                  isLoading={uploading}
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              )}
            </HStack>
            <Button rounded="full" variant="ghost" color="gray.600" onClick={onClose}>
              Cancel
            </Button>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}

async function cropToRatio(file) {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
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
  return canvas.toDataURL(file.type);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function evaluateQuality(cv, grayMat, quad) {
  const width = 700;
  const height = Math.round(width / TARGET_RATIO);
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, quad.flatMap((p) => [p.x, p.y]));
  const dstTri = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    [0, 0, width - 1, 0, width - 1, height - 1, 0, height - 1]
  );
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const warped = new cv.Mat();
  cv.warpPerspective(grayMat, warped, M, new cv.Size(width, height));

  const brightness = cv.mean(warped)[0];
  const lap = new cv.Mat();
  cv.Laplacian(warped, lap, cv.CV_64F);
  const mean = new cv.Mat();
  const stddev = new cv.Mat();
  cv.meanStdDev(lap, mean, stddev);
  const sharpness = Math.pow(stddev.doubleAt(0, 0), 2);

  warped.delete();
  lap.delete();
  mean.delete();
  stddev.delete();
  srcTri.delete();
  dstTri.delete();
  M.delete();

  return { brightness, sharpness };
}

function analyzeOrientation(rect) {
  const [tl, tr, br, bl] = rect;
  const slope = tr.y - tl.y;
  if (slope > MAX_TILT) {
    return { slope, direction: 'Lower the right edge' };
  }
  if (slope < -MAX_TILT) {
    return { slope, direction: 'Lower the left edge' };
  }

  const leftHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightHeight = Math.hypot(br.x - tr.x, br.y - tr.y);
  const diff = rightHeight - leftHeight;
  if (diff > 20) {
    return { slope, direction: 'Tilt card back' };
  }
  if (diff < -20) {
    return { slope, direction: 'Tilt card forward' };
  }
  return { slope, direction: null };
}

function drawOverlay(canvas, detection) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!detection || !detection.quad) return;
  ctx.strokeStyle = detection.ready ? '#34D399' : '#FBBF24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(detection.quad[0].x, detection.quad[0].y);
  for (let i = 1; i < detection.quad.length; i += 1) {
    ctx.lineTo(detection.quad[i].x, detection.quad[i].y);
  }
  ctx.closePath();
  ctx.stroke();
}
