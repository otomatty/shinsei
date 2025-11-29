// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Marketplace tab navigation component
 * Provides tabbed navigation with optional count badges
 */

import { Chip, Tab, Tabs, useTheme } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import type { MarketplaceTab, TabConfig } from "@lichtblick/suite-base/types/soraMarketplaceUI";

const useStyles = makeStyles()((theme) => ({
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginTop: "16px",
  },
  tabs: {
    minHeight: "48px",
  },
  tabLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tabChip: {
    height: "20px",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
}));

export interface MarketplaceTabNavigationProps {
  /** Tab configuration */
  tabs: TabConfig[];
  /** Currently selected tab */
  activeTab: MarketplaceTab;
  /** Tab change handler */
  onTabChange: (tab: MarketplaceTab) => void;
}

/**
 * Tab navigation component for marketplace
 */
export default function SoraMarketplaceTabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: MarketplaceTabNavigationProps): React.JSX.Element {
  const theme = useTheme();
  const { classes } = useStyles();

  if (tabs.length === 0) {
    return <></>;
  }

  return (
    <div className={classes.tabsContainer}>
      <Tabs
        value={activeTab}
        onChange={(_, newValue: MarketplaceTab) => {
          onTabChange(newValue);
        }}
        variant="fullWidth"
        className={classes.tabs}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            value={tab.key}
            label={
              <div className={classes.tabLabel}>
                <span>{tab.label}</span>
                {tab.count != undefined && (
                  <Chip
                    size="small"
                    label={tab.count}
                    variant="filled"
                    color={activeTab === tab.key ? "primary" : "default"}
                    className={classes.tabChip}
                    style={{
                      backgroundColor:
                        activeTab === tab.key
                          ? theme.palette.primary.main
                          : theme.palette.action.hover,
                      color: activeTab === tab.key ? "#ffffff" : theme.palette.text.secondary,
                    }}
                  />
                )}
              </div>
            }
            style={{
              textTransform: "none",
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: "0.9rem",
            }}
          />
        ))}
      </Tabs>
    </div>
  );
}
