// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useCallback } from "react";

/**
 * Props for the RemountOnValueChange component
 */
type RemountOnValueChangeProps = PropsWithChildren<{
  /** The value to watch for changes. When this value changes, children will be remounted */
  value: unknown;
}>;

/**
 * A utility component that forces remounting of its children when a specific value changes.
 * This component unmounts and remounts the entire child component tree when the `value` prop changes.
 *
 * This is useful when you want to completely "reset" a component tree for a specific value change,
 * effectively clearing all internal state and forcing a fresh initialization.
 *
 * **Warning:** Use sparingly and prefer hook dependencies to manage state updates. This should be a
 * last resort nuclear option when you think that an entire subtree should be purged.
 *
 * @component
 * @param props - The component props
 * @returns A React element that wraps the children
 *
 * @example
 * ```tsx
 * <RemountOnValueChange value={userId}>
 *   <UserProfile />
 * </RemountOnValueChange>
 * // When userId changes, UserProfile will be completely remounted
 * ```
 */
export default function RemountOnValueChange(props: RemountOnValueChangeProps): React.JSX.Element {
  // When the value changes, useCallback will create a new component by returning a new
  // function instance. Since this is a completely new component it will remount its entire tree.
  const Parent = useCallback(
    ({ children }: PropsWithChildren) => {
      void props.value; // to suppress eslint complaining about the value in the deps list
      return <>{children}</>;
    },
    [props.value],
  );

  return <Parent>{props.children}</Parent>;
}
