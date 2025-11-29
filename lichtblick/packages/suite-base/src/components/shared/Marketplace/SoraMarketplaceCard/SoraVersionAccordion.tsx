// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Version accordion component
 * Displays multiple versions in a collapsible format
 */

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { useState } from "react";
import { makeStyles } from "tss-react/mui";

import { VersionInfo } from "@lichtblick/suite-base/types/soraMarketplaceUI";

import ActionButtons from "./SoraActionButtons";
import { formatVersionForDisplay } from "../utils/soraVersionDisplay";

const useStyles = makeStyles()((theme) => ({
  accordion: {
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    margin: 0,
  },
  accordionSummary: {
    minHeight: "auto",
    padding: "4px 0",
    margin: 0,
  },
  toggleText: {
    color: theme.palette.primary.main,
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  accordionDetails: {
    padding: "0 0 8px 0",
  },
  versionList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  versionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: theme.palette.action.hover,
    borderRadius: "6px",
    border: `1px solid ${theme.palette.divider}`,
  },
  versionInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  versionNumber: {
    fontWeight: 500,
    fontSize: "0.85rem",
    color: theme.palette.text.primary,
  },
  separator: {
    color: theme.palette.text.disabled,
  },
  publishedDate: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
  },
}));

interface VersionAccordionProps {
  versions: VersionInfo[];
  onViewDetails: (version: string) => void;
  onInstall: (version: string) => void;
  onUninstall: (version: string) => void;
  maxShown?: number;
  loading?: boolean;
}

export default function SoraVersionAccordion({
  versions,
  onViewDetails,
  onInstall,
  onUninstall,
  maxShown = 5,
  loading = false,
}: VersionAccordionProps): React.JSX.Element {
  const { classes } = useStyles();
  const [expanded, setExpanded] = useState(false);

  // List of older versions excluding the latest
  const olderVersions = versions.filter((v) => !v.isLatest).slice(0, maxShown);

  if (olderVersions.length === 0) {
    return <></>;
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanced) => {
        setExpanded(isExpanced);
      }}
      elevation={0}
      className={classes.accordion}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
        <Typography variant="body2" className={classes.toggleText}>
          ▼ Show {olderVersions.length} more version{olderVersions.length > 1 ? "s" : ""}
        </Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.accordionDetails}>
        <div className={classes.versionList}>
          {olderVersions.map((version) => (
            <div key={version.version} className={classes.versionItem}>
              <div className={classes.versionInfo}>
                <Typography variant="body2" className={classes.versionNumber}>
                  {formatVersionForDisplay(version.version)}
                </Typography>
                {version.publishedDate && (
                  <>
                    <span className={classes.separator}>•</span>
                    <Typography variant="body2" className={classes.publishedDate}>
                      {new Date(version.publishedDate).toLocaleDateString()}
                    </Typography>
                  </>
                )}
              </div>
              <ActionButtons
                installed={version.installed}
                loading={loading}
                onViewDetails={() => {
                  onViewDetails(version.version);
                }}
                onInstall={() => {
                  onInstall(version.version);
                }}
                onUninstall={() => {
                  onUninstall(version.version);
                }}
                variant="version"
              />
            </div>
          ))}
        </div>
      </AccordionDetails>
    </Accordion>
  );
}
