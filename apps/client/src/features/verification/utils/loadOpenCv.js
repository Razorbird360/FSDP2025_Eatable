let loadPromise;

export function loadOpenCv() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV can only be loaded in the browser'));
  }

  if (window.cv && window.cv.imread) {
    return Promise.resolve(window.cv);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('opencv-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.cv));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'opencv-script';
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.async = true;
    script.onload = () => {
      if (window.cv && window.cv['onRuntimeInitialized']) {
        window.cv['onRuntimeInitialized'] = () => resolve(window.cv);
      } else {
        resolve(window.cv);
      }
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return loadPromise;
}
