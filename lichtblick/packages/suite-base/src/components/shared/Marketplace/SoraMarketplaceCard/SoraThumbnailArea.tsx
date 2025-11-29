// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Typography } from "@mui/material";
import { useState } from "react";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  thumbnailArea: {
    width: "136px",
    height: "136px",
    minWidth: "136px",
    minHeight: "136px",
    flexShrink: 0,
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: theme.palette.action.hover,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${theme.palette.divider}`,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  thumbnailIcon: {
    color: theme.palette.primary.main,
    fontSize: "32px",
  },
  thumbnailPlaceholder: {
    color: theme.palette.text.secondary,
    fontSize: "10px",
    textAlign: "center",
    padding: "4px",
    lineHeight: 1.2,
  },
}));

interface ThumbnailAreaProps {
  thumbnail?: string;
  icon?: React.ReactNode;
  name: string;
}

/**
 * Thumbnail display area component
 */
export default function SoraThumbnailArea({
  thumbnail,
  icon,
  name,
}: ThumbnailAreaProps): React.JSX.Element {
  const { classes } = useStyles();
  const [imageError, setImageError] = useState(false);

  const hasValidThumbnail = thumbnail != undefined && !imageError;

  return (
    <div className={classes.thumbnailArea}>
      {hasValidThumbnail ? (
        <img
          src={thumbnail}
          alt={name}
          className={classes.thumbnailImage}
          onError={() => {
            setImageError(true);
          }}
        />
      ) : icon != undefined ? (
        <div className={classes.thumbnailIcon}>{icon}</div>
      ) : (
        <Typography variant="caption" className={classes.thumbnailPlaceholder}>
          No Image
        </Typography>
      )}
    </div>
  );
}
