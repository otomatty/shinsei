// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ChartDataset } from "chart.js";
import * as R from "ramda";

import { TypedData, ObjectData } from "./types";

export type Point = { index: number; x: number; y: number; label?: string | undefined };

/**
 * iterateObjects iterates over ObjectData, yielding a `Point` for each entry.
 */
export function* iterateObjects(dataset: ObjectData): Generator<Point> {
  let index = 0;
  for (const datum of dataset) {
    if (datum == undefined) {
      index++;
      continue;
    }

    const { x, y, label } = datum;
    yield {
      index,
      x,
      y,
      label,
    };
    index++;
  }
}

/**
 * ExtractPoint maps an object type with array properties to one with the
 * arrays replaced by their element type. For example:
 * type Foo = {
 *   foo: Float32Array;
 *   bar: number[];
 *   baz: string[];
 * }
 * would be mapped to:
 * ExtractPoint<Foo> == {
 *   foo: number;
 *   bar: number;
 *   baz: string;
 * }
 * It is used to go from `TypedData`'s various incarnations to what a single
 * point would look like as a `Datum`.
 *
 * These `any`s do not introduce anything unsafe; they are necessary for
 * specifying the type (which is ultimately type-checked at point of use.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtractPoint<T extends { [key: string]: Array<any> | Float32Array }> = {
  [P in keyof T]-?: NonNullable<T[P]>[0];
} & {
  index: number;
  // downsampling requires a label, so even if T does not have a `label` property, we still
  // include one
  label: string | undefined;
};

/**
 *   Iterate over a typed dataset one point at a time. This abstraction is
 *   necessary because the Plot panel extends TypedData with more fields; we
 *   still want those to be available while iterating.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function* iterateTyped<T extends { [key: string]: Array<any> | Float32Array }>(
  dataset: T[],
): Generator<ExtractPoint<T>> {
  const point: ExtractPoint<T> = {
    index: 0,
    label: undefined,
  } as ExtractPoint<T>;

  let index = 0;
  for (const slice of dataset) {
    // Find a property for which we can check the length
    const first = R.head(Object.values(slice));
    if (first == undefined) {
      continue;
    }

    for (let j = 0; j < first.length; j++) {
      for (const key of Object.keys(slice) as (keyof typeof slice)[]) {
        point[key] = slice[key]?.[j];
      }

      point.index = index;
      index++;
      yield point;
    }
  }
}

export type Indices = [slice: number, offset: number];
/**
 * Given a dataset and an index inside of that dataset, return the index of the
 * slice and offset inside of that slice.
 */
export function findIndices(dataset: TypedData[], index: number): Indices | undefined {
  let offset = index;
  for (let i = 0; i < dataset.length; i++) {
    const slice = dataset[i];
    if (slice == undefined) {
      continue;
    }

    const {
      x: { length: numElements },
    } = slice;

    if (offset === numElements && i === dataset.length - 1) {
      return [i, offset];
    }

    if (offset >= numElements) {
      offset -= numElements;
      continue;
    }

    return [i, offset];
  }

  return undefined;
}

/**
 * チャートデータセットの基本設定
 *
 * Chart.jsのデータセットに対してLichtblick固有の
 * デフォルト設定を適用するためのユーティリティ関数群です。
 */

/**
 * データセットのデフォルト設定を作成
 *
 * 散布図用のデータセットに対して、一貫した見た目と
 * パフォーマンス設定を適用します。
 *
 * @param overrides - 上書きしたい設定項目
 * @returns 設定済みのデータセット
 */
export function createDefaultDataset(
  overrides: Partial<ChartDataset<"scatter", ObjectData>> = {},
): ChartDataset<"scatter", ObjectData> {
  return {
    // データ配列（空で初期化）
    data: [],

    // 点の表示設定
    pointRadius: 3,
    pointHoverRadius: 4,
    pointBackgroundColor: "rgba(54, 162, 235, 0.8)",
    pointBorderColor: "rgba(54, 162, 235, 1)",
    pointBorderWidth: 1,

    // 線の表示設定
    showLine: false,
    borderColor: "rgba(54, 162, 235, 1)",
    borderWidth: 2,

    // 塗りつぶし設定
    fill: false,

    // アニメーション設定（パフォーマンス向上のため無効化）
    animation: false,

    // ユーザー指定の設定で上書き
    ...overrides,
  };
}

/**
 * 複数のデータセットを作成
 *
 * 複数の系列データを表示する際に使用します。
 * 各データセットには自動的に異なる色が割り当てられます。
 *
 * @param count - 作成するデータセット数
 * @param baseConfig - 基本設定
 * @returns データセット配列
 */
export function createMultipleDatasets(
  count: number,
  baseConfig: Partial<ChartDataset<"scatter", ObjectData>> = {},
): ChartDataset<"scatter", ObjectData>[] {
  const colors = [
    "rgba(54, 162, 235, 0.8)", // 青
    "rgba(255, 99, 132, 0.8)", // 赤
    "rgba(255, 206, 86, 0.8)", // 黄
    "rgba(75, 192, 192, 0.8)", // 緑
    "rgba(153, 102, 255, 0.8)", // 紫
    "rgba(255, 159, 64, 0.8)", // オレンジ
  ];

  return Array.from({ length: count }, (_, index) => {
    const colorIndex = index % colors.length;
    const color = colors[colorIndex];

    return createDefaultDataset({
      ...baseConfig,
      label: `Dataset ${index + 1}`,
      pointBackgroundColor: color,
      pointBorderColor: color?.replace("0.8", "1"),
      borderColor: color?.replace("0.8", "1"),
    });
  });
}

/**
 * 状態遷移用のデータセット設定
 *
 * 状態遷移パネルで使用される特別なデータセット設定です。
 * ラベル表示とライン区間の色分けが有効になります。
 *
 * @param overrides - 上書きしたい設定項目
 * @returns 状態遷移用データセット
 */
export function createStateTransitionDataset(
  overrides: Partial<ChartDataset<"scatter", ObjectData>> = {},
): ChartDataset<"scatter", ObjectData> {
  return createDefaultDataset({
    // 線を表示（状態遷移の流れを表現）
    showLine: true,

    // ステップ状の線（状態の変化を表現）
    stepped: true,

    // 点を小さく（線が主役）
    pointRadius: 2,
    pointHoverRadius: 3,

    // 区間ごとの色分け設定
    segment: {
      borderColor: (ctx) => {
        // 各区間で異なる色を適用
        // この関数はChartJSManagerで実装される
        return ctx.p0.parsed.y !== ctx.p1.parsed.y ? "red" : "blue";
      },
    },

    ...overrides,
  });
}
