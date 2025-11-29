// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview Marketplace Domain Layer Type Definitions
 *
 * Type definitions for business logic and domain models.
 * These types represent the internal data structures used in application logic.
 */

import type { ExtensionMarketplaceDetail } from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import type { LayoutMarketplaceDetail } from "@lichtblick/suite-base/context/SoraLayoutMarketplaceContext";

import type { StabilityLevel } from "./soraMarketplaceUI";

// =============================================================================
// Extension Domain Types
// =============================================================================

/**
 * Individual version detail information (domain model)
 */
export interface ExtensionVersionDetail {
  version: string; // Version number (e.g., "1.0.0")
  publishedDate: string; // Published date (ISO8601 format)
  sha256sum: string; // File hash (required)
  foxe: string; // Download URL (required)
  readme?: string; // README URL
  changelog?: string; // CHANGELOG URL
  isLatest?: boolean; // Latest version flag
  deprecated?: boolean; // Deprecated flag
  stability?: StabilityLevel; // Stability level
  minLichtblickVersion?: string; // Required minimum version
  fileSize?: number; // File size (in bytes)
}

/**
 * Multi-version extension data structure (domain model)
 */
export interface MultiVersionExtensionData {
  // Basic information
  id: string; // Base ID (e.g., "foxglove.turtlesim")
  name: string; // Display name
  publisher: string; // Publisher
  description: string; // Description
  homepage?: string; // Homepage URL
  license?: string; // License
  keywords?: string[]; // Search keywords

  // Version management
  versions: {
    [version: string]: ExtensionVersionDetail;
  };

  latest: string; // Latest version identifier
}

/**
 * ExtensionMarketplaceDetail extension - supports multiple versions
 */
export type ExtensionVersionGroup = ExtensionMarketplaceDetail & {
  baseId: string; // Group ID for the same extension
  versions: {
    [version: string]: {
      version: string;
      publishedDate: string;
      downloadUrl: string;
      sha256sum?: string;
      changelog?: string;
      isLatest: boolean;
      installed?: boolean;
    };
  };
};

// =============================================================================
// Layout Domain Types
// =============================================================================

/**
 * LayoutMarketplaceDetail extension - multi-version support
 */
export type LayoutVersionGroup = LayoutMarketplaceDetail & {
  baseId: string; // Group ID for the same layout
  versions: {
    [version: string]: {
      version: string;
      publishedDate: string;
      layoutUrl: string;
      sha256sum?: string;
      changelog?: string;
      isLatest: boolean;
      installed?: boolean;
    };
  };
};

/**
 * Utility type for version management (generic)
 */
export type VersionGroup = {
  baseId: string;
  name: string;
  description: string;
  publisher: string;
  keywords: string[];
  thumbnail?: string;
  latestVersion: string;
  totalVersions: number;
  versions: Record<
    string,
    {
      version: string;
      publishedDate: string;
      isLatest: boolean;
      installed?: boolean;
      changelog?: string;
    }
  >;
  homepage?: string;
  license?: string;
};
