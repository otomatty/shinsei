// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview Common types for installed items tracking
 *
 * Defines the state interface used by both extension and layout hooks
 * for tracking installed marketplace items.
 */

/**
 * State for tracking installed marketplace items
 * @template T - Type of the installed item (ExtensionInfo or Layout)
 */
export interface InstalledItemsState<T> {
  /** Set of installed marketplace IDs */
  installedIds: Set<string>;

  /** Map from marketplace ID to installed item */
  itemMap: Map<string, T>;

  /** Check if an item is installed by marketplace ID */
  isInstalled: (marketplaceId: string) => boolean;

  /** Get installed item by marketplace ID */
  getItem: (marketplaceId: string) => T | undefined;

  /** Refresh the installed items list */
  refresh: () => Promise<void>;

  /** Loading state */
  loading: boolean;

  /** Error message if loading failed */
  error: string | undefined;
}
