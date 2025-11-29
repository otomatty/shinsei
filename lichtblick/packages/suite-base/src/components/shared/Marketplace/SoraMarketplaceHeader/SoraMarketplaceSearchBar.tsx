// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Marketplace search bar component
 * Provides search input with optional suggestions/autocomplete
 */

import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, Chip, InputAdornment, TextField, useTheme } from "@mui/material";
import { useState } from "react";
import { makeStyles } from "tss-react/mui";

import SearchBar from "@lichtblick/suite-base/components/SearchBar/SearchBar";
import type { SearchSuggestion } from "@lichtblick/suite-base/types/soraMarketplaceUI";

const useStyles = makeStyles()(() => ({
  searchBar: {
    borderRadius: "12px",
  },
  suggestionItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
  },
  suggestionTypeChip: {
    color: "white",
    fontSize: "0.7rem",
    minWidth: "60px",
  },
  suggestionText: {
    flex: 1,
  },
  suggestionCountChip: {
    fontSize: "0.7rem",
  },
}));

export interface MarketplaceSearchBarProps {
  /** Title for placeholder text */
  title: string;
  /** Current search value */
  searchValue: string;
  /** Search value change handler */
  onSearchChange: (value: string) => void;
  /** Enable search suggestions */
  enableSearchSuggestions?: boolean;
  /** List of search suggestions */
  searchSuggestions?: SearchSuggestion[];
  /** Selected keywords (for keyword suggestion filtering) */
  selectedKeywords?: string[];
  /** Keyword filter change handler (for keyword suggestions) */
  onKeywordFilterChange?: (keywords: string[]) => void;
}

/**
 * Marketplace search bar with optional autocomplete
 */
export default function SoraMarketplaceSearchBar({
  title,
  searchValue,
  onSearchChange,
  enableSearchSuggestions = false,
  searchSuggestions = [],
  selectedKeywords = [],
  onKeywordFilterChange,
}: MarketplaceSearchBarProps): React.JSX.Element {
  const theme = useTheme();
  const { classes } = useStyles();
  const [isComposing, setIsComposing] = useState(false);

  // Autocomplete with suggestions
  if (enableSearchSuggestions && searchSuggestions.length > 0) {
    return (
      <Autocomplete
        freeSolo
        options={searchSuggestions.map((suggestion) => suggestion.value)}
        value={searchValue}
        onInputChange={(_, newValue, reason) => {
          // Handle clear button click
          if (reason === "clear") {
            onSearchChange("");
            return;
          }
          // Skip processing during IME input (before conversion is confirmed)
          // Only process with 'input' reason (exclude 'reset', etc.)
          if (!isComposing && reason === "input") {
            onSearchChange(newValue);
          }
        }}
        onChange={(_, newValue) => {
          // Handle selection from dropdown
          if (newValue && typeof newValue === "string") {
            const suggestion = searchSuggestions.find((s) => s.value === newValue);

            // If a keyword is selected, add it to keyword filters
            if (suggestion?.type === "keyword" && onKeywordFilterChange) {
              const currentKeywords = selectedKeywords;
              if (!currentKeywords.includes(newValue)) {
                onKeywordFilterChange([...currentKeywords, newValue]);
              }
              // Clear search input after adding keyword
              onSearchChange("");
            } else {
              // For non-keyword suggestions, just update the search value
              onSearchChange(newValue);
            }
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={`Search ${title.toLowerCase()}...`}
            variant="filled"
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
            onCompositionStart={() => {
              // IME input start (Japanese input start)
              setIsComposing(true);
            }}
            onCompositionEnd={(event) => {
              // IME input end (conversion confirmed)
              setIsComposing(false);
              // Execute search when conversion is confirmed
              const target = event.target as HTMLInputElement;
              onSearchChange(target.value);
            }}
            className={classes.searchBar}
          />
        )}
        renderOption={(props, option) => {
          const suggestion = searchSuggestions.find((s) => s.value === option);
          const typeColor: Record<SearchSuggestion["type"], string> = {
            name: theme.palette.primary.main,
            keyword: theme.palette.secondary.main,
            publisher: theme.palette.info.main,
          };
          const isKeyword = suggestion?.type === "keyword";

          return (
            <li {...props} key={option}>
              <div className={classes.suggestionItem}>
                <Chip
                  size="small"
                  label={suggestion?.type ?? ""}
                  className={classes.suggestionTypeChip}
                  style={{
                    backgroundColor: typeColor[suggestion?.type ?? "keyword"],
                  }}
                />
                <span className={classes.suggestionText}>{option}</span>
                {suggestion?.count != undefined && suggestion.count > 1 && (
                  <Chip
                    size="small"
                    label={suggestion.count}
                    variant="outlined"
                    className={classes.suggestionCountChip}
                  />
                )}
                {isKeyword && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.75rem",
                      color: theme.palette.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FilterListIcon fontSize="small" style={{ fontSize: "14px" }} />
                    Click to filter
                  </span>
                )}
              </div>
            </li>
          );
        }}
      />
    );
  }

  // Simple search bar without suggestions
  return (
    <SearchBar
      placeholder={`Search ${title.toLowerCase()}...`}
      value={searchValue}
      onChange={(event) => {
        onSearchChange(event.target.value);
      }}
      onClear={() => {
        onSearchChange("");
      }}
      showClearIcon={searchValue.length > 0}
      className={classes.searchBar}
    />
  );
}
