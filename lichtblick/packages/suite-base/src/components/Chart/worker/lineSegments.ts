// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PointElement, ScriptableLineSegmentContext } from "chart.js";

/**
 * ラベルカラー情報を持つポイント要素の型定義
 *
 * Chart.jsのPointElementを拡張し、rawデータ内にlabelColor情報を含む
 * ポイント要素を表します。状態遷移パネルなどで、線分ごとに異なる色を
 * 適用する際に使用されます。
 */
type PointElementWithRawData = PointElement & {
  /** 生データ情報 */
  raw: {
    /** ラベルカラー（未定義の場合もある） */
    labelColor: undefined | string;
  };
};

/**
 * ポイント要素がラベルカラー情報を持つかどうかを判定する型ガード
 *
 * @param element - 判定対象のポイント要素
 * @returns ラベルカラー情報を持つ場合はtrue
 *
 * @example
 * ```typescript
 * if (isPointElementWithRawData(point)) {
 *   const color = point.raw.labelColor;
 *   // ラベルカラーを安全に使用できる
 * }
 * ```
 */
function isPointElementWithRawData(element: PointElement): element is PointElementWithRawData {
  return "raw" in element;
}

/**
 * 線分セグメントのラベルカラーを取得する関数
 *
 * Chart.jsの線分描画時に呼び出され、各セグメントの色を動的に決定します。
 * 主に状態遷移パネルで使用され、単一の線上で異なる色のセグメントを
 * 描画する際に重要な役割を果たします。
 *
 * ## 使用場面
 * - 状態遷移の可視化（各状態で異なる色）
 * - 時系列データの条件別色分け
 * - 動的な線分カラーリング
 *
 * ## 技術的詳細
 * この関数はChart.jsのsegment.borderColor設定で使用され、
 * WebWorker内で実行されるため、関数の直列化が不可能です。
 * そのため、ChartJSManager内で直接定義される必要があります。
 *
 * @param context - Chart.jsの線分セグメントコンテキスト
 * @returns ラベルカラー文字列、または未定義
 *
 * @example
 * ```typescript
 * // Chart.jsデータセット設定での使用例
 * const dataset = {
 *   data: chartData,
 *   segment: {
 *     borderColor: lineSegmentLabelColor // この関数が各セグメントで呼び出される
 *   }
 * };
 * ```
 */
export function lineSegmentLabelColor(context: ScriptableLineSegmentContext): undefined | string {
  if (isPointElementWithRawData(context.p0)) {
    return context.p0.raw.labelColor!;
  }
  return undefined;
}
