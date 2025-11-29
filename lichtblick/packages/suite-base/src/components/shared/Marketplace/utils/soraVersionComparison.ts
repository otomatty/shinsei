// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Normalize version string
 * Converts a version string to semantic versioning format (x.y.z)
 * @param version - Version string to normalize
 * @returns Normalized version string
 */
export function normalizeVersion(version: string): string {
  // Normalize to semantic versioning format
  const parts = version.replace(/[^0-9.]/g, "").split(".");
  while (parts.length < 3) {
    parts.push("0");
  }
  return parts.slice(0, 3).join(".");
}

/**
 * Compare versions
 * @param a - First version string
 * @param b - Second version string
 * @returns -1: a < b, 0: a = b, 1: a > b
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] ?? 0;
    const bPart = bParts[i] ?? 0;

    if (aPart < bPart) {
      return -1;
    }
    if (aPart > bPart) {
      return 1;
    }
  }

  return 0;
}

/**
 * Compare dates
 * @param a - First date (string or Date object)
 * @param b - Second date (string or Date object)
 * @returns Difference in milliseconds (a - b)
 */
export function compareDates(a?: string | Date, b?: string | Date): number {
  const dateA = a != undefined ? new Date(a).getTime() : 0;
  const dateB = b != undefined ? new Date(b).getTime() : 0;
  return dateA - dateB;
}
