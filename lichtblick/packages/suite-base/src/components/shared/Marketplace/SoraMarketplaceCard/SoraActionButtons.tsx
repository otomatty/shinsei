// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Action buttons component
 * Unified button set reusable for both main and version rows
 */

import { Button } from "@mui/material";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()(() => ({
  container: {
    display: "flex",
    flexDirection: "row",
    gap: "6px",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  button: {
    minWidth: "60px",
    fontSize: "0.7rem",
    fontWeight: 500,
    textTransform: "none",
    padding: "4px 8px",
  },
  actionButton: {
    minWidth: "70px",
    fontSize: "0.7rem",
    fontWeight: 500,
    textTransform: "none",
    padding: "4px 8px",
  },
}));

interface ActionButtonsProps {
  installed?: boolean;
  loading?: boolean;
  onViewDetails?: () => void;
  onInstall?: () => void;
  onUninstall?: () => void;
  variant?: "main" | "version";
  /** Label for the details/preview button (default: "Details") */
  detailsButtonLabel?: string;
}

export default function SoraActionButtons({
  installed = false,
  loading = false,
  onViewDetails,
  onInstall,
  onUninstall,
  variant: _variant = "main",
  detailsButtonLabel = "Details",
}: ActionButtonsProps): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <div className={classes.container}>
      {onViewDetails && (
        <Button
          size="small"
          onClick={() => {
            onViewDetails();
          }}
          className={classes.button}
        >
          {detailsButtonLabel}
        </Button>
      )}
      {installed
        ? onUninstall && (
            <Button
              size="small"
              variant="outlined"
              onClick={onUninstall}
              disabled={loading}
              color="error"
              className={classes.actionButton}
            >
              {loading ? "..." : "Remove"}
            </Button>
          )
        : onInstall && (
            <Button
              size="small"
              variant="contained"
              onClick={onInstall}
              disabled={loading}
              className={classes.actionButton}
              style={{
                color: "#ffffff",
              }}
            >
              {loading ? "..." : "Install"}
            </Button>
          )}
    </div>
  );
}
