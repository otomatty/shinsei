// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { useAsync, useMountedState } from "react-use";
import { useDebounce } from "use-debounce";

import Logger from "@lichtblick/log";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import {
  LayoutID,
  LayoutState,
  useCurrentLayoutSelector,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";

type UpdatedLayout = NonNullable<LayoutState["selectedLayout"]>;

const log = Logger.getLogger(__filename);

const EMPTY_UNSAVED_LAYOUTS: Record<LayoutID, UpdatedLayout> = {};
const SAVE_INTERVAL_MS = 1000;

/**
 * Selector function to get the current layout from the layout state
 * @param state - The layout state
 * @returns The currently selected layout
 */
const selectCurrentLayout = (state: LayoutState) => state.selectedLayout;

/**
 * A synchronization adapter that observes changes in the current layout and
 * asynchronously pushes them to the layout manager. This component handles
 * the automatic saving of layout changes with debouncing to prevent excessive
 * write operations.
 *
 * Key features:
 * - Monitors layout changes and batches unsaved modifications
 * - Debounces save operations to reduce server load
 * - Handles errors gracefully with user notifications
 * - Tracks analytics for layout updates
 * - Flushes pending changes on component unmount
 *
 * The component uses a debounced approach where layout changes are collected
 * and saved after a delay (SAVE_INTERVAL_MS) to avoid saving on every keystroke
 * or minor adjustment.
 *
 * @component
 * @returns null - This component has no visual representation
 *
 * @example
 * ```tsx
 * // Used in the main application layout
 * <CurrentLayoutSyncAdapter />
 * ```
 */
export function CurrentLayoutSyncAdapter(): ReactNull {
  const selectedLayout = useCurrentLayoutSelector(selectCurrentLayout);

  const layoutManager = useLayoutManager();

  const [unsavedLayouts, setUnsavedLayouts] = useState(EMPTY_UNSAVED_LAYOUTS);

  const isMounted = useMountedState();

  const analytics = useAnalytics();

  useEffect(() => {
    if (selectedLayout?.edited === true) {
      setUnsavedLayouts((old) => ({
        ...old,
        [selectedLayout.id]: selectedLayout,
      }));
    }
  }, [selectedLayout]);

  const [debouncedUnsavedLayouts, debouncedUnsavedLayoutActions] = useDebounce(
    unsavedLayouts,
    SAVE_INTERVAL_MS,
  );

  // Flush and clear pending updates on unmount.
  useEffect(() => {
    return () => {
      debouncedUnsavedLayoutActions.flush();
      debouncedUnsavedLayoutActions.cancel();
    };
  }, [debouncedUnsavedLayoutActions]);

  // Write all pending layout updates to the layout manager. Under the hood this
  // uses useEffect so it happens after DOM updates are complete.
  useAsync(async () => {
    const unsavedLayoutsSnapshot = { ...debouncedUnsavedLayouts };
    setUnsavedLayouts(EMPTY_UNSAVED_LAYOUTS);

    for (const params of Object.values(unsavedLayoutsSnapshot)) {
      try {
        await layoutManager.updateLayout(params);
      } catch (error) {
        log.error(error);
        if (isMounted()) {
          enqueueSnackbar(`Your changes could not be saved. ${error.toString()}`, {
            variant: "error",
            key: "CurrentLayoutProvider.throttledSave",
          });
        }
      }
    }

    void analytics.logEvent(AppEvent.LAYOUT_UPDATE);
  }, [analytics, debouncedUnsavedLayouts, isMounted, layoutManager]);

  return ReactNull;
}
