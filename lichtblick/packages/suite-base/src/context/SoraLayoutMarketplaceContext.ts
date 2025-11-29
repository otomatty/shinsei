// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

export type LayoutMarketplaceDetail = {
  /** Unique identifier for the layout */
  id: string;
  /** Display name of the layout */
  name: string;
  /** Description of the layout */
  description: string;
  /** Creator/publisher name */
  publisher?: string;
  /** Array of keywords for search */
  keywords?: string[];
  /** URL for preview thumbnail image */
  thumbnail?: string;
  /** URL of the layout file (.json) */
  layout: string;
  /** SHA256 hash for file integrity verification */
  sha256sum?: string;
  /** License information */
  license?: string;
  /** Homepage/repository URL */
  homepage?: string;
};

/**
 * LayoutMarketplace interface provides access to the layout marketplace.
 * This interface is responsible for fetching marketplace data only.
 * Layout download, verification, and installation are handled by LayoutCatalog.
 *
 * @see LayoutCatalog - For layout download, verification, and installation
 */
export interface LayoutMarketplace {
  /**
   * **Get list of available layouts**
   *
   * @returns Array of layout detail information
   * @throws {Error} Network error or API error
   */
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;

  /**
   * **Search layouts by keyword**
   *
   * Performs search on name, description, keywords, and author name.
   * Supports partial match and case-insensitive search.
   *
   * @param query - Search keyword
   * @returns Array of search result layouts
   * @throws {Error} Network error or search API error
   */
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;

  /**
   * **Get specific layout detail information**
   *
   * @param id - Layout ID
   * @returns Layout detail information (undefined if not found)
   * @throws {Error} Network error or API error
   */
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
}

/**
 * ## SoraLayoutMarketplaceContext
 * @see LayoutMarketplace - Marketplace interface
 * @see LayoutMarketplaceDetail - Layout detail information
 */
const SoraLayoutMarketplaceContext = createContext<LayoutMarketplace | undefined>(undefined);
SoraLayoutMarketplaceContext.displayName = "SoraLayoutMarketplaceContext";

/**
 * ## useLayoutMarketplace
 * @returns {LayoutMarketplace} Layout marketplace interface
 * @throws {Error} When LayoutMarketplaceProvider is not configured
 */
export function useLayoutMarketplace(): LayoutMarketplace {
  const layoutMarketplace = useContext(SoraLayoutMarketplaceContext);
  if (layoutMarketplace == undefined) {
    throw new Error("A SoraLayoutMarketplaceContext provider is required to useLayoutMarketplace");
  }
  return layoutMarketplace;
}

export default SoraLayoutMarketplaceContext;
