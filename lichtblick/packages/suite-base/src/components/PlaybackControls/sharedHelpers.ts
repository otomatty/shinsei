// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

/**
 * PlaybackControls 共有ヘルパー関数
 *
 * @overview
 * PlaybackControls コンポーネント群で共有される時間計算とシーク操作のヘルパー関数。
 * キーボードショートカットによる時間移動の計算ロジックを提供し、
 * 統一的な操作体験を実現する。
 *
 * @features
 * - キーボード修飾キーに基づく時間移動量の計算
 * - 前進/後退方向の統一インターフェース
 * - ミリ秒単位での正確な時間計算
 * - 3段階の移動速度対応
 *
 * @architecture
 * - rostime ライブラリを使用した時間操作
 * - 修飾キーベースの時間移動量決定
 * - 方向定数による統一的な前進/後退操作
 * - 純粋関数による副作用なし設計
 *
 * @keyboardShortcuts
 * - Alt + 矢印キー: 500ms移動（大きなジャンプ）
 * - Shift + 矢印キー: 10ms移動（細かいジャンプ）
 * - 矢印キーのみ: 100ms移動（デフォルト）
 *
 * @performance
 * 時間計算は ミリ秒→秒→ミリ秒 の変換で高精度を維持。
 * JavaScript の Number 型で表現可能な範囲内での正確な時間操作を保証。
 *
 * @usageExample
 * ```typescript
 * import { DIRECTION, jumpSeek } from './sharedHelpers';
 *
 * // デフォルト前進
 * const nextTime = jumpSeek(DIRECTION.FORWARD, currentTime);
 *
 * // キーボードイベント対応
 * const onKeyDown = (ev: KeyboardEvent) => {
 *   if (ev.key === 'ArrowRight') {
 *     const targetTime = jumpSeek(DIRECTION.FORWARD, currentTime, ev);
 *     player.seek(targetTime);
 *   }
 * };
 * ```
 */

import { Time, toMillis, fromMillis } from "@lichtblick/rostime";

/** 大きなジャンプの時間移動量（ミリ秒）- Alt + 矢印キー */
const ARROW_SEEK_BIG_MS = 500;
/** デフォルトの時間移動量（ミリ秒）- 矢印キーのみ */
const ARROW_SEEK_DEFAULT_MS = 100;
/** 小さなジャンプの時間移動量（ミリ秒）- Shift + 矢印キー */
const ARROW_SEEK_SMALL_MS = 10;

/**
 * シーク方向の定数
 *
 * @constant
 * @description
 * 時間軸上での前進/後退方向を表す定数。
 * jumpSeek 関数で使用される。
 */
export const DIRECTION = {
  /** 前進方向（時間軸上で未来へ） */
  FORWARD: 1,
  /** 後退方向（時間軸上で過去へ） */
  BACKWARD: -1,
};

/**
 * キーボード修飾キーに基づく時間ジャンプ計算
 *
 * @description
 * 現在時刻からキーボードの修飾キーに応じた時間移動を計算。
 * PlaybackControls のキーボードショートカット機能で使用。
 *
 * @algorithm
 * 1. 修飾キーによる移動量の決定
 * 2. 方向符号による前進/後退の適用
 * 3. ミリ秒単位での時間計算
 *
 * @param directionSign - 移動方向（DIRECTION.FORWARD または DIRECTION.BACKWARD）
 * @param currentTime - 現在の時刻
 * @param modifierKeys - キーボード修飾キーの状態
 * @param modifierKeys.altKey - Alt キーが押されているか
 * @param modifierKeys.shiftKey - Shift キーが押されているか
 *
 * @returns 移動先の時刻
 *
 * @example
 * ```typescript
 * // 100ms前進
 * const nextTime = jumpSeek(DIRECTION.FORWARD, currentTime);
 *
 * // 500ms後退（Alt + 左矢印）
 * const prevTime = jumpSeek(DIRECTION.BACKWARD, currentTime, { altKey: true });
 *
 * // 10ms前進（Shift + 右矢印）
 * const smallStep = jumpSeek(DIRECTION.FORWARD, currentTime, { shiftKey: true });
 * ```
 */
export const jumpSeek = (
  directionSign: (typeof DIRECTION)[keyof typeof DIRECTION],
  currentTime: Time,
  modifierKeys?: { altKey: boolean; shiftKey: boolean },
  defaultStepSize?: number,
): Time => {
  const timeMs = toMillis(currentTime);

  const correctSeekValue =
    typeof defaultStepSize === "number" && !isNaN(defaultStepSize) && defaultStepSize > 0;

  let deltaMs: number;
  if (modifierKeys?.altKey === true) {
    deltaMs = ARROW_SEEK_BIG_MS;
  } else if (modifierKeys?.shiftKey === true) {
    deltaMs = ARROW_SEEK_SMALL_MS;
  } else {
    deltaMs = correctSeekValue ? defaultStepSize : ARROW_SEEK_DEFAULT_MS;
  }

  return fromMillis(timeMs + deltaMs * directionSign);
};
