// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview Marketplace UI Layer Type Definitions
 *
 * Type definitions for UI components, user interactions, and display states.
 * These types are used exclusively in the presentation layer.
 */

/**
 * Marketplace tab type
 */
export type MarketplaceTab = "available" | "installed";

/**
 * Keyword filter mode
 * - AND: Show items that contain all selected keywords
 * - OR: Show items that contain any of the selected keywords
 */
export type KeywordFilterMode = "AND" | "OR";

/**
 * Tab configuration
 */
export interface TabConfig {
  key: MarketplaceTab;
  label: string;
  count?: number;
}

/**
 * Keyword statistics for filtering
 */
export interface KeywordStats {
  keyword: string;
  count: number;
}

/**
 * Search suggestion types
 */
export type SearchSuggestionType = "keyword" | "publisher" | "keyword" | "name";

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  value: string;
  type: SearchSuggestionType;
  label?: string;
  count?: number;
  priority?: number;
}

/**
 * Advanced search options
 */
export interface AdvancedSearchOptions {
  /** Filter by publisher */
  publisherFilter?: string;

  /** Filter by version range */
  versionRange?: {
    min?: string;
    max?: string;
  };

  /** Sort order (combined format for easier use) */
  sortOrder?:
    | "name-asc"
    | "name-desc"
    | "date-asc"
    | "date-desc"
    | "publisher-asc"
    | "publisher-desc";

  /** Sort order */
  sortBy?: "name" | "publisher" | "date" | "downloads" | "rating";

  /** Sort direction */
  sortDirection?: "asc" | "desc";

  /** Filter by license */
  licenseFilter?: string[];

  /** Show only verified items */
  verifiedOnly?: boolean;
}

/**
 * Stability level for version releases
 */
export type StabilityLevel = "stable" | "beta" | "alpha" | "experimental";

/**
 * Version information for display
 */
export interface VersionInfo {
  version: string;
  publishedDate?: string;
  isLatest: boolean;
  installed?: boolean;
  changelog?: string;
}

/**
 * Version detail information for VERSION tab display
 */
export interface VersionDisplayInfo {
  version: string;
  publishedDate: string;
  downloadUrl: string;
  fileSize?: number;
  isLatest: boolean;
  installed: boolean;
  deprecated: boolean;
  stability: StabilityLevel;
  minLichtblickVersion?: string;
  compatible: boolean; // Whether compatible with current Lichtblick version
  changelog?: string;
  sha256sum: string;
}

/**
 * Operation status for install/uninstall actions
 */
export enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
}

/**
 * Detail tab configuration
 */
export interface DetailTabConfig {
  label: string;
  content: React.ReactNode;
}
