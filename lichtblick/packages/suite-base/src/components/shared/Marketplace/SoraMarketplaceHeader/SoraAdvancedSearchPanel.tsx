// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Advanced search options panel component
 * Provides detailed search and sort functionality for the marketplace
 */

import CloseIcon from "@mui/icons-material/Close";
import { Button, Grid, IconButton, Typography } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { makeStyles } from "tss-react/mui";

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
    marginBottom: "16px",
  },
  title: {
    color: theme.palette.text.primary,
    fontWeight: 600,
  },
  buttonContainer: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
  },
  clearButton: {
    color: theme.palette.error.main,
  },
  // CustomSelect styles
  selectContainer: {
    position: "relative",
    width: "100%",
  },
  selectLabel: {
    display: "block",
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginBottom: "4px",
    fontWeight: 500,
  },
  selectButton: {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "4px",
    color: theme.palette.text.primary,
    fontSize: "0.875rem",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: theme.palette.primary.main,
    },
  },
  selectButtonText: {
    color: theme.palette.text.primary,
  },
  selectButtonTextPlaceholder: {
    color: theme.palette.text.disabled,
  },
  selectArrow: {
    transition: "transform 0.2s",
  },
  selectArrowOpen: {
    transform: "rotate(180deg)",
  },
  selectArrowClosed: {
    transform: "rotate(0deg)",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: "4px",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "4px",
    boxShadow: theme.shadows[8],
    zIndex: 10000,
    maxHeight: "300px",
    overflowY: "auto",
  },
  dropdownOption: {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: theme.palette.background.paper,
    border: "none",
    color: theme.palette.text.primary,
    fontSize: "0.875rem",
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  dropdownOptionSelected: {
    backgroundColor: theme.palette.action.selected,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
}));

export type SortOrder =
  | "name-asc"
  | "name-desc"
  | "date-asc"
  | "date-desc"
  | "publisher-asc"
  | "publisher-desc";

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  label?: string;
}

/**
 * Custom select box component
 * Implements scroll support while avoiding z-index issues
 */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "選択してください",
  label,
}: CustomSelectProps): React.JSX.Element {
  const { classes, cx } = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  // eslint-disable-next-line no-restricted-syntax
  const selectRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // eslint-disable-next-line no-restricted-syntax
      if (selectRef.current != null && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }

    return undefined;
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={selectRef} className={classes.selectContainer}>
      {label != undefined && <label className={classes.selectLabel}>{label}</label>}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className={classes.selectButton}
      >
        <span
          className={
            selectedOption != undefined
              ? classes.selectButtonText
              : classes.selectButtonTextPlaceholder
          }
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <span
          className={cx(
            classes.selectArrow,
            isOpen ? classes.selectArrowOpen : classes.selectArrowClosed,
          )}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div className={classes.dropdown}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cx(
                classes.dropdownOption,
                option.value === value && classes.dropdownOptionSelected,
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface AdvancedSearchOptions {
  /** Publisher filter */
  publisherFilter?: string;
  /** Sort order */
  sortOrder?: SortOrder;
}

export interface AdvancedSearchPanelProps {
  /** Advanced search options */
  options: AdvancedSearchOptions;
  /** Advanced search options change handler */
  onOptionsChange: (options: AdvancedSearchOptions) => void;
  /** Available publishers list */
  availablePublishers: string[];
  /** Close panel handler */
  onClose?: () => void;
}

/**
 * Advanced search options panel
 * Provides publisher filter and sort functionality
 */
export default function SoraAdvancedSearchPanel({
  options,
  onOptionsChange,
  availablePublishers,
  onClose,
}: AdvancedSearchPanelProps): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <Typography variant="subtitle2" className={classes.title}>
          Advanced Search Options
        </Typography>
        {onClose && (
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close advanced search panel"
            style={{ padding: "4px" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </div>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <CustomSelect
            label="Publisher"
            value={options.publisherFilter ?? ""}
            onChange={(value) => {
              onOptionsChange({
                ...options,
                publisherFilter: value !== "" ? value : undefined,
              });
            }}
            options={[
              { value: "", label: "All Publishers" },
              ...availablePublishers.map((publisher: string) => ({
                value: publisher,
                label: publisher,
              })),
            ]}
            placeholder="Select publisher"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CustomSelect
            label="Sort by"
            value={options.sortOrder ?? "name-asc"}
            onChange={(value) => {
              onOptionsChange({
                ...options,
                sortOrder: value as SortOrder,
              });
            }}
            options={[
              { value: "name-asc", label: "Name (A-Z)" },
              { value: "name-desc", label: "Name (Z-A)" },
              { value: "publisher-asc", label: "Publisher (A-Z)" },
              { value: "publisher-desc", label: "Publisher (Z-A)" },
              { value: "date-desc", label: "Newest First" },
              { value: "date-asc", label: "Oldest First" },
            ]}
            placeholder="Select sort order"
          />
        </Grid>
      </Grid>
      <div className={classes.buttonContainer}>
        <Button
          size="small"
          onClick={() => {
            onOptionsChange({});
          }}
          className={classes.clearButton}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}
