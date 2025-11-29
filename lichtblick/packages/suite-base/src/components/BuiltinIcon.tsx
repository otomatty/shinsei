// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ICONS from "@lichtblick/suite-base/theme/icons";
import { RegisteredIconNames } from "@lichtblick/suite-base/types/Icons";

/**
 * Props for the BuiltinIcon component
 */
type BuiltinIconProps = {
  /** The name of the registered icon to display */
  name?: RegisteredIconNames;
};

/**
 * A component that renders a built-in icon by name from the registered icons collection.
 * If no name is provided or the name is undefined, renders an empty fragment.
 *
 * @component
 * @param props - The component props
 * @returns A React element representing the requested icon or empty fragment
 *
 * @example
 * ```tsx
 * <BuiltinIcon name="add" />
 * ```
 */
export function BuiltinIcon(props: BuiltinIconProps): React.JSX.Element {
  if (props.name == undefined) {
    return <></>;
  }
  return ICONS[props.name];
}
