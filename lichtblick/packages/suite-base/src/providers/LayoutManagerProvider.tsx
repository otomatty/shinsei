// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useMemo } from "react";
import { useNetworkState } from "react-use";

import { useVisibilityState } from "@lichtblick/hooks";
import Logger from "@lichtblick/log";
import LayoutManagerContext from "@lichtblick/suite-base/context/LayoutManagerContext";
import { useLayoutStorage } from "@lichtblick/suite-base/context/LayoutStorageContext";
import { useRemoteLayoutStorage } from "@lichtblick/suite-base/context/RemoteLayoutStorageContext";
import LayoutManager from "@lichtblick/suite-base/services/LayoutManager/LayoutManager";
import delay from "@lichtblick/suite-base/util/delay";

const log = Logger.getLogger(__filename);

/** Base value for sync interval (milliseconds) */
const SYNC_INTERVAL_BASE_MS = 30_000;
/** Maximum value for sync interval (milliseconds) */
const SYNC_INTERVAL_MAX_MS = 3 * 60_000;

/**
 * LayoutManagerProvider
 *
 * Provider component that provides the layout management system.
 * Integrates local and remote layout storage and provides automatic sync functionality.
 *
 * ## Main Features
 * - Local layout storage management
 * - Sync with remote layout storage
 * - Automatic sync control based on network state
 * - Sync optimization based on application visibility
 * - Robust sync retry with exponential backoff
 *
 * ## Sync Strategy
 * - Execute sync only when online
 * - Sync only when application is visible
 * - Retry with exponential backoff on sync failure
 * - Distribute sync timing with jitter
 *
 * ## Use Cases
 * - Saving and loading layouts
 * - Layout sharing across multiple devices
 * - Offline/online state management
 * - Layout conflict resolution
 *
 * ## Performance Optimization
 * - Stop sync when application is hidden
 * - Efficient sync with network state monitoring
 * - Reduce server load with exponential backoff
 *
 * @param props - Component properties
 * @param props.children - Child components
 * @returns React.JSX.Element
 *
 * @example
 * ```typescript
 * // Usage in application
 * <LayoutManagerProvider>
 *   <LayoutEditor />
 *   <LayoutSidebar />
 * </LayoutManagerProvider>
 *
 * // Usage in child component
 * const layoutManager = useContext(LayoutManagerContext);
 *
 * // Save layout
 * await layoutManager.saveLayout(layout);
 *
 * // Load layout
 * const layout = await layoutManager.loadLayout(layoutId);
 *
 * // Manual sync
 * await layoutManager.syncWithRemote();
 * ```
 */
export default function LayoutManagerProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  // Get local layout storage
  const layoutStorage = useLayoutStorage();
  // Get remote layout storage
  const remoteLayoutStorage = useRemoteLayoutStorage();

  // Create LayoutManager instance (integrating local and remote storage)
  const layoutManager = useMemo(
    () => new LayoutManager({ local: layoutStorage, remote: remoteLayoutStorage }),
    [layoutStorage, remoteLayoutStorage],
  );

  // Monitor network state
  const { online = false } = useNetworkState();
  // Monitor application visibility state
  const visibilityState = useVisibilityState();

  // Notify LayoutManager of online state changes
  useEffect(() => {
    layoutManager.setOnline({ online });
  }, [layoutManager, online]);

  // Sync conditions: logged in, online, application is visible
  const enableSyncing = remoteLayoutStorage != undefined && online && visibilityState === "visible";

  // Periodic sync process
  useEffect(() => {
    if (!enableSyncing) {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      let failures = 0;

      while (!controller.signal.aborted) {
        try {
          // Execute sync with remote
          await layoutManager.syncWithRemote(controller.signal);
          failures = 0; // Reset failure counter on success
        } catch (error) {
          log.error("Sync failed:", error);
          failures++;
        }

        // Calculate sync interval with exponential backoff and jitter
        // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
        const duration =
          Math.random() * Math.min(SYNC_INTERVAL_MAX_MS, SYNC_INTERVAL_BASE_MS * 2 ** failures);
        log.debug("Waiting", (duration / 1000).toFixed(2), "sec for next sync", { failures });
        await delay(duration);
      }
    })();

    return () => {
      log.debug("Canceling layout sync due to effect cleanup callback");
      controller.abort();
    };
  }, [enableSyncing, layoutManager]);

  return (
    <LayoutManagerContext.Provider value={layoutManager}>{children}</LayoutManagerContext.Provider>
  );
}
