// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Marketplace title section component
 * Displays the title, subtitle, icon, and optional actions
 */

import { Typography, useTheme } from "@mui/material";
import { ReactNode } from "react";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()(() => ({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  iconContainer: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: 700,
    fontSize: "1.75rem",
    lineHeight: 1.2,
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "1rem",
  },
}));

export interface MarketplaceTitleSectionProps {
  /** Title text */
  title: string;
  /** Subtitle text (optional) */
  subtitle?: string;
  /** Icon element (optional) */
  icon?: ReactNode;
  /** Custom action elements (optional) */
  actions?: ReactNode;
}

/**
 * Marketplace title section component
 */
export default function SoraMarketplaceTitleSection({
  title,
  subtitle,
  icon,
  actions,
}: MarketplaceTitleSectionProps): React.JSX.Element {
  const theme = useTheme();
  const { classes } = useStyles();

  return (
    <div className={classes.container}>
      <div className={classes.leftSection}>
        {icon != undefined && (
          <div
            className={classes.iconContainer}
            style={{
              backgroundColor: theme.palette.primary.main + "15",
              color: theme.palette.primary.main,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <Typography
            variant="h4"
            component="h1"
            className={classes.title}
            style={{
              color: theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              className={classes.subtitle}
              style={{
                color: theme.palette.text.secondary,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </div>
      </div>
      {actions != undefined && <div>{actions}</div>}
    </div>
  );
}
