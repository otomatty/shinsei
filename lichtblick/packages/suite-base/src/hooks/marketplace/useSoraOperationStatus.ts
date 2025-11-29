// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { useState, useCallback } from "react";

/**
 * Operation status for marketplace items (extensions and layouts)
 */
export enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
  UPDATING = "updating",
}

export interface UseOperationStatusOptions {
  /**
   * Enable detailed status tracking
   * If false, only tracks whether an operation is in progress
   */
  enableDetailedStatus?: boolean;
}

/**
 * Hook for managing operation status (install/uninstall/update) for marketplace items.
 * Provides a consistent API for both extensions and layouts.
 */
export function useSoraOperationStatus(_options?: UseOperationStatusOptions): {
  setStatus: (id: string, status: OperationStatus) => void;
  getStatus: (id: string) => OperationStatus;
  isOperating: (id: string) => boolean;
  isInstalling: (id: string) => boolean;
  isUninstalling: (id: string) => boolean;
  isUpdating: (id: string) => boolean;
  resetAll: () => void;
  getItemsByStatus: (status: OperationStatus) => string[];
  hasAnyOperation: () => boolean;
  operations: Record<string, OperationStatus>;
} {
  const [operations, setOperations] = useState<Record<string, OperationStatus>>({});

  /**
   * Set operation status for an item
   * @param id Item ID
   * @param status Operation status
   */
  const setStatus = useCallback((id: string, status: OperationStatus) => {
    setOperations((prev) => {
      // Remove from tracking when IDLE (memory optimization)
      if (status === OperationStatus.IDLE) {
        const { [id]: _unused, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: status };
    });
  }, []);

  /**
   * Get current operation status for an item
   * @param id Item ID
   * @returns Current status (defaults to IDLE)
   */
  const getStatus = useCallback(
    (id: string): OperationStatus => {
      return operations[id] ?? OperationStatus.IDLE;
    },
    [operations],
  );

  /**
   * Check if any operation is in progress for an item
   * @param id Item ID
   * @returns true if installing/uninstalling/updating
   */
  const isOperating = useCallback(
    (id: string): boolean => {
      const status = operations[id];
      return status != undefined && status !== OperationStatus.IDLE;
    },
    [operations],
  );

  /**
   * Check if item is currently being installed
   * @param id Item ID
   * @returns true if status is INSTALLING
   */
  const isInstalling = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.INSTALLING;
    },
    [operations],
  );

  /**
   * Check if item is currently being uninstalled
   * @param id Item ID
   * @returns true if status is UNINSTALLING
   */
  const isUninstalling = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.UNINSTALLING;
    },
    [operations],
  );

  /**
   * Check if item is currently being updated
   * @param id Item ID
   * @returns true if status is UPDATING
   */
  const isUpdating = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.UPDATING;
    },
    [operations],
  );

  /**
   * Reset all operation statuses
   */
  const resetAll = useCallback(() => {
    setOperations({});
  }, []);

  /**
   * Get all items with a specific status
   * @param status Operation status to filter by
   * @returns Array of item IDs with the specified status
   */
  const getItemsByStatus = useCallback(
    (status: OperationStatus): string[] => {
      return Object.entries(operations)
        .filter(([_id, s]) => s === status)
        .map(([id]) => id);
    },
    [operations],
  );

  /**
   * Check if any operation is in progress (for any item)
   * @returns true if any item has an operation in progress
   */
  const hasAnyOperation = useCallback((): boolean => {
    return Object.keys(operations).length > 0;
  }, [operations]);

  return {
    setStatus,
    getStatus,
    isOperating,
    isInstalling,
    isUninstalling,
    isUpdating,
    resetAll,
    getItemsByStatus,
    hasAnyOperation,
    operations, // Exposed for debugging or advanced use cases
  };
}
