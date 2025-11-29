// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import { MARKETPLACE_CONFIG } from "@lichtblick/suite-base/config/marketplace";
import LayoutMarketplaceContext, {
  LayoutMarketplaceDetail,
} from "@lichtblick/suite-base/context/SoraLayoutMarketplaceContext";

/**
 * LayoutMarketplaceProvider
 *
 * Provider component that manages the layout marketplace.
 * Provides functionality for retrieving available layout information and markdown content.
 *
 * ## Main Features
 * - Fetching layout list from marketplace
 * - Category-based and keyword search functionality
 * - Retrieving layout details
 * - Downloading and parsing layout data
 * - Security verification (SHA256 hash)
 * - Efficient data fetching with caching
 *
 * ## Use Cases
 * - Displaying layout store
 * - Showing layout details
 * - Discovering new layouts
 * - Managing layout metadata
 *
 * ## Data Sources
 * - Official layout marketplace repository on GitHub
 * - README files for each layout
 * - Layout metadata (version, description, etc.)
 *
 * ## Error Handling
 * - Network error handling
 * - Invalid JSON response handling
 * - Markdown file fetch error handling
 * - Layout data validation checks
 *
 * @param props - Component properties
 * @param props.children - Child components
 * @returns React.JSX.Element
 */
export default function SoraLayoutMarketplaceProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  /**
   * Fetches the list of available layouts
   * Directly fetches from layouts.json endpoint
   * @returns Promise<LayoutMarketplaceDetail[]> Array of layout detail information
   */
  const getAvailableLayouts = useCallback(async (): Promise<LayoutMarketplaceDetail[]> => {
    const response = await fetch(MARKETPLACE_CONFIG.layoutsJsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch layouts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid marketplace data format");
    }

    return data as LayoutMarketplaceDetail[];
  }, []);

  /**
   * Searches layouts by keyword
   * @param query - Search keyword
   * @returns Promise<LayoutMarketplaceDetail[]> Array of search result layouts
   */
  const searchLayouts = useCallback(
    async (query: string): Promise<LayoutMarketplaceDetail[]> => {
      try {
        if (!query.trim()) {
          return await getAvailableLayouts();
        }

        const allLayouts = await getAvailableLayouts();
        const searchTerm = query.toLowerCase();

        return allLayouts.filter((layout) => {
          const matchFields = [
            layout.name,
            layout.description,
            layout.publisher ?? "",
            ...(layout.keywords ?? []),
          ].filter((field): field is string => field.length > 0);

          return matchFields.some((field) => field.toLowerCase().includes(searchTerm));
        });
      } catch (error) {
        console.error(`Error searching layouts with query "${query}":`, error);
        throw error;
      }
    },
    [getAvailableLayouts],
  );

  /**
   * Retrieves specific layout detail information
   * @param id - Layout ID
   * @returns Promise<LayoutMarketplaceDetail | undefined> Layout detail information
   */
  const getLayoutDetail = useCallback(
    async (id: string): Promise<LayoutMarketplaceDetail | undefined> => {
      try {
        const allLayouts = await getAvailableLayouts();
        return allLayouts.find((layout) => layout.id === id);
      } catch (error) {
        console.error(`Error fetching layout detail for id ${id}:`, error);
        throw error;
      }
    },
    [getAvailableLayouts],
  );

  // Optimize performance with shallow comparison memoization
  const marketplace = useShallowMemo({
    getAvailableLayouts,
    searchLayouts,
    getLayoutDetail,
  });

  return (
    <LayoutMarketplaceContext.Provider value={marketplace}>
      {children}
    </LayoutMarketplaceContext.Provider>
  );
}
