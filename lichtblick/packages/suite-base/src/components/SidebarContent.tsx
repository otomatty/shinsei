// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Typography } from "@mui/material";
import { CSSProperties, Fragment, PropsWithChildren } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";

const useStyles = makeStyles()((theme) => ({
  leadingItems: {
    display: "flex",
    alignItems: "center",
    marginLeft: theme.spacing(-1),
    gap: theme.spacing(0.5),
  },
  toolbar: {
    minHeight: 56,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(2, 2, 0, 2),
    gap: theme.spacing(0.5),
  },
}));

/**
 * Props for the SidebarContent component
 */
type SidebarContentProps = {
  /** The title to display in the sidebar header */
  title?: string;
  /** Whether to disable padding around the content area */
  disablePadding?: boolean;
  /** Whether to disable the toolbar completely */
  disableToolbar?: boolean;
  /** Buttons/items to display on the leading (left) side of the header */
  leadingItems?: React.ReactNode[];
  /** Overflow style of root element @default "auto" */
  overflow?: CSSProperties["overflow"];
  /** Buttons/items to display on the trailing (right) side of the header */
  trailingItems?: React.ReactNode[];
};

/**
 * A standardized sidebar content container with optional header toolbar.
 * Provides consistent layout and styling for sidebar panels throughout the application.
 *
 * The component includes:
 * - Optional header toolbar with title and action buttons
 * - Flexible content area with configurable padding
 * - Support for leading (left) and trailing (right) header items
 * - Configurable overflow behavior
 *
 * @component
 * @param props - The component props
 * @returns A React element representing the sidebar content container
 *
 * @example
 * ```tsx
 * <SidebarContent
 *   title="My Panel"
 *   leadingItems={[<BackButton />]}
 *   trailingItems={[<SettingsButton />]}
 * >
 *   <div>Panel content goes here</div>
 * </SidebarContent>
 * ```
 */
export function SidebarContent({
  disablePadding = false,
  disableToolbar = false,
  title,
  children,
  leadingItems,
  overflow = "auto",
  trailingItems,
}: PropsWithChildren<SidebarContentProps>): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <Stack overflow={overflow} fullHeight flex="auto" gap={1}>
      {!disableToolbar && (
        <div className={classes.toolbar}>
          {leadingItems != undefined && (
            <div className={classes.leadingItems}>
              {leadingItems.map((item, i) => (
                <Fragment key={i}>{item}</Fragment>
              ))}
            </div>
          )}
          <Typography component="h2" variant="h4" fontWeight={800} flex="auto">
            {title}
          </Typography>
          {trailingItems != undefined && (
            <Stack direction="row" alignItems="center">
              {trailingItems.map((item, i) => (
                <div key={i}>{item}</div>
              ))}
            </Stack>
          )}
        </div>
      )}
      <Stack flex="auto" {...(!disablePadding && { padding: 2 })}>
        {children}
      </Stack>
    </Stack>
  );
}
