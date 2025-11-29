// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview 境界値計算ユーティリティ
 *
 * このファイルは、1次元および2次元空間での境界値（範囲）を表現し、
 * 操作するための型定義とユーティリティ関数を提供します。
 *
 * 主な用途:
 * - チャートやプロットの表示範囲計算
 * - 2D/3D空間での当たり判定
 * - データの最小値・最大値の管理
 * - ズーム機能での表示領域計算
 */

import { Immutable } from "@lichtblick/suite";

/**
 * 1次元の境界値
 *
 * @description 1次元空間での範囲を表現します。
 * 最小値と最大値のペアで定義されます。
 *
 * @example
 * ```typescript
 * // 温度の範囲
 * const temperatureRange: Bounds1D = {
 *   min: -10.0,
 *   max: 40.0
 * };
 *
 * // 時間の範囲
 * const timeRange: Bounds1D = {
 *   min: 0,
 *   max: 3600  // 1時間
 * };
 * ```
 */
export type Bounds1D = {
  /** 最小値 */
  min: number;
  /** 最大値 */
  max: number;
};

/**
 * 2次元の矩形領域を表す境界値
 *
 * @description 2次元空間での矩形領域を表現します。
 * X軸とY軸それぞれの範囲で定義されます。
 *
 * @example
 * ```typescript
 * // 地図の表示領域
 * const mapBounds: Bounds = {
 *   x: { min: -100.0, max: 100.0 },  // 東西方向の範囲
 *   y: { min: -50.0, max: 50.0 }     // 南北方向の範囲
 * };
 *
 * // チャートの表示範囲
 * const chartBounds: Bounds = {
 *   x: { min: 0, max: 1000 },        // 時間軸
 *   y: { min: -5, max: 15 }          // 値軸
 * };
 * ```
 */
export type Bounds = {
  /** X軸方向の境界値 */
  x: Bounds1D;
  /** Y軸方向の境界値 */
  y: Bounds1D;
};

/**
 * 2つの1次元境界値の和集合を計算
 *
 * @description 2つの1次元境界値を統合し、両方を含む最小の境界値を返します。
 * データの範囲を動的に拡張する際に使用されます。
 *
 * @param a - 最初の境界値
 * @param b - 2番目の境界値
 * @returns 両方の境界値を含む統合された境界値
 *
 * @example
 * ```typescript
 * const range1: Bounds1D = { min: 0, max: 10 };
 * const range2: Bounds1D = { min: 5, max: 15 };
 *
 * const combined = unionBounds1D(range1, range2);
 * // 結果: { min: 0, max: 15 }
 *
 * const range3: Bounds1D = { min: -5, max: 3 };
 * const combined2 = unionBounds1D(combined, range3);
 * // 結果: { min: -5, max: 15 }
 * ```
 */
export function unionBounds1D(a: Immutable<Bounds1D>, b: Immutable<Bounds1D>): Bounds1D {
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

/**
 * 境界値を指定した値を含むように拡張
 *
 * @description 既存の境界値を、指定した値を含むように拡張します。
 * 境界値オブジェクトは直接変更され、同じオブジェクトが返されます。
 *
 * @param bounds - 拡張対象の境界値（直接変更される）
 * @param value - 境界値に含めたい値
 *
 * @example
 * ```typescript
 * const bounds: Bounds1D = { min: 5, max: 10 };
 *
 * // 小さい値で拡張
 * extendBounds1D(bounds, 2);
 * // bounds は { min: 2, max: 10 } になる
 *
 * // 大きい値で拡張
 * extendBounds1D(bounds, 15);
 * // bounds は { min: 2, max: 15 } になる
 *
 * // 範囲内の値では変更されない
 * extendBounds1D(bounds, 8);
 * // bounds は { min: 2, max: 15 } のまま
 * ```
 *
 * @note この関数は境界値オブジェクトを直接変更します（ミューテーション）
 */
export function extendBounds1D(bounds: Bounds1D, value: number): void {
  bounds.min = Math.min(bounds.min, value);
  bounds.max = Math.max(bounds.max, value);
}
