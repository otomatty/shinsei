// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * useDownsampler - データダウンサンプリングフック
 *
 * このフックは、TimeBasedChartコンポーネントの高性能描画を実現するため、
 * 大量のデータセットを効率的にダウンサンプリングします。
 * PlotDataProviderを使用せずに直接データを渡す場合に特に有用です。
 *
 * ## 主要な機能
 *
 * ### 1. 自動ダウンサンプリング
 * - **スケール連動**: チャートのズームレベルに応じた適応的サンプリング
 * - **ビューポート最適化**: 表示領域に基づく効率的なデータ選択
 * - **デバウンス処理**: 100ms間隔での処理最適化
 *
 * ### 2. パフォーマンス最適化
 * - **WebWorker対応**: Downsamplerクラスによるバックグラウンド処理
 * - **スロットリング**: 連続更新時の負荷制限
 * - **メモ化**: 不要な再計算の回避
 *
 * ### 3. 動的更新
 * - **スケール変更**: ズーム・パン操作への即座の対応
 * - **データセット更新**: 新しいデータの自動処理
 * - **ビューポート変更**: 表示領域変更への適応
 *
 * ## アーキテクチャ
 *
 * ### データフロー
 * ```
 * 元データセット
 *     ↓
 * Downsampler.update()
 *     ↓
 * queueDownsample (デバウンス)
 *     ↓
 * applyDownsample()
 *     ↓
 * ダウンサンプル済みデータ
 * ```
 *
 * ### 更新トリガー
 * - **スケール変更**: setScales() → 即座にダウンサンプル実行
 * - **データセット変更**: datasets prop → デバウンス後実行
 * - **ビューポート変更**: view state → 境界更新のみ（ダウンサンプルなし）
 *
 * ## 使用例
 *
 * ### 基本的な使用
 * ```tsx
 * const { downsampler, setScales } = useDownsampler(chartDatasets);
 *
 * // TimeBasedChartで使用
 * <TimeBasedChart
 *   provider={downsampler}
 *   onScalesChange={setScales}
 *   {...otherProps}
 * />
 * ```
 *
 * ### 手動スケール更新
 * ```tsx
 * const { setScales } = useDownsampler(datasets);
 *
 * // ズーム操作時
 * const handleZoom = (newScales) => {
 *   setScales(newScales);
 * };
 * ```
 *
 * ## パフォーマンス特性
 *
 * ### デバウンス設定
 * - **遅延**: 100ms - UI応答性とCPU負荷のバランス
 * - **最大待機**: 100ms - 連続更新時の確実な実行
 * - **先頭実行**: false - 最後の更新を重視
 *
 * ### メモリ効率
 * - Downsamplerインスタンスの再利用
 * - 不要な中間データの削除
 * - 境界計算の最適化
 *
 * ## 内部実装の詳細
 *
 * ### 状態管理
 * - `view`: 現在のビューポート情報
 * - `setter`: データ更新コールバック
 * - `downsampler`: Downsamplerインスタンス
 *
 * ### コールバック設計
 * - `applyDownsample`: 実際のダウンサンプリング実行
 * - `queueDownsample`: デバウンス付きの処理キュー
 * - `setScales`: スケール更新と即座の処理実行
 *
 * ## 関連コンポーネント
 *
 * - `Downsampler`: 実際のダウンサンプリング処理クラス
 * - `TimeBasedChart`: このフックを使用するメインコンポーネント
 * - `getBounds`: 境界計算ユーティリティ
 * - `PlotDataProvider`: データプロバイダーインターフェース
 *
 * ## 注意事項
 *
 * - 大量データでのみ有効（小さなデータセットでは不要）
 * - スケール変更は即座に処理される（デバウンスなし）
 * - ビューポート変更は境界更新のみ（パフォーマンス重視）
 * - WebWorker使用時はメインスレッドブロッキングを回避
 */

import React, { useMemo, useCallback, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

import type { ObjectData, RpcScales } from "@lichtblick/suite-base/components/Chart/types";

import { Downsampler } from "./Downsampler";
import { PlotDataProvider, ProviderStateSetter, PlotViewport, ChartDataset } from "./types";
import { getBounds } from "./useProvider";

/**
 * useDownsampler - データダウンサンプリングフック
 *
 * 大量のデータセットを効率的にダウンサンプリングし、
 * TimeBasedChartの高性能描画を実現するReactフック。
 * PlotDataProviderインターフェースを通じて統一的なデータ提供を行う。
 *
 * @param datasets - ダウンサンプリング対象のデータセット配列
 * @returns ダウンサンプラープロバイダーとスケール更新関数
 *
 * ## 戻り値
 *
 * ### downsampler: PlotDataProvider<ObjectData>
 * - TimeBasedChartで使用可能なデータプロバイダー
 * - setView/registerメソッドを提供
 * - 自動的なダウンサンプリング処理
 *
 * ### setScales: (scales: RpcScales) => void
 * - チャートスケール変更時の更新関数
 * - 即座にダウンサンプリングを実行
 * - ズーム・パン操作への対応
 *
 * ## 内部動作
 *
 * ### 更新フロー
 * 1. **datasets変更** → Downsampler.update() → queueDownsample()
 * 2. **scales変更** → Downsampler.update() → 即座にapplyDownsample()
 * 3. **view変更** → Downsampler.update() → 境界更新のみ
 *
 * ### デバウンス戦略
 * - スケール変更: デバウンスなし（即座実行）
 * - データセット変更: 100msデバウンス
 * - ビューポート変更: ダウンサンプルなし
 */
export default function useDownsampler(datasets: ChartDataset[]): {
  downsampler: PlotDataProvider<ObjectData>;
  setScales: (scales: RpcScales) => void;
} {
  /** 現在のビューポート情報 */
  const [view, setView] = React.useState<PlotViewport | undefined>();

  /** データ更新コールバック */
  const [setter, setSetter] = React.useState<ProviderStateSetter<ObjectData> | undefined>();

  /** ダウンサンプラーインスタンス（再利用） */
  const downsampler = useMemo(() => new Downsampler(), []);

  /**
   * applyDownsample - 実際のダウンサンプリング実行
   *
   * Downsamplerクラスを使用してデータを処理し、
   * 結果をsetterコールバックに渡します。
   * 境界計算も含めた完全な処理を実行します。
   */
  const applyDownsample = useCallback(() => {
    if (setter == undefined) {
      return;
    }

    const downsampled = downsampler.downsample();
    if (downsampled == undefined) {
      return;
    }

    const bounds = getBounds(downsampled);
    if (bounds == undefined) {
      return;
    }

    setter({
      bounds,
      data: {
        datasets: downsampled,
      },
    });
  }, [setter, downsampler]);

  /**
   * queueDownsample - デバウンス付きダウンサンプリング
   *
   * 連続的な更新要求をデバウンスし、CPU負荷を制限します。
   * 100ms間隔でのスロットリング効果も提供します。
   */
  const queueDownsample = useDebouncedCallback(
    applyDownsample,
    100,
    // maxWait equal to debounce timeout makes the debounce act like a throttle
    // Without a maxWait - invocations of the debounced invalidate reset the countdown
    // resulting in no invalidation when scales are constantly changing (playback)
    { leading: false, maxWait: 100 },
  );

  /**
   * setScales - スケール更新処理
   *
   * チャートのズーム・パン操作に対応し、
   * 即座にダウンサンプリングを実行します。
   * デバウンスは適用されません（応答性重視）。
   */
  const setScales = useCallback(
    (scales: RpcScales) => {
      downsampler.update({ scales });
      queueDownsample();
    },
    [downsampler, queueDownsample],
  );

  // ビューポート変更時の境界更新（ダウンサンプルなし）
  useEffect(() => {
    downsampler.update({ datasetBounds: view });
  }, [view, downsampler]);

  // データセット変更時のダウンサンプリング実行
  useEffect(() => {
    downsampler.update({ datasets });
    queueDownsample();
  }, [downsampler, datasets, queueDownsample]);

  // PlotDataProviderインターフェースの実装
  return React.useMemo(() => {
    return {
      downsampler: {
        setView,
        // setSetter cannot take two arguments, so we can't just write
        // `register: setSetter`
        register: (newSetter) => {
          setSetter(() => newSetter);
        },
      },
      setScales,
    };
  }, [setScales]);
}
