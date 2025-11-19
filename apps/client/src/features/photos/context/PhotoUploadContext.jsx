import { createContext, useCallback, useContext, useRef, useState } from "react";

const PhotoUploadContext = createContext(null);

const defaultState = {
  file: null,
  previewUrl: null,
  aspectRatio: "square",
};

export function PhotoUploadProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const objectUrlRef = useRef(null);

  const revokePreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setPhotoData = useCallback((updates) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      if (
        Object.prototype.hasOwnProperty.call(updates, "previewUrl") &&
        updates.previewUrl === null &&
        prev.previewUrl?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      if (updates?.previewUrl && updates.previewUrl !== prev.previewUrl) {
        if (prev.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        if (updates.previewUrl.startsWith("blob:")) {
          objectUrlRef.current = updates.previewUrl;
        } else {
          revokePreview();
        }
      }
      return next;
    });
  }, [revokePreview]);

  const clearPhotoData = useCallback(() => {
    revokePreview();
    setState(defaultState);
  }, [revokePreview]);

  return (
    <PhotoUploadContext.Provider
      value={{ ...state, setPhotoData, clearPhotoData }}
    >
      {children}
    </PhotoUploadContext.Provider>
  );
}

export function usePhotoUpload() {
  const ctx = useContext(PhotoUploadContext);
  if (!ctx) {
    throw new Error("usePhotoUpload must be used within PhotoUploadProvider");
  }
  return ctx;
}
