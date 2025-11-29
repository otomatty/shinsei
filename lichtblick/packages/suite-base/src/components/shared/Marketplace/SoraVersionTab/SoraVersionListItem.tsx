// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Alert, Button, Checkbox, CircularProgress, Paper, Typography } from "@mui/material";
import { useState } from "react";
import { makeStyles } from "tss-react/mui";

import { VersionDisplayInfo } from "@lichtblick/suite-base/types/soraMarketplaceUI";

import { formatDate } from "../utils";
import { SoraVersionBadge } from "./SoraVersionBadge";

const useStyles = makeStyles()((theme) => ({
  versionCard: {
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1.5),
  },
  versionInfo: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
  },
  checkbox: {
    padding: 0,
  },
  versionNumber: {
    fontWeight: 600,
  },
  badges: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(5),
  },
  compatibilityRow: {
    display: "flex",
    gap: theme.spacing(2),
    flexWrap: "wrap",
  },
  deprecationWarning: {
    marginLeft: theme.spacing(5),
    marginBottom: theme.spacing(1.5),
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    marginLeft: theme.spacing(5),
  },
}));

interface VersionListItemProps {
  version: VersionDisplayInfo;
  onInstall: () => Promise<void>;
  onUninstall: () => Promise<void>;
  onViewChangelog?: () => void;
}

/**
 * VersionListItem Component
 *
 * Displays individual version information with install/uninstall actions
 */
export default function SoraVersionListItem({
  version,
  onInstall,
  onUninstall,
  onViewChangelog,
}: VersionListItemProps): React.ReactElement {
  const { classes } = useStyles();
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    setUninstalling(true);
    try {
      await onUninstall();
    } finally {
      setUninstalling(false);
    }
  };

  const isProcessing = installing || uninstalling;

  return (
    <Paper className={classes.versionCard} elevation={1}>
      {/* Header row */}
      <div className={classes.header}>
        <div className={classes.versionInfo}>
          <Checkbox checked={version.installed} disabled className={classes.checkbox} />
          <Typography variant="h6" className={classes.versionNumber}>
            v{version.version}
          </Typography>

          {/* Badges */}
          <div className={classes.badges}>
            {version.isLatest && <SoraVersionBadge type="latest" />}
            <SoraVersionBadge type={version.stability} />
            {version.installed && <SoraVersionBadge type="installed" />}
            {version.deprecated && <SoraVersionBadge type="deprecated" />}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className={classes.details}>
        <Typography variant="body2" color="text.secondary">
          Published: {formatDate(version.publishedDate)}
        </Typography>

        <div className={classes.compatibilityRow}>
          {version.minLichtblickVersion && (
            <Typography variant="body2" color={version.compatible ? "text.secondary" : "error"}>
              {version.compatible ? "Compatible" : "Incompatible"} with Lichtblick{" "}
              {version.minLichtblickVersion}+
            </Typography>
          )}
        </div>
      </div>

      {/* Deprecation warning */}
      {version.deprecated && (
        <Alert severity="warning" className={classes.deprecationWarning}>
          ⚠️ This version is deprecated. Consider upgrading to a newer version.
        </Alert>
      )}

      {/* Action buttons */}
      <div className={classes.actions}>
        {onViewChangelog && version.changelog && (
          <Button size="small" variant="text" onClick={onViewChangelog} disabled={isProcessing}>
            View Changelog
          </Button>
        )}

        {version.installed ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleUninstall}
            disabled={uninstalling || !version.compatible}
            startIcon={uninstalling ? <CircularProgress size={16} /> : undefined}
          >
            {uninstalling ? "Uninstalling..." : "Uninstall"}
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            onClick={handleInstall}
            disabled={installing || !version.compatible}
            startIcon={installing ? <CircularProgress size={16} /> : undefined}
          >
            {installing ? "Installing..." : "Install"}
          </Button>
        )}
      </div>
    </Paper>
  );
}
