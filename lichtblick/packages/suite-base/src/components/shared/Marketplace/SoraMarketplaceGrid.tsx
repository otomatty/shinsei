// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Common marketplace grid component
 * Displays cards in a responsive grid layout
 */

import { ReactNode } from "react";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles<{ minColumnWidth: number; gap: number }>()(
  (_theme, { minColumnWidth, gap }) => ({
    grid: {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))`,
      gap: `${gap}px`,
      padding: "4px", // For card hover effect
    },
  }),
);

export interface MarketplaceGridProps {
  /** Grid items */
  children: ReactNode;
  /** Minimum column width */
  minColumnWidth?: number;
  /** Gap size */
  gap?: number;
}

/**
 * Responsive marketplace grid
 */
export default function SoraMarketplaceGrid({
  children,
  minColumnWidth = 340,
  gap = 20,
}: MarketplaceGridProps): React.JSX.Element {
  const { classes } = useStyles({ minColumnWidth, gap });

  return <div className={classes.grid}>{children}</div>;
}
