// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Common marketplace header component
 * Includes title, statistics, and search functionality
 */

import { Alert, Button } from "@mui/material";
import { ReactNode } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";
import type {
  MarketplaceTab,
  SearchSuggestion,
  TabConfig,
  KeywordFilterMode,
  KeywordStats,
} from "@lichtblick/suite-base/types/soraMarketplaceUI";

import { type AdvancedSearchOptions } from "./SoraAdvancedSearchPanel";
import MarketplaceFilterButtons from "./SoraMarketplaceFilterButton/SoraMarketplaceFilterButtons";
import MarketplaceSearchBar from "./SoraMarketplaceSearchBar";
import MarketplaceTabNavigation from "./SoraMarketplaceTabNavigation";
import MarketplaceTitleSection from "./SoraMarketplaceTitleSection";

const useStyles = makeStyles()(() => ({
  errorAlert: {
    borderRadius: "8px",
  },
  searchContainer: {
    maxWidth: "800px",
  },
  searchRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  searchInputWrapper: {
    flexGrow: 1,
  },
}));

export interface MarketplaceHeaderProps {
  /** Title */
  title: string;
  /** Subtitle */
  subtitle?: string;
  /** Icon */
  icon?: ReactNode;
  /** Search value */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Error message */
  error?: string;
  /** Error resolution action */
  onRetry?: () => void;
  /** Custom actions */
  actions?: ReactNode;
  /** Available keywords and their usage statistics */
  tagStats?: KeywordStats[];
  /** Selected keyword filters */
  selectedKeywords?: string[];
  /** Keyword filter change handler */
  onKeywordFilterChange?: (keywords: string[]) => void;
  /** Keyword filter mode (AND/OR) */
  keywordFilterMode?: KeywordFilterMode;
  /** Keyword filter mode change handler */
  onKeywordFilterModeChange?: (mode: KeywordFilterMode) => void;
  /** Tab configuration */
  tabs?: TabConfig[];
  /** Currently selected tab */
  activeTab?: MarketplaceTab;
  /** Tab change handler */
  onTabChange?: (tab: MarketplaceTab) => void;
  /** Enable search suggestions */
  enableSearchSuggestions?: boolean;
  /** Search suggestions list */
  searchSuggestions?: SearchSuggestion[];
  /** Enable advanced search options */
  enableAdvancedSearch?: boolean;
  /** Advanced search options */
  advancedSearchOptions?: AdvancedSearchOptions;
  /** Advanced search options change handler */
  onAdvancedSearchChange?: (options: AdvancedSearchOptions) => void;
  /** Available publishers list */
  availablePublishers?: string[];
}

/**
 * Marketplace header component
 */
export default function SoraMarketplaceHeader({
  title,
  subtitle,
  icon,
  searchValue = "",
  onSearchChange,
  error,
  onRetry,
  actions,
  tagStats = [],
  selectedKeywords = [],
  onKeywordFilterChange,
  keywordFilterMode = "AND",
  onKeywordFilterModeChange,
  tabs = [],
  activeTab = "available",
  onTabChange,
  enableSearchSuggestions = false,
  searchSuggestions = [],
  enableAdvancedSearch = false,
  advancedSearchOptions = {},
  onAdvancedSearchChange,
  availablePublishers = [],
}: MarketplaceHeaderProps): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <Stack gap={3}>
      {/* Title section */}
      <MarketplaceTitleSection title={title} subtitle={subtitle} icon={icon} actions={actions} />

      {/* Error display */}
      {error && (
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
          className={classes.errorAlert}
        >
          {error}
        </Alert>
      )}

      {/* Search bar and filters */}
      {onSearchChange && (
        <div className={classes.searchContainer}>
          <div className={classes.searchRow}>
            <div className={classes.searchInputWrapper}>
              <MarketplaceSearchBar
                title={title}
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                enableSearchSuggestions={enableSearchSuggestions}
                searchSuggestions={searchSuggestions}
                selectedKeywords={selectedKeywords}
                onKeywordFilterChange={onKeywordFilterChange}
              />
            </div>
            <MarketplaceFilterButtons
              tagStats={tagStats}
              selectedKeywords={selectedKeywords}
              onKeywordFilterChange={onKeywordFilterChange}
              keywordFilterMode={keywordFilterMode}
              onKeywordFilterModeChange={onKeywordFilterModeChange}
              enableAdvancedSearch={enableAdvancedSearch}
              advancedSearchOptions={advancedSearchOptions}
              onAdvancedSearchChange={onAdvancedSearchChange}
              availablePublishers={availablePublishers}
            />
          </div>
        </div>
      )}

      {/* Tab navigation */}
      {tabs.length > 0 && onTabChange && (
        <MarketplaceTabNavigation tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </Stack>
  );
}
