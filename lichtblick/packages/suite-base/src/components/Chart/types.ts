// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ScatterDataPoint, ChartData as ChartJsChartData } from "chart.js";

/**
 * 拡張されたデータポイント型
 *
 * Chart.jsの標準ScatterDataPointを拡張し、Lichtblick固有の機能をサポートします。
 */
type Datum = ScatterDataPoint & {
  /**
   * データポイント上に表示するラベル
   * 状態遷移パネルで遷移データ上にラベルを表示するために使用
   */
  label?: string;

  /**
   * ラベルの色
   * データポイントごとに異なる色でラベルを表示可能
   */
  labelColor?: string;

  /**
   * 元の値（プロット座標ではなく）
   * 状態遷移で使用される元の値を保持
   */
  value?: string | number | bigint | boolean;

  /**
   * データの定数名
   * 状態遷移で使用される定数名を保持
   */
  constantName?: string | undefined;

  /**
   * このライン区間に存在する全ての異なる状態
   * 状態遷移データでのみ使用
   */
  states?: string[];
};

/**
 * オブジェクト形式のチャートデータ
 * 通常のJavaScriptオブジェクトとして格納されるデータ配列
 */
export type ObjectData = (Datum | undefined)[];

/**
 * Chart.jsチャートデータ（オブジェクト形式）
 * 散布図タイプのチャートで使用される標準的なデータ形式
 */
export type ChartData = ChartJsChartData<"scatter", ObjectData>;

/**
 * 型付き配列形式のデータ
 *
 * パフォーマンス最適化のため、大量データを効率的に処理するための
 * TypedArray形式のデータ構造です。
 */
export type TypedData = {
  /** X座標値（Float32Array形式） */
  x: Float32Array;
  /** Y座標値（Float32Array形式） */
  y: Float32Array;
  /** 元の値の配列 */
  value: (string | number | bigint | boolean | undefined)[];
  /** 定数名の配列（オプション） */
  constantName?: string[];
};

/**
 * 型付き配列形式のチャートデータ
 * 大量データの高速処理に使用される最適化されたデータ形式
 */
export type TypedChartData = ChartJsChartData<"scatter", TypedData[]>;

/**
 * RPC通信用のスケール情報
 *
 * WebWorkerとメインスレッド間でチャートのスケール情報を
 * 効率的に転送するための軽量な型定義です。
 */
export type RpcScale = {
  /** スケールの最小値 */
  min: number;
  /** スケールの最大値 */
  max: number;
  /** 最小値に対応するピクセル座標 */
  pixelMin: number;
  /** 最大値に対応するピクセル座標 */
  pixelMax: number;
};

/**
 * RPC通信用のスケール群
 * X軸とY軸のスケール情報を含むオブジェクト
 */
export type RpcScales = {
  /** X軸スケール情報 */
  x?: RpcScale;
  /** Y軸スケール情報 */
  y?: RpcScale;
};

/**
 * RPC通信用の要素情報
 *
 * チャート上の要素（データポイント等）の情報を
 * WebWorkerからメインスレッドに転送するための型定義です。
 */
export type RpcElement = {
  /** 要素に関連付けられたデータ */
  data?: Datum;
  /** データセットのインデックス */
  datasetIndex: number;
  /** データ内のインデックス */
  index: number;
  /** 表示位置情報 */
  view: {
    /** X座標 */
    x: number;
    /** Y座標 */
    y: number;
  };
};

/**
 * イベントリスナーハンドラー関数の型
 * DOM風のイベントリスナー管理のための関数型
 */
export type EventListenerHandler = (eventName: string, fn?: () => void) => void;
