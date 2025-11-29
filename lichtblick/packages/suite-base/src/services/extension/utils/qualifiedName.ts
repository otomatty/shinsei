// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Namespace } from "@lichtblick/suite-base/types";
import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

export default function qualifiedName(
  namespace: Namespace,
  publisher: string,
  info: ExtensionInfo,
): string {
  switch (namespace) {
    case "local":
      // For local namespace we use the extension display name
      return info.displayName;
    case "org":
      // For private registry we use namespace and package name.
      return [namespace, publisher, info.name].join(":");
    default:
      // Handle any other namespace cases
      return info.name;
  }
}
