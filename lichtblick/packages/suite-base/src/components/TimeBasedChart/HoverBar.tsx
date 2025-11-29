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
 * HoverBar - チャートホバーバー表示コンポーネント
 *
 * このコンポーネントは、TimeBasedChartでのマウスホバー時に
 * 垂直線を表示するためのコンポーネントです。
 * TimelineInteractionStateContextと連携し、複数チャート間での
 * ホバー位置同期を実現します。
 *
 * ## 主要な機能
 *
 * ### 1. ホバー状態の取得
 * - **useHoverValue**: グローバルホバー状態の取得
 * - **componentId**: コンポーネント固有の識別子
 * - **isPlaybackSeconds**: 再生時間モードの判定
 *
 * ### 2. 垂直線の表示
 * - **VerticalBarWrapper**: 実際の垂直線描画
 * - **スケール連動**: チャートスケールに基づく位置計算
 * - **条件付き表示**: ホバー値が存在する場合のみ表示
 *
 * ### 3. 複数チャート同期
 * - **グローバル状態**: TimelineInteractionStateContext使用
 * - **コンポーネント識別**: componentIdによる識別
 * - **時間軸統一**: isPlaybackSecondsによる時間軸同期
 *
 * ## 使用例
 *
 * ### 基本的な使用
 * ```tsx
 * <HoverBar
 *   componentId="my-chart"
 *   isPlaybackSeconds={true}
 *   scales={chartScales}
 * >
 *   <div>チャート内容</div>
 * </HoverBar>
 * ```
 *
 * ### TimeBasedChart内での使用
 * ```tsx
 * // TimeBasedChart内部で自動的に使用される
 * <HoverBar
 *   componentId={datasetId}
 *   isPlaybackSeconds={xAxisIsPlaybackTime}
 *   scales={currentScales}
 * >
 *   <ChartComponent {...chartProps} />
 * </HoverBar>
 * ```
 *
 * ## Props仕様
 *
 * ### scales?: RpcScales
 * - チャートの現在のスケール情報
 * - X軸・Y軸の範囲とピクセル情報
 * - 垂直線の位置計算に使用
 *
 * ### componentId: string
 * - コンポーネントの固有識別子
 * - 複数チャート間での区別に使用
 * - TimeBasedChartのdatasetIdが通常使用される
 *
 * ### isPlaybackSeconds: boolean
 * - X軸が再生時間を表すかどうか
 * - trueの場合、時間軸同期が有効
 * - falseの場合、独立したホバー状態
 *
 * ## 内部実装
 *
 * ### ホバー値の取得
 * ```tsx
 * const hoverValue = useHoverValue({ componentId, isPlaybackSeconds });
 * ```
 * - グローバルホバー状態から対応する値を取得
 * - componentIdとisPlaybackSecondsで適切な値を選択
 * - 値が存在しない場合はundefinedを返す
 *
 * ### 垂直線の描画
 * ```tsx
 * <VerticalBarWrapper scales={scales} xValue={hoverValue?.value}>
 *   {children}
 * </VerticalBarWrapper>
 * ```
 * - VerticalBarWrapperに実際の描画を委譲
 * - ホバー値とスケールを渡して位置計算
 * - 子要素をラップして表示
 *
 * ## パフォーマンス最適化
 *
 * ### React.memo使用
 * - 不要な再レンダリングを防止
 * - props変更時のみ再描画
 * - 複数チャート使用時の負荷軽減
 *
 * ### 条件付きレンダリング
 * - ホバー値が存在する場合のみ垂直線を表示
 * - 不要なDOM操作を回避
 * - スムーズなアニメーション
 *
 * ## 関連コンポーネント
 *
 * - `VerticalBarWrapper`: 垂直線の実際の描画
 * - `TimeBasedChart`: このコンポーネントを使用する親
 * - `useHoverValue`: ホバー状態取得フック
 * - `TimelineInteractionStateContext`: グローバル状態管理
 *
 * ## 注意事項
 *
 * - componentIdは一意である必要がある
 * - isPlaybackSecondsは一貫して設定する
 * - scalesが未定義の場合、垂直線は表示されない
 * - 複数チャートでの同期には適切な設定が必要
 */

import { RpcScales } from "@lichtblick/suite-base/components/Chart/types";
import { useHoverValue } from "@lichtblick/suite-base/context/TimelineInteractionStateContext";

import { VerticalBarWrapper } from "./VerticalBarWrapper";

/**
 * Props - HoverBarコンポーネントのプロパティ
 */
type Props = {
  /** チャートの現在のスケール情報 */
  scales?: RpcScales;
  /** コンポーネントの固有識別子 */
  componentId: string;
  /** X軸が再生時間を表すかどうか */
  isPlaybackSeconds: boolean;
};

/**
 * HoverBar - チャートホバーバー表示コンポーネント
 *
 * TimeBasedChartでのマウスホバー時に垂直線を表示し、
 * 複数チャート間でのホバー位置同期を実現します。
 * React.memoによる最適化により、効率的な再レンダリングを提供します。
 */
export default React.memo<React.PropsWithChildren<Props>>(function HoverBar({
  children,
  componentId,
  isPlaybackSeconds,
  scales,
}) {
  // グローバルホバー状態から対応する値を取得
  const hoverValue = useHoverValue({ componentId, isPlaybackSeconds });

  return (
    <VerticalBarWrapper scales={scales} xValue={hoverValue?.value}>
      {children}
    </VerticalBarWrapper>
  );
});
