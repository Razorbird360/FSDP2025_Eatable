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
  placement: "bottom-end",
  overlap: false,
  pauseOnPageIdle: true,
});

export function Toaster() {
  return (
    <ChakraToaster toaster={toaster}>
      {(toast) => (
        <ToastRoot
          key={toast.id}
          className="mb-2 flex min-w-[320px] max-w-[400px] items-start gap-2 rounded-xl bg-[#1d1d1d]/95 px-4 py-3 text-white shadow-lg"
        >
          <ToastIndicator className="mt-0.5 text-green-300" />
          <div className="flex-1">
            {toast.title && (
              <ToastTitle className="text-xs font-semibold">
                {toast.title}
              </ToastTitle>
            )}
            {toast.description && (
              <ToastDescription className="text-[11px] text-gray-300">
                {toast.description}
              </ToastDescription>
            )}
          </div>
        </ToastRoot>
      )}
    </ChakraToaster>
  );
}
