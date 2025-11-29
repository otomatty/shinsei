// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { filterItemsBySearchAndKeywords } from "./soraSearchFiltering";
import { compareDates, compareVersions, normalizeVersion } from "./soraVersionComparison";

/**
 * Filter and sort items with advanced search options
 * @param items - Items to filter
 * @param searchQuery - Search query string
 * @param selectedKeywords - Selected keywords for filtering
 * @param advancedOptions - Advanced filtering and sorting options
 * @returns Filtered and sorted items
 */
export function filterAndSortWithAdvancedOptions<
  T extends {
    name?: string;
    displayName?: string;
    description?: string;
    publisher?: string;
    version?: string;
    keywords?: string[] | readonly string[];
    updatedAt?: string | Date;
  },
>(
  items: T[],
  searchQuery: string,
  selectedKeywords: string[],
  advancedOptions: {
    publisherFilter?: string;
    versionRange?: {
      min?: string;
      max?: string;
    };
    sortOrder?:
      | "name-asc"
      | "name-desc"
      | "date-asc"
      | "date-desc"
      | "publisher-asc"
      | "publisher-desc";
  } = {},
): T[] {
  let filteredItems = items;

  // Basic search and keyword filtering
  filteredItems = filterItemsBySearchAndKeywords(filteredItems, searchQuery, selectedKeywords);

  // Publisher filtering
  if (advancedOptions.publisherFilter) {
    const publisherFilter = advancedOptions.publisherFilter.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const publisher = (item.publisher ?? "").toLowerCase();
      return publisher.includes(publisherFilter);
    });
  }

  // Version range filtering
  if (advancedOptions.versionRange?.min || advancedOptions.versionRange?.max) {
    filteredItems = filteredItems.filter((item) => {
      const version = item.version;
      if (!version) {
        return true; // Include items without version
      }

      const itemVersion = normalizeVersion(version);
      const minVersion = advancedOptions.versionRange?.min
        ? normalizeVersion(advancedOptions.versionRange.min)
        : undefined;
      const maxVersion = advancedOptions.versionRange?.max
        ? normalizeVersion(advancedOptions.versionRange.max)
        : undefined;

      if (minVersion && compareVersions(itemVersion, minVersion) < 0) {
        return false;
      }
      if (maxVersion && compareVersions(itemVersion, maxVersion) > 0) {
        return false;
      }

      return true;
    });
  }

  // Sorting
  if (advancedOptions.sortOrder) {
    filteredItems = [...filteredItems].sort((a, b) => {
      switch (advancedOptions.sortOrder) {
        case "name-asc":
          return (a.name ?? "").localeCompare(b.name ?? "");
        case "name-desc":
          return (b.name ?? "").localeCompare(a.name ?? "");
        case "publisher-asc":
          return (a.publisher ?? "").localeCompare(b.publisher ?? "");
        case "publisher-desc":
          return (b.publisher ?? "").localeCompare(a.publisher ?? "");
        case "date-asc":
          return compareDates(a.updatedAt, b.updatedAt);
        case "date-desc":
          return compareDates(b.updatedAt, a.updatedAt);
        default:
          return 0;
      }
    });
  }

  return filteredItems;
}
