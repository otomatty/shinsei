// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Button, Divider, Tab, Tabs, Typography } from "@mui/material";
import { ReactNode, useState } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";
import TextContent from "@lichtblick/suite-base/components/TextContent";

const useStyles = makeStyles()((theme) => ({
  backButton: {
    marginLeft: theme.spacing(-1.5),
    marginBottom: theme.spacing(2),
  },
  actionButton: {
    minWidth: 100,
  },
  idLink: {
    cursor: "pointer",
  },
  headerSection: {
    marginBottom: theme.spacing(3),
  },
  infoSection: {
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  metadataRow: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap",
  },
  metadataDivider: {
    color: theme.palette.text.disabled,
  },
  tabsContainer: {
    marginBottom: theme.spacing(2),
  },
  tabContent: {
    maxWidth: "100%",
    overflowX: "auto",
  },
}));

/**
 * ## MarketplaceDetailBase
 *
 * **Common base component for marketplace detail screens**
 *
 * ### Overview
 * - Base component that can be commonly used for extension and layout detail screens
 * - Provides common UI such as header, tabs, and action buttons
 * - Individual implementations can be customized through slots
 *
 * ### Main Features
 * - **Header**: Title, back button
 * - **Basic Information Display**: ID, version, license, description
 * - **Tab UI**: README, CHANGELOG, and other tabs
 * - **Action Area**: Install/Uninstall buttons
 * - **Custom Content**: Flexible extension through slots
 */

interface TabConfig {
  label: string;
  content: ReactNode;
}

export interface MarketplaceDetailBaseProps {
  // Header information
  title: string;
  onClose: () => void;

  // Basic information
  id: string;
  version: string;
  license?: string;
  publisher: string;
  description: string;
  homepage?: string;

  // Action button
  actionButton?: ReactNode;

  // Custom content (displayed below basic information)
  extraInfoContent?: ReactNode;

  // Tab configuration
  tabs: TabConfig[];
  defaultTab?: number;

  // Style customization
  className?: string;
}

/**
 * MarketplaceDetailBase Component
 *
 * Base component that can be commonly used for extension and layout detail screens.
 * Provides common UI patterns and individual implementations can be customized through props.
 */
export default function SoraMarketplaceDetailBase({
  title,
  onClose,
  id,
  version,
  license,
  publisher,
  description,
  homepage,
  actionButton,
  extraInfoContent,
  tabs,
  defaultTab = 0,
  className,
}: MarketplaceDetailBaseProps): React.ReactElement {
  const { classes } = useStyles();
  const [activeTab, setActiveTab] = useState<number>(defaultTab);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Stack fullHeight flex="auto" gap={2} className={className}>
      {/* Header Section */}
      <div className={classes.headerSection}>
        <Button
          className={classes.backButton}
          onClick={onClose}
          size="small"
          startIcon={<ChevronLeftIcon />}
        >
          Back
        </Button>
        <Typography variant="h3" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          by {publisher}
        </Typography>
      </div>

      {/* Basic Information Section */}
      <div className={classes.infoSection}>
        <Stack gap={2} alignItems="flex-start">
          <div className={classes.metadataRow}>
            {homepage ? (
              <Typography
                variant="body2"
                color="primary"
                component="a"
                href={homepage}
                target="_blank"
                className={classes.idLink}
                style={{ textDecoration: "underline" }}
              >
                {id}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {id}
              </Typography>
            )}
            <span className={classes.metadataDivider}>•</span>
            <Typography variant="body2" color="text.secondary">
              v{version}
            </Typography>
            {license && (
              <>
                <span className={classes.metadataDivider}>•</span>
                <Typography variant="body2" color="text.secondary">
                  {license}
                </Typography>
              </>
            )}
          </div>

          <Typography variant="body1" color="text.primary">
            {description}
          </Typography>

          {/* Extra Info Content (e.g., thumbnails, keywords, downloads) */}
          {extraInfoContent}

          {/* Action Button */}
          {actionButton != undefined && <div className={classes.actionButton}>{actionButton}</div>}
        </Stack>
      </div>

      {/* Tabs Section */}
      <div className={classes.tabsContainer}>
        <Tabs textColor="inherit" value={activeTab} onChange={handleTabChange}>
          {tabs.map((tab, index) => (
            <Tab key={index} disableRipple label={tab.label} value={index} />
          ))}
        </Tabs>
        <Divider />
      </div>

      {/* Tab Content */}
      <Stack flex="auto" className={classes.tabContent}>
        {tabs.map((tab, index) => (
          <div key={index} style={{ display: activeTab === index ? "block" : "none" }}>
            {typeof tab.content === "string" ? (
              <TextContent>{tab.content}</TextContent>
            ) : (
              tab.content
            )}
          </div>
        ))}
      </Stack>
    </Stack>
  );
}
