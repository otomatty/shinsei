// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Log from "@lichtblick/log";

const log = Log.getLogger(__filename);

/**
 * Check if ID is in versioned format
 * @param id Extension ID
 * @returns true if ID contains version information
 * @example
 * isVersioned("publisher.name@1.0.0") // → true
 * isVersioned("publisher.name") // → false
 */
export function isVersioned(id: string): boolean {
  return id.includes("@") && id.split("@").length === 2;
}

/**
 * Extract base ID from potentially versioned ID
 * @param id Extension ID (versioned or legacy format)
 * @returns Base ID without version information
 * @example
 * extractBaseId("publisher.name@1.0.0") // → "publisher.name"
 * extractBaseId("publisher.name") // → "publisher.name"
 */
export function extractBaseId(id: string): string {
  const atIndex = id.indexOf("@");
  if (atIndex === -1) {
    return id;
  }
  return id.substring(0, atIndex);
}

/**
 * Extract version from versioned ID
 * @param id Extension ID
 * @returns Version string, or undefined if not versioned
 * @example
 * extractVersion("publisher.name@1.0.0") // → "1.0.0"
 * extractVersion("publisher.name") // → undefined
 */
export function extractVersion(id: string): string | undefined {
  const atIndex = id.indexOf("@");
  if (atIndex === -1) {
    return undefined;
  }
  return id.substring(atIndex + 1);
}

/**
 * Create versioned ID from base ID and version
 * @param baseId Base ID (publisher.name)
 * @param version Version string
 * @returns Versioned ID in format "baseId@version"
 * @example
 * toVersionedId("publisher.name", "1.0.0") // → "publisher.name@1.0.0"
 * toVersionedId("publisher.name@0.9.0", "1.0.0") // → "publisher.name@1.0.0"
 */
export function toVersionedId(baseId: string, version: string): string {
  // Ensure we're working with a clean base ID
  const cleanBaseId = extractBaseId(baseId);
  return `${cleanBaseId}@${version}`;
}

/**
 * Check if two IDs refer to the same base extension
 * @param id1 First extension ID
 * @param id2 Second extension ID
 * @returns true if both IDs have the same base ID
 * @example
 * isSameBaseExtension(
 *   "publisher.name@1.0.0",
 *   "publisher.name@2.0.0"
 * ) // → true
 */
export function isSameBaseExtension(id1: string, id2: string): boolean {
  return extractBaseId(id1) === extractBaseId(id2);
}

/**
 * Generate base ID with publisher prefix
 * @param name Extension name
 * @param publisher Publisher name
 * @returns Base ID in format "publisher.name"
 * @example
 * withPublisher("my-extension", "acme") // → "acme.my-extension"
 * withPublisher("my-extension@1.0.0", "acme") // → "acme.my-extension"
 */
export function withPublisher(name: string, publisher: string): string {
  // Remove version information if present
  const cleanName = name.replace(/(@[\d.]+.*)?$/, "");
  return `${publisher}.${cleanName}`;
}

/**
 * Validate extension ID format
 * @param id Extension ID to validate
 * @returns true if ID is in valid format
 * @example
 * validate("publisher.name@1.0.0") // → true
 * validate("publisher.name") // → true
 * validate("invalid") // → false
 */
export function validate(id: string): boolean {
  if (!id || typeof id !== "string" || id.length === 0) {
    return false;
  }

  // For versioned ID
  if (isVersioned(id)) {
    const baseId = extractBaseId(id);
    const version = extractVersion(id);
    return baseId.length > 0 && baseId.includes(".") && version != undefined && version.length > 0;
  }

  // For legacy format ID
  return id.includes(".") && id.length > 0;
}

/**
 * Debug: Log detailed ID information
 * @param id Extension ID to debug
 * @example
 * debugExtensionId("publisher.name@1.0.0")
 * // Logs: {
 * //   id: "publisher.name@1.0.0",
 * //   isVersioned: true,
 * //   baseId: "publisher.name",
 * //   version: "1.0.0",
 * //   isValid: true
 * // }
 */
export function debugExtensionId(id: string): void {
  log.debug("Extension ID Debug:", {
    id,
    isVersioned: isVersioned(id),
    baseId: extractBaseId(id),
    version: extractVersion(id),
    isValid: validate(id),
  });
}

/**
 * Centralized utility functions for extension ID manipulation and version management.
 *
 * @deprecated Use individual named exports instead. This will be removed in a future version.
 * @example
 * // Before
 * ExtensionIdUtils.extractBaseId("publisher.name@1.0.0")
 * // After
 * import { extractBaseId } from "./ExtensionIdUtils"
 * extractBaseId("publisher.name@1.0.0")
 */
export const ExtensionIdUtils = {
  isVersioned,
  extractBaseId,
  extractVersion,
  toVersionedId,
  isSameBaseExtension,
  withPublisher,
  validate,
  debug: debugExtensionId,
} as const;
