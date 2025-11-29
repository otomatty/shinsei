// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import Log from "@lichtblick/log";
import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";
import {
  isVersioned,
  toVersionedId,
  extractBaseId,
} from "@lichtblick/suite-base/util/marketplace/soraExtensionIdUtils";

const log = Log.getLogger(__filename);

/**
 * Extension migration processing
 */

/**
 * Migrates extension info to versioned ID
 * @param extensionInfo Extension information
 * @returns Extension information migrated to versioned ID
 */
export function migrateExtensionInfo(extensionInfo: ExtensionInfo): ExtensionInfo {
  // Return as-is if already versioned ID
  if (isVersioned(extensionInfo.id)) {
    return extensionInfo;
  }

  // Generate new format ID
  const versionedId = toVersionedId(extensionInfo.id, extensionInfo.version);

  // Output log only if ID has changed
  if (versionedId !== extensionInfo.id) {
    log.info(`Migrating extension ID: ${extensionInfo.id} → ${versionedId}`);
  }

  return {
    ...extensionInfo,
    id: versionedId,
  };
}

/**
 * Batch migrates extension list
 * @param extensions Extension list
 * @returns Extension list migrated to versioned IDs
 */
export function migrateExtensionList(extensions: ExtensionInfo[]): ExtensionInfo[] {
  return extensions.map((ext) => migrateExtensionInfo(ext));
}

/**
 * Creates mapping for searching extensions from legacy ID
 * @param extensions Extension list
 * @returns Mapping from legacy ID to ExtensionInfo
 */
export function createLegacyIdMapping(extensions: ExtensionInfo[]): Map<string, ExtensionInfo> {
  const mapping = new Map<string, ExtensionInfo>();

  extensions.forEach((ext) => {
    if (isVersioned(ext.id)) {
      const baseId = extractBaseId(ext.id);
      // Prioritize latest version for same base ID (later ones overwrite)
      mapping.set(baseId, ext);
    }
  });

  return mapping;
}

/**
 * Checks if extension ID needs migration
 * @param extensionInfo Extension information
 * @returns Whether migration is needed
 */
export function needsMigration(extensionInfo: ExtensionInfo): boolean {
  return !isVersioned(extensionInfo.id);
}

/**
 * Infers original legacy ID from versioned ID
 * @param versionedId Versioned ID
 * @returns Legacy ID
 */
export function inferLegacyId(versionedId: string): string {
  return extractBaseId(versionedId);
}

/**
 * Gets migration statistics
 * @param extensions Extension list
 * @returns Migration statistics
 */
export function getMigrationStats(extensions: ExtensionInfo[]): {
  total: number;
  migrated: number;
  needsMigration: number;
  migrationRate: number;
} {
  const total = extensions.length;
  const migrated = extensions.filter((ext) => isVersioned(ext.id)).length;
  const needsMigrationCount = extensions.filter((ext) => needsMigration(ext)).length;
  const migrationRate = total > 0 ? (migrated / total) * 100 : 0;

  return {
    total,
    migrated,
    needsMigration: needsMigrationCount,
    migrationRate: Math.round(migrationRate * 100) / 100, // 小数点2桁
  };
}
