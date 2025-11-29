// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Chip, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  keyword: {
    height: "22px",
    fontSize: "0.7rem",
    cursor: "pointer",
  },
  tagOutlined: {
    borderColor: theme.palette.divider,
    color: theme.palette.text.secondary,
    backgroundColor: "transparent",
  },
  tagFilled: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
  },
  tagMore: {
    height: "22px",
    fontSize: "0.7rem",
    borderColor: theme.palette.divider,
    color: theme.palette.text.secondary,
    cursor: "pointer",
  },
  tooltipKeyword: {
    height: "20px",
    fontSize: "0.65rem",
    cursor: "pointer",
  },
  tooltipKeywordContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    margin: "4px",
  },
  tooltipKeywordOutlined: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderColor: theme.palette.divider,
  },
  tooltipKeywordFilled: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderColor: theme.palette.primary.main,
  },
}));

interface KeywordsDisplayProps {
  keywords: string[];
  selectedKeywords?: string[];
  onKeywordClick?: (keyword: string) => void;
  maxDisplayed?: number;
}

/**
 * Keywords display component
 */
export default function SoraKeywordsDisplay({
  keywords,
  selectedKeywords = [],
  onKeywordClick,
  maxDisplayed = 3,
}: KeywordsDisplayProps): React.JSX.Element {
  const { classes, cx } = useStyles();

  if (keywords.length === 0) {
    return <></>;
  }

  // If there are only maxDisplayed + 1 keywords (e.g., 4 keywords when maxDisplayed is 3),
  // display all keywords instead of showing "+ 1 more"
  const shouldShowAll = keywords.length === maxDisplayed + 1;
  const displayedKeywords = shouldShowAll ? keywords : keywords.slice(0, maxDisplayed);
  const remainingKeywords = shouldShowAll ? [] : keywords.slice(maxDisplayed);

  return (
    <div className={classes.tagsContainer}>
      {displayedKeywords.map((keyword) => {
        const isSelected = selectedKeywords.includes(keyword);
        return (
          <Chip
            key={keyword}
            size="small"
            label={keyword}
            variant={isSelected ? "filled" : "outlined"}
            color={isSelected ? "primary" : "default"}
            clickable={onKeywordClick != undefined}
            onClick={
              onKeywordClick
                ? (e) => {
                    e.stopPropagation();
                    onKeywordClick(keyword);
                  }
                : undefined
            }
            className={cx(classes.keyword, isSelected ? classes.tagFilled : classes.tagOutlined)}
          />
        );
      })}
      {remainingKeywords.length > 0 && (
        <Tooltip
          title={
            <div className={classes.tooltipKeywordContainer}>
              {remainingKeywords.map((keyword) => {
                const isSelected = selectedKeywords.includes(keyword);
                return (
                  <Chip
                    key={keyword}
                    size="small"
                    label={keyword}
                    variant={isSelected ? "filled" : "outlined"}
                    color={isSelected ? "primary" : "default"}
                    clickable={onKeywordClick != undefined}
                    onClick={
                      onKeywordClick
                        ? (e) => {
                            e.stopPropagation();
                            onKeywordClick(keyword);
                          }
                        : undefined
                    }
                    className={cx(
                      classes.tooltipKeyword,
                      isSelected ? classes.tooltipKeywordFilled : classes.tooltipKeywordOutlined,
                    )}
                  />
                );
              })}
            </div>
          }
          arrow
          placement="top"
        >
          <Chip
            size="small"
            label={`+${remainingKeywords.length} more`}
            variant={
              remainingKeywords.some((keyword) => selectedKeywords.includes(keyword))
                ? "filled"
                : "outlined"
            }
            color={
              remainingKeywords.some((keyword) => selectedKeywords.includes(keyword))
                ? "primary"
                : "default"
            }
            className={cx(
              classes.tagMore,
              remainingKeywords.some((keyword) => selectedKeywords.includes(keyword))
                ? classes.tagFilled
                : classes.tagOutlined,
            )}
          />
        </Tooltip>
      )}
    </div>
  );
}
