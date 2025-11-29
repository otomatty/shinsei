// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useStateToURLSynchronization } from "@lichtblick/suite-base/hooks/useStateToURLSynchronization";

/**
 * URLStateSyncAdapter component that synchronizes application state with the URL.
 * This component is implemented as a simple subcomponent to avoid triggering
 * re-renders of expensive parent components while it listens for state changes.
 *
 * The component has no visual representation and returns null, but provides
 * important functionality for maintaining URL state synchronization.
 *
 * @component
 * @returns null - This component renders nothing
 *
 * @example
 * ```tsx
 * <URLStateSyncAdapter />
 * ```
 */
export function URLStateSyncAdapter(): ReactNull {
  useStateToURLSynchronization();

  return ReactNull;
}
