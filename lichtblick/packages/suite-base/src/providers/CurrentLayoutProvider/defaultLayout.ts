// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { defaultPlaybackConfig } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/reducers";

/**
 * Docker環境でのセルフホスティング時にオーバーライドされるデフォルトレイアウト
 *
 * globalThisオブジェクトを通じて外部から注入される可能性のあるレイアウト設定です。
 * 主にDockerコンテナ環境やカスタムデプロイメントにおいて、
 * 組織固有のデフォルトレイアウトを提供するために使用されます。
 *
 * ## 設定方法
 * ```javascript
 * // Docker環境やカスタムビルドでの設定例
 * globalThis.LICHTBLICK_SUITE_DEFAULT_LAYOUT = {
 *   configById: { ... },
 *   globalVariables: { ... },
 *   layout: { ... }
 * };
 * ```
 *
 * @type {LayoutData | undefined}
 */
const staticDefaultLayout = (globalThis as { LICHTBLICK_SUITE_DEFAULT_LAYOUT?: LayoutData })
  .LICHTBLICK_SUITE_DEFAULT_LAYOUT;

/**
 * アプリケーション起動時のデフォルトレイアウト設定
 *
 * ユーザーがレイアウトを選択していない状態でアプリケーションが起動された際に
 * 表示される初期レイアウトです。空白画面を避けるために提供されています。
 *
 * ## レイアウト構成
 * ```
 * ┌─────────────────┬─────────────────┐
 * │                 │     Image       │
 * │       3D        │                 │
 * │                 ├─────────────────┤
 * │                 │  RawMessages    │
 * └─────────────────┴─────────────────┘
 * ```
 *
 * ## 含まれるパネル
 * - **3D Panel** (`3D!18i6zy7`): 3Dビジュアライゼーション
 *   - グリッドレイヤー付き（10x10、青色、1px線幅）
 * - **Image Panel** (`Image!3mnp456`): 画像表示パネル
 * - **RawMessages Panel** (`RawMessages!os6rgs`): 生メッセージ表示
 *
 * ## レイアウト分割
 * - 水平分割: 70%（3D） : 30%（右側）
 * - 右側は垂直分割: 70%（Image） : 30%（RawMessages）
 *
 * ## 設定項目
 * - `configById`: 各パネルの個別設定
 * - `globalVariables`: グローバル変数（空）
 * - `userNodes`: ユーザー定義ノード（空）
 * - `playbackConfig`: 再生設定（デフォルト速度1.0）
 * - `layout`: React Mosaicレイアウト構造
 *
 * ## 優先順位
 * 1. `staticDefaultLayout`（Docker等で注入）
 * 2. ハードコードされたデフォルトレイアウト
 *
 * @type {LayoutData}
 * @see LayoutData - レイアウトデータの型定義
 * @see defaultPlaybackConfig - デフォルト再生設定
 */
export const defaultLayout: LayoutData =
  staticDefaultLayout ??
  ({
    configById: {
      // 3Dパネルの設定: グリッドレイヤー付き
      "3D!18i6zy7": {
        layers: {
          "845139cb-26bc-40b3-8161-8ab60af4baf5": {
            visible: true,
            frameLocked: true,
            label: "Grid",
            instanceId: "845139cb-26bc-40b3-8161-8ab60af4baf5",
            layerId: "foxglove.Grid",
            size: 10,
            divisions: 10,
            lineWidth: 1,
            color: "#248eff",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            order: 1,
          },
        },
      },
      // RawMessagesパネルの設定: 空の設定オブジェクト
      "RawMessages!os6rgs": {},
      // Imageパネルの設定: 空の設定オブジェクト
      "Image!3mnp456": {},
    },
    globalVariables: {},
    userNodes: {},
    playbackConfig: { ...defaultPlaybackConfig },
    layout: {
      first: "3D!18i6zy7",
      second: {
        first: "Image!3mnp456",
        second: "RawMessages!os6rgs",
        direction: "column",
        splitPercentage: 30,
      },
      direction: "row",
      splitPercentage: 70,
    },
  } as const);
