/* eslint-env worker */
/* global cv */

const CV_SCRIPT_URL = 'https://docs.opencv.org/4.x/opencv.js';

let cvReady = false;
let pendingMessages = [];
let lastLogTime = 0;

function logStatus(message) {
  const now = Date.now();
  if (now - lastLogTime >= 500) {
    console.log(`[ID Worker] ${message}`);
    lastLogTime = now;
  }
}

function rotatedRectPoints(rect) {
  const angle = (rect.angle * Math.PI) / 180;
  const b = Math.cos(angle) * 0.5;
  const a = Math.sin(angle) * 0.5;
  const width = rect.size.width;
  const height = rect.size.height;

  return [
    {
      x: rect.center.x - a * height - b * width,
      y: rect.center.y + b * height - a * width,
    },
    {
      x: rect.center.x + a * height - b * width,
      y: rect.center.y - b * height - a * width,
    },
    {
      x: rect.center.x + a * height + b * width,
      y: rect.center.y - b * height + a * width,
    },
    {
      x: rect.center.x - a * height + b * width,
      y: rect.center.y + b * height + a * width,
    },
  ];
}

self.Module = {
  onRuntimeInitialized() {
    cvReady = true;
    logStatus('OpenCV initialized');
    self.postMessage({ type: 'ready' });
    pendingMessages.forEach((data) => handleMessage(data));
    pendingMessages = [];
  },
};

importScripts(CV_SCRIPT_URL);

function orderPoints(points) {
  const rect = new Array(4);
  const sum = points.map((p) => p.x + p.y);
  const diff = points.map((p) => p.x - p.y);

  rect[0] = points[sum.indexOf(Math.min(...sum))];
  rect[2] = points[sum.indexOf(Math.max(...sum))];
  rect[1] = points[diff.indexOf(Math.min(...diff))];
  rect[3] = points[diff.indexOf(Math.max(...diff))];

  return rect;
}

function measureDimensions(points) {
  const width = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const height = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
  return { width, height };
}

function detectCard({ width, height, buffer }) {
  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const morph = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
  cv.Canny(blur, edges, 30, 120);
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  cv.dilate(edges, morph, kernel);
  cv.erode(morph, edges, kernel);
  kernel.delete();
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const frameArea = width * height;
  let best = null;
  let bestCoverage = 0;

  for (let i = 0; i < contours.size(); i += 1) {
    const contour = contours.get(i);
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    const area = Math.abs(cv.contourArea(contour));
    if (area >= 0.02 * frameArea) {
      let candidate = null;
      if (approx.rows === 4) {
        const pts = [];
        for (let j = 0; j < 4; j += 1) {
          const px = approx.intPtr(j, 0)[0];
          const py = approx.intPtr(j, 0)[1];
          pts.push({ x: px, y: py });
        }
        candidate = orderPoints(pts);
      } else {
        const rotated = cv.minAreaRect(contour);
        candidate = orderPoints(rotatedRectPoints(rotated));
      }

      if (candidate) {
        const { width: cardWidth, height: cardHeight } = measureDimensions(candidate);
        if (cardWidth > 0 && cardHeight > 0) {
          const longSideRatio = Math.max(cardWidth / cardHeight, cardHeight / cardWidth);
          if (longSideRatio >= 1.1 && longSideRatio <= 3.2) {
            const coverage = area / frameArea;
            if (coverage > bestCoverage) {
              best = candidate.map((pt) => ({ x: pt.x, y: pt.y }));
              bestCoverage = coverage;
            }
          }
        }
      }
    }

    approx.delete();
    contour.delete();
  }

  logStatus(`Contours=${contours.size()} edgeFound=${best ? 'yes' : 'no'}`);

  src.delete();
  gray.delete();
  blur.delete();
  edges.delete();
  morph.delete();
  contours.delete();
  hierarchy.delete();

  if (best) {
    if (bestCoverage >= 0.5) {
      logStatus(`Detected ID card covering ${(bestCoverage * 100).toFixed(1)}% of frame`);
    }
    return { points: best, width, height, coverage: bestCoverage };
  }
  return null;
}

function handleMessage(data) {
  if (!cvReady) {
    pendingMessages.push(data);
    return;
  }

  if (data.type === 'frame' || data.type === 'image') {
    const result = detectCard(data);
    self.postMessage({
      type: 'detection',
      points: result ? result.points : null,
      width: data.width,
      height: data.height,
      coverage: result ? result.coverage : null,
    });
  } else if (data.type === 'clear') {
    self.postMessage({ type: 'detection', points: null, width: data.width ?? 0, height: data.height ?? 0 });
  }
}

self.onmessage = (event) => {
  handleMessage(event.data);
};
