// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Typography } from "@mui/material";
import { ReactNode, ReactElement } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";

const useStyles = makeStyles()((theme) => ({
  root: {
    whiteSpace: "pre-line",

    code: {
      color: theme.palette.primary.main,
      background: "transparent",
      padding: 0,
    },
  },
}));

/**
 * Props for the EmptyState component
 */
type EmptyStateProps = {
  /** Content to display in the empty state */
  children: ReactNode;
  /** Optional CSS class name for styling */
  className?: string;
};

/**
 * A component that displays an empty state message centered on the screen.
 * Used to show messages when there's no data or content to display.
 *
 * @component
 * @example
 * ```tsx
 * <EmptyState>
 *   No data available
 * </EmptyState>
 * ```
 */
export default function EmptyState({ children, className }: EmptyStateProps): ReactElement {
  const { classes, cx } = useStyles();

  return (
    <Stack
      className={cx(classes.root, className)}
      flex="auto"
      alignItems="center"
      justifyContent="center"
      fullHeight
      paddingX={1}
    >
      <Typography variant="body2" color="text.secondary" lineHeight={1.4} align="center">
        {children}
      </Typography>
    </Stack>
  );
}
