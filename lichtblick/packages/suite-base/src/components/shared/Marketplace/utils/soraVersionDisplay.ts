// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { compareVersions, normalizeVersion } from "./soraVersionComparison";

/**
 * Get the latest version from a list of versions
 * @param versions - Array of version strings
 * @returns Latest version string
 */
export function getLatestVersion(versions: string[]): string {
  if (versions.length === 0) {
    return "1.0.0";
  }

  return versions.reduce((latest, current) => {
    return compareVersions(normalizeVersion(current), normalizeVersion(latest)) > 0
      ? current
      : latest;
  });
}

/**
 * Format version string for display
 * @param version - Version string
 * @returns Formatted version string
 */
export function formatVersionForDisplay(version: string): string {
  // Convert version string to a more readable format
  const normalized = normalizeVersion(version);

  // Preserve prerelease information if present
  if (version.includes("-")) {
    const [base, prerelease] = version.split("-", 2);
    if (base && prerelease) {
      return `${normalizeVersion(base)}-${prerelease}`;
    }
  }

  return normalized;
}
