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
 * @fileoverview パネル関連の型定義
 *
 * このファイルは、Lichtblickアプリケーションのパネルシステムで使用される
 * 型定義を提供します。パネルの配置、設定、ドラッグ&ドロップ、
 * 再生制御、ユーザースクリプトなどの機能をサポートします。
 */

import type { MosaicPath } from "react-mosaic-component";

/**
 * Mosaicドロップターゲットの位置
 *
 * @description パネルのドラッグ&ドロップ時に、ドロップ先の位置を指定します。
 * 既存のパネルに対する相対的な位置を表現します。
 */
export type MosaicDropTargetPosition = "top" | "bottom" | "left" | "right";

/**
 * Mosaicドロップ操作の結果
 *
 * @description パネルのドラッグ&ドロップ操作の結果を表現します。
 * ドロップ先のパス、位置、タブIDを含みます。
 *
 * @example
 * ```typescript
 * const dropResult: MosaicDropResult = {
 *   path: ["first", "second"],
 *   position: "right",
 *   tabId: "new-tab"
 * };
 * ```
 */
export type MosaicDropResult = {
  /** ドロップ先のMosaicパス */
  path?: MosaicPath;
  /** ドロップ先の位置 */
  position?: MosaicDropTargetPosition;
  /** ドロップ先のタブID */
  tabId?: string;
};

/**
 * パネルの設定情報
 *
 * @description 各パネルの設定を保存するための汎用的なオブジェクト型です。
 * パネルの種類に応じて、異なる設定プロパティを持つことができます。
 *
 * @example
 * ```typescript
 * // 3Dパネルの設定例
 * const threeDConfig: PanelConfig = {
 *   followTf: "base_link",
 *   cameraState: {
 *     distance: 10,
 *     perspective: true,
 *     phi: 0.5,
 *     target: [0, 0, 0],
 *     targetOffset: [0, 0, 0],
 *     targetOrientation: [0, 0, 0, 1],
 *     thetaOffset: 0
 *   },
 *   transforms: {},
 *   topics: {
 *     "/points": { visible: true, colorMode: "flat" }
 *   }
 * };
 *
 * // プロットパネルの設定例
 * const plotConfig: PanelConfig = {
 *   paths: [
 *     { value: "/odom.pose.pose.position.x", enabled: true },
 *     { value: "/odom.pose.pose.position.y", enabled: true }
 *   ],
 *   minYValue: -10,
 *   maxYValue: 10,
 *   showLegend: true
 * };
 * ```
 */
export type PanelConfig = {
  /** パネル固有の設定プロパティ */
  [key: string]: unknown;
};

/**
 * 時刻表示方法
 *
 * @description タイムスタンプの表示形式を指定します。
 * - SEC: 秒単位での表示
 * - TOD: 時刻形式での表示 (Time of Day)
 */
export type TimeDisplayMethod = "SEC" | "TOD";

/**
 * 再生制御の設定
 *
 * @description データの再生速度を制御する設定です。
 *
 * @example
 * ```typescript
 * const playbackConfig: PlaybackConfig = {
 *   speed: 2.0  // 2倍速再生
 * };
 * ```
 */
export type PlaybackConfig = {
  /** 再生速度の倍率 (1.0が通常速度) */
  speed: number;
};

/**
 * ユーザースクリプト
 *
 * @description ユーザーが定義したカスタムスクリプトの情報です。
 *
 * @example
 * ```typescript
 * const userScript: UserScript = {
 *   name: "データ変換スクリプト",
 *   sourceCode: `
 *     export const inputs = ["/sensor_data"];
 *     export const output = "/processed_data";
 *
 *     export default function script(event) {
 *       return {
 *         topic: output,
 *         datatype: "custom_msgs/ProcessedData",
 *         message: {
 *           processed_value: event.message.raw_value * 2,
 *           timestamp: event.message.header.stamp
 *         }
 *       };
 *     }
 *   `
 * };
 * ```
 */
export type UserScript = {
  /** スクリプトの名前 */
  name: string;
  /** スクリプトのソースコード */
  sourceCode: string;
};

/**
 * ユーザースクリプトのコレクション
 *
 * @description スクリプトIDをキーとして、複数のユーザースクリプトを管理します。
 *
 * @example
 * ```typescript
 * const userScripts: UserScripts = {
 *   "data-processor": {
 *     name: "データ処理",
 *     sourceCode: "// データ処理ロジック"
 *   },
 *   "alert-generator": {
 *     name: "アラート生成",
 *     sourceCode: "// アラート生成ロジック"
 *   }
 * };
 * ```
 */
export type UserScripts = {
  /** スクリプトIDをキーとするユーザースクリプトのマップ */
  [scriptId: string]: UserScript;
};

/**
 * パネル設定の保存関数型
 *
 * @description パネルの設定を更新するための関数型です。
 * 部分的な設定更新と関数による設定更新の両方をサポートします。
 *
 * @template Config - パネル設定の型
 * @param newConfig - 新しい設定値または設定更新関数
 *
 * @example
 * ```typescript
 * // 部分的な設定更新
 * saveConfig({ showLegend: true });
 *
 * // 関数による設定更新
 * saveConfig((oldConfig) => ({
 *   ...oldConfig,
 *   paths: [...oldConfig.paths, newPath]
 * }));
 * ```
 */
export type SaveConfig<Config> = (
  newConfig: Partial<Config> | ((oldConfig: Config) => Partial<Config>),
) => void;

/**
 * 保存されたパネル設定のコレクション
 *
 * @description パネルIDをキーとして、各パネルの設定を保存します。
 *
 * @example
 * ```typescript
 * const savedProps: SavedProps = {
 *   "3d-panel-1": {
 *     followTf: "base_link",
 *     cameraState: { distance: 10 }
 *   },
 *   "plot-panel-1": {
 *     paths: [{ value: "/odom.pose.pose.position.x", enabled: true }],
 *     showLegend: true
 *   }
 * };
 * ```
 */
export type SavedProps = {
  /** パネルIDをキーとするパネル設定のマップ */
  [panelId: string]: PanelConfig;
};

/**
 * 兄弟パネルを開く関数型
 *
 * @description 現在のパネルの隣に新しいパネルを開くための関数型です。
 *
 * @example
 * ```typescript
 * const openSiblingPanel: OpenSiblingPanel = ({ panelType, siblingConfigCreator, updateIfExists }) => {
 *   // 兄弟パネルを開く実装
 * };
 *
 * // 使用例
 * openSiblingPanel({
 *   panelType: "Plot",
 *   siblingConfigCreator: (config) => ({
 *     ...config,
 *     paths: [...config.paths, "/new/topic"]
 *   }),
 *   updateIfExists: true
 * });
 * ```
 */
export type OpenSiblingPanel = (params: {
  /** 開くパネルの種類 */
  panelType: string;
  /** 兄弟パネルの設定を作成する関数 */
  siblingConfigCreator: (config: PanelConfig) => PanelConfig;
  /** 既存のパネルがある場合に更新するかどうか */
  updateIfExists: boolean;
}) => void;
