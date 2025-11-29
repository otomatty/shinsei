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
 * @fileoverview ホバー値の型定義
 *
 * このファイルは、UIコンポーネントでのホバー操作時に表示される
 * 値の情報を定義します。主にタイムライン、チャート、プロットなどで
 * マウスホバー時の詳細情報表示に使用されます。
 */

/**
 * ホバー時に表示される値の情報
 *
 * @description マウスホバー時に表示される値とその関連情報を定義します。
 *
 * 主な用途:
 * - タイムライン上でのホバー情報
 * - チャート/グラフでのデータポイント詳細
 * - プロット上での値表示
 * - 時系列データの詳細表示
 *
 * @example
 * ```typescript
 * // 再生時間のホバー値
 * const playbackHover: HoverValue = {
 *   value: 123.456,
 *   componentId: "timeline-scrubber",
 *   type: "PLAYBACK_SECONDS"
 * };
 *
 * // その他の値のホバー値
 * const customHover: HoverValue = {
 *   value: 42.0,
 *   componentId: "custom-chart",
 *   type: "OTHER"
 * };
 * ```
 */
export type HoverValue = {
  /** ホバー対象の数値 */
  value: number;
  /** ホバー値を提供するコンポーネントの識別子 */
  componentId: string;
  /** ホバー値の種類 */
  type: "PLAYBACK_SECONDS" | "OTHER";
};
