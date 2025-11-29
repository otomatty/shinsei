// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import type { KeywordStats } from "@lichtblick/suite-base/types/soraMarketplaceUI";

/**
 * Calculate keyword usage statistics from a list of items
 * @param items - Array of items with keywords
 * @returns Array of keyword statistics sorted by usage count (descending)
 */
export function calculateKeywordStats<T extends { keywords?: string[] | readonly string[] }>(
  items: T[],
): KeywordStats[] {
  const tagCounts = new Map<string, number>();

  // Aggregate keywords from each item
  items.forEach((item) => {
    if (item.keywords) {
      item.keywords.forEach((keyword) => {
        tagCounts.set(keyword, (tagCounts.get(keyword) ?? 0) + 1);
      });
    }
  });

  // Sort by usage count in descending order
  return Array.from(tagCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Filter items by selected keywords
 * @param items - Items to filter
 * @param selectedKeywords - Keywords to filter by
 * @param mode - Filter mode: "AND" (all keywords) or "OR" (any keyword). Defaults to "AND"
 * @returns Filtered items
 */
export function filterItemsByKeywords<T extends { keywords?: string[] | readonly string[] }>(
  items: T[],
  selectedKeywords: string[],
  mode: "AND" | "OR" = "AND",
): T[] {
  if (selectedKeywords.length === 0) {
    return items;
  }

  return items.filter((item) => {
    if (!item.keywords || item.keywords.length === 0) {
      return false;
    }

    if (mode === "AND") {
      // Return items that contain all of the selected keywords
      return selectedKeywords.every((selectedKeyword) => item.keywords!.includes(selectedKeyword));
    } else {
      // Return items that contain any of the selected keywords
      return selectedKeywords.some((selectedKeyword) => item.keywords!.includes(selectedKeyword));
    }
  });
}
