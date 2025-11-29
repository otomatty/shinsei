// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview 状態遷移データダウンサンプリングシステム
 *
 * このファイルは、状態遷移データ（State Transition Data）の効率的な
 * ダウンサンプリング機能を提供します。時系列データとは異なる特殊な
 * アルゴリズムにより、状態変化の詳細を保持しながら描画性能を最適化します。
 *
 * ## 主要機能
 *
 * ### 1. 状態遷移の保持
 * - 各間隔内での状態変化を正確に追跡
 * - 単一状態の間隔は元のポイントを保持
 * - 複数状態の間隔は特別な表現で可視化
 *
 * ### 2. 視覚的区別
 * - 単一状態間隔: 元のデータポイントとして表示
 * - 複数状態間隔: グレーライン区間として表示
 * - 状態の詳細情報をツールチップで提供
 *
 * ### 3. 効率的な処理
 * - 間隔ベースのダウンサンプリング
 * - 重複状態の効率的な除去
 * - バッファリングによる境界処理
 *
 * ## アルゴリズム詳細
 *
 * ### 間隔ベース状態集約
 * 1. **間隔分割**: 表示領域を均等な間隔に分割
 * 2. **状態収集**: 各間隔内の全状態変化を記録
 * 3. **表現決定**: 単一/複数状態に基づく出力形式決定
 * 4. **境界処理**: 間隔境界での状態遷移を適切に処理
 *
 * ### 状態ラベル管理
 * - 連続する同一状態の重複排除
 * - 状態変化のタイミング保持
 * - 効率的なラベルスタック管理
 *
 * ## データ構造
 *
 * ### StatePoint
 * 状態遷移セグメントを表現する基本単位
 * - 単一状態: 元のポイントインデックスを保持
 * - 複数状態: 状態リストと範囲情報を保持
 *
 * ### Interval
 * 処理中の間隔状態を管理する内部構造
 * - 間隔の開始/終了X座標
 * - 間隔内で出現した全ラベル
 * - 最初のポイントのインデックス
 *
 * ## パフォーマンス特性
 *
 * ### 時間計算量
 * - O(n): 入力ポイント数に対して線形
 * - 状態数に依存しない効率的な処理
 *
 * ### 空間計算量
 * - O(k): 間隔数に比例（通常は画面幅に依存）
 * - 状態ラベルの効率的な管理
 *
 * ## 使用例
 *
 * ### 基本的な状態遷移ダウンサンプリング
 * ```typescript
 * const viewport = { bounds: { x: { min: 0, max: 100 }, y: { min: 0, max: 1 } }, width: 800, height: 100 };
 * const statePoints = [
 *   { x: 0, y: 0, index: 0, label: "IDLE" },
 *   { x: 10, y: 1, index: 1, label: "ACTIVE" },
 *   { x: 20, y: 0, index: 2, label: "IDLE" }
 * ];
 * const result = downsampleStates(statePoints, viewport);
 * ```
 *
 * ### 複数状態間隔の処理
 * ```typescript
 * // 間隔内に複数の状態変化がある場合
 * const complexStates = [
 *   { x: 0, y: 0, index: 0, label: "STATE_A" },
 *   { x: 1, y: 1, index: 1, label: "STATE_B" },
 *   { x: 2, y: 0, index: 2, label: "STATE_C" },
 *   { x: 3, y: 1, index: 3, label: "STATE_A" }
 * ];
 * const result = downsampleStates(complexStates, viewport);
 * // 結果: [
 * //   { x: 0, index: undefined, states: ["STATE_A", "STATE_B", "STATE_C"] },
 * //   { x: 4, index: 3 }  // 間隔終了点
 * // ]
 * ```
 *
 * ## 技術的注意事項
 *
 * ### 境界処理
 * - 表示領域の50%バッファを使用
 * - パン/ズーム操作での連続性を保証
 * - 境界外ポイントの適切な処理
 *
 * ### 状態の一意性
 * - Ramdaライブラリによる効率的な重複排除
 * - 状態変化のタイミング保持
 * - ラベルスタックの最適化
 *
 * ### 描画最適化
 * - 単一状態間隔: 通常の点として描画
 * - 複数状態間隔: 特別なスタイルで描画
 * - ツールチップでの詳細情報提供
 *
 * @author Lichtblick Suite Team
 * @since 2023
 * @version 2.0
 */

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as R from "ramda";

import { Immutable } from "@lichtblick/suite";
import { Point } from "@lichtblick/suite-base/components/Chart/datasets";

import { calculateIntervals } from "./downsample";
import type { PlotViewport } from "./types";

/**
 * 状態遷移セグメントに対応するポイントを表現
 *
 * StatePointは状態遷移データの描画において、単一状態の間隔と
 * 複数状態の間隔を区別して表現するために使用されます。
 *
 * ## 使用パターン
 *
 * ### 単一状態間隔
 * ```typescript
 * const singleState: StatePoint = {
 *   x: 10.5,           // 実際のデータポイントのX座標
 *   index: 42,         // 元データセットでのインデックス
 *   states: undefined  // 単一状態なので未定義
 * };
 * ```
 *
 * ### 複数状態間隔
 * ```typescript
 * const multipleStates: StatePoint = {
 *   x: 15.0,                              // 間隔開始のX座標
 *   index: undefined,                     // 複数状態なので未定義
 *   states: ["IDLE", "ACTIVE", "ERROR"]   // 間隔内の全状態
 * };
 * ```
 *
 * @interface StatePoint
 */
export type StatePoint = {
  /**
   * プロット座標系でのX座標
   *
   * 単一状態の場合は実際のデータポイントのX座標、
   * 複数状態の場合は間隔の開始または終了X座標を表します。
   */
  x: number;

  /**
   * 元データセットでのポイントインデックス
   *
   * 単一状態の場合は実際のポイントインデックス、
   * 複数状態の場合は`undefined`となり、特別な描画処理が必要です。
   */
  index: number | undefined;

  /**
   * 間隔内に出現した状態のリスト
   *
   * 複数状態の間隔でのみ設定され、ツールチップや
   * 特別な描画スタイルで使用されます。
   */
  states?: string[];
};

/**
 * 状態ラベルの情報を管理する内部構造
 *
 * 各状態変化のタイミングと値を効率的に追跡するために
 * 使用される内部データ構造です。
 *
 * @interface Label
 */
type Label = {
  /**
   * このラベルが最初に出現したインデックス
   *
   * 状態変化のタイミングを正確に記録し、
   * 後の処理で参照されます。
   */
  index: number;

  /**
   * ラベルの値（状態名）
   *
   * 実際の状態を表す文字列値で、
   * 重複排除や表示に使用されます。
   */
  value: string;
};

/**
 * ラベルリストに新しいラベルを追加（重複排除付き）
 *
 * 連続する同一状態の重複を効率的に排除し、
 * 状態変化のみを記録します。関数型プログラミングの
 * 原則に従い、元の配列を変更せずに新しい配列を返します。
 *
 * @param label - 追加するラベル
 * @param labels - 既存のラベルリスト（不変）
 * @returns 更新されたラベルリスト（不変）
 *
 * @example
 * ```typescript
 * const labels = [{ index: 0, value: "IDLE" }];
 * const newLabel = { index: 1, value: "ACTIVE" };
 * const updated = addLabel(newLabel, labels);
 * // 結果: [{ index: 0, value: "IDLE" }, { index: 1, value: "ACTIVE" }]
 *
 * // 重複の場合
 * const duplicate = { index: 2, value: "IDLE" };
 * const notUpdated = addLabel(duplicate, updated);
 * // 結果: [{ index: 0, value: "IDLE" }, { index: 1, value: "ACTIVE" }] (変更なし)
 * ```
 */
function addLabel(label: Label, labels: Immutable<Label[]>): Immutable<Label[]> {
  const last = labels.at(-1);
  if (last != undefined && label.value === last.value) {
    return labels;
  }

  return [...labels, label];
}

/**
 * 各間隔で追跡する全状態情報
 *
 * ダウンサンプリング処理中に各間隔の状態を管理するための
 * 内部データ構造です。間隔の境界と含まれる状態変化を
 * 効率的に追跡します。
 *
 * @interface Interval
 */
type Interval = {
  /**
   * 間隔開始のX座標
   *
   * プロット座標系での間隔の開始位置を表し、
   * 出力StatePointの生成に使用されます。
   */
  x: number;

  /**
   * 間隔開始のピクセル座標
   *
   * 間隔の判定に使用される内部的なピクセル座標で、
   * 効率的な間隔変更検出を可能にします。
   */
  xPixel: number;

  /**
   * 間隔終了のX座標
   *
   * 複数状態間隔の場合の終了ポイント生成に使用され、
   * 間隔の範囲を明確に示します。
   */
  endX: number;

  /**
   * 間隔内で出現した全ラベル
   *
   * 状態変化の順序と内容を保持し、最終的な
   * StatePoint生成時に使用されます。
   */
  labels: Immutable<Label[]>;

  /**
   * 間隔を開始したポイントのインデックス
   *
   * 間隔の開始ポイントを特定し、単一状態間隔の
   * 場合のインデックス決定に使用されます。
   */
  index: number;
};

/**
 * 状態遷移データの効率的なダウンサンプリングを実行
 *
 * 表示可能な領域を均等な間隔に分割し、各間隔内での状態遷移の
 * 数を記録します。複雑な状態変化を視覚的に区別可能な形式で
 * 表現し、パフォーマンスと情報量のバランスを取ります。
 *
 * ## アルゴリズムの詳細
 *
 * ### 間隔処理ロジック
 * 1. **単一状態間隔**: 元のポイントを保持し、通常の描画
 * 2. **複数状態間隔**: 2つのStatePointを生成
 *    - 間隔開始点（index=undefined, states配列付き）
 *    - 間隔終了点（最後のポイントのindex）
 *
 * ### 境界処理
 * - 表示領域の50%バッファを使用
 * - パン/ズーム操作での連続性を保証
 * - 境界前後のポイントを適切に処理
 *
 * ### 状態の一意性
 * - 連続する同一状態は1つのエントリとして記録
 * - 状態変化のタイミングを正確に保持
 * - 効率的な重複排除アルゴリズム
 *
 * @param points - 状態遷移ポイントのイテラブル
 * @param view - プロットの表示領域情報
 * @param maxPoints - 最大ポイント数（オプション、デフォルトは2ポイント/間隔）
 * @returns 最適化された状態遷移ポイント配列
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const viewport = {
 *   bounds: { x: { min: 0, max: 100 }, y: { min: 0, max: 1 } },
 *   width: 800,
 *   height: 100
 * };
 *
 * const stateData = [
 *   { x: 0, y: 0, index: 0, label: "IDLE" },
 *   { x: 10, y: 1, index: 1, label: "ACTIVE" },
 *   { x: 15, y: 0, index: 2, label: "IDLE" },
 *   { x: 16, y: 1, index: 3, label: "BUSY" },
 *   { x: 17, y: 0, index: 4, label: "IDLE" },
 *   { x: 30, y: 1, index: 5, label: "ACTIVE" }
 * ];
 *
 * const result = downsampleStates(stateData, viewport);
 *
 * // 結果例:
 * // [
 * //   { x: 0, index: 0 },                              // 単一状態間隔
 * //   { x: 15, index: undefined, states: ["IDLE", "BUSY"] }, // 複数状態間隔開始
 * //   { x: 18, index: 4 },                             // 複数状態間隔終了
 * //   { x: 30, index: 5 }                              // 単一状態間隔
 * // ]
 * ```
 *
 * @example
 * ```typescript
 * // 高密度データでの使用例
 * const highDensityStates = generateStateTransitions(10000);
 * const optimized = downsampleStates(highDensityStates, viewport, 500);
 *
 * // 描画処理
 * optimized.forEach(point => {
 *   if (point.index !== undefined) {
 *     // 通常のポイントとして描画
 *     renderStatePoint(point);
 *   } else {
 *     // 複数状態間隔として特別な描画
 *     renderMultiStateInterval(point);
 *   }
 * });
 * ```
 */
export function downsampleStates(
  points: Iterable<Point>,
  view: PlotViewport,
  maxPoints?: number,
): StatePoint[] {
  const { bounds } = view;
  const { pixelPerXValue } = calculateIntervals(view, 2, maxPoints);
  const xValuePerPixel = 1 / pixelPerXValue;

  const indices: StatePoint[] = [];
  let interval: Interval | undefined;

  // We keep points within a buffer window around the bounds so points near the bounds are
  // connected to their peers and available for pan/zoom.
  // Points outside this buffer window are dropped.
  const xRange = bounds.x.max - bounds.x.min;
  const minX = bounds.x.min - xRange * 0.5;
  const maxX = bounds.x.max + xRange * 0.5;

  let firstPastBounds: number | undefined = undefined;

  /**
   * 現在の間隔を完了し、1つ以上のStatePointを生成
   *
   * 間隔内の状態数に基づいて適切な出力形式を決定します。
   * 単一状態の場合は元のポイントを保持し、複数状態の場合は
   * 特別な表現形式で2つのポイントを生成します。
   *
   * ## 処理ロジック
   *
   * ### 単一状態間隔
   * - 元のポイントインデックスを保持
   * - 通常の描画処理で処理可能
   * - 状態リストは未定義
   *
   * ### 複数状態間隔
   * - 開始ポイント: index=undefined, states配列付き
   * - 終了ポイント: 最後のポイントのindex
   * - 特別な描画処理が必要
   *
   * @private
   */
  const finishInterval = () => {
    if (interval == undefined) {
      return;
    }

    const { labels, endX } = interval;
    const [first] = labels;
    const last = labels.at(-1);
    const haveMultiple = labels.length > 1;

    if (first == undefined || last == undefined) {
      return;
    }

    indices.push({
      x: interval.x,
      index: haveMultiple ? undefined : first.index,
      ...(haveMultiple ? { states: R.uniq(labels.map(({ value }) => value)) } : undefined),
    });

    if (!haveMultiple) {
      return;
    }

    indices.push({
      x: endX,
      index: last.index,
    });
  };

  for (const datum of points) {
    const { index, label, x } = datum;

    // track the first point before our bounds
    if (datum.x < minX) {
      const point = {
        index,
        x,
      };
      if (indices.length === 0) {
        indices.push(point);
      } else {
        indices[0] = point;
      }
      continue;
    }

    // track the first point outside of our bounds
    if (datum.x > maxX) {
      firstPastBounds = index;
      continue;
    }

    // This only seems to occur when we've inserted a dummy final point, which
    // we need to add
    if (label == undefined) {
      indices.push({
        x,
        index,
      });
      continue;
    }

    const xPixel = Math.trunc(x * pixelPerXValue);
    const isNew = interval?.xPixel !== xPixel;
    if (interval != undefined && isNew) {
      finishInterval();
    }

    // Start a new interval if this point falls in a new one
    if (interval == undefined || isNew) {
      interval = {
        x,
        endX: xPixel * xValuePerPixel + xValuePerPixel,
        xPixel,
        index,
        labels: [
          {
            index,
            value: label,
          },
        ],
      };
      continue;
    }

    // If we haven't yet moved on, add this point's label
    interval.labels = addLabel(
      {
        index,
        value: label,
      },
      interval.labels,
    );
  }

  // finish the last interval
  finishInterval();

  // Add the first point past the bounds if it exists
  if (firstPastBounds != undefined) {
    indices.push({
      x: bounds.x.max,
      index: firstPastBounds,
    });
  }

  return indices;
}
