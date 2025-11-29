// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import { Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";

const useStyles = makeStyles()((theme) => ({
  container: {
    backgroundColor: theme.palette.action.hover,
    border: `1px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    minHeight: 150,
  },
  icon: {
    fontSize: 48,
    color: theme.palette.text.disabled,
    opacity: 0.5,
  },
  text: {
    color: theme.palette.text.disabled,
  },
}));

interface NoImageProps {
  alt?: string;
  showAltText?: boolean;
}

/**
 * NoImage Component
 *
 * Displays a placeholder when an image fails to load or is not available.
 * Shows a broken image icon with optional alternative text.
 *
 * @param alt - Alternative text for the image
 * @param showAltText - Whether to display the alt text below the icon
 */
export default function SoraNoImage({ alt, showAltText = true }: NoImageProps): React.ReactElement {
  const { classes } = useStyles();

  return (
    <Stack className={classes.container} alignItems="center" justifyContent="center" gap={1}>
      <BrokenImageIcon className={classes.icon} />
      {showAltText && alt && (
        <Typography variant="caption" className={classes.text} align="center">
          {alt}
        </Typography>
      )}
      {showAltText && !alt && (
        <Typography variant="caption" className={classes.text} align="center">
          Image not available
        </Typography>
      )}
    </Stack>
  );
}
