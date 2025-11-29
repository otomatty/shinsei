// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useState, useMemo, useCallback } from "react";

import {
  calculateKeywordStats,
  filterItemsByKeywords,
  filterItemsBySearchAndKeywords,
  generateSearchSuggestions,
  filterAndSortWithAdvancedOptions,
} from "../../components/shared/Marketplace/utils";
import type {
  MarketplaceTab,
  TabConfig,
  AdvancedSearchOptions,
  KeywordStats,
  SearchSuggestion,
  KeywordFilterMode,
} from "../../types/soraMarketplaceUI";

/**
 * Generic marketplace item interface
 * All marketplace items must conform to this structure
 */
export interface MarketplaceItem {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  publisher?: string;
  keywords?: string[] | readonly string[];
  version?: string;
  installed?: boolean;
  updatedAt?: string | Date;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Configuration for the marketplace search hook
 */
export interface MarketplaceSearchConfig<T extends MarketplaceItem> {
  /**
   * All available items (unfiltered)
   */
  items: T[];

  /**
   * Initial search query (optional)
   */
  initialSearchQuery?: string;

  /**
   * Initial selected keywords (optional)
   */
  initialSelectedKeywords?: string[];

  /**
   * Initial active tab (optional)
   */
  initialActiveTab?: MarketplaceTab;

  /**
   * Initial keyword filter mode (optional, default: "AND")
   */
  initialKeywordFilterMode?: KeywordFilterMode;

  /**
   * Enable search suggestions (default: true)
   */
  enableSuggestions?: boolean;

  /**
   * Maximum number of suggestions to show (default: 15)
   */
  maxSuggestions?: number;

  /**
   * Custom field mapping for search
   */
  fieldMapping?: {
    name?: keyof T;
    description?: keyof T;
    publisher?: keyof T;
    keywords?: keyof T;
  };
}

/**
 * Return value of useMarketplaceSearch hook
 */
export interface MarketplaceSearchResult<T extends MarketplaceItem> {
  // State
  searchQuery: string;
  selectedKeywords: string[];
  activeTab: MarketplaceTab;
  advancedSearchOptions: AdvancedSearchOptions;
  keywordFilterMode: KeywordFilterMode;

  // Setters
  setSearchQuery: (query: string) => void;
  setSelectedKeywords: (keywords: string[]) => void;
  setActiveTab: (tab: MarketplaceTab) => void;
  setAdvancedSearchOptions: (options: AdvancedSearchOptions) => void;
  setKeywordFilterMode: (mode: KeywordFilterMode) => void;

  // Computed data
  filteredItems: T[];
  tabFilteredItems: T[];
  tagStats: KeywordStats[];
  searchSuggestions: SearchSuggestion[];
  tabs: TabConfig[];

  // Helper functions
  toggleKeyword: (keyword: string) => void;
  clearFilters: () => void;
  getFilteredCountForTab: (tab: MarketplaceTab) => number;
}

/**
 * Custom hook for marketplace search functionality
 * Provides unified search, filtering, and suggestion logic for any marketplace
 */
export function useSoraMarketplaceSearch<T extends MarketplaceItem>(
  config: MarketplaceSearchConfig<T>,
): MarketplaceSearchResult<T> {
  const {
    items,
    initialSearchQuery = "",
    initialSelectedKeywords = [],
    initialActiveTab = "available",
    initialKeywordFilterMode = "AND",
    enableSuggestions = true,
    maxSuggestions = 15,
    fieldMapping,
  } = config;

  // State
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(initialSelectedKeywords);
  const [activeTab, setActiveTab] = useState<MarketplaceTab>(initialActiveTab);
  const [advancedSearchOptions, setAdvancedSearchOptions] = useState<AdvancedSearchOptions>({});
  const [keywordFilterMode, setKeywordFilterMode] =
    useState<KeywordFilterMode>(initialKeywordFilterMode);

  // Map items to normalized format for search
  const normalizedItems = useMemo(() => {
    if (!fieldMapping) {
      return items;
    }

    return items.map((item) => ({
      ...item,
      name: fieldMapping.name != undefined ? String(item[fieldMapping.name]) : item.name,
      description:
        fieldMapping.description != undefined
          ? String(item[fieldMapping.description])
          : item.description,
      publisher:
        fieldMapping.publisher != undefined ? String(item[fieldMapping.publisher]) : item.publisher,
      keywords:
        fieldMapping.keywords != undefined
          ? (item[fieldMapping.keywords] as string[])
          : item.keywords ?? item.keywords,
    }));
  }, [items, fieldMapping]);

  // Tab filtering
  const tabFilteredItems = useMemo(() => {
    if (activeTab === "installed") {
      return normalizedItems.filter((item) => item.installed === true);
    }
    // Available tab shows non-installed items
    return normalizedItems.filter((item) => item.installed !== true);
  }, [normalizedItems, activeTab]);

  // Calculate keyword statistics (based on current tab and selected keywords in AND mode)
  const tagStats = useMemo(() => {
    // In AND mode, show only keywords from items that match currently selected keywords
    // This creates a progressive filtering experience
    if (keywordFilterMode === "AND" && selectedKeywords.length > 0) {
      const filteredByKeywords = filterItemsByKeywords(tabFilteredItems, selectedKeywords, "AND");
      return calculateKeywordStats(filteredByKeywords);
    }
    // In OR mode or when no keywords selected, show all available keywords
    return calculateKeywordStats(tabFilteredItems);
  }, [tabFilteredItems, selectedKeywords, keywordFilterMode]);

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    if (!enableSuggestions) {
      return [];
    }
    return generateSearchSuggestions(tabFilteredItems, searchQuery, maxSuggestions);
  }, [tabFilteredItems, searchQuery, enableSuggestions, maxSuggestions]);

  // Apply search and keyword filters
  const filteredItems = useMemo(() => {
    let result = tabFilteredItems;

    // Text search and keyword filtering
    result = filterItemsBySearchAndKeywords(
      result,
      searchQuery,
      selectedKeywords,
      keywordFilterMode,
    );

    // Advanced search options (if any)
    if (
      advancedSearchOptions.publisherFilter ||
      advancedSearchOptions.sortBy ||
      advancedSearchOptions.sortOrder
    ) {
      // Support both sortBy+sortDirection and direct sortOrder
      const sortOrder:
        | "name-asc"
        | "name-desc"
        | "date-asc"
        | "date-desc"
        | "publisher-asc"
        | "publisher-desc"
        | undefined =
        advancedSearchOptions.sortOrder ??
        (advancedSearchOptions.sortBy
          ? (`${advancedSearchOptions.sortBy}-${advancedSearchOptions.sortDirection ?? "asc"}` as
              | "name-asc"
              | "name-desc"
              | "date-asc"
              | "date-desc"
              | "publisher-asc"
              | "publisher-desc")
          : undefined);

      const advancedOpts = {
        publisherFilter: advancedSearchOptions.publisherFilter,
        versionRange: advancedSearchOptions.versionRange,
        sortOrder,
      };
      result = filterAndSortWithAdvancedOptions(result, "", [], advancedOpts);
    }

    return result;
  }, [tabFilteredItems, searchQuery, selectedKeywords, keywordFilterMode, advancedSearchOptions]);

  // Calculate filtered count for each tab
  const getFilteredCountForTab = useCallback(
    (tab: MarketplaceTab) => {
      const tabData =
        tab === "installed"
          ? normalizedItems.filter((item) => item.installed === true)
          : normalizedItems.filter((item) => item.installed !== true);

      return filterItemsBySearchAndKeywords(tabData, searchQuery, selectedKeywords).length;
    },
    [normalizedItems, searchQuery, selectedKeywords],
  );

  // Tab configuration with counts
  const tabs: TabConfig[] = useMemo(() => {
    return [
      {
        key: "available",
        label: "Available",
        count: getFilteredCountForTab("available"),
      },
      {
        key: "installed",
        label: "Installed",
        count: getFilteredCountForTab("installed"),
      },
    ];
  }, [getFilteredCountForTab]);

  // Helper: Toggle keyword selection
  const toggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword) ? prev.filter((t) => t !== keyword) : [...prev, keyword],
    );
  }, []);

  // Helper: Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedKeywords([]);
    setAdvancedSearchOptions({});
    setKeywordFilterMode("AND");
  }, []);

  return {
    // State
    searchQuery,
    selectedKeywords,
    activeTab,
    advancedSearchOptions,
    keywordFilterMode,

    // Setters
    setSearchQuery,
    setSelectedKeywords,
    setActiveTab,
    setAdvancedSearchOptions,
    setKeywordFilterMode,

    // Computed data
    filteredItems,
    tabFilteredItems,
    tagStats,
    searchSuggestions,
    tabs,

    // Helper functions
    toggleKeyword,
    clearFilters,
    getFilteredCountForTab,
  };
}
