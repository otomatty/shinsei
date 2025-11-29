// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useState } from "react";

/**
 * Configuration options for useImageError hook
 */
export interface UseImageErrorOptions {
  /** Callback when image fails to load */
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Initial error state */
  initialError?: boolean;
}

/**
 * Return value of useImageError hook
 */
export interface UseImageErrorResult {
  /** Whether image has failed to load */
  hasError: boolean;
  /** Error handler for img element */
  handleError: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Manual reset function */
  reset: () => void;
}

/**
 * Custom hook for handling image loading errors
 *
 * Provides a simple, reusable way to handle image loading failures.
 * Can be used with any image element or image-based component.
 *
 * @param options - Configuration options
 * @returns Object containing error state, handler, and reset function
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { hasError, handleError } = useImageError();
 *
 * return (
 *   <>
 *     {hasError && <div>Image failed to load</div>}
 *     <img src="..." onError={handleError} />
 *   </>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // With custom callback
 * const { hasError, handleError, reset } = useImageError({
 *   onError: (e) => {
 *     console.log('Image failed:', e);
 *   },
 * });
 *
 * return (
 *   <>
 *     {hasError && (
 *       <div>
 *         Image not available
 *         <button onClick={reset}>Retry</button>
 *       </div>
 *     )}
 *     <img src="..." onError={handleError} />
 *   </>
 * );
 * ```
 */
export function useSoraImageError(options?: UseImageErrorOptions): UseImageErrorResult {
  const { onError, initialError = false } = options ?? {};
  const [hasError, setHasError] = useState(initialError);

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      // Call custom callback if provided
      onError?.(event);
      // Set error state
      setHasError(true);
    },
    [onError],
  );

  const reset = useCallback(() => {
    setHasError(false);
  }, []);

  return { hasError, handleError, reset };
}
