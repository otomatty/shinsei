// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { getNodeAtPath, MosaicRootActions, MosaicWindowActions } from "react-mosaic-component";
import { MosaicKey } from "react-mosaic-component/lib/types";

import { getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";

/**
 * **PanelToolbar Utilities** - パネルツールバーユーティリティ関数
 *
 * パネルツールバーコンポーネントで使用される共通のユーティリティ関数を提供します。
 * React Mosaicレイアウトシステムとの統合に特化した機能を含みます。
 *
 * @utilities
 * - **getPanelTypeFromMosaic**: MosaicからパネルタイプIDを取得
 *
 * @dependencies
 * - **react-mosaic-component**: レイアウトシステム
 * - **@lichtblick/suite-base/util/layout**: パネルID解析
 */

/**
 * **getPanelTypeFromMosaic** - Mosaicからパネルタイプを取得
 *
 * React Mosaicレイアウトシステムから現在のパネルタイプを取得するユーティリティ関数。
 * パネルのコンテキストメニューやアクションで、現在のパネルタイプを判定する際に使用されます。
 *
 * @algorithm
 * 1. MosaicWindowActionsからパネルパスを取得
 * 2. MosaicRootActionsからルートノードを取得
 * 3. パスを使用してノードを特定
 * 4. ノードIDからパネルタイプを抽出
 *
 * @safety
 * - **引数チェック**: undefinedの場合は安全にundefinedを返す
 * - **型検証**: 非リーフノードの場合はエラーを投げる
 * - **エラーハンドリング**: 適切なエラーメッセージを提供
 *
 * @example
 * ```tsx
 * // パネルアクションドロップダウンでの使用例
 * const getPanelType = useCallback(
 *   () => getPanelTypeFromMosaic(mosaicWindowActions, mosaicActions),
 *   [mosaicActions, mosaicWindowActions]
 * );
 *
 * const handleSplit = () => {
 *   const type = getPanelType();
 *   if (type) {
 *     // パネル分割処理
 *   }
 * };
 * ```
 *
 * @param mosaicWindowActions - Mosaicウィンドウアクション（省略可能）
 * @param mosaicActions - Mosaicルートアクション（省略可能）
 * @returns パネルタイプ文字列、取得できない場合はundefined
 * @throws {Error} 非リーフノードの場合にエラーを投げる
 */
export function getPanelTypeFromMosaic(
  mosaicWindowActions?: MosaicWindowActions,
  mosaicActions?: MosaicRootActions<MosaicKey>,
): string | undefined {
  if (!mosaicWindowActions || !mosaicActions) {
    return undefined;
  }
  const node = getNodeAtPath(mosaicActions.getRoot(), mosaicWindowActions.getPath());
  if (typeof node !== "string") {
    throw new Error(`Used getPanelTypeFromMosaic on non-leaf node: ${JSON.stringify(node)}`);
  }
  const type = getPanelTypeFromId(node);

  return type;
}
