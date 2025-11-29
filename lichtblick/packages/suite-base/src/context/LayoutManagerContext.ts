// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { ILayoutManager } from "@lichtblick/suite-base/services/ILayoutManager";

/**
 * ## LayoutManagerContext
 *
 * @see ILayoutManager - レイアウト管理インターフェース
 * @see ILayoutStorage - レイアウトストレージインターフェース
 * @see IRemoteLayoutStorage - リモートレイアウトストレージインターフェース
 */
const LayoutManagerContext = createContext<ILayoutManager | undefined>(undefined);
LayoutManagerContext.displayName = "LayoutManagerContext";

/**
 * ## useLayoutManager
 *
 * @returns {ILayoutManager} レイアウト管理インターフェース
 * @throws {Error} LayoutManagerProviderが設定されていない場合
 */
export function useLayoutManager(): ILayoutManager {
  const ctx = useContext(LayoutManagerContext);
  if (ctx == undefined) {
    throw new Error("A LayoutManager provider is required to useLayoutManager");
  }
  return ctx;
}

export default LayoutManagerContext;
