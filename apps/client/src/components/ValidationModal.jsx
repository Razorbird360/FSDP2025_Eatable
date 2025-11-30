import { Button, VStack, Text } from "@chakra-ui/react";

/**
 * Minimal validation modal - only shows during loading
 * Success/failure handled by toast notifications
 * @param {boolean} isOpen - Whether the modal is open
 * @param {string} message - Message to display during loading
 * @param {function} onCancel - Callback to cancel validation
 */
export default function ValidationModal({
  isOpen,
  message = "",
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-[#F8FDF3] rounded-2xl shadow-lg p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <VStack gap={4}>
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
          <Text fontSize="lg" fontWeight="medium" color="gray.700">
            {message || "Validating image..."}
          </Text>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              colorScheme="gray"
              mt={2}
            >
              Cancel
            </Button>
          )}
        </VStack>
      </div>
      <style>{`
        .spinner-container {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 56px;
          height: 56px;
          border: 4px solid #d1fae5;
          border-top-color: #059669;
          border-radius: 50%;
          animation: spinner-rotate 0.8s linear infinite;
        }

        @keyframes spinner-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
