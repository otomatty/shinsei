// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview Hook for tracking installed extensions
 *
 * Provides state management for installed extensions from the marketplace.
 * Uses synchronous data from ExtensionCatalog via useExtensionSettings.
 */

import { useMemo, useCallback } from "react";

import Log from "@lichtblick/log";
import useExtensionSettings from "@lichtblick/suite-base/components/ExtensionsSettings/hooks/useExtensionSettings";
import type { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";
import type { InstalledItemsState } from "@lichtblick/suite-base/types/soraInstalledItems";
import { extractBaseId } from "@lichtblick/suite-base/util/marketplace/soraExtensionIdUtils";

const log = Log.getLogger(__filename);

/**
 * Hook for tracking installed extensions.
 * Uses synchronous data from ExtensionCatalog via useExtensionSettings.
 *
 * @returns State object with installed extensions information
 *
 * @example
 * ```tsx
 * const { installedIds, isInstalled, getItem } = useSoraInstalledExtensions();
 *
 * if (isInstalled('org.example.extension')) {
 *   const ext = getItem('org.example.extension');
 *   console.log('Installed:', ext.name);
 * }
 * ```
 */
export function useSoraInstalledExtensions(): InstalledItemsState<ExtensionInfo> {
  const { namespacedData, refreshMarketplaceEntries } = useExtensionSettings();

  const { installedIds, itemMap } = useMemo(() => {
    const ids = new Set<string>();
    const map = new Map<string, ExtensionInfo>();

    namespacedData.forEach((namespace) => {
      namespace.entries.forEach((ext) => {
        const baseId = extractBaseId(ext.id);
        ids.add(baseId);
        // Store the extension info (keeping the versioned ID as the actual ID)
        map.set(baseId, ext as ExtensionInfo);
      });
    });

    return { installedIds: ids, itemMap: map };
  }, [namespacedData]);

  const isInstalled = useCallback(
    (marketplaceId: string): boolean => {
      const baseId = extractBaseId(marketplaceId);
      return installedIds.has(baseId);
    },
    [installedIds],
  );

  const getItem = useCallback(
    (marketplaceId: string): ExtensionInfo | undefined => {
      const baseId = extractBaseId(marketplaceId);
      return itemMap.get(baseId);
    },
    [itemMap],
  );

  const refresh = useCallback(async () => {
    try {
      await refreshMarketplaceEntries();
    } catch (error) {
      log.error("Failed to refresh extensions:", error);
    }
  }, [refreshMarketplaceEntries]);

  return {
    installedIds,
    itemMap,
    isInstalled,
    getItem,
    refresh,
    loading: false, // Extensions are loaded synchronously via Zustand
    error: undefined,
  };
}
