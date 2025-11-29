// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";
import { DeepPartial } from "ts-essentials";
import { StoreApi } from "zustand";

import { Immutable, SettingsTreeField, SettingsTreeNode } from "@lichtblick/suite";
import { AppBarMenuItem } from "@lichtblick/suite-base/components/AppBar/types";
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { WorkspaceContextStore } from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import type { SceneExtensionConfig } from "@lichtblick/suite-base/panels/ThreeDeeRender/SceneExtensionConfig";
import type { Player } from "@lichtblick/suite-base/players/types";

/**
 * AppContext - Integration point for application features
 *
 * This context provides an interface for integrating platform-specific features
 * and customizable components. Different implementations can be injected for
 * Web and Desktop versions.
 *
 * Main responsibilities:
 * - UI component customization
 * - Feature flag management
 * - Player extension
 * - Platform-specific feature integration
 */
interface IAppContext {
  /** App bar layout button - Custom layout selection UI */
  appBarLayoutButton?: React.JSX.Element;

  /** App bar menu items - Additional menu items */
  appBarMenuItems?: readonly AppBarMenuItem[];

  /** Event creation function - Custom event creation feature */
  createEvent?: (args: {
    deviceId: string;
    timestamp: string;
    durationNanos: string;
    metadata: Record<string, string>;
  }) => Promise<void>;

  /** Injected features - Platform-specific feature flags */
  injectedFeatures?: InjectedFeatures;

  /** Layout file import function - Custom layout loading */
  importLayoutFile?: (fileName: string, data: LayoutData) => Promise<void>;

  /** Layout empty state component - Display when no layout exists */
  layoutEmptyState?: React.JSX.Element;

  /** Layout browser component - Layout selection UI */
  layoutBrowser?: () => React.JSX.Element;

  /** Sidebar items - Additional sidebar items */
  sidebarItems?: readonly [[string, { iconName: string; title: string }]];

  /** Sync adapters - Data synchronization components */
  syncAdapters?: readonly React.JSX.Element[];

  /** Workspace extensions - Workspace feature extensions */
  workspaceExtensions?: readonly React.JSX.Element[];

  /** Extension marketplace settings component - Extension marketplace settings UI (custom implementation) */
  // extensionSettings?: React.JSX.Element;
  extensionMarketplaceSettings?: React.JSX.Element;

  /** Layout marketplace settings component - Layout marketplace settings UI (custom implementation) */
  layoutMarketplaceSettings?: React.JSX.Element;

  /** Settings status button renderer - Status display for settings items */
  renderSettingsStatusButton?: (
    nodeOrField: Immutable<SettingsTreeNode | SettingsTreeField>,
  ) => React.JSX.Element | undefined;

  /** Workspace store creator - Custom workspace state management */
  workspaceStoreCreator?: (
    initialState?: Partial<WorkspaceContextStore>,
  ) => StoreApi<WorkspaceContextStore>;

  /** Performance sidebar component - Performance monitoring UI */
  PerformanceSidebarComponent?: React.ComponentType;

  /** Player wrapper function - Player feature extension */
  wrapPlayer: (child: Player) => Player;
}

/**
 * Injectable feature key definitions
 *
 * Currently supported features:
 * - customSceneExtensions: 3D scene extension customization
 */
export const INJECTED_FEATURE_KEYS = {
  customSceneExtensions: "ThreeDeeRender.customSceneExtensions",
} as const;

/**
 * Injected feature map type definition
 *
 * Defines the type of configuration object corresponding to each feature key
 */
export type InjectedFeatureMap = {
  [INJECTED_FEATURE_KEYS.customSceneExtensions]?: {
    customSceneExtensions: DeepPartial<SceneExtensionConfig>;
  };
};

/**
 * Injected features integrated type
 *
 * Represents a collection of available features
 */
export type InjectedFeatures = {
  availableFeatures: InjectedFeatureMap;
};

/**
 * AppContext - Create context with default values
 *
 * Default implementation:
 * - wrapPlayer: Pass-through (no modifications)
 */
const AppContext = createContext<IAppContext>({
  // Default wrapPlayer is a no-op and is a pass-through of the provided child player
  wrapPlayer: (child) => child,
});
AppContext.displayName = "AppContext";

/**
 * useAppContext - Custom hook to retrieve AppContext values
 *
 * @returns IAppContext - Application context values
 *
 * Usage example:
 * ```typescript
 * const { wrapPlayer, layoutBrowser } = useAppContext();
 * const wrappedPlayer = wrapPlayer(basePlayer);
 * ```
 */
export function useAppContext(): IAppContext {
  return useContext(AppContext);
}

export { AppContext };
export type { IAppContext };
