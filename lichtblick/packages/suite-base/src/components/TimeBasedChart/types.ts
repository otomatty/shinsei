// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * TimeBasedChart/types - 時系列チャート型定義
 *
 * このファイルは、TimeBasedChartコンポーネントシステムで使用される
 * 全ての型定義を提供します。Chart.jsベースのデータ構造から、
 * カスタムデータプロバイダーまで、チャート描画に必要な型を統一的に管理します。
 *
 * ## 主要な型カテゴリ
 *
 * ### 1. Chart.js型のエイリアス
 * - Chart.jsの複雑な型を簡潔に使用するためのエイリアス定義
 * - TypeScriptの型推論を改善
 * - コードの可読性向上
 *
 * ### 2. 座標系・境界定義
 * - 1次元・2次元の境界定義
 * - ビューポート管理
 * - 座標変換サポート
 *
 * ### 3. データプロバイダー
 * - 高度なデータ管理機能
 * - 動的データ更新
 * - パフォーマンス最適化
 *
 * ## 型の階層構造
 *
 * ```
 * ChartData (Chart.js)
 * ├── ChartDatasets[]
 * │   └── ChartDataset
 * │       └── ChartDatum
 * └── TypedChartData
 *     └── TypedChartDatasets[]
 *         └── TypedChartDataset
 *
 * PlotDataProvider<T>
 * ├── ObjectDataProvider
 * └── TypedDataProvider
 * ```
 *
 * ## 使用例
 *
 * ### 基本的なチャートデータ操作
 * ```typescript
 * const dataset: ChartDataset = {
 *   label: "Temperature",
 *   data: points,
 *   borderColor: "blue"
 * };
 * ```
 *
 * ### データプロバイダーの実装
 * ```typescript
 * const provider: ObjectDataProvider = {
 *   setView: (view) => handleViewChange(view),
 *   register: (setter, addPartial) => {
 *     // データ更新ロジック
 *   }
 * };
 * ```
 */

import type { ChartData as AbstractChartData } from "chart.js";

import type {
  ObjectData,
  ChartData,
  TypedChartData,
  TypedData,
} from "@lichtblick/suite-base/components/Chart/types";

// Chart.js型のエイリアス定義（利便性向上のため）

/** チャートデータセット配列の型エイリアス */
export type ChartDatasets = ChartData["datasets"];

/** 単一チャートデータセットの型エイリアス */
export type ChartDataset = ChartDatasets[0];

/** チャートデータポイントの型エイリアス */
export type ChartDatum = ChartDataset["data"][0];

/** 型付きチャートデータセット配列の型エイリアス */
export type TypedChartDatasets = TypedChartData["datasets"];

/** 単一型付きチャートデータセットの型エイリアス */
export type TypedChartDataset = TypedChartDatasets[0];

// 座標系・境界定義

/**
 * 1次元境界定義
 *
 * 単一軸（X軸またはY軸）の最小値・最大値を表現
 */
export type Bounds1D = { min: number; max: number };

/**
 * 2次元境界定義
 *
 * チャートの表示領域やデータ範囲を表現するための
 * X軸・Y軸の境界を組み合わせた構造
 */
export type Bounds = {
  x: Bounds1D;
  y: Bounds1D;
};

/**
 * PlotViewport - プロット表示領域定義
 *
 * プロットの可視領域を軸の値と画面上の寸法の両方で表現します。
 * この情報は、データプロバイダーが効率的なデータ取得を行うために使用されます。
 *
 * ## 用途
 * - データプロバイダーへの表示領域通知
 * - 効率的なデータフェッチング
 * - ズーム・パン操作の管理
 * - レンダリング最適化
 */
export type PlotViewport = {
  /** プロットの幅（ピクセル単位） */
  width: number;
  /** プロットの高さ（ピクセル単位） */
  height: number;
  /** 軸の境界値 */
  bounds: Bounds;
};

// データプロバイダー状態管理

/**
 * ProviderState - データプロバイダー状態
 *
 * データプロバイダーが管理するデータとその境界情報を組み合わせた状態定義
 *
 * @template T - データの型（ObjectData または TypedData[]）
 */
export type ProviderState<T> = {
  /** Chart.js形式のデータ */
  data: AbstractChartData<"scatter", T>;
  /** データに含まれる値の境界 */
  bounds: Bounds;
};

/** オブジェクト形式データ用のプロバイダー状態 */
export type ChartProviderState = ProviderState<ObjectData>;

/** 型付きデータ用のプロバイダー状態 */
export type TypedProviderState = ProviderState<TypedData[]>;

/**
 * ProviderStateSetter - 状態更新関数型
 *
 * データプロバイダーの状態を更新するための関数型定義
 *
 * @template T - データの型
 */
export type ProviderStateSetter<T> = (state: ProviderState<T>) => void;

// 高度なデータプロバイダー

/**
 * PlotDataProvider - 高度なデータ管理インターフェース
 *
 * TimeBasedChartユーザーに、表示データのより詳細な制御を提供します。
 * 現在のビューポート情報へのアクセスと、動的なデータ更新機能を含みます。
 *
 * ## 主な機能
 * - **ビューポート連動**: 表示領域に応じたデータ取得
 * - **段階的更新**: 完全更新と部分更新の両対応
 * - **パフォーマンス最適化**: 必要な部分のみのデータ更新
 * - **リアルタイム対応**: ストリーミングデータの効率的処理
 *
 * ## 実装例
 * ```typescript
 * const provider: PlotDataProvider<ObjectData> = {
 *   setView: (view) => {
 *     // ビューポート変更時の処理
 *     fetchDataForViewport(view.bounds);
 *   },
 *   register: (setter, addPartial) => {
 *     // データ更新コールバックの登録
 *     onDataUpdate = setter;
 *     onPartialUpdate = addPartial;
 *   }
 * };
 * ```
 *
 * @template T - 管理するデータの型
 */
export type PlotDataProvider<T> = {
  /**
   * ビューポート変更通知
   *
   * チャートの表示領域が変更された際に呼び出されます
   */
  setView: (view: PlotViewport) => void;

  /**
   * 状態更新コールバック登録
   *
   * データの完全更新と部分更新のためのコールバックを登録します
   *
   * @param setter - 完全なデータ更新用コールバック
   * @param addPartial - 部分的なデータ追加用コールバック
   */
  register: (setter: ProviderStateSetter<T>, addPartial: ProviderStateSetter<T>) => void;
};

/** オブジェクト形式データ用のデータプロバイダー */
export type ObjectDataProvider = PlotDataProvider<ObjectData>;

/** 型付きデータ用のデータプロバイダー */
export type TypedDataProvider = PlotDataProvider<TypedData[]>;
