// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Keyword Filter Panel Component
 * Keyword-based filtering UI for marketplace
 */

import CloseIcon from "@mui/icons-material/Close";
import { Chip, IconButton, Typography, useTheme } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import type {
  KeywordFilterMode,
  KeywordStats,
} from "@lichtblick/suite-base/types/soraMarketplaceUI";

import SoraKeywordFilterModeToggle from "./SoraKeywordsFilterModeToggle";

const useStyles = makeStyles()((theme) => ({
  container: {
    padding: "16px",
    backgroundColor: theme.palette.background.paper,
    borderRadius: "8px",
    border: `1px solid ${theme.palette.divider}`,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  title: {
    color: theme.palette.text.primary,
    fontWeight: 600,
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  selectedChip: {
    fontWeight: 600,
  },
  unselectedChip: {
    fontWeight: 400,
  },
  clearButton: {
    borderColor: theme.palette.error.main,
    color: theme.palette.error.main,
  },
}));

export interface KeywordFilterPanelProps {
  /** Available keywords and their usage statistics */
  tagStats: KeywordStats[];
  /** Selected keyword filters */
  selectedKeywords: string[];
  /** Keyword filter change handler */
  onKeywordFilterChange: (keywords: string[]) => void;
  /** Keyword filter mode (AND/OR) */
  filterMode?: KeywordFilterMode;
  /** Keyword filter mode change handler */
  onFilterModeChange?: (mode: KeywordFilterMode) => void;
  /** Close panel handler */
  onClose?: () => void;
}

/**
 * Keyword Filter Panel
 * Provides keyword selection/deselection and clear functionality
 */
export default function SoraKeywordsFilterPanel({
  tagStats,
  selectedKeywords,
  onKeywordFilterChange,
  filterMode = "AND",
  onFilterModeChange,
  onClose,
}: KeywordFilterPanelProps): React.JSX.Element {
  const theme = useTheme();
  const { classes } = useStyles();

  return (
    <div className={classes.container}>
      {/* Header row: title, mode toggle, and close button */}
      <div className={classes.header}>
        <Typography variant="subtitle2" className={classes.title}>
          Filter by Keywords
        </Typography>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Mode toggle component */}
          {onFilterModeChange && (
            <SoraKeywordFilterModeToggle
              mode={filterMode}
              onModeChange={onFilterModeChange}
              size="small"
            />
          )}

          {/* Close button */}
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close keyword filter panel"
              style={{ padding: "4px" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Keyword list */}
      <div className={classes.tagList}>
        {tagStats.map(({ keyword, count }) => {
          const isSelected = selectedKeywords.includes(keyword);
          return (
            <Chip
              key={keyword}
              label={`${keyword} (${count})`}
              clickable
              onClick={() => {
                const newKeywords = isSelected
                  ? selectedKeywords.filter((t) => t !== keyword)
                  : [...selectedKeywords, keyword];
                onKeywordFilterChange(newKeywords);
              }}
              variant={isSelected ? "filled" : "outlined"}
              color={isSelected ? "primary" : "default"}
              className={isSelected ? classes.selectedChip : classes.unselectedChip}
              style={{
                backgroundColor: isSelected ? theme.palette.primary.main : "transparent",
                color: isSelected
                  ? theme.palette.primary.contrastText
                  : theme.palette.text.secondary,
                borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
              }}
            />
          );
        })}
        {selectedKeywords.length > 0 && (
          <Chip
            label="Clear All"
            clickable
            onClick={() => {
              onKeywordFilterChange([]);
            }}
            variant="outlined"
            className={classes.clearButton}
          />
        )}
      </div>
    </div>
  );
}
