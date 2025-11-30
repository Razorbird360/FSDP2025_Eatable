import { Button, Spinner, VStack, Text } from "@chakra-ui/react";

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
          <Spinner
            size="xl"
            color="green.600"
            borderWidth="4px"
            css={{
              animation: "spin 0.8s linear infinite",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" }
              }
            }}
          />
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
    </div>
  );
}
