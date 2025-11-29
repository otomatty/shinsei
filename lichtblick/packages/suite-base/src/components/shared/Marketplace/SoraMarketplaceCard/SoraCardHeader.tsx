// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Chip, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { formatVersionForDisplay } from "../utils/soraVersionDisplay";

const useStyles = makeStyles()((theme) => ({
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  headerContent: {
    flexGrow: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: 600,
    fontSize: "1.1rem",
    lineHeight: 1.3,
    marginBottom: "4px",
    color: theme.palette.text.primary,
  },
  metadata: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  metadataText: {
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
  },
  metadataDivider: {
    color: theme.palette.text.disabled,
  },
  installedChip: {
    height: "20px",
    fontWeight: 500,
    fontSize: "0.7rem",
    marginLeft: "8px",
  },
}));

interface CardHeaderProps {
  name: string;
  version?: string;
  publisher?: string;
  installed?: boolean;
  versionsCount: number;
}

/**
 * Card header component (title, version, publisher, installation status)
 */
export default function SoraCardHeader({
  name,
  version,
  publisher,
  installed = false,
  versionsCount,
}: CardHeaderProps): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <div className={classes.header}>
      <div className={classes.headerContent}>
        <Typography variant="h6" component="h3" className={classes.title} title={name}>
          {name}
        </Typography>
        <div className={classes.metadata}>
          {version != undefined && (
            <Typography variant="body2" className={classes.metadataText}>
              {formatVersionForDisplay(version)}
              {versionsCount > 1 && ` (Latest)`}
            </Typography>
          )}
          {publisher && (
            <>
              {version != undefined && <span className={classes.metadataDivider}>•</span>}
              <Typography variant="body2" className={classes.metadataText}>
                {publisher}
              </Typography>
            </>
          )}
          {versionsCount > 1 && (
            <>
              <span className={classes.metadataDivider}>•</span>
              <Typography variant="body2" className={classes.metadataText}>
                {versionsCount} versions available
              </Typography>
            </>
          )}
          {installed && (
            <Chip
              size="small"
              label="Installed"
              color="success"
              variant="filled"
              className={classes.installedChip}
            />
          )}
        </div>
      </div>
    </div>
  );
}
