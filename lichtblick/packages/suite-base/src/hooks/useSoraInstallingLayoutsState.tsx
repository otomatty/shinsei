// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { useCallback } from "react";

import { useLayoutCatalog } from "@lichtblick/suite-base/context/SoraLayoutCatalogContext";
import { LayoutMarketplaceDetail } from "@lichtblick/suite-base/context/SoraLayoutMarketplaceContext";

import { useInstallingLayoutsStore } from "./useInstallingLayoutsStore";

export interface InstallLayoutsData {
  detail: LayoutMarketplaceDetail;
}

export interface UseInstallingLayoutsState {
  installLayouts: (layouts: InstallLayoutsData[]) => Promise<void>;
}

export function useSoraInstallingLayoutsState(): UseInstallingLayoutsState {
  const catalog = useLayoutCatalog();

  const { setInstallingProgress, startInstallingProgress, resetInstallingProgress } =
    useInstallingLayoutsStore((state) => ({
      setInstallingProgress: state.setInstallingProgress,
      startInstallingProgress: state.startInstallingProgress,
      resetInstallingProgress: state.resetInstallingProgress,
    }));

  const installLayouts = useCallback(
    async (layoutsData: InstallLayoutsData[]) => {
      try {
        startInstallingProgress(layoutsData.length);

        for (const { detail } of layoutsData) {
          try {
            await catalog.installLayoutFromMarketplace(detail);
          } catch (error) {
            // Continue with next layout if one fails
            console.error(`Failed to install layout ${detail.id}:`, error);
          }

          setInstallingProgress((prev) => ({
            ...prev,
            installed: prev.installed + 1,
          }));
        }

        setInstallingProgress((prev) => ({
          ...prev,
          inProgress: false,
        }));
      } catch (error) {
        setInstallingProgress((prev) => ({
          ...prev,
          inProgress: false,
        }));
        console.error("Error installing layouts:", error);
      } finally {
        resetInstallingProgress();
      }
    },
    [catalog, startInstallingProgress, setInstallingProgress, resetInstallingProgress],
  );

  return { installLayouts };
}
