// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ExtensionIcon from "@mui/icons-material/Extension";
import { useSnackbar } from "notistack";
import { useMemo, useState, useCallback } from "react";

import Log from "@lichtblick/log";
import useExtensionSettings from "@lichtblick/suite-base/components/ExtensionsSettings/hooks/useExtensionSettings";
import ExtensionDetail from "@lichtblick/suite-base/components/SoraExtensionsMarketplaceSettings/SoraExtensionDetail";
import Stack from "@lichtblick/suite-base/components/Stack";
import {
  SoraMarketplaceCard,
  SoraMarketplaceGrid,
  SoraMarketplaceHeader,
  VersionInfo,
  useSoraMarketplaceSearch,
} from "@lichtblick/suite-base/components/shared/Marketplace";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import {
  ExtensionMarketplaceDetail,
  useExtensionMarketplace,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import { useSoraMarketplaceActions } from "@lichtblick/suite-base/hooks/marketplace/useSoraMarketplaceActions";
import {
  useSoraOperationStatus,
  OperationStatus,
} from "@lichtblick/suite-base/hooks/marketplace/useSoraOperationStatus";
import { useGroupedExtensionsByVersion } from "@lichtblick/suite-base/hooks/marketplace/useSoraProcessedExtensions";
import { useSoraInstalledExtensions } from "@lichtblick/suite-base/hooks/useSoraInstalledExtensions";
import isDesktopApp from "@lichtblick/suite-base/util/isDesktopApp";
import {
  toVersionedId,
  extractBaseId,
} from "@lichtblick/suite-base/util/marketplace/soraExtensionIdUtils";

const log = Log.getLogger(__filename);

interface ExtensionWithVersions {
  extensionId: string;
  versionedId: string;
  name: string;
  description: string;
  publisher: string;
  latestVersion: string;
  keywords: readonly string[];
  installed: boolean;
  homepage?: string;
  license?: string;
  namespace?: string;
  versions: VersionInfo[];
  totalVersions: number;
  readme?: string;
  changelog?: string;
}

export default function SoraExtensionsMarketplaceSettings(): React.ReactElement {
  const [focusedExtension, setFocusedExtension] = useState<
    | {
        installed: boolean;
        extension: ExtensionMarketplaceDetail;
      }
    | undefined
  >();

  // Separate concerns: state management and action execution
  const { setStatus, isOperating } = useSoraOperationStatus();
  const { executeMarketplaceOperation } = useSoraMarketplaceActions();

  // ExtensionCatalog hooks
  const downloadExtension = useExtensionCatalog((state) => state.downloadExtension);
  const installExtensions = useExtensionCatalog((state) => state.installExtensions);
  const uninstallExtension = useExtensionCatalog((state) => state.uninstallExtension);
  const isExtensionInstalled = useExtensionCatalog((state) => state.isExtensionInstalled);

  // Marketplace-related hooks
  const { marketplaceExtensions } = useExtensionMarketplace();
  // Other hooks
  const { enqueueSnackbar } = useSnackbar();

  const { marketplaceEntries, refreshMarketplaceEntries, namespacedData, groupedMarketplaceData } =
    useExtensionSettings();

  // Use unified hook for tracking installed extensions
  const { isInstalled: isAnyVersionInstalled } = useSoraInstalledExtensions();

  // Process and group extensions by version
  const groupedExtensions = useGroupedExtensionsByVersion({
    installedData: namespacedData.flatMap((namespace) =>
      namespace.entries.map((ext) => ({
        id: ext.id,
        name: ext.name,
        description: ext.description,
        publisher: ext.publisher,
        version: ext.version,
        keywords: ext.keywords,
        homepage: ext.homepage,
        license: ext.license,
        qualifiedName: ext.qualifiedName,
        namespace: ext.namespace,
        readme: ext.readme,
        changelog: ext.changelog,
      })),
    ),
    marketplaceData:
      marketplaceExtensions && marketplaceExtensions.length > 0
        ? marketplaceExtensions.map((ext) => ({
            id: ext.id,
            name: ext.name,
            description: ext.description,
            publisher: ext.publisher,
            version: ext.version,
            keywords: ext.keywords,
            homepage: ext.homepage,
            license: ext.license,
            readme: ext.readme,
            changelog: ext.changelog,
            qualifiedName: ext.qualifiedName,
            namespace: ext.namespace,
          }))
        : groupedMarketplaceData.flatMap((namespace) =>
            namespace.entries.map((ext) => ({
              id: ext.id,
              name: ext.name,
              description: ext.description,
              publisher: ext.publisher,
              version: ext.version || "1.0.0",
              keywords: ext.keywords,
              homepage: ext.homepage,
              license: ext.license,
              qualifiedName: ext.qualifiedName,
              namespace: ext.namespace,
              readme: ext.readme,
              changelog: ext.changelog,
            })),
          ),
    isExtensionInstalled,
    isAnyVersionInstalled,
  });

  // useMarketplaceSearch hook for unified search functionality
  const {
    searchQuery,
    setSearchQuery,
    selectedKeywords,
    setSelectedKeywords,
    activeTab,
    setActiveTab,
    advancedSearchOptions,
    setAdvancedSearchOptions,
    filteredItems: filteredExtensions,
    tagStats,
    searchSuggestions,
    tabs,
    keywordFilterMode,
    setKeywordFilterMode,
  } = useSoraMarketplaceSearch({
    items: groupedExtensions.map((ext) => ({
      ...ext,
      id: ext.versionedId,
      keywords: ext.keywords,
      publisher: ext.publisher,
    })),
    enableSuggestions: true,
    maxSuggestions: 15,
    fieldMapping: {
      name: "name",
      keywords: "keywords",
      publisher: "publisher",
    },
  });

  // Generate list of available publishers
  const availablePublishers = useMemo(() => {
    const publishers = new Set<string>();
    groupedExtensions.forEach((ext) => {
      if (ext.publisher) {
        publishers.add(ext.publisher);
      }
    });
    return Array.from(publishers).sort();
  }, [groupedExtensions]);

  // Handler for keyword clicks
  const handleKeywordClick = (keyword: string) => {
    const keywords = selectedKeywords;
    if (keywords.includes(keyword)) {
      setSelectedKeywords(keywords.filter((t: string) => t !== keyword));
    } else {
      setSelectedKeywords([...keywords, keyword]);
    }
  };

  // Handlers for CRUD operations
  const handleInstall = useCallback(
    async (extension: ExtensionWithVersions, version?: string) => {
      const targetVersion = version ?? extension.latestVersion;
      const baseId = extension.extensionId;
      const versionedId = toVersionedId(baseId, targetVersion);

      // Check if already installed (consistent with Layout implementation)
      if (isExtensionInstalled(versionedId)) {
        enqueueSnackbar(`${extension.name} v${targetVersion} is already installed`, {
          variant: "info",
        });
        return;
      }

      setStatus(versionedId, OperationStatus.INSTALLING);
      try {
        // Search for the extension from the original marketplace entries by base ID and version
        let marketplaceEntry = marketplaceEntries.value?.find((entry) => {
          const entryBaseId = extractBaseId(entry.id);
          return entryBaseId === baseId && entry.version === targetVersion;
        });

        // If not found by base ID + version, try exact ID match (fallback)
        if (!marketplaceEntry) {
          marketplaceEntry = marketplaceEntries.value?.find(
            (entry) => entry.id === extension.versionedId && entry.version === targetVersion,
          );
        }

        if (!marketplaceEntry?.foxe) {
          throw new Error(
            `Cannot install extension ${baseId} v${targetVersion}, "foxe" URL is missing`,
          );
        }

        // Execute with consistent error handling
        await executeMarketplaceOperation(
          async () => {
            // Assert foxe URL and marketplaceEntry exist (already checked above)
            if (!marketplaceEntry || !marketplaceEntry.foxe) {
              throw new Error("Marketplace entry or foxe URL not found");
            }
            const foxeUrl = marketplaceEntry.foxe;

            // Use the namespace from marketplace entry, defaulting to "marketplace" for marketplace extensions
            const targetNamespace = (marketplaceEntry.namespace ?? "marketplace") as
              | "local"
              | "marketplace";
            log.info(
              `[Install] Installing extension ${baseId} v${targetVersion} with namespace: ${targetNamespace}`,
            );

            try {
              const buffer = await downloadExtension(foxeUrl);
              const results = await installExtensions(targetNamespace, [
                { buffer, namespace: targetNamespace },
              ]);

              const result = results[0];
              if (result?.success !== true) {
                const errorMessage =
                  result?.error instanceof Error ? result.error.message : "Installation failed";
                throw new Error(errorMessage);
              }
            } catch (downloadError) {
              // Detailed handling of CORS issues and network errors
              const err = downloadError as Error;
              const isDesktop = isDesktopApp();

              if (
                err.message.includes("CORS") ||
                err.message.includes("Access-Control-Allow-Origin")
              ) {
                const corsMessage = `CORS policy blocked the download from ${new URL(foxeUrl).hostname}.`;
                const suggestion = isDesktop
                  ? " Please try again or contact the extension author."
                  : " Consider using the desktop app for better extension compatibility, or contact the extension author.";
                throw new Error(corsMessage + suggestion);
              } else if (err.message.includes("302") || err.message.includes("Found")) {
                const redirectMessage =
                  "The extension download URL redirected. This may indicate the file has moved or requires authentication.";
                const suggestion = isDesktop
                  ? " Please try again or contact the extension author."
                  : " Try using the desktop app or contact the extension author.";
                throw new Error(redirectMessage + suggestion);
              } else if (err.message.includes("Failed to fetch")) {
                const networkMessage = "Network error occurred while downloading the extension.";
                const suggestion = isDesktop
                  ? " Please check your internet connection and try again."
                  : " Please check your internet connection. For better reliability, consider using the desktop app.";
                throw new Error(networkMessage + suggestion);
              }
              throw err;
            }
          },
          {
            successMessage: `${extension.name} v${targetVersion} installed successfully`,
            errorMessage: `Failed to install ${extension.name} v${targetVersion}`,
            onSuccess: async () => {
              await refreshMarketplaceEntries();
            },
          },
        );
      } finally {
        setStatus(versionedId, OperationStatus.IDLE);
      }
    },
    [
      setStatus,
      executeMarketplaceOperation,
      downloadExtension,
      installExtensions,
      marketplaceEntries.value,
      refreshMarketplaceEntries,
      isExtensionInstalled,
      enqueueSnackbar,
    ],
  );

  const handleUninstall = useCallback(
    async (extension: ExtensionWithVersions, version?: string) => {
      const targetVersion = version ?? extension.latestVersion;
      const baseId = extension.extensionId;
      const versionedId = toVersionedId(baseId, targetVersion);
      const namespace = extension.namespace ?? "local";

      // Extensions in the org namespace cannot be uninstalled
      // NOTE: org namespace is currently not in use
      // if (namespace === "org") {
      //   enqueueSnackbar(`Cannot uninstall system extension ${extension.displayName}`, {
      //     variant: "warning",
      //   });
      //   return;
      // }

      // Validate namespace is supported
      if (namespace !== "local" && namespace !== "marketplace") {
        enqueueSnackbar(`Unsupported namespace: ${namespace}`, {
          variant: "error",
        });
        return;
      }

      setStatus(versionedId, OperationStatus.UNINSTALLING);
      try {
        await executeMarketplaceOperation(
          async () => {
            log.info(
              `[Uninstall] Attempting to uninstall extension: ${versionedId}, namespace: ${namespace}`,
            );
            await uninstallExtension(namespace, versionedId);
            log.info(`[Uninstall] Successfully uninstalled extension: ${versionedId}`);
          },
          {
            successMessage: `${extension.name} v${targetVersion} uninstalled successfully`,
            errorMessage: `Failed to uninstall ${extension.name} v${targetVersion}`,
            onSuccess: async () => {
              await refreshMarketplaceEntries();
            },
          },
        );
      } finally {
        setStatus(versionedId, OperationStatus.IDLE);
      }
    },
    [
      setStatus,
      executeMarketplaceOperation,
      uninstallExtension,
      refreshMarketplaceEntries,
      enqueueSnackbar,
    ],
  );

  if (focusedExtension) {
    return (
      <ExtensionDetail
        installed={focusedExtension.installed}
        extension={focusedExtension.extension}
        onClose={() => {
          setFocusedExtension(undefined);
        }}
      />
    );
  }

  return (
    <Stack gap={3}>
      <SoraMarketplaceHeader
        title="Extensions"
        subtitle="Manage and discover extensions"
        icon={<ExtensionIcon style={{ fontSize: "28px" }} />}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        tagStats={tagStats}
        selectedKeywords={selectedKeywords}
        onKeywordFilterChange={setSelectedKeywords}
        keywordFilterMode={keywordFilterMode}
        onKeywordFilterModeChange={setKeywordFilterMode}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        error={marketplaceEntries.error?.message}
        onRetry={refreshMarketplaceEntries}
        enableSearchSuggestions={true}
        searchSuggestions={searchSuggestions}
        enableAdvancedSearch={true}
        advancedSearchOptions={advancedSearchOptions}
        onAdvancedSearchChange={setAdvancedSearchOptions}
        availablePublishers={availablePublishers}
      />

      <SoraMarketplaceGrid>
        {filteredExtensions.map((extension) => {
          // Check if any version of this extension is currently being operated on
          const isAnyVersionLoading = extension.versions.some((versionInfo: VersionInfo) =>
            isOperating(toVersionedId(extension.extensionId, versionInfo.version)),
          );

          return (
            <SoraMarketplaceCard
              key={extension.versionedId}
              name={extension.name}
              version={extension.latestVersion}
              description={extension.description}
              keywords={[...extension.keywords]}
              installed={extension.installed}
              loading={isAnyVersionLoading}
              versions={extension.versions}
              onKeywordClick={handleKeywordClick}
              selectedKeywords={selectedKeywords}
              onViewDetails={(version?: string) => {
                // Convert to ExtensionMarketplaceDetail format
                const targetVersion = version ?? extension.latestVersion;

                // Search for the corresponding extension from the original marketplace entries to get readme/changelog
                const originalEntry =
                  marketplaceEntries.value?.find(
                    (entry) =>
                      entry.id === extension.versionedId && entry.version === targetVersion,
                  ) ??
                  marketplaceEntries.value?.find((entry) => entry.id === extension.versionedId);

                const marketplaceEntry: ExtensionMarketplaceDetail = {
                  id: extension.versionedId,
                  name: extension.name,
                  displayName: extension.name, // Use name as displayName for marketplace extensions
                  description: extension.description,
                  publisher: extension.publisher,
                  version: targetVersion,
                  keywords: [...extension.keywords] as string[],
                  homepage: extension.homepage ?? "",
                  license: extension.license ?? "",
                  qualifiedName: `${extension.publisher}.${extension.name}`,
                  namespace: (extension.namespace ?? "local") as "local" | "org",
                  foxe: originalEntry?.foxe ?? "",
                  sha256sum: originalEntry?.sha256sum ?? "",
                  time: originalEntry?.time ?? {},
                  readme: originalEntry?.readme,
                  changelog: originalEntry?.changelog,
                };

                setFocusedExtension({
                  installed: extension.installed,
                  extension: marketplaceEntry,
                });
              }}
              onInstall={(version?: string) => {
                void handleInstall(extension, version);
              }}
              onUninstall={(version?: string) => {
                void handleUninstall(extension, version);
              }}
              thumbnail={undefined}
              icon={<ExtensionIcon style={{ fontSize: "24px" }} />}
            />
          );
        })}
      </SoraMarketplaceGrid>
    </Stack>
  );
}
