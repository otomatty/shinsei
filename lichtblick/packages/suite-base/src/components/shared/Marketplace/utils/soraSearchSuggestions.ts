// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import type { SearchSuggestion } from "@lichtblick/suite-base/types/soraMarketplaceUI";

/**
 * Generate search suggestions from a list of items
 * Extracts candidates from keywords, publishers, keywords, and names,
 * and returns them sorted by usage frequency and relevance
 * @param items - Items to generate suggestions from
 * @param currentQuery - Current search query
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Array of search suggestions
 */
export function generateSearchSuggestions<
  T extends {
    name?: string;
    displayName?: string;
    description?: string;
    publisher?: string;
    keywords?: string[] | readonly string[];
  },
>(items: T[], currentQuery = "", maxSuggestions = 20): SearchSuggestion[] {
  const suggestions = new Map<string, SearchSuggestion>();
  const query = currentQuery.toLowerCase().trim();

  // Extract candidates from each item
  items.forEach((item) => {
    // Extract candidates from keywords
    const keywords = item.keywords ?? item.keywords ?? [];
    keywords.forEach((keyword) => {
      if (keyword.toLowerCase().includes(query)) {
        const key = `keyword:${keyword}`;
        const existing = suggestions.get(key);
        if (existing) {
          existing.count = (existing.count ?? 0) + 1;
        } else {
          suggestions.set(key, {
            value: keyword,
            type: "keyword",
            count: 1,
            priority: calculatePriority("keyword", keyword, query),
          });
        }
      }
    });

    // Extract candidates from publishers
    const publisher = item.publisher;
    if (publisher?.toLowerCase().includes(query) === true) {
      const key = `publisher:${publisher}`;
      const existing = suggestions.get(key);
      if (existing) {
        existing.count = (existing.count ?? 0) + 1;
      } else {
        suggestions.set(key, {
          value: publisher,
          type: "publisher",
          count: 1,
          priority: calculatePriority("publisher", publisher, query),
        });
      }
    }

    // Extract candidates from names
    const name = item.displayName ?? item.name;
    if (name?.toLowerCase().includes(query) === true) {
      const key = `name:${name}`;
      const existing = suggestions.get(key);
      if (existing) {
        existing.count = (existing.count ?? 0) + 1;
      } else {
        suggestions.set(key, {
          value: name,
          type: "name",
          count: 1,
          priority: calculatePriority("name", name, query),
        });
      }
    }

    // Extract keywords from description (word by word)
    if (item.description && query.length >= 2) {
      const words = item.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3 && word.includes(query));

      words.forEach((word) => {
        const key = `keyword:${word}`;
        const existing = suggestions.get(key);
        if (existing) {
          existing.count = (existing.count ?? 0) + 1;
        } else {
          suggestions.set(key, {
            value: word,
            type: "keyword",
            count: 1,
            priority: calculatePriority("keyword", word, query),
          });
        }
      });
    }
  });

  // Sort and return suggestions
  return Array.from(suggestions.values())
    .sort((a, b) => {
      // Sort by priority first, then by usage frequency, finally alphabetically
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      const countA = a.count ?? 0;
      const countB = b.count ?? 0;
      if (countA !== countB) {
        return countB - countA;
      }
      return a.value.localeCompare(b.value);
    })
    .slice(0, maxSuggestions);
}

/**
 * Calculate priority for search suggestions
 * Assigns higher priority in order: exact match > prefix match > partial match
 * @param type - Suggestion type (name, keyword, publisher, keyword)
 * @param value - Suggestion value
 * @param query - Current search query
 * @returns Priority score
 */
function calculatePriority(type: string, value: string, query: string): number {
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let basePriority = 0;

  // Base priority by type
  switch (type) {
    case "name":
      basePriority = 1000; // Name has highest priority
      break;
    case "keyword":
      basePriority = 800; // Keyword has second priority
      break;
    case "publisher":
      basePriority = 600; // Publisher
      break;
  }

  // Priority adjustment based on match type
  if (lowerValue === lowerQuery) {
    return basePriority + 300; // Exact match
  } else if (lowerValue.startsWith(lowerQuery)) {
    return basePriority + 200; // Prefix match
  } else if (lowerValue.includes(lowerQuery)) {
    return basePriority + 100; // Partial match
  }

  return basePriority; // Other
}
