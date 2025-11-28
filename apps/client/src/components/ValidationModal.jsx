import { Button, Spinner, VStack, Text } from "@chakra-ui/react";

/**
 * Reusable validation modal for food image validation
 * @param {boolean} isOpen - Whether the modal is open
 * @param {"loading"|"error"|"success"} status - Current validation status
 * @param {string} message - Message to display
 * @param {function} onRetry - Callback for retry button (error state)
 * @param {function} onClose - Callback to close modal
 */
export default function ValidationModal({
  isOpen,
  status = "loading",
  message = "",
  onRetry,
  onClose,
}) {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <VStack gap={4}>
            <Spinner size="xl" color="green.600" thickness="4px" />
            <Text fontSize="lg" fontWeight="medium" color="gray.700">
              {message || "Validating image..."}
            </Text>
          </VStack>
        );

      case "error":
        return (
          <VStack gap={4}>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <Text
              fontSize="lg"
              fontWeight="semibold"
              color="gray.900"
              textAlign="center"
            >
              {message || "Validation failed"}
            </Text>
            <div className="flex gap-3 mt-4">
              <Button
                onClick={onRetry}
                colorScheme="green"
                size="lg"
                px={8}
              >
                Retry
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline" size="lg" px={8}>
                  Cancel
                </Button>
              )}
            </div>
          </VStack>
        );

      case "success":
        return (
          <VStack gap={4}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <Text
              fontSize="lg"
              fontWeight="semibold"
              color="gray.900"
              textAlign="center"
            >
              {message || "Validation successful"}
            </Text>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={status === "error" ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </div>
    </div>
  );
}
