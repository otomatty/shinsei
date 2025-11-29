// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview Marketplace JSON Schema Type Definitions
 *
 * Type definitions for API responses and JSON schema structures.
 * These types represent the external data format from marketplace APIs.
 */

// =============================================================================
// Extensions Schema Types (Multi-Version Support)
// =============================================================================

/**
 * Individual version details in API response
 */
export interface ExtensionVersionSchema {
  /** Version string (semantic versioning) */
  version: string;
  /** Published date (ISO 8601) */
  publishedDate: string;
  /** SHA256 hash */
  sha256sum?: string;
  /** Download URL for .foxe file */
  foxe?: string;
  /** Deprecated flag */
  deprecated?: boolean;
}

/**
 * Extension definition (multi-version support)
 */
export interface ExtensionItem {
  // Basic information
  /** Unique identifier for the extension */
  id: string;
  /** Extension name */
  name: string;
  /** Publisher/organization name */
  publisher: string;
  /** Description */
  description?: string;
  // Metadata
  /** Homepage URL */
  homepage?: string;
  /** License identifier */
  license?: string;
  /** Keywords for search and filtering */
  keywords?: string[];
  /** Thumbnail image URL */
  thumbnail?: string;
  // Documentation (common across all versions)
  /** URL to README.md */
  readme?: string;
  /** URL to CHANGELOG.md */
  changelog?: string;
  // Version management
  /** Version information map (key: version string) */
  versions: Record<string, ExtensionVersionSchema>;
  /** List of deprecated versions */
  deprecated?: string[];
}

/**
 * Extensions JSON file type (array)
 */
export type ExtensionsData = ExtensionItem[];

// =============================================================================
// Layouts Schema Types (External File Reference)
// =============================================================================

/**
 * Layout definition (external file reference)
 */
export interface LayoutItem {
  // Basic information
  /** Unique identifier for the layout */
  id: string;
  /** Layout name */
  name: string;
  /** Publisher/creator name */
  publisher: string;
  /** Description */
  description: string;

  // Metadata
  /** Keywords for search and filtering */
  keywords: string[];
  /** Thumbnail image URL */
  thumbnail?: string;

  // Layout data
  /** URL to layout JSON file (relative path or absolute URL) */
  layout: string;
}

/**
 * Layouts JSON file type (array)
 */
export type LayoutsData = LayoutItem[];
