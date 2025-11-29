// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Marketplace filter buttons component
 * Provides keyword filter and advanced search buttons with poppers
 */

import FilterListIcon from "@mui/icons-material/FilterList";
import TuneIcon from "@mui/icons-material/Tune";
import { Badge, ClickAwayListener, Fade, IconButton, Paper, Popper, useTheme } from "@mui/material";
import { useRef, useState } from "react";
import { makeStyles } from "tss-react/mui";

import type {
  KeywordFilterMode,
  KeywordStats,
} from "@lichtblick/suite-base/types/soraMarketplaceUI";

import AdvancedSearchPanel, { type AdvancedSearchOptions } from "../SoraAdvancedSearchPanel";
import KeywordFilterPanel from "./SoraKeywordsFilterPanel/SoraKeywordsFilterPanel";

const useStyles = makeStyles()(() => ({
  badgeStyle: {
    fontSize: "0.7rem",
    height: "18px",
    minWidth: "18px",
    fontWeight: 600,
  },
  iconButton: {
    transition: "background-color 0.2s ease",
  },
  popperContainer: {
    zIndex: 10000,
  },
  tagFilterPaper: {
    padding: "16px",
    borderRadius: "12px",
    minWidth: "400px",
    maxWidth: "600px",
  },
  advancedSearchPaper: {
    padding: "16px",
    borderRadius: "12px",
    minWidth: "500px",
    maxWidth: "700px",
  },
}));

export interface MarketplaceFilterButtonsProps {
  /** Keyword statistics for keyword filter */
  tagStats?: KeywordStats[];
  /** Selected keywords */
  selectedKeywords?: string[];
  /** Keyword filter change handler */
  onKeywordFilterChange?: (keywords: string[]) => void;
  /** Keyword filter mode (AND/OR) */
  keywordFilterMode?: KeywordFilterMode;
  /** Keyword filter mode change handler */
  onKeywordFilterModeChange?: (mode: KeywordFilterMode) => void;
  /** Enable advanced search */
  enableAdvancedSearch?: boolean;
  /** Advanced search options */
  advancedSearchOptions?: AdvancedSearchOptions;
  /** Advanced search options change handler */
  onAdvancedSearchChange?: (options: AdvancedSearchOptions) => void;
  /** Available publishers list */
  availablePublishers?: string[];
}

/**
 * Filter buttons with keyword filter and advanced search
 */
export default function SoraMarketplaceFilterButtons({
  tagStats = [],
  selectedKeywords = [],
  onKeywordFilterChange,
  keywordFilterMode = "AND",
  onKeywordFilterModeChange,
  enableAdvancedSearch = false,
  advancedSearchOptions = {},
  onAdvancedSearchChange,
  availablePublishers = [],
}: MarketplaceFilterButtonsProps): React.JSX.Element {
  const theme = useTheme();
  const { classes } = useStyles();
  const [showKeywordFilter, setShowKeywordFilter] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isHoveringKeywordFilter, setIsHoveringKeywordFilter] = useState(false);
  const [isHoveringAdvancedSearch, setIsHoveringAdvancedSearch] = useState(false);

  // Reference to anchor element for Popper
  // eslint-disable-next-line no-restricted-syntax
  const tagFilterButtonRef = useRef<HTMLButtonElement>(null);
  // eslint-disable-next-line no-restricted-syntax
  const advancedSearchButtonRef = useRef<HTMLButtonElement>(null);

  const handleCloseKeywordFilter = () => {
    setShowKeywordFilter(false);
  };

  const handleCloseAdvancedSearch = () => {
    setShowAdvancedSearch(false);
  };

  return (
    <>
      {/* Keyword filter button */}
      {tagStats.length > 0 && (
        <Badge
          badgeContent={selectedKeywords.length}
          color="primary"
          invisible={selectedKeywords.length === 0}
          componentsProps={{
            badge: {
              className: classes.badgeStyle,
            },
          }}
        >
          <IconButton
            ref={tagFilterButtonRef}
            onClick={() => {
              setShowKeywordFilter(!showKeywordFilter);
            }}
            onMouseEnter={() => {
              setIsHoveringKeywordFilter(true);
            }}
            onMouseLeave={() => {
              setIsHoveringKeywordFilter(false);
            }}
            className={classes.iconButton}
            style={{
              backgroundColor: showKeywordFilter
                ? theme.palette.primary.main + "15"
                : isHoveringKeywordFilter
                  ? theme.palette.action.selected
                  : theme.palette.action.hover,
              color: showKeywordFilter ? theme.palette.primary.main : theme.palette.text.secondary,
            }}
            title="Filter by keywords"
          >
            <FilterListIcon />
          </IconButton>
        </Badge>
      )}

      {/* Advanced search button */}
      {enableAdvancedSearch && (
        <IconButton
          ref={advancedSearchButtonRef}
          onClick={() => {
            setShowAdvancedSearch(!showAdvancedSearch);
          }}
          onMouseEnter={() => {
            setIsHoveringAdvancedSearch(true);
          }}
          onMouseLeave={() => {
            setIsHoveringAdvancedSearch(false);
          }}
          className={classes.iconButton}
          style={{
            backgroundColor: showAdvancedSearch
              ? theme.palette.primary.main + "15"
              : isHoveringAdvancedSearch
                ? theme.palette.action.selected
                : theme.palette.action.hover,
            color: showAdvancedSearch ? theme.palette.primary.main : theme.palette.text.secondary,
          }}
          title="Advanced search options"
        >
          <TuneIcon />
        </IconButton>
      )}

      {/* Keyword filter - Popper */}
      <Popper
        open={showKeywordFilter && tagStats.length > 0 && onKeywordFilterChange != undefined}
        anchorEl={tagFilterButtonRef.current}
        placement="bottom-end"
        transition
        className={classes.popperContainer}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper elevation={8} className={classes.tagFilterPaper}>
              <ClickAwayListener onClickAway={handleCloseKeywordFilter}>
                <div>
                  <KeywordFilterPanel
                    tagStats={tagStats}
                    selectedKeywords={selectedKeywords}
                    onKeywordFilterChange={onKeywordFilterChange ?? (() => {})}
                    filterMode={keywordFilterMode}
                    onFilterModeChange={onKeywordFilterModeChange}
                    onClose={handleCloseKeywordFilter}
                  />
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>

      {/* Advanced search options - Popper */}
      <Popper
        open={showAdvancedSearch && enableAdvancedSearch && onAdvancedSearchChange != undefined}
        anchorEl={advancedSearchButtonRef.current}
        placement="bottom-end"
        transition
        className={classes.popperContainer}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper elevation={8} className={classes.advancedSearchPaper}>
              <ClickAwayListener onClickAway={handleCloseAdvancedSearch}>
                <div>
                  <AdvancedSearchPanel
                    options={advancedSearchOptions}
                    onOptionsChange={onAdvancedSearchChange ?? (() => {})}
                    availablePublishers={availablePublishers}
                    onClose={handleCloseAdvancedSearch}
                  />
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}
