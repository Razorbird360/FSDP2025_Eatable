const MIN_COVERAGE = 0.6;
const TARGET_RATIO = 1.75;

self.onmessage = (event) => {
  const { width, height, frame } = event.data;
  const feedback = [];
  let ready = false;
  if (!frame) {
    self.postMessage({ ready: false, feedback: ['Awaiting camera feed'] });
    return;
  }

  const data = frame.data;
  const centerWidth = Math.floor(width * 0.7);
  const centerHeight = Math.floor(height * 0.7);
  const startX = Math.floor((width - centerWidth) / 2);
  const startY = Math.floor((height - centerHeight) / 2);

  let totalBrightness = 0;
  let sampleCount = 0;

  for (let y = startY; y < startY + centerHeight; y += 4) {
    for (let x = startX; x < startX + centerWidth; x += 4) {
      const idx = (y * width + x) * 4;
      const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      totalBrightness += brightness;
      sampleCount += 1;
    }
  }

  const avgBrightness = sampleCount ? totalBrightness / sampleCount : 0;
  const coverageEstimate = centerWidth * centerHeight / (width * height);

  if (coverageEstimate < MIN_COVERAGE) {
    feedback.push('Move card closer to fill the frame');
  }
  if (avgBrightness < 70) {
    feedback.push('Increase lighting');
  }

  if (!feedback.length) {
    ready = true;
    feedback.push('ID centered and clear');
  }

  self.postMessage({ ready, feedback });
};
