// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import type * as IDB from "idb/with-async-ittr";

import Log from "@lichtblick/log";
import type { StoredExtension } from "@lichtblick/suite-base/services/IExtensionStorage";
import type { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";
import {
  isVersioned,
  toVersionedId,
  extractBaseId as extractBaseIdUtil,
  extractVersion as extractVersionUtil,
} from "@lichtblick/suite-base/util/marketplace/soraExtensionIdUtils";

const log = Log.getLogger(__filename);

/**
 * IndexedDB Extension Storage Migration Utilities
 *
 * Handles database schema migrations for the extension storage.
 * Currently supports migration from V1 (single version) to V2 (multi-version support).
 */

/**
 * Migrate from Version 1 to Version 2
 *
 * V1: Extensions stored with ID format: "publisher.name"
 * V2: Extensions stored with ID format: "publisher.name@version"
 *
 * @param transaction - IndexedDB transaction
 * @param metadataStoreName - Name of the metadata store
 * @param extensionsStoreName - Name of the extensions store
 */
export async function migrateV1ToV2(
  transaction: IDB.IDBPTransaction<unknown, ArrayLike<string>, "versionchange">,
  metadataStoreName: string,
  extensionsStoreName: string,
): Promise<void> {
  log.info("[Migration] Starting V1 → V2 migration: multi-version support");

  try {
    // Get object stores
    const metadataStore = transaction.objectStore(metadataStoreName);
    const extensionsStore = transaction.objectStore(extensionsStoreName);

    // Migrate metadata store
    await migrateMetadataStore(metadataStore);

    // Migrate extensions store
    await migrateExtensionsStore(extensionsStore);

    log.info("[Migration] V1 → V2 migration completed successfully");
  } catch (error) {
    log.error("[Migration] V1 → V2 migration failed:", error);
    throw error;
  }
}

/**
 * Migrate metadata store from V1 to V2
 *
 * @param store - Metadata object store
 */
async function migrateMetadataStore(
  store: IDB.IDBPObjectStore<unknown, string[], string, "versionchange">,
): Promise<void> {
  log.debug("[Migration] Migrating metadata store...");

  const records = await store.getAll();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const extension of records as ExtensionInfo[]) {
    try {
      // Skip if already migrated (ID contains "@")
      if (isVersioned(extension.id)) {
        skippedCount++;
        continue;
      }

      const oldId = extension.id;
      const newId = toVersionedId(extension.id, extension.version);

      // Delete old record
      await store.delete(oldId);

      // Create new record with updated structure
      const migratedExtension: ExtensionInfo = {
        ...extension,
        id: newId,
      };

      await store.put(migratedExtension);

      log.debug(`[Migration] Metadata migrated: ${oldId} → ${newId}`);
      migratedCount++;
    } catch (error) {
      log.error(`[Migration] Failed to migrate metadata for ${extension.id}:`, error);
      // Continue with next record instead of failing entire migration
    }
  }

  log.info(
    `[Migration] Metadata store migration completed: ${migratedCount} migrated, ${skippedCount} skipped`,
  );
}

/**
 * Migrate extensions store from V1 to V2
 *
 * @param store - Extensions object store
 */
async function migrateExtensionsStore(
  store: IDB.IDBPObjectStore<unknown, string[], string, "versionchange">,
): Promise<void> {
  log.debug("[Migration] Migrating extensions store...");

  const records = await store.getAll();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const stored of records as StoredExtension[]) {
    try {
      // Skip if already migrated (ID contains "@")
      if (isVersioned(stored.info.id)) {
        skippedCount++;
        continue;
      }

      const oldId = stored.info.id;
      const newId = toVersionedId(stored.info.id, stored.info.version);

      // Delete old record
      await store.delete(oldId);

      // Create new record with updated structure
      const migratedExtension: StoredExtension = {
        ...stored,
        info: {
          ...stored.info,
          id: newId,
        },
      };

      await store.put(migratedExtension);

      log.debug(`[Migration] Extension migrated: ${oldId} → ${newId}`);
      migratedCount++;
    } catch (error) {
      log.error(`[Migration] Failed to migrate extension for ${stored.info.id}:`, error);
      // Continue with next record instead of failing entire migration
    }
  }

  log.info(
    `[Migration] Extensions store migration completed: ${migratedCount} migrated, ${skippedCount} skipped`,
  );
}

/**
 * Check if an extension ID is in V2 format
 *
 * V2 format: "publisher.name@version"
 * V1 format: "publisher.name"
 *
 * @param id - Extension ID to check
 * @returns true if ID is in V2 format
 * @deprecated Use isVersioned() from ExtensionIdUtils instead
 */
export function isV2Format(id: string): boolean {
  return isVersioned(id);
}

/**
 * Convert V1 ID to V2 ID
 *
 * @param baseId - V1 format ID (e.g., "publisher.name")
 * @param version - Version string (e.g., "1.0.0")
 * @returns V2 format ID (e.g., "publisher.name@1.0.0")
 * @deprecated Use toVersionedId() from ExtensionIdUtils instead
 */
export function toV2Id(baseId: string, version: string): string {
  return toVersionedId(baseId, version);
}

/**
 * Extract base ID (marketplace ID) from versioned ID
 *
 * @param versionedId - V2 format ID (e.g., "publisher.name@1.0.0")
 * @returns Base ID (e.g., "publisher.name")
 * @deprecated Use extractBaseId() from ExtensionIdUtils instead
 */
export function extractBaseId(versionedId: string): string {
  return extractBaseIdUtil(versionedId);
}

/**
 * Extract version from versioned ID
 *
 * @param versionedId - V2 format ID (e.g., "publisher.name@1.0.0")
 * @returns Version string (e.g., "1.0.0"), or undefined if not in V2 format
 * @deprecated Use extractVersion() from ExtensionIdUtils instead
 */
export function extractVersion(versionedId: string): string | undefined {
  return extractVersionUtil(versionedId);
}
