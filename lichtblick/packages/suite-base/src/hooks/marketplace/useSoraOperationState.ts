// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { useCallback, useState } from "react";
import { useMountedState } from "react-use";

/**
 * Hook for managing operation state (loading/idle) for multiple items.
 * Automatically handles cleanup when component unmounts.
 */
export default function useSoraOperationState(): {
  isLoading: (key: string) => boolean;
  startOperation: (key: string, operation: () => Promise<unknown>) => Promise<unknown>;
  finishOperation: (key: string) => void;
  loadingItems: Set<string>;
} {
  const [loadingItems, setLoadingItems] = useState(new Set<string>());
  const isMounted = useMountedState();

  const isLoading = useCallback((key: string) => loadingItems.has(key), [loadingItems]);

  const startOperation = useCallback(
    async (key: string, operation: () => Promise<unknown>): Promise<unknown> => {
      setLoadingItems((prev) => new Set(prev).add(key));
      try {
        return await operation();
      } finally {
        if (isMounted()) {
          setLoadingItems((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      }
    },
    [isMounted],
  );

  const finishOperation = useCallback((key: string) => {
    setLoadingItems((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return { isLoading, startOperation, finishOperation, loadingItems };
}
