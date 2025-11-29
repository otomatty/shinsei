// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

export type ExtensionMarketplaceDetail = ExtensionInfo & {
  sha256sum?: string;
  foxe?: string;
  time?: Record<string, string>;
};

export interface ExtensionMarketplace {
  getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>;
  searchExtensions(query: string): Promise<ExtensionMarketplaceDetail[]>;
  getExtensionDetail(id: string): Promise<ExtensionMarketplaceDetail | undefined>;
  getMarkdown(url: string): Promise<string>;
  refreshMarketplaceData(): Promise<void>;
  marketplaceExtensions: ExtensionMarketplaceDetail[] | undefined;
  marketplaceLoading: boolean;
  marketplaceError: string | undefined;
}

const ExtensionMarketplaceContext = createContext<ExtensionMarketplace | undefined>(undefined);
ExtensionMarketplaceContext.displayName = "ExtensionMarketplaceContext";

export function useExtensionMarketplace(): ExtensionMarketplace {
  const extensionMarketplace = useContext(ExtensionMarketplaceContext);
  if (extensionMarketplace == undefined) {
    throw new Error(
      "An ExtensionMarketplaceContext provider is required to useExtensionMarketplace",
    );
  }
  return extensionMarketplace;
}

export default ExtensionMarketplaceContext;
