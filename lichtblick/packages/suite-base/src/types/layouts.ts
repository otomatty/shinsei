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

/**
 * @fileoverview レイアウト関連の型定義
 *
 * このファイルは、Lichtblickアプリケーションのレイアウトシステムで使用される
 * 型定義を提供します。タブ、パネル、レイアウト情報の管理に使用されます。
 *
 * 主な機能:
 * - タブベースのレイアウト管理
 * - パネルの配置と組織化
 * - レイアウトのメタデータ管理
 */

import { MosaicNode } from "react-mosaic-component";

import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext";

/**
 * タブの設定情報
 *
 * @description 個々のタブの設定を定義します。
 * 各タブは名前とオプションでレイアウト情報を持ちます。
 *
 * @example
 * ```typescript
 * const tabConfig: TabConfig = {
 *   title: "メインビュー",
 *   layout: {
 *     direction: "row",
 *     first: "3d-panel",
 *     second: "plot-panel",
 *     splitPercentage: 50
 *   }
 * };
 * ```
 */
export type TabConfig = {
  /** タブの表示名 */
  title: string;
  /** タブ内のパネルレイアウト (省略時は空のタブ) */
  layout?: MosaicNode<string>;
};

/**
 * タブパネルの設定情報
 *
 * @description 複数のタブを持つパネルの設定を定義します。
 * アクティブなタブのインデックスとタブの配列を管理します。
 *
 * @example
 * ```typescript
 * const tabPanelConfig: TabPanelConfig = {
 *   activeTabIdx: 0,
 *   tabs: [
 *     { title: "カメラ", layout: cameraLayout },
 *     { title: "LiDAR", layout: lidarLayout },
 *     { title: "マップ", layout: mapLayout }
 *   ]
 * };
 * ```
 */
export type TabPanelConfig = {
  /** 現在アクティブなタブのインデックス */
  activeTabIdx: number;
  /** タブの配列 */
  tabs: Array<TabConfig>;
};

/**
 * タブの位置情報
 *
 * @description 特定のタブの位置を識別するための情報です。
 * パネルIDとオプションでタブインデックスを含みます。
 *
 * @example
 * ```typescript
 * // 特定のタブを指定
 * const tabLocation: TabLocation = {
 *   panelId: "main-tab-panel",
 *   tabIndex: 2
 * };
 *
 * // パネル全体を指定（タブインデックスなし）
 * const panelLocation: TabLocation = {
 *   panelId: "sidebar-panel"
 * };
 * ```
 */
export type TabLocation = {
  /** パネルの一意識別子 */
  panelId: string;
  /** タブのインデックス (省略時はパネル全体を指す) */
  tabIndex?: number;
};

/**
 * レイアウトのメタデータ
 *
 * @description レイアウトの詳細情報を含むメタデータです。
 * レイアウトの名前、作成元、実際のレイアウトデータを含みます。
 *
 * @example
 * ```typescript
 * const layoutInfo: LayoutInfo = {
 *   name: "ロボット監視レイアウト",
 *   from: "user-templates",
 *   data: {
 *     layout: mosaicLayout,
 *     savedProps: panelConfigs,
 *     globalVariables: {},
 *     userNodes: {},
 *     playbackConfig: { speed: 1.0 }
 *   }
 * };
 * ```
 */
export type LayoutInfo = {
  /** レイアウトの表示名 */
  name: string;
  /** レイアウトの作成元 (例: "user-templates", "default", "imported") */
  from: string;
  /** レイアウトの実際のデータ */
  data: LayoutData;
};
