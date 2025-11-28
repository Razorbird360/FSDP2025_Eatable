import { createContext, useCallback, useContext, useRef, useState } from "react";
import api from "../../../lib/api";

const PhotoUploadContext = createContext(null);

const defaultState = {
  file: null,
  previewUrl: null,
  aspectRatio: "square",
  validationStatus: null, // null | "validating" | "success" | "error"
  validationMessage: "",
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

  const validatePhoto = useCallback(async (file) => {
    if (!file) return { success: false, message: "No file provided" };

    // Set validating status
    setState((prev) => ({
      ...prev,
      validationStatus: "validating",
      validationMessage: "Validating image...",
    }));

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/media/validate-generic", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 second timeout for AI validation
      });

      const { is_food, message } = response.data;

      if (is_food === 1) {
        // Success - food detected
        setState((prev) => ({
          ...prev,
          validationStatus: "success",
          validationMessage: message || "Food detected!",
        }));
        return { success: true, message };
      } else {
        // Error - no food detected
        setState((prev) => ({
          ...prev,
          validationStatus: "error",
          validationMessage: message || "No food detected. Please upload a photo of food.",
        }));
        return { success: false, message };
      }
    } catch (error) {
      console.error("Validation error:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to validate image. Please try again.";

      setState((prev) => ({
        ...prev,
        validationStatus: "error",
        validationMessage: errorMessage,
      }));

      return { success: false, message: errorMessage };
    }
  }, []);

  const resetValidation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      validationStatus: null,
      validationMessage: "",
    }));
  }, []);

  return (
    <PhotoUploadContext.Provider
      value={{
        ...state,
        setPhotoData,
        clearPhotoData,
        validatePhoto,
        resetValidation,
      }}
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
