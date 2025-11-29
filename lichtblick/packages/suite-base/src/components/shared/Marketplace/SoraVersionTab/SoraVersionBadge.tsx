// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Chip, ChipProps } from "@mui/material";

import { StabilityLevel } from "@lichtblick/suite-base/types/soraMarketplaceUI";

/**
 * Badge type for version status
 */
export type BadgeType = "latest" | "installed" | "deprecated" | StabilityLevel;

interface VersionBadgeProps {
  type: BadgeType;
}

interface BadgeConfig {
  label: string;
  color: ChipProps["color"];
  variant: "filled" | "outlined";
}

const badgeConfig: Record<BadgeType, BadgeConfig> = {
  latest: { label: "Latest", color: "primary", variant: "filled" },
  installed: { label: "Installed", color: "success", variant: "filled" },
  stable: { label: "Stable", color: "default", variant: "outlined" },
  beta: { label: "Beta", color: "warning", variant: "outlined" },
  alpha: { label: "Alpha", color: "warning", variant: "outlined" },
  experimental: { label: "Experimental", color: "error", variant: "outlined" },
  deprecated: { label: "Deprecated", color: "error", variant: "outlined" },
};

/**
 * VersionBadge Component
 *
 * Displays a badge indicating version status (Latest, Installed, Stable, etc.)
 */
export function SoraVersionBadge({ type }: VersionBadgeProps): React.ReactElement {
  const config = badgeConfig[type];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant={config.variant}
      style={{ fontWeight: config.variant === "filled" ? 600 : 400 }}
    />
  );
}
