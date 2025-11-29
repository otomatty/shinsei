// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview Hook for tracking installed layouts
 *
 * Provides state management for installed layouts from the marketplace.
 * Uses asynchronous data from LayoutCatalog.
 */

import { useState, useEffect, useCallback } from "react";

import Log from "@lichtblick/log";
import { useLayoutCatalog } from "@lichtblick/suite-base/context/SoraLayoutCatalogContext";
import type { Layout } from "@lichtblick/suite-base/services/ILayoutStorage";
import type { InstalledItemsState } from "@lichtblick/suite-base/types/soraInstalledItems";

const log = Log.getLogger(__filename);

/**
 * Hook for tracking installed layouts.
 * Uses asynchronous data from LayoutCatalog.
 *
 * @returns State object with installed layouts information
 *
 * @example
 * ```tsx
 * const { installedIds, isInstalled, loading, refresh } = useSoraInstalledLayouts();
 *
 * useEffect(() => {
 *   if (!loading && isInstalled('example.layout')) {
 *     console.log('Layout is installed');
 *   }
 * }, [loading, isInstalled]);
 * ```
 */
export function useSoraInstalledLayouts(): InstalledItemsState<Layout> {
  const catalog = useLayoutCatalog();

  const [state, setState] = useState<{
    installedIds: Set<string>;
    itemMap: Map<string, Layout>;
    loading: boolean;
    error: string | undefined;
  }>({
    installedIds: new Set(),
    itemMap: new Map(),
    loading: false,
    error: undefined,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const layouts = await catalog.getInstalledMarketplaceLayouts();
      const installedIds = new Set<string>();
      const itemMap = new Map<string, Layout>();

      for (const layout of layouts) {
        const origin = await catalog.getMarketplaceOrigin(layout.id);
        if (origin?.marketplaceId) {
          installedIds.add(origin.marketplaceId);
          itemMap.set(origin.marketplaceId, layout);
        }
      }

      setState({ installedIds, itemMap, loading: false, error: undefined });
    } catch (error) {
      const err = error as Error;
      log.error("Failed to load installed layouts:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Failed to load installed layouts: ${err.message}`,
      }));
    }
  }, [catalog]);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isInstalled = useCallback(
    (marketplaceId: string): boolean => {
      return state.installedIds.has(marketplaceId);
    },
    [state.installedIds],
  );

  const getItem = useCallback(
    (marketplaceId: string): Layout | undefined => {
      return state.itemMap.get(marketplaceId);
    },
    [state.itemMap],
  );

  return {
    ...state,
    isInstalled,
    getItem,
    refresh,
  };
}
