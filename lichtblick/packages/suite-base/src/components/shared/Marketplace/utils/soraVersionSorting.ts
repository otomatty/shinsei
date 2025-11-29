// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { VersionDisplayInfo, VersionInfo } from "@lichtblick/suite-base/types/soraMarketplaceUI";

import { compareVersions, normalizeVersion } from "./soraVersionComparison";

/**
 * Sort versions by published date (newest first)
 * @param versions - Array of version information
 * @returns Sorted array
 */
export function sortVersionsByDate(versions: VersionDisplayInfo[]): VersionDisplayInfo[] {
  return [...versions].sort((a, b) => {
    const dateA = new Date(a.publishedDate);
    const dateB = new Date(b.publishedDate);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Sort versions by semantic versioning (highest first)
 * @param versions - Array of version information
 * @returns Sorted array
 */
export function sortVersionsBySemver(versions: VersionDisplayInfo[]): VersionDisplayInfo[] {
  return [...versions].sort((a, b) => {
    const aParts = a.version.split(".").map((part) => parseInt(part, 10));
    const bParts = b.version.split(".").map((part) => parseInt(part, 10));

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] ?? 0;
      const bPart = bParts[i] ?? 0;

      if (bPart !== aPart) {
        return bPart - aPart;
      }
    }

    return 0;
  });
}

/**
 * Sort version information (descending order - latest first)
 * Sorts by version number first, then by publish date if versions are equal
 * @param versions - Array of version information
 * @returns Sorted array
 */
export function sortVersions(versions: VersionInfo[]): VersionInfo[] {
  return [...versions].sort((a, b) => {
    const versionCompare = compareVersions(
      normalizeVersion(b.version),
      normalizeVersion(a.version),
    );

    // If versions are the same, compare by publish date
    if (versionCompare === 0) {
      const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return dateB - dateA;
    }

    return versionCompare;
  });
}
