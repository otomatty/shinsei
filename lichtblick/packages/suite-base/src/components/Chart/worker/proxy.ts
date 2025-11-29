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

import { ChartData } from "chart.js";
import * as R from "ramda";

import { findIndices } from "../datasets";
import { TypedChartData, TypedData } from "../types";

/** 型付きデータセット（型付き配列形式） */
type TypedDataSet = TypedChartData["datasets"][0];
/** 通常のデータセット（オブジェクト配列形式） */
type NormalDataSet = ChartData<"scatter">["datasets"][0];

/**
 * 型付きデータセットを通常のデータセットにプロキシする関数
 *
 * 型付き配列（TypedArray）形式のデータセットを、Chart.jsが期待する
 * オブジェクト配列形式にプロキシします。実際のデータ変換は行わず、
 * JavaScriptのProxyを使用して動的にアクセスを変換します。
 *
 * ## パフォーマンス最適化
 * - 大量データの場合、全データを変換するとメモリ使用量が増大
 * - Proxyを使用することで、必要な時のみデータを変換
 * - 型付き配列の高速性を維持しながらChart.js互換性を確保
 *
 * ## 技術的詳細
 * - `length`プロパティ: 全データポイント数を計算
 * - インデックスアクセス: 動的にスライスとオフセットを計算
 * - `_chartjs`プロパティ: Chart.js内部使用のため未定義を返す
 * - `isExtensible`: 配列の拡張を禁止
 *
 * @param dataset - 型付きデータセット
 * @returns Chart.js互換の通常データセット
 *
 * @example
 * ```typescript
 * const typedDataset = {
 *   label: "Temperature",
 *   data: [
 *     { x: new Float64Array([1, 2, 3]), y: new Float64Array([10, 20, 30]) }
 *   ]
 * };
 *
 * const normalDataset = proxyDataset(typedDataset);
 * // normalDataset.data[0] => { x: 1, y: 10 }
 * // normalDataset.data[1] => { x: 2, y: 20 }
 * ```
 */
function proxyDataset(dataset: TypedDataSet): NormalDataSet {
  const { data } = dataset;

  // 全データポイント数を計算（各スライスのx配列の長さの合計）
  const length = R.pipe(
    R.map((v: TypedData) => v.x.length),
    R.sum,
  )(data);

  return {
    ...dataset,
    data: new Proxy(Object.seal([]), {
      /**
       * 配列の拡張を禁止
       * Chart.jsが配列を変更しようとすることを防ぐ
       */
      isExtensible() {
        return false;
      },

      /**
       * プロパティアクセスの動的処理
       *
       * @param target - プロキシ対象（空配列）
       * @param prop - アクセスされるプロパティ
       * @returns 計算されたプロパティ値
       */
      get(target, prop, __) {
        // Chart.js内部プロパティは未定義を返す
        if (prop === "_chartjs") {
          return undefined;
        }

        // 配列の長さを返す
        if (prop === "length") {
          return length;
        }

        // 文字列以外のプロパティは元の配列から取得
        if (typeof prop !== "string") {
          // dangerous, but required for ChartJS to function properly
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return target[prop as any];
        }

        // インデックスアクセスの処理
        const index = parseInt(prop);
        if (index < 0 || index >= length) {
          return undefined;
        }

        // インデックスから対応するスライスとオフセットを計算
        const indices = findIndices(data, index);
        if (indices == undefined) {
          return undefined;
        }

        const [sliceIndex, offset] = indices;
        const slice = data[sliceIndex];
        if (slice == undefined) {
          return undefined;
        }

        // 各プロパティ（x, y, labelなど）の値を取得してオブジェクトを構築
        const point: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(slice)) {
          point[key] = value[offset];
        }

        return point;
      },
    }),
  } as NormalDataSet;
}

/**
 * 型付きチャートデータを通常のチャートデータにプロキシする関数
 *
 * 型付き配列（TypedArray）形式のチャートデータを、Chart.jsが期待する
 * オブジェクト配列形式にプロキシします。大量のデータを効率的に処理
 * するための主要な変換関数です。
 *
 * ## 使用場面
 * - 大量の時系列データの可視化
 * - リアルタイムデータストリーミング
 * - メモリ効率が重要な環境
 * - WebWorkerでの高速データ処理
 *
 * ## パフォーマンス特性
 * - **メモリ効率**: データ変換を行わずプロキシで動的アクセス
 * - **処理速度**: 型付き配列の高速性を維持
 * - **遅延評価**: 必要な時のみデータポイントを計算
 *
 * ## 技術的背景
 * Chart.jsはオブジェクト配列 `[{x: 1, y: 2}, ...]` を期待しますが、
 * 大量データでは型付き配列 `{x: Float64Array, y: Float64Array}` の方が
 * メモリ効率と処理速度で優れています。この関数はその橋渡しを行います。
 *
 * @param data - 型付きチャートデータ
 * @returns Chart.js互換の通常チャートデータ
 *
 * @example
 * ```typescript
 * const typedChartData: TypedChartData = {
 *   datasets: [{
 *     label: "Sensor Data",
 *     data: [{
 *       x: new Float64Array([1, 2, 3, 4, 5]),
 *       y: new Float64Array([10, 15, 12, 18, 20])
 *     }]
 *   }]
 * };
 *
 * const normalChartData = proxyTyped(typedChartData);
 * // Chart.jsで使用可能
 * const chart = new Chart(canvas, {
 *   type: 'scatter',
 *   data: normalChartData
 * });
 * ```
 */
export function proxyTyped(data: TypedChartData): ChartData<"scatter"> {
  return {
    ...data,
    datasets: data.datasets.map(proxyDataset),
  };
}
