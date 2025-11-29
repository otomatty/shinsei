// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Button } from "@mui/material";
import DOMPurify from "dompurify";
import { useSnackbar } from "notistack";
import { useCallback, useMemo, useState } from "react";
import { useAsync, useMountedState } from "react-use";

import { Immutable } from "@lichtblick/suite";
import {
  OperationStatus,
  SoraVersionTab,
  VersionDisplayInfo,
} from "@lichtblick/suite-base/components/shared/Marketplace";
import SoraMarketplaceDetailBase from "@lichtblick/suite-base/components/shared/Marketplace/SoraMarketplaceDetailBase";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import {
  ExtensionMarketplaceDetail,
  useExtensionMarketplace,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
import isDesktopApp from "@lichtblick/suite-base/util/isDesktopApp";
import { isValidUrl } from "@lichtblick/suite-base/util/isValidURL";

/**
 * ## ExtensionDetail
 *
 * **Extension detail screen component (new independent implementation)**
 *
 * ### Overview
 * - New implementation independent from ExtensionDetails.tsx
 * - Uses MarketplaceDetailBase to unify common UI
 * - Avoids conflicts during OSS merges
 * - Freely customizable
 *
 * ### Main Features
 * - **Extension Detail Display**: README, CHANGELOG
 * - **Install/Uninstall**: Extension management
 * - **Version Information**: Semantic versioning support
 * - **Security**: SHA256 hash verification
 *
 * ### Differences from ExtensionDetails.tsx
 * - Implementation using MarketplaceDetailBase
 * - More flexible customization possible
 * - Independent implementation path from OSS
 */

interface ExtensionDetailProps {
  installed: boolean;
  extension: Immutable<ExtensionMarketplaceDetail>;
  onClose: () => void;
}

/**
 * Safely retrieve version information as a string
 */
function getVersionString(version: unknown): string {
  if (typeof version === "string") {
    return version;
  }
  if (typeof version === "number") {
    return String(version);
  }
  if (version != undefined && typeof version === "object") {
    if ("version" in version && typeof version.version === "string") {
      return version.version;
    }
    if ("latest" in version && typeof version.latest === "string") {
      return version.latest;
    }
    try {
      return JSON.stringify(version) ?? "[object Object]";
    } catch {
      return "[object Object]";
    }
  }
  return version == undefined ? "unknown" : "[object Object]";
}

export default function SoraExtensionDetail({
  extension,
  onClose,
  installed,
}: Readonly<ExtensionDetailProps>): React.ReactElement {
  const [isInstalled, setIsInstalled] = useState(installed);
  const [operationStatus, setOperationStatus] = useState<OperationStatus>(OperationStatus.IDLE);
  const isMounted = useMountedState();

  // Extension Catalog hooks
  const downloadExtension = useExtensionCatalog((state) => state.downloadExtension);
  const installExtensions = useExtensionCatalog((state) => state.installExtensions);
  const uninstallExtension = useExtensionCatalog((state) => state.uninstallExtension);

  // Marketplace hooks
  const marketplace = useExtensionMarketplace();
  const { enqueueSnackbar } = useSnackbar();
  const analytics = useAnalytics();

  // README and CHANGELOG content
  const readme = extension.readme;
  const changelog = extension.changelog;
  const canInstall = extension.foxe != undefined;
  const canUninstall = extension.namespace !== "org";

  const { value: readmeContent } = useAsync(
    async () =>
      readme != undefined && isValidUrl(readme)
        ? await marketplace.getMarkdown(readme)
        : DOMPurify.sanitize(readme ?? "No readme found."),
    [marketplace, readme],
  );

  const { value: changelogContent } = useAsync(
    async () =>
      changelog != undefined && isValidUrl(changelog)
        ? await marketplace.getMarkdown(changelog)
        : DOMPurify.sanitize(changelog ?? "No changelog found."),
    [marketplace, changelog],
  );

  /**
   * Download and install the extension
   */
  const downloadAndInstall = useCallback(async () => {
    if (!isDesktopApp()) {
      enqueueSnackbar("Download the desktop app to use marketplace extensions.", {
        variant: "error",
      });
      return;
    }

    const url = extension.foxe;
    try {
      if (url == undefined) {
        throw new Error(`Cannot install extension ${extension.id}, "foxe" URL is missing`);
      }
      setOperationStatus(OperationStatus.INSTALLING);
      const buffer = await downloadExtension(url);
      await installExtensions("local", [{ buffer, namespace: "local" }]);
      enqueueSnackbar(`${extension.name} installed successfully`, { variant: "success" });
      if (isMounted()) {
        setIsInstalled(true);
        setOperationStatus(OperationStatus.IDLE);
        void analytics.logEvent(AppEvent.EXTENSION_INSTALL, { type: extension.id });
      }
    } catch (e: unknown) {
      const err = e as Error;
      enqueueSnackbar(`Failed to install extension ${extension.id}. ${err.message}`, {
        variant: "error",
      });
      setOperationStatus(OperationStatus.IDLE);
    }
  }, [
    analytics,
    downloadExtension,
    enqueueSnackbar,
    extension.foxe,
    extension.id,
    installExtensions,
    isMounted,
    extension.name,
  ]);

  /**
   * Uninstall the extension
   */
  const uninstall = useCallback(async () => {
    try {
      setOperationStatus(OperationStatus.UNINSTALLING);
      // UX - Avoid button flickering when operation completes too fast
      await new Promise((resolve) => setTimeout(resolve, 200));
      await uninstallExtension(extension.namespace ?? "local", extension.id);
      enqueueSnackbar(`${extension.name} uninstalled successfully`, { variant: "success" });
      if (isMounted()) {
        setIsInstalled(false);
        setOperationStatus(OperationStatus.IDLE);
        void analytics.logEvent(AppEvent.EXTENSION_UNINSTALL, { type: extension.id });
      }
    } catch (e: unknown) {
      const err = e as Error;
      enqueueSnackbar(`Failed to uninstall extension ${extension.id}. ${err.message}`, {
        variant: "error",
      });
      setOperationStatus(OperationStatus.IDLE);
    }
  }, [
    analytics,
    extension.id,
    extension.namespace,
    isMounted,
    uninstallExtension,
    enqueueSnackbar,
    extension.name,
  ]);

  // Generate action button
  const actionButton = useMemo(() => {
    if (isInstalled && canUninstall) {
      return (
        <Button
          size="small"
          color="inherit"
          variant="contained"
          onClick={uninstall}
          disabled={operationStatus !== OperationStatus.IDLE}
        >
          {operationStatus === OperationStatus.UNINSTALLING ? "Uninstalling..." : "Uninstall"}
        </Button>
      );
    }

    if (canInstall) {
      return (
        <Button
          size="small"
          color="inherit"
          variant="contained"
          onClick={downloadAndInstall}
          disabled={operationStatus !== OperationStatus.IDLE}
        >
          {operationStatus === OperationStatus.INSTALLING ? "Installing..." : "Install"}
        </Button>
      );
    }

    return undefined;
  }, [isInstalled, canUninstall, canInstall, operationStatus, uninstall, downloadAndInstall]);

  // Prepare version data for VERSION tab
  // Note: This is a placeholder implementation showing current version only
  // Future enhancement: Fetch multiple versions from the API
  const versionData: VersionDisplayInfo[] = useMemo(() => {
    const currentVersionInfo: VersionDisplayInfo = {
      version: getVersionString(extension.version),
      publishedDate: extension.time?.[extension.version] ?? new Date().toISOString(),
      downloadUrl: extension.foxe ?? "",
      fileSize: undefined, // Not available in current data structure
      isLatest: true,
      installed: isInstalled,
      deprecated: false,
      stability: "stable", // Default to stable
      minLichtblickVersion: undefined, // Not available in current data structure
      compatible: true, // Assume compatible if no version requirement
      changelog: extension.changelog,
      sha256sum: extension.sha256sum ?? "",
    };

    return [currentVersionInfo];
  }, [extension, isInstalled]);

  const handleInstallVersion = useCallback(
    async (_version: string) => {
      // Install the specified version
      await downloadAndInstall();
    },
    [downloadAndInstall],
  );

  const handleUninstallVersion = useCallback(
    async (_version: string) => {
      // Uninstall the specified version
      await uninstall();
    },
    [uninstall],
  );

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        label: "README",
        content: readmeContent ?? "Loading...",
      },
      {
        label: "CHANGELOG",
        content: changelogContent ?? "Loading...",
      },
      {
        label: "VERSION",
        content: (
          <SoraVersionTab
            versions={versionData}
            onInstall={handleInstallVersion}
            onUninstall={handleUninstallVersion}
            loading={false}
          />
        ),
      },
    ],
    [readmeContent, changelogContent, versionData, handleInstallVersion, handleUninstallVersion],
  );

  return (
    <SoraMarketplaceDetailBase
      title={extension.name}
      onClose={onClose}
      id={extension.id}
      version={getVersionString(extension.version)}
      license={extension.license}
      publisher={extension.publisher}
      description={extension.description}
      homepage={extension.homepage}
      actionButton={actionButton}
      tabs={tabs}
    />
  );
}
