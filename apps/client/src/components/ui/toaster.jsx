import {
  Toaster as ChakraToaster,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastCloseTrigger,
  ToastIndicator,
  createToaster,
} from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "top",
  overlap: false,
  pauseOnPageIdle: true,
});

export function Toaster() {
  return (
    <ChakraToaster toaster={toaster}>
      {(toast) => (
        <ToastRoot
          key={toast.id}
          className="mb-3 flex items-start gap-3 rounded-2xl bg-[#121212] px-4 py-3 text-white shadow-2xl"
        >
          <ToastIndicator className="mt-0.5 text-green-300" />
          <div className="flex-1">
            {toast.title && (
              <ToastTitle className="text-sm font-semibold">
                {toast.title}
              </ToastTitle>
            )}
            {toast.description && (
              <ToastDescription className="text-xs text-gray-200">
                {toast.description}
              </ToastDescription>
            )}
          </div>
          <ToastCloseTrigger className="ml-2 text-xs font-medium text-gray-300 hover:text-white">
            Close
          </ToastCloseTrigger>
        </ToastRoot>
      )}
    </ChakraToaster>
  );
}
