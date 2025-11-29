// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Common marketplace components
 * Design system shared between Extension and Layout marketplaces
 */

// Types and Enums - re-export from centralized type definitions
export * from "../../../types/soraMarketplaceUI";
export * from "../../../types/soraMarketplaceDomain";
export * from "./utils";

export { default as SoraMarketplaceCard } from "./SoraMarketplaceCard/SoraMarketplaceCard";
export type { MarketplaceCardProps } from "./SoraMarketplaceCard/SoraMarketplaceCard";
export { default as SoraMarketplaceHeader } from "./SoraMarketplaceHeader/SoraMarketplaceHeader";
export type { MarketplaceHeaderProps } from "./SoraMarketplaceHeader/SoraMarketplaceHeader";
export { default as SoraVersionTab } from "./SoraVersionTab/SoraVersionTab";
export type { VersionTabProps } from "./SoraVersionTab/SoraVersionTab";
export { default as SoraMarketplaceGrid } from "./SoraMarketplaceGrid";
export type { MarketplaceGridProps } from "./SoraMarketplaceGrid";
export { default as SoraMarketplaceDetailBase } from "./SoraMarketplaceDetailBase";
export type { MarketplaceDetailBaseProps } from "./SoraMarketplaceDetailBase";

// Hooks
export { useSoraMarketplaceSearch } from "../../../hooks/marketplace/useSoraMarketplaceSearch";
export type {
  MarketplaceItem,
  MarketplaceSearchConfig,
  MarketplaceSearchResult,
} from "../../../hooks/marketplace/useSoraMarketplaceSearch";
