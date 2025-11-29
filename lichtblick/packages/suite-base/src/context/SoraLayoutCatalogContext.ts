// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { LayoutMarketplaceDetail } from "@lichtblick/suite-base/context/SoraLayoutMarketplaceContext";
import { Layout } from "@lichtblick/suite-base/services/ILayoutStorage";

/**
 * Type definition for layout installation result
 *
 * Represents the result of a layout installation process.
 * Provides success/failure status and error information.
 */
export type InstallLayoutResult = {
  /** Success or failure of installation */
  success: boolean;
  /** Information about the installed layout (on success) */
  layout?: Layout;
  /** Error information (on failure) */
  error?: unknown;
};

/**
 * Type definition for marketplace origin information
 *
 * Holds origin information when a layout is installed from the marketplace.
 *
 * Note: Version field is not required since layouts are not version-controlled
 */
export type MarketplaceOrigin = {
  /** Layout ID on the marketplace */
  marketplaceId: string;
  /** Installation date and time */
  installedAt: string;
  /** Original layout URL */
  originalUrl: string;
  /** Publisher information */
  publisher: string;
};

/**
 * ## LayoutCatalog
 *
 * **Integrated management interface for layout catalog**
 *
 * ### Overview
 * - Provides full lifecycle management of layouts
 * - Integrates marketplace integration features
 * - Includes security and validation functionality
 *
 * ### Main Features
 * - **Marketplace operations**: Download, install
 * - **State tracking**: Management of installed layouts
 * - **Security**: Hash verification, data validation
 * - **Origin management**: Management of marketplace origin information
 *
 *
 * @see LayoutMarketplaceDetail - Marketplace layout details
 * @see InstallLayoutResult - Installation result
 * @see MarketplaceOrigin - Marketplace origin information
 */
export interface LayoutCatalog {
  /**
   * **Download layout data from marketplace**
   *
   * Safely downloads layout data including security checks
   * and data validation.
   *
   * @param detail - Marketplace layout details
   * @returns Promise<LayoutData> Downloaded layout data
   * @throws {Error} Download error or validation error
   */
  downloadLayoutFromMarketplace: (detail: LayoutMarketplaceDetail) => Promise<LayoutData>;

  /**
   * **Install layout from marketplace**
   *
   * Downloads layout, performs validation, and installs it
   * into the system. Origin information is also recorded.
   *
   * @param detail - Marketplace layout details
   * @param name - Layout name at installation (uses original name if omitted)
   * @returns Promise<InstallLayoutResult> Installation result
   */
  installLayoutFromMarketplace: (
    detail: LayoutMarketplaceDetail,
    name?: string,
  ) => Promise<InstallLayoutResult>;

  /**
   * **Get installed marketplace layouts**
   *
   * Filters and retrieves only layouts installed from
   * the marketplace.
   *
   * @returns Promise<Layout[]> Array of marketplace-origin layouts
   */
  getInstalledMarketplaceLayouts: () => Promise<Layout[]>;

  /**
   * **Uninstall marketplace layout**
   *
   * Removes a layout installed from the marketplace
   * along with its origin information.
   *
   * @param id - Layout ID
   * @returns Promise<void>
   * @throws {Error} If layout does not exist or is not from marketplace
   */
  uninstallMarketplaceLayout: (id: LayoutID) => Promise<void>;

  /**
   * **Validate layout data**
   *
   * Checks the structure and content of layout data to
   * determine if it can be safely installed.
   *
   * @param data - Layout data to validate
   * @returns Promise<boolean> Validation check result
   */
  validateLayoutData: (data: LayoutData) => Promise<boolean>;

  /**
   * **Verify layout data hash**
   *
   * Detects tampering of layout data using SHA256 hash.
   *
   * @param data - Layout data to verify
   * @param expectedHash - Expected SHA256 hash
   * @returns Promise<boolean> Verification result (true: valid, false: tampered)
   */
  verifyLayoutHash: (data: LayoutData, expectedHash: string) => Promise<boolean>;

  /**
   * **Get marketplace origin information**
   *
   * Retrieves origin information when a layout was installed
   * from the marketplace.
   *
   * @param layoutId - Layout ID
   * @returns Promise<MarketplaceOrigin | undefined> Origin information (undefined if not from marketplace)
   */
  getMarketplaceOrigin: (layoutId: LayoutID) => Promise<MarketplaceOrigin | undefined>;

  /**
   * **Mark as marketplace layout**
   *
   * Associates marketplace origin information with a layout.
   * Called automatically during installation.
   *
   * @param layoutId - Layout ID
   * @param origin - Marketplace origin information
   * @returns Promise<void>
   */
  markAsMarketplaceLayout: (layoutId: LayoutID, origin: MarketplaceOrigin) => Promise<void>;
}

/**
 * ## LayoutCatalogContext
 *
 * **Context for layout catalog management**
 *
 * ### Overview
 * - Provides integrated management of layouts
 * - Includes marketplace integration features
 * - Integrates security and validation functionality
 *
 * ### Management Scope
 * - **Marketplace**: Layout search and installation
 * - **Origin management**: Tracking and managing installation sources
 * - **Security**: Hash verification and data validation
 * - **Update management**: Layout update processing
 *
 * @see LayoutCatalog - Layout catalog interface
 * @see LayoutMarketplaceDetail - Marketplace layout details
 * @see MarketplaceOrigin - Marketplace origin information
 */
export const LayoutCatalogContext = createContext<LayoutCatalog | undefined>(undefined);
LayoutCatalogContext.displayName = "LayoutCatalogContext";

/**
 * ## useLayoutCatalog
 *
 * **Custom hook for accessing the layout catalog**
 *
 * ### Overview
 * - Retrieves LayoutCatalog instance from LayoutCatalogContext
 * - Provides marketplace integration features
 * - Checks for required Context dependencies
 *
 * @returns {LayoutCatalog} Layout catalog interface
 * @throws {Error} If LayoutCatalogProvider is not configured
 */
export function useLayoutCatalog(): LayoutCatalog {
  const layoutCatalog = useContext(LayoutCatalogContext);
  if (layoutCatalog == undefined) {
    throw new Error("A LayoutCatalogContext provider is required to useLayoutCatalog");
  }
  return layoutCatalog;
}
