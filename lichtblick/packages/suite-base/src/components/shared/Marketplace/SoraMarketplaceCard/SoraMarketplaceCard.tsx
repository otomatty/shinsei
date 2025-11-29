// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Common marketplace card component
 * Refined design used for both Extensions and Layouts
 */

import { Card, CardContent, Typography } from "@mui/material";
import { ReactNode } from "react";
import { makeStyles } from "tss-react/mui";

import { VersionInfo } from "@lichtblick/suite-base/types/soraMarketplaceUI";

import ActionButtons from "./SoraActionButtons";
import CardHeader from "./SoraCardHeader";
import SoraKeywordsDisplay from "./SoraKeywordsDisplay";
import ThumbnailArea from "./SoraThumbnailArea";
import VersionAccordion from "./SoraVersionAccordion";

const useStyles = makeStyles()((theme) => ({
  card: {
    minHeight: "140px",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.2s ease-in-out",
    border: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: theme.shadows[4],
    },
  },
  cardContent: {
    flexGrow: 1,
    paddingBottom: "8px",
    padding: "16px",
  },
  mainContent: {
    display: "flex",
    gap: "16px",
    position: "relative",
  },
  contentArea: {
    flexGrow: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between", // Separate content and buttons
    gap: "8px",
  },
  contentSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  description: {
    color: theme.palette.text.secondary,
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  customActions: {
    marginTop: "8px",
  },
  actionButtonsArea: {
    // Action buttons area (automatically positioned at the bottom)
  },
  versionSection: {
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    padding: "12px 16px",
  },
}));

export interface MarketplaceCardProps {
  /** Item name */
  name: string;
  /** Version (optional, extensions only) */
  version?: string;
  /** Description */
  description?: string;
  /** Publisher */
  publisher?: string;
  /** Keywords for search and filtering */
  keywords?: string[];
  /** Installation status */
  installed?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Actions */
  onInstall?: (version?: string) => void;
  onUninstall?: (version?: string) => void;
  onViewDetails?: (version?: string) => void;
  /** Icon */
  icon?: ReactNode;
  /** Thumbnail image URL */
  thumbnail?: string;
  /** Custom actions */
  customActions?: ReactNode;
  /** All versions list */
  versions?: VersionInfo[];
  /** Maximum versions shown */
  maxVersionsShown?: number;
  /** Keyword click handler */
  onKeywordClick?: (keyword: string) => void;
  /** Selected keywords */
  selectedKeywords?: string[];
  /** Details/Preview button label (default: "Details") */
  detailsButtonLabel?: string;
}

/**
 * Refined marketplace card
 */
export default function SoraMarketplaceCard({
  name,
  version,
  description,
  publisher,
  keywords = [],
  installed = false,
  loading = false,
  onInstall,
  onUninstall,
  onViewDetails,
  icon,
  thumbnail,
  customActions,
  versions = [],
  maxVersionsShown = 5,
  onKeywordClick,
  selectedKeywords = [],
  detailsButtonLabel,
}: MarketplaceCardProps): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <Card elevation={2} className={classes.card}>
      <CardContent className={classes.cardContent}>
        {/* Main content area */}
        <div className={classes.mainContent}>
          {/* Left side: Thumbnail/Icon */}
          <ThumbnailArea thumbnail={thumbnail} icon={icon} name={name} />

          {/* Right side: Content area (separate content and buttons) */}
          <div className={classes.contentArea}>
            {/* Content section */}
            <div className={classes.contentSection}>
              {/* Header */}
              <CardHeader
                name={name}
                version={version}
                publisher={publisher}
                installed={installed}
                versionsCount={versions.length}
              />

              {/* Description */}
              {description && (
                <Typography variant="body2" className={classes.description}>
                  {description}
                </Typography>
              )}

              {/* Keywords */}
              <SoraKeywordsDisplay
                keywords={keywords}
                selectedKeywords={selectedKeywords}
                onKeywordClick={onKeywordClick}
                maxDisplayed={3}
              />

              {/* Custom actions */}
              {customActions != undefined && (
                <div className={classes.customActions}>{customActions}</div>
              )}
            </div>

            {/* Action buttons area (automatically placed at bottom) */}
            <div className={classes.actionButtonsArea}>
              <ActionButtons
                installed={installed}
                loading={loading}
                onViewDetails={
                  onViewDetails
                    ? () => {
                        onViewDetails();
                      }
                    : undefined
                }
                onInstall={
                  onInstall
                    ? () => {
                        onInstall();
                      }
                    : undefined
                }
                onUninstall={
                  onUninstall
                    ? () => {
                        onUninstall();
                      }
                    : undefined
                }
                variant="main"
                detailsButtonLabel={detailsButtonLabel}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Version accordion section */}
      {versions.length > 1 && (
        <div className={classes.versionSection}>
          <VersionAccordion
            versions={versions}
            onViewDetails={(ver) => onViewDetails?.(ver)}
            onInstall={(ver) => onInstall?.(ver)}
            onUninstall={(ver) => onUninstall?.(ver)}
            maxShown={maxVersionsShown}
            loading={loading}
          />
        </div>
      )}
    </Card>
  );
}
