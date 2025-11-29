// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState, useMemo } from "react";

import Stack from "@lichtblick/suite-base/components/Stack";
import {
  SoraMarketplaceCard,
  SoraMarketplaceGrid,
  SoraMarketplaceHeader,
} from "@lichtblick/suite-base/components/shared/Marketplace";
import { useLayoutCatalog } from "@lichtblick/suite-base/context/SoraLayoutCatalogContext";
import {
  LayoutMarketplaceDetail,
  useLayoutMarketplace,
} from "@lichtblick/suite-base/context/SoraLayoutMarketplaceContext";
import { useSoraMarketplaceActions } from "@lichtblick/suite-base/hooks/marketplace/useSoraMarketplaceActions";
import { useSoraMarketplaceSearch } from "@lichtblick/suite-base/hooks/marketplace/useSoraMarketplaceSearch";
import {
  useSoraOperationStatus,
  OperationStatus,
} from "@lichtblick/suite-base/hooks/marketplace/useSoraOperationStatus";
import { useSoraInstalledLayouts } from "@lichtblick/suite-base/hooks/useSoraInstalledLayouts";
import { useSoraInstallingLayoutsState } from "@lichtblick/suite-base/hooks/useSoraInstallingLayoutsState";

interface LayoutMarketplaceSettingsProps {
  className?: string;
}

/**
 * Layout marketplace settings component
 * Displays layouts in a simple list format without version management
 */
export default function SoraLayoutMarketplaceSettings({
  className,
}: LayoutMarketplaceSettingsProps): React.ReactElement {
  // Separate concerns: state management and action execution
  const { setStatus, isOperating } = useSoraOperationStatus();
  const { executeMarketplaceOperation } = useSoraMarketplaceActions();

  // Context hooks
  const marketplace = useLayoutMarketplace();
  const catalog = useLayoutCatalog();
  const { enqueueSnackbar } = useSnackbar();

  // Layout installation hook with notifications
  const { installLayouts } = useSoraInstallingLayoutsState();

  // Hook for tracking installed layouts
  const {
    installedIds: installedMarketplaceIds,
    itemMap: installedLayoutsMap,
    loading: loadingInstalledLayouts,
    error: installedLayoutsError,
    refresh: refreshInstalledLayouts,
  } = useSoraInstalledLayouts();

  // State
  const [layouts, setLayouts] = useState<LayoutMarketplaceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Add installed property to layouts based on installedMarketplaceIds
  const layoutsWithInstalledStatus = useMemo(() => {
    return layouts.map((layout) => ({
      ...layout,
      installed: installedMarketplaceIds.has(layout.id),
    }));
  }, [layouts, installedMarketplaceIds]);

  // useMarketplaceSearch hook for unified search functionality
  const {
    searchQuery,
    setSearchQuery,
    selectedKeywords,
    setSelectedKeywords,
    activeTab,
    setActiveTab,
    filteredItems: filteredLayouts,
    tagStats,
    searchSuggestions,
    tabs,
    keywordFilterMode,
    setKeywordFilterMode,
    advancedSearchOptions,
    setAdvancedSearchOptions,
  } = useSoraMarketplaceSearch({
    items: layoutsWithInstalledStatus,
    enableSuggestions: true,
    maxSuggestions: 15,
  });

  // Generate list of available publishers from layouts
  const availablePublishers = React.useMemo(() => {
    const publishers = new Set<string>();
    layouts.forEach((layout) => {
      if (layout.publisher) {
        publishers.add(layout.publisher);
      }
    });
    return Array.from(publishers).sort();
  }, [layouts]);

  // Handler for keyword click
  const handleKeywordClick = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((t) => t !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  // Load layouts from marketplace
  const loadLayouts = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const fetchedLayouts = await marketplace.getAvailableLayouts();
      setLayouts(fetchedLayouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load layouts");
    } finally {
      setLoading(false);
    }
  }, [marketplace]);

  // Install layout with notifications
  const installLayout = useCallback(
    async (layout: LayoutMarketplaceDetail) => {
      // Check if already installed
      if (installedMarketplaceIds.has(layout.id)) {
        enqueueSnackbar(`Layout "${layout.name}" is already installed`, {
          variant: "info",
        });
        return;
      }

      setStatus(layout.id, OperationStatus.INSTALLING);
      try {
        await executeMarketplaceOperation(
          async () => {
            await installLayouts([{ detail: layout }]);
            await refreshInstalledLayouts();
          },
          {
            successMessage: `Layout "${layout.name}" installed successfully`,
            errorMessage: `Failed to install layout "${layout.name}"`,
          },
        );
      } finally {
        setStatus(layout.id, OperationStatus.IDLE);
      }
    },
    [
      setStatus,
      executeMarketplaceOperation,
      installLayouts,
      refreshInstalledLayouts,
      installedMarketplaceIds,
      enqueueSnackbar,
    ],
  );

  // Uninstall layout
  const uninstallLayout = useCallback(
    async (marketplaceLayout: LayoutMarketplaceDetail) => {
      const layout = installedLayoutsMap.get(marketplaceLayout.id);
      if (!layout) {
        enqueueSnackbar(`Failed to find layout ID for "${marketplaceLayout.name}"`, {
          variant: "error",
        });
        return;
      }

      setStatus(marketplaceLayout.id, OperationStatus.UNINSTALLING);
      try {
        await executeMarketplaceOperation(
          async () => {
            await catalog.uninstallMarketplaceLayout(layout.id);
            await refreshInstalledLayouts();
          },
          {
            successMessage: `Successfully uninstalled "${marketplaceLayout.name}"`,
            errorMessage: `Failed to uninstall layout "${marketplaceLayout.name}"`,
          },
        );
      } finally {
        setStatus(marketplaceLayout.id, OperationStatus.IDLE);
      }
    },
    [
      setStatus,
      executeMarketplaceOperation,
      catalog,
      refreshInstalledLayouts,
      installedLayoutsMap,
      enqueueSnackbar,
    ],
  );

  // Initial load
  useEffect(() => {
    if (layouts.length === 0 && !loading && !error) {
      void loadLayouts();
    }
  }, [layouts.length, loading, error, loadLayouts]);

  // Reload installed layouts when component is focused/visible
  // This ensures the installed status is updated after preview confirmation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && layouts.length > 0) {
        void refreshInstalledLayouts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also reload when the component mounts (dialog opens)
    if (layouts.length > 0) {
      void refreshInstalledLayouts();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [layouts.length, refreshInstalledLayouts]);

  // Show error notification for installed layouts loading errors
  useEffect(() => {
    if (installedLayoutsError) {
      enqueueSnackbar(installedLayoutsError, {
        variant: "error",
      });
    }
  }, [installedLayoutsError, enqueueSnackbar]);

  return (
    <Stack gap={3} className={className}>
      <SoraMarketplaceHeader
        title="Layouts"
        subtitle="Discover and install pre-configured layouts"
        icon={<ViewQuiltIcon style={{ fontSize: "28px" }} />}
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
        error={error}
        onRetry={loadLayouts}
        enableSearchSuggestions={true}
        searchSuggestions={searchSuggestions}
        enableAdvancedSearch={true}
        advancedSearchOptions={advancedSearchOptions}
        onAdvancedSearchChange={setAdvancedSearchOptions}
        availablePublishers={availablePublishers}
      />

      <SoraMarketplaceGrid>
        {filteredLayouts.map((layout) => {
          const isInstalled = installedMarketplaceIds.has(layout.id);
          const isCardLoading = isOperating(layout.id) || loadingInstalledLayouts;
          return (
            <SoraMarketplaceCard
              key={layout.id}
              name={layout.name}
              description={layout.description}
              publisher={layout.publisher}
              keywords={layout.keywords}
              installed={isInstalled}
              loading={isCardLoading}
              onKeywordClick={handleKeywordClick}
              selectedKeywords={selectedKeywords}
              onInstall={async () => {
                await installLayout(layout);
              }}
              onUninstall={
                isInstalled
                  ? async () => {
                      await uninstallLayout(layout);
                    }
                  : undefined
              }
              thumbnail={layout.thumbnail}
              icon={<ViewQuiltIcon style={{ fontSize: "24px" }} />}
            />
          );
        })}
      </SoraMarketplaceGrid>
    </Stack>
  );
}
