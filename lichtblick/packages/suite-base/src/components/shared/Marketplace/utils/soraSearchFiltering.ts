// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { filterItemsByKeywords } from "./soraKeywordFilter";

/**
 * Filter items by combining search query and keyword filters
 * @param items - Items to filter
 * @param searchQuery - Search query string
 * @param selectedKeywords - Selected keywords for filtering
 * @param keywordFilterMode - Keyword filter mode: "AND" or "OR"
 * @returns Filtered items
 */
export function filterItemsBySearchAndKeywords<
  T extends {
    name?: string;
    displayName?: string;
    description?: string;
    publisher?: string;
    keywords?: string[] | readonly string[];
  },
>(
  items: T[],
  searchQuery: string,
  selectedKeywords: string[],
  keywordFilterMode: "AND" | "OR" = "AND",
): T[] {
  let filteredItems = items;

  // Keyword filtering
  if (selectedKeywords.length > 0) {
    filteredItems = filterItemsByKeywords(filteredItems, selectedKeywords, keywordFilterMode);
  }

  // Search query filtering
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const name = (item.displayName ?? item.name ?? "").toLowerCase();
      const description = (item.description ?? "").toLowerCase();
      const publisher = (item.publisher ?? "").toLowerCase();
      const keywords = (item.keywords ?? item.keywords ?? []).join(" ").toLowerCase();

      return (
        name.includes(query) ||
        description.includes(query) ||
        publisher.includes(query) ||
        keywords.includes(query)
      );
    });
  }

  return filteredItems;
}
