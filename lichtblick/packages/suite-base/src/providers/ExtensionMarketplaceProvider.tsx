// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useState } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import { MARKETPLACE_CONFIG } from "@lichtblick/suite-base/config/marketplace";
import ExtensionMarketplaceContext, {
  ExtensionMarketplaceDetail,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";

/**
 * ExtensionMarketplaceProvider
 *
 * Provider component that manages the extension marketplace.
 * Provides functionality for retrieving, searching, and caching extension information.
 *
 * ## Main Features
 * - Fetching extension list from marketplace
 * - Searching extensions by keyword
 * - Retrieving extension details
 * - Managing extension data cache
 * - Managing external API communication
 *
 * ## Use Cases
 * - Displaying extension store
 * - Showing extension details
 * - Discovering new extensions
 * - Managing extension metadata
 *
 * ## Data Sources
 * - Official marketplace repository
 * - README files for each extension
 * - Extension metadata (version, description, etc.)
 *
 * ## Error Handling
 * - Network error handling
 * - Invalid JSON response handling
 * - Markdown file fetch error handling
 *
 * @param props - Component properties
 * @param props.children - Child components
 * @returns React.JSX.Element
 */
export default function ExtensionMarketplaceProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const [marketplaceExtensions, setMarketplaceExtensions] = useState<
    ExtensionMarketplaceDetail[] | undefined
  >(undefined);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | undefined>(undefined);

  /**
   * Fetches the list of available extensions
   * Caches the result in state for efficient access
   * @returns Promise<ExtensionMarketplaceDetail[]> Array of extension detail information
   */
  const getAvailableExtensions = useCallback(async (): Promise<ExtensionMarketplaceDetail[]> => {
    try {
      setMarketplaceLoading(true);
      setMarketplaceError(undefined);

      const response = await fetch(MARKETPLACE_CONFIG.extensionsJsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch extensions: ${response.status} ${response.statusText}`);
      }

      interface ExtensionWithVersions {
        id: string;
        name: string;
        publisher: string;
        description: string;
        homepage?: string;
        license?: string;
        keywords?: string[];
        thumbnail?: string;
        namespace?: string;
        readme?: string;
        changelog?: string;
        versions: Record<
          string,
          {
            version: string;
            publishedDate: string;
            sha256sum?: string;
            foxe: string;
          }
        >;
      }

      const rawExtensions = (await response.json()) as ExtensionWithVersions[];

      // Flatten the nested versions structure
      const flattenedExtensions: ExtensionMarketplaceDetail[] = [];
      for (const ext of rawExtensions) {
        const versions = ext.versions;
        for (const [versionKey, versionData] of Object.entries(versions)) {
          flattenedExtensions.push({
            id: ext.id,
            name: ext.name,
            displayName: ext.name, // displayName will be updated from .foxe if available
            publisher: ext.publisher,
            description: ext.description,
            homepage: ext.homepage ?? "",
            license: ext.license ?? "",
            keywords: ext.keywords ?? [], // Server provides keywords as fallback/supplement
            thumbnail: ext.thumbnail,
            namespace: (ext.namespace ?? "marketplace") as "local" | "org",
            readme: ext.readme,
            changelog: ext.changelog,
            version: versionData.version,
            foxe: versionData.foxe,
            sha256sum: versionData.sha256sum,
            time: {
              [versionKey]: versionData.publishedDate,
            },
            qualifiedName: `${ext.publisher}.${ext.name}`,
          });
        }
      }

      setMarketplaceExtensions(flattenedExtensions);
      setMarketplaceLoading(false);
      return flattenedExtensions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch extensions";
      setMarketplaceError(errorMsg);
      setMarketplaceLoading(false);
      throw error;
    }
  }, []);

  /**
   * Searches extensions by keyword
   * @param query - Search keyword
   * @returns Promise<ExtensionMarketplaceDetail[]> Array of search result extensions
   */
  const searchExtensions = useCallback(
    async (query: string): Promise<ExtensionMarketplaceDetail[]> => {
      try {
        if (!query.trim()) {
          return await getAvailableExtensions();
        }

        // Use cache if available
        let extensions = marketplaceExtensions;
        if (!extensions) {
          extensions = await getAvailableExtensions();
        }

        const searchTerm = query.toLowerCase();
        return extensions.filter((ext) => {
          const matchFields = [ext.name, ext.description, ext.publisher, ...ext.keywords].filter(
            (field): field is string => typeof field === "string" && field.length > 0,
          );

          return matchFields.some((field) => field.toLowerCase().includes(searchTerm));
        });
      } catch (error) {
        console.error(`Error searching extensions with query "${query}":`, error);
        throw error;
      }
    },
    [getAvailableExtensions, marketplaceExtensions],
  );

  /**
   * Retrieves specific extension detail information
   * @param id - Extension ID
   * @returns Promise<ExtensionMarketplaceDetail | undefined> Extension detail information
   */
  const getExtensionDetail = useCallback(
    async (id: string): Promise<ExtensionMarketplaceDetail | undefined> => {
      try {
        // Use cache if available
        let extensions = marketplaceExtensions;
        if (!extensions) {
          extensions = await getAvailableExtensions();
        }
        return extensions.find((ext) => ext.id === id);
      } catch (error) {
        console.error(`Error fetching extension detail for id ${id}:`, error);
        throw error;
      }
    },
    [getAvailableExtensions, marketplaceExtensions],
  );

  /**
   * Fetches markdown content from the specified URL
   * @param url - URL of the markdown file
   * @returns Promise<string> Markdown string content
   */
  const getMarkdown = useCallback(async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }, []);

  /**
   * Refreshes marketplace cache
   * Clears cached data and forces a fresh fetch on next access
   */
  const refreshMarketplaceData = useCallback(async (): Promise<void> => {
    setMarketplaceExtensions(undefined);
    await getAvailableExtensions();
  }, [getAvailableExtensions]);

  // Optimize performance with shallow comparison memoization
  const marketplace = useShallowMemo({
    getAvailableExtensions,
    searchExtensions,
    getExtensionDetail,
    getMarkdown,
    refreshMarketplaceData,
    marketplaceExtensions,
    marketplaceLoading,
    marketplaceError,
  });

  return (
    <ExtensionMarketplaceContext.Provider value={marketplace}>
      {children}
    </ExtensionMarketplaceContext.Provider>
  );
}
