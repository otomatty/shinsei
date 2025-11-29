// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";

import Log from "@lichtblick/log";
import type { VersionInfo } from "@lichtblick/suite-base/components/shared/Marketplace";
import {
  normalizeVersion,
  sortVersions,
} from "@lichtblick/suite-base/components/shared/Marketplace";
import {
  extractBaseId,
  toVersionedId,
} from "@lichtblick/suite-base/util/marketplace/soraExtensionIdUtils";

const log = Log.getLogger(__filename);

// Re-export for backward compatibility (deprecated, will be removed in future)
/** @deprecated Use useGroupedExtensionsByVersion instead */
export const useProcessedExtensions = useGroupedExtensionsByVersion;

/**
 * Combined extension information with version management
 * Represents a grouped extension that combines installed and marketplace data
 */
export interface ExtensionWithVersions {
  /** Extension identifier without version (e.g., "publisher.extension-name") */
  extensionId: string;

  /** Versioned extension identifier (e.g., "publisher.extension-name@1.0.0") */
  versionedId: string;

  /** Extension name (used for both technical and display purposes) */
  name: string;

  /** Description of the extension */
  description: string;

  /** Publisher/author name */
  publisher: string;

  /** Latest available version */
  latestVersion: string;

  /** Keywords for categorization and filtering */
  keywords: readonly string[];

  /** Whether ANY version of this extension is installed */
  installed: boolean;

  /** Homepage URL */
  homepage?: string;

  /** License identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;

  /** Namespace (local, marketplace, org) */
  namespace?: string;

  /** Version information for all available versions */
  versions: VersionInfo[];

  /** Total number of versions */
  totalVersions: number;

  /** README content (from latest version) */
  readme?: string;

  /** Changelog content (from latest version) */
  changelog?: string;
}

/**
 * Input format for installed extension data
 */
export interface InstalledExtensionInput {
  id: string;
  name: string;
  description: string;
  publisher: string;
  version: string;
  keywords: readonly string[];
  homepage?: string;
  license?: string;
  qualifiedName?: string;
  namespace?: string;
  readme?: string;
  changelog?: string;
}

/**
 * Input format for marketplace extension data
 */
export interface MarketplaceExtensionInput {
  id: string;
  name: string;
  description: string;
  publisher: string;
  version: string;
  keywords: readonly string[];
  homepage?: string;
  license?: string;
  readme?: string;
  changelog?: string;
}

/**
 * Options for processing extensions
 */
export interface ProcessedExtensionsOptions {
  /** Installed extensions from ExtensionCatalog (namespacedData) */
  installedData: InstalledExtensionInput[];

  /** Marketplace extensions from API */
  marketplaceData: MarketplaceExtensionInput[];

  /** Function to check if a specific versioned extension is installed */
  isExtensionInstalled: (id: string) => boolean;

  /** Function to check if any version of an extension is installed (by base ID) */
  isAnyVersionInstalled: (baseId: string) => boolean;
}

/**
 * Group and process extensions by version.
 *
 * This hook replaces the useMemo chain pattern in ExtensionMarketplaceSettings:
 * 1. Combines installed and marketplace data
 * 2. Groups by extension ID with comprehensive version management
 * 3. Tracks installation status for each version
 *
 * All operations are performed in a single useMemo for optimal performance.
 *
 * @param options - Processing options
 * @returns Array of grouped extension information with version details
 *
 */
export function useGroupedExtensionsByVersion(
  options: ProcessedExtensionsOptions,
): ExtensionWithVersions[] {
  const { installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled } = options;

  return useMemo(() => {
    // Early return for empty inputs
    if (installedData.length === 0 && marketplaceData.length === 0) {
      log.warn("[useGroupedExtensionsByVersion] No extensions provided");
      return [];
    }

    const startTime = performance.now();

    log.debug(
      `[useGroupedExtensionsByVersion] Processing ${installedData.length} installed + ${marketplaceData.length} marketplace extensions`,
    );

    // Step 1 & 2: Combine and group extensions
    const groups = new Map<string, ExtensionWithVersions>();

    // Process installed extensions first (higher priority)
    for (const ext of installedData) {
      const baseId = extractBaseId(ext.id);

      if (!groups.has(baseId)) {
        // Create new group
        groups.set(baseId, {
          extensionId: baseId,
          versionedId: ext.id,
          name: ext.name,
          description: ext.description,
          publisher: ext.publisher,
          latestVersion: ext.version,
          keywords: ext.keywords,
          installed: isExtensionInstalled(ext.id),
          homepage: ext.homepage,
          license: ext.license,
          namespace: ext.namespace,
          versions: [],
          totalVersions: 0,
          readme: ext.readme,
          changelog: ext.changelog,
        });
      }

      // Add version information
      addVersionToGroup(groups.get(baseId)!, ext, isExtensionInstalled);
    }

    // Process marketplace extensions
    for (const ext of marketplaceData) {
      const baseId = extractBaseId(ext.id);

      if (!groups.has(baseId)) {
        // Create new group for marketplace-only extension
        groups.set(baseId, {
          extensionId: baseId,
          versionedId: ext.id,
          name: ext.name,
          description: ext.description,
          publisher: ext.publisher,
          latestVersion: ext.version,
          keywords: ext.keywords,
          installed: false,
          homepage: ext.homepage,
          license: ext.license,
          versions: [],
          totalVersions: 0,
          readme: ext.readme,
          changelog: ext.changelog,
        });
      }

      // Add version information
      addVersionToGroup(groups.get(baseId)!, ext, isExtensionInstalled);
    }

    // Step 3: Finalize version processing
    const allExtensions = [...installedData, ...marketplaceData];

    for (const group of groups.values()) {
      // Sort versions (descending order - latest first)
      group.versions = sortVersions(group.versions);

      // Determine latest version
      const latestVersionInfo = group.versions.find((v) => {
        // Find the highest version number
        return group.versions.every((other) => {
          const comparison =
            normalizeVersion(v.version) === normalizeVersion(other.version) ||
            normalizeVersion(v.version) > normalizeVersion(other.version);
          return comparison;
        });
      });

      // Mark latest version and update group metadata
      if (latestVersionInfo) {
        group.versions = group.versions.map((v) => ({
          ...v,
          isLatest: normalizeVersion(v.version) === normalizeVersion(latestVersionInfo.version),
        }));

        group.latestVersion = latestVersionInfo.version;

        // Update readme/changelog from latest version
        const latestExt = findExtensionByVersion(
          allExtensions,
          group.extensionId,
          latestVersionInfo.version,
        );
        if (latestExt) {
          group.readme = latestExt.readme ?? group.readme;
          group.changelog = latestExt.changelog ?? group.changelog;
        }
      }

      // Update installation status for entire group
      group.installed = group.installed || isAnyVersionInstalled(group.extensionId);

      // Update total versions
      group.totalVersions = group.versions.length;
    }

    const result = Array.from(groups.values());
    const endTime = performance.now();

    log.debug(
      `[useGroupedExtensionsByVersion] Processed ${groups.size} extension groups in ${(endTime - startTime).toFixed(2)}ms`,
    );
    log.debug(
      `[useGroupedExtensionsByVersion] Result: ${result.length} groups, ${result.reduce((sum, g) => sum + g.totalVersions, 0)} total versions`,
    );

    return result;
  }, [installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled]);
}

/**
 * Add version information to a group
 * Handles duplicate version detection and installation status
 */
function addVersionToGroup(
  group: ExtensionWithVersions,
  ext: InstalledExtensionInput | MarketplaceExtensionInput,
  isExtensionInstalled: (id: string) => boolean,
): void {
  try {
    const normalizedVersion = normalizeVersion(ext.version);

    // Check if this version already exists
    const existingVersion = group.versions.find(
      (v) => normalizeVersion(v.version) === normalizedVersion,
    );

    if (existingVersion) {
      // Update installation status if needed
      const versionedId = toVersionedId(group.extensionId, ext.version);
      if (isExtensionInstalled(versionedId)) {
        existingVersion.installed = true;
      }
      return;
    }

    // Add new version
    const versionedId = toVersionedId(group.extensionId, ext.version);
    const versionInfo: VersionInfo = {
      version: ext.version,
      // Note: publishedDate should be retrieved from API when available
      publishedDate: new Date().toISOString(),
      isLatest: false, // Will be determined later
      installed: isExtensionInstalled(versionedId),
    };

    group.versions.push(versionInfo);

    // Check if this is the latest version (preliminary check)
    const currentLatestNormalized = normalizeVersion(group.latestVersion);
    if (normalizedVersion > currentLatestNormalized) {
      group.latestVersion = ext.version;
    }

    // Update installation status for the group
    if (isExtensionInstalled(versionedId)) {
      group.installed = true;
    }
  } catch (error) {
    log.error(
      `[useGroupedExtensionsByVersion] Error adding version ${ext.version} to group`,
      error,
    );
  }
}

/**
 * Find extension data by base ID and version
 */
function findExtensionByVersion(
  extensions: Array<InstalledExtensionInput | MarketplaceExtensionInput>,
  baseId: string,
  version: string,
): (InstalledExtensionInput | MarketplaceExtensionInput) | undefined {
  const normalizedTargetVersion = normalizeVersion(version);

  return extensions.find((ext) => {
    const extBaseId = extractBaseId(ext.id);
    const extNormalizedVersion = normalizeVersion(ext.version);
    return extBaseId === baseId && extNormalizedVersion === normalizedTargetVersion;
  });
}
