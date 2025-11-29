// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { CircularProgress, Typography } from "@mui/material";
import { useMemo } from "react";

import Stack from "@lichtblick/suite-base/components/Stack";
import { VersionDisplayInfo } from "@lichtblick/suite-base/types/soraMarketplaceUI";

import VersionListItem from "./SoraVersionListItem";
import { sortVersionsByDate } from "../utils";

export interface VersionTabProps {
  // Version information
  versions: VersionDisplayInfo[];

  // Callbacks
  onInstall: (version: string) => Promise<void>;
  onUninstall: (version: string) => Promise<void>;
  onViewChangelog?: (version: string) => void;

  // State
  loading?: boolean;
  error?: Error;
}

/**
 * VersionTab Component
 *
 * Main component for displaying version list in VERSION tab
 */
export default function SoraVersionTab({
  versions,
  onInstall,
  onUninstall,
  onViewChangelog,
  loading = false,
  error,
}: VersionTabProps): React.ReactElement {
  // Sort versions by published date (newest first)
  const sortedVersions = useMemo(() => {
    return sortVersionsByDate(versions);
  }, [versions]);

  if (loading) {
    return (
      <Stack fullHeight flex="auto" alignItems="center" justifyContent="center">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" marginTop={2}>
          Loading versions...
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack fullHeight flex="auto" alignItems="center" justifyContent="center">
        <Typography variant="body1" color="error">
          Failed to load versions
        </Typography>
        <Typography variant="body2" color="text.secondary" marginTop={1}>
          {error.message}
        </Typography>
      </Stack>
    );
  }

  if (sortedVersions.length === 0) {
    return (
      <Stack fullHeight flex="auto" alignItems="center" justifyContent="center">
        <Typography variant="body1" color="text.secondary">
          No versions available
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack flex="auto" gap={2} paddingY={1}>
      {sortedVersions.map((version) => (
        <VersionListItem
          key={version.version}
          version={version}
          onInstall={async () => {
            await onInstall(version.version);
          }}
          onUninstall={async () => {
            await onUninstall(version.version);
          }}
          onViewChangelog={
            onViewChangelog
              ? () => {
                  onViewChangelog(version.version);
                }
              : undefined
          }
        />
      ))}
    </Stack>
  );
}
