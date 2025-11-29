// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Keyword Filter Mode Toggle Component
 * ToggleButton UI for switching between AND/OR search modes
 */

import { ToggleButton, ToggleButtonGroup, useTheme } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import type { KeywordFilterMode } from "@lichtblick/suite-base/types/soraMarketplaceUI";

const useStyles = makeStyles()((theme) => ({
  toggleButtonGroup: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "8px",
  },
  toggleButton: {
    padding: "4px 12px",
    fontSize: "0.75rem",
    border: "none",
  },
  toggleButtonFirst: {
    borderRadius: "6px 0 0 6px",
  },
  toggleButtonLast: {
    borderRadius: "0 6px 6px 0",
  },
}));

export interface KeywordFilterModeToggleProps {
  /** Current filter mode */
  mode: KeywordFilterMode;
  /** Mode change handler */
  onModeChange: (mode: KeywordFilterMode) => void;
  /** Component size */
  size?: "small" | "medium" | "large";
  /** Disabled flag */
  disabled?: boolean;
}

/**
 * Keyword Filter Mode Toggle Component
 * Switches between AND search (match all) and OR search (match any)
 */
export default function SoraKeywordsFilterModeToggle({
  mode,
  onModeChange,
  size = "small",
  disabled = false,
}: KeywordFilterModeToggleProps): React.JSX.Element {
  const theme = useTheme();
  const { classes, cx } = useStyles();

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    // eslint-disable-next-line no-restricted-syntax
    newMode: KeywordFilterMode | null,
  ) => {
    // Don't change if null (keep at least one selected)
    // eslint-disable-next-line no-restricted-syntax
    if (newMode != null) {
      onModeChange(newMode);
    }
  };

  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={handleModeChange}
      size={size}
      disabled={disabled}
      className={classes.toggleButtonGroup}
    >
      <ToggleButton
        value="AND"
        title="Match all selected keywords"
        className={cx(classes.toggleButton, classes.toggleButtonFirst)}
        style={{
          fontWeight: mode === "AND" ? 600 : 400,
          color: mode === "AND" ? theme.palette.primary.main : theme.palette.text.secondary,
        }}
      >
        AND
      </ToggleButton>
      <ToggleButton
        value="OR"
        title="Match any selected keyword"
        className={cx(classes.toggleButton, classes.toggleButtonLast)}
        style={{
          fontWeight: mode === "OR" ? 600 : 400,
          color: mode === "OR" ? theme.palette.primary.main : theme.palette.text.secondary,
        }}
      >
        OR
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
