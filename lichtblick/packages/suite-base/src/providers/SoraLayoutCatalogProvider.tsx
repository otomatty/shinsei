// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import {
  InstallLayoutResult,
  LayoutCatalogContext,
  MarketplaceOrigin,
} from "@lichtblick/suite-base/context/SoraLayoutCatalogContext";
import { LayoutMarketplaceDetail } from "@lichtblick/suite-base/context/SoraLayoutMarketplaceContext";
import { Layout } from "@lichtblick/suite-base/services/ILayoutStorage";

/**
 * Local storage key: Marketplace origin information
 * Stores MarketplaceOrigin information with layout ID as key
 */
const MARKETPLACE_ORIGINS_KEY = "lichtblick.layout.marketplace.origins";

/**
 * Helper function to calculate SHA256 hash
 *
 * @param data - Data to calculate hash for
 * @returns SHA256 hash as hexadecimal string
 */
async function calculateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Checks basic validity of layout data
 *
 * @param data - Layout data to check
 * @returns Validation check result
 */
function validateLayoutDataStructure(data: unknown): data is LayoutData {
  if (typeof data !== "object" || data == undefined) {
    return false;
  }

  const layoutData = data as Record<string, unknown>;

  // Check existence of required fields
  const hasRequiredFields =
    layoutData.configById != undefined &&
    typeof layoutData.configById === "object" &&
    layoutData.globalVariables != undefined &&
    typeof layoutData.globalVariables === "object" &&
    layoutData.playbackConfig != undefined &&
    typeof layoutData.playbackConfig === "object" &&
    layoutData.userNodes != undefined &&
    typeof layoutData.userNodes === "object";

  return hasRequiredFields;
}

/**
 * Checks high-level validity of layout data
 *
 * @param data - Layout data to check
 * @returns Validation check result
 */
function validateLayoutDataContent(data: LayoutData): boolean {
  try {
    // Validate panel configurations
    const { configById } = data;
    // Check if each panel configuration is a valid object
    for (const [panelId, config] of Object.entries(configById)) {
      if (typeof panelId !== "string" || !panelId.trim()) {
        return false;
      }

      if (typeof config !== "object") {
        return false;
      }
    }

    // Validate global variables
    const { globalVariables } = data;
    for (const [varName, varValue] of Object.entries(globalVariables)) {
      if (typeof varName !== "string" || !varName.trim()) {
        return false;
      }
      // Basic check of variable value
      if (
        varValue != undefined &&
        typeof varValue !== "string" &&
        typeof varValue !== "number" &&
        typeof varValue !== "boolean"
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves marketplace origin information from local storage
 *
 * @returns Map of marketplace origin information
 */
function getMarketplaceOrigins(): Record<string, MarketplaceOrigin> {
  try {
    const stored = localStorage.getItem(MARKETPLACE_ORIGINS_KEY);
    if (stored) {
      return JSON.parse(stored) as Record<string, MarketplaceOrigin>;
    }
  } catch (error) {
    console.warn("Failed to load marketplace origins from localStorage:", error);
  }
  return {};
}

/**
 * Saves marketplace origin information to local storage
 *
 * @param origins - Map of marketplace origin information to save
 */
function saveMarketplaceOrigins(origins: Record<string, MarketplaceOrigin>): void {
  try {
    const serialized = JSON.stringify(origins);
    if (serialized != undefined) {
      localStorage.setItem(MARKETPLACE_ORIGINS_KEY, serialized);
    }
  } catch (error) {
    console.warn("Failed to save marketplace origins to localStorage:", error);
  }
}

/**
 * LayoutCatalogProvider
 *
 * Provider component that manages the layout catalog.
 * Provides marketplace integration, security validation, and origin management.
 *
 * ## Main Features
 * - Layout download and installation from marketplace
 * - Layout data validation and security verification
 * - Marketplace origin information management and tracking
 * - Installed layout management, updating, and deletion
 *
 * ## Use Cases
 * - Integration with layout marketplace
 * - Safe installation and management of layouts
 * - Layout distribution meeting security requirements
 * - Layout management in enterprise environments
 *
 * ## Error Handling
 * - Proper network error handling
 * - Detailed validation error information
 * - Recovery functionality for installation failures
 * - Local storage error handling
 *
 * @param props - Component properties
 * @param props.children - Child components
 * @returns React.JSX.Element
 */
export default function SoraLayoutCatalogProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const layoutManager = useLayoutManager();

  /**
   * Validates layout data
   */
  const validateLayoutData = useCallback(async (data: LayoutData): Promise<boolean> => {
    try {
      // Structure check
      if (!validateLayoutDataStructure(data)) {
        return false;
      }

      // Content check
      if (!validateLayoutDataContent(data)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating layout data:", error);
      return false;
    }
  }, []);

  /**
   * Verifies layout data hash
   */
  const verifyLayoutHash = useCallback(
    async (data: LayoutData, expectedHash: string): Promise<boolean> => {
      try {
        const dataString = JSON.stringify(data);
        if (dataString == undefined) {
          throw new Error("Failed to serialize layout data");
        }
        const actualHash = await calculateSHA256(dataString);
        return actualHash === expectedHash.toLowerCase();
      } catch (error) {
        console.error("Error verifying layout hash:", error);
        return false;
      }
    },
    [],
  );

  /**
   * Retrieves marketplace origin information
   */
  const getMarketplaceOrigin = useCallback(
    async (layoutId: LayoutID): Promise<MarketplaceOrigin | undefined> => {
      try {
        const origins = getMarketplaceOrigins();
        return origins[layoutId];
      } catch (error) {
        console.error(`Error getting marketplace origin for ${layoutId}:`, error);
        return undefined;
      }
    },
    [],
  );

  /**
   * Marks marketplace origin information
   */
  const markAsMarketplaceLayout = useCallback(
    async (layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void> => {
      try {
        const origins = getMarketplaceOrigins();
        origins[layoutId] = origin;
        saveMarketplaceOrigins(origins);
      } catch (error) {
        console.error(`Error marking layout ${layoutId} as marketplace:`, error);
        throw error;
      }
    },
    [],
  );

  /**
   * Downloads layout data from marketplace
   */
  const downloadLayoutFromMarketplace = useCallback(
    async (detail: LayoutMarketplaceDetail): Promise<LayoutData> => {
      try {
        // Download layout data directly via fetch
        const response = await fetch(detail.layout);
        if (!response.ok) {
          throw new Error(`Failed to download layout: ${response.status}`);
        }

        const layoutData = (await response.json()) as LayoutData;

        // Validate data structure
        if (!validateLayoutDataStructure(layoutData)) {
          throw new Error("Invalid layout data structure");
        }

        // Hash verification (if available)
        if (detail.sha256sum) {
          const isValid = await verifyLayoutHash(layoutData, detail.sha256sum);
          if (!isValid) {
            throw new Error("Hash verification failed - layout may be corrupted or tampered");
          }
        }

        return layoutData;
      } catch (error) {
        console.error(`Error downloading layout ${detail.id}:`, error);
        throw error;
      }
    },
    [verifyLayoutHash],
  );

  /**
   * Installs layout from marketplace
   */
  const installLayoutFromMarketplace = useCallback(
    async (detail: LayoutMarketplaceDetail, name?: string): Promise<InstallLayoutResult> => {
      try {
        // Check if already installed by checking all existing layouts
        const allLayouts = await layoutManager.getLayouts();
        const origins = getMarketplaceOrigins();

        const alreadyInstalled = allLayouts.find((layout) => {
          const origin = origins[layout.id];
          return origin?.marketplaceId === detail.id;
        });

        if (alreadyInstalled) {
          return {
            success: false,
            error: new Error(`Layout "${detail.name}" is already installed`),
          };
        }

        // Download layout data
        const layoutData = await downloadLayoutFromMarketplace(detail);

        // Data validation
        const isValid = await validateLayoutData(layoutData);
        if (!isValid) {
          return {
            success: false,
            error: new Error("Layout data validation failed"),
          };
        }

        // Install layout
        const layout = await layoutManager.saveNewLayout({
          name: name ?? detail.name,
          data: layoutData,
          permission: "CREATOR_WRITE",
        });

        // Record marketplace origin information
        const origin: MarketplaceOrigin = {
          marketplaceId: detail.id,
          installedAt: new Date().toISOString(),
          originalUrl: detail.layout,
          publisher: detail.publisher ?? "",
        };

        await markAsMarketplaceLayout(layout.id, origin);

        return {
          success: true,
          layout,
        };
      } catch (error) {
        console.error(`Error installing layout ${detail.id}:`, error);
        return {
          success: false,
          error,
        };
      }
    },
    [downloadLayoutFromMarketplace, layoutManager, markAsMarketplaceLayout, validateLayoutData],
  );

  /**
   * Retrieves installed marketplace layouts
   */
  const getInstalledMarketplaceLayouts = useCallback(async (): Promise<Layout[]> => {
    try {
      const allLayouts = await layoutManager.getLayouts();
      const origins = getMarketplaceOrigins();

      return allLayouts.filter((layout) => origins[layout.id] != undefined);
    } catch (error) {
      console.error("Error getting installed marketplace layouts:", error);
      throw error;
    }
  }, [layoutManager]);

  /**
   * Uninstalls marketplace layout
   */
  const uninstallMarketplaceLayout = useCallback(
    async (id: LayoutID): Promise<void> => {
      try {
        const origins = getMarketplaceOrigins();

        if (!origins[id]) {
          throw new Error("Layout is not from marketplace or origin info not found");
        }

        // Delete layout
        await layoutManager.deleteLayout({ id });

        // Delete origin information as well
        const newOrigins = { ...origins };
        delete newOrigins[id];
        saveMarketplaceOrigins(newOrigins);
      } catch (error) {
        console.error(`Error uninstalling marketplace layout ${id}:`, error);
        throw error;
      }
    },
    [layoutManager],
  );

  // Optimize performance with shallow comparison memoization
  const catalog = useShallowMemo({
    downloadLayoutFromMarketplace,
    installLayoutFromMarketplace,
    getInstalledMarketplaceLayouts,
    uninstallMarketplaceLayout,
    validateLayoutData,
    verifyLayoutHash,
    getMarketplaceOrigin,
    markAsMarketplaceLayout,
  });

  return <LayoutCatalogContext.Provider value={catalog}>{children}</LayoutCatalogContext.Provider>;
}
