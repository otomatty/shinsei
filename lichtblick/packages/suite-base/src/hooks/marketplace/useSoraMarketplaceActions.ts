// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { useSnackbar } from "notistack";
import { useCallback } from "react";

const UX_DELAY_MS = 200; // Prevent button flickering

interface ExecuteOptions {
  /** Success notification message */
  successMessage?: string;
  /** Error notification message (error details will be appended) */
  errorMessage: string;
  /** Callback after successful operation */
  onSuccess?: () => void | Promise<void>;
  /** Skip UX delay (for operations that are naturally slow) */
  skipDelay?: boolean;
}

/**
 * Hook for executing marketplace operations with consistent error handling and notifications.
 * Uses modern async/await pattern with clear separation of concerns.
 */
export function useSoraMarketplaceActions(): {
  executeMarketplaceOperation: (
    operation: () => Promise<void>,
    options: ExecuteOptions,
  ) => Promise<boolean>;
} {
  const { enqueueSnackbar } = useSnackbar();

  const executeMarketplaceOperation = useCallback(
    async (operation: () => Promise<void>, options: ExecuteOptions): Promise<boolean> => {
      const { successMessage, errorMessage, onSuccess, skipDelay = false } = options;

      try {
        // UX delay to prevent button flickering (only for fast operations)
        if (!skipDelay) {
          await new Promise((resolve) => setTimeout(resolve, UX_DELAY_MS));
        }

        // Execute the operation
        await operation();

        // Success callback
        if (onSuccess) {
          await onSuccess();
        }

        // Success notification
        if (successMessage) {
          enqueueSnackbar(successMessage, { variant: "success" });
        }

        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        enqueueSnackbar(`${errorMessage}: ${errorMsg}`, { variant: "error" });
        return false;
      }
    },
    [enqueueSnackbar],
  );

  return { executeMarketplaceOperation };
}
