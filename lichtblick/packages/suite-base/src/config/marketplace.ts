// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Marketplace configuration
 *
 * Centralized configuration for marketplace URLs.
 * This prevents duplication of URL definitions across providers.
 */

/**
 * Get marketplace URL from environment variable or use default
 * @param envVar - Environment variable name
 * @param defaultUrl - Default URL to use if environment variable is not set
 * @returns Marketplace URL
 */
function getMarketplaceUrl(envVar: string, defaultUrl: string): string {
  if (typeof window !== "undefined") {
    const envValue = (window as unknown as Record<string, unknown>)[envVar];
    if (typeof envValue === "string" && envValue.length > 0) {
      return envValue;
    }
  }
  return defaultUrl;
}

/**
 * Marketplace URL configuration
 */
export const MARKETPLACE_CONFIG = {
  /**
   * Extension marketplace JSON endpoint
   * Can be overridden via EXTENSION_MARKETPLACE_URL environment variable
   */
  extensionsJsonUrl: getMarketplaceUrl(
    "EXTENSION_MARKETPLACE_URL",
    "http://localhost:3001/extensions/extensions.json",
  ),

  /**
   * Layout marketplace JSON endpoint
   * Can be overridden via LAYOUT_MARKETPLACE_URL environment variable
   */
  layoutsJsonUrl: getMarketplaceUrl(
    "LAYOUT_MARKETPLACE_URL",
    "http://localhost:3001/layouts/layouts.json",
  ),
} as const;
