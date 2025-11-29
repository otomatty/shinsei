// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * RepeatAdapter - 再生リピート機能アダプター
 *
 * @overview
 * 再生が終了時に自動的に開始位置に戻るリピート機能を提供。
 * MessagePipeline の状態を監視し、適切なタイミングでシーク操作を実行。
 *
 * @features
 * - 自動リピート機能の実装
 * - 再生終了の自動検出
 * - 開始位置への自動シーク
 * - 一時停止状態でも自動再生開始
 *
 * @architecture
 * - MessagePipeline 状態監視
 * - useLayoutEffect による即座の状態反映
 * - 仮想 DOM 最適化のための分離コンポーネント
 * - 時間比較による終了判定
 *
 * @performance
 * MessagePipeline の全フレームを受信するため、
 * 子コンポーネントへの影響を避けるために独立したコンポーネントとして実装。
 *
 * @usageExample
 * ```tsx
 * <RepeatAdapter
 *   repeatEnabled={isRepeatOn}
 *   play={() => player.play()}
 *   seek={(time) => player.seek(time)}
 * />
 * ```
 */

import { useLayoutEffect } from "react";

import { compare, Time } from "@lichtblick/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

/**
 * RepeatAdapter のプロパティ
 *
 * @interface RepeatAdapterProps
 */
type RepeatAdapterProps = {
  /** リピート機能の有効/無効状態 */
  repeatEnabled: boolean;
  /** 再生開始操作のコールバック関数 */
  play: () => void;
  /** シーク操作のコールバック関数 */
  seek: (to: Time) => void;
};

/**
 * MessagePipeline からアクティブデータを取得するセレクター
 *
 * @param ctx - MessagePipelineContext
 * @returns アクティブデータまたは undefined
 */
function activeDataSelector(ctx: MessagePipelineContext) {
  return ctx.playerState.activeData;
}

/**
 * RepeatAdapter コンポーネント
 *
 * @description
 * 再生が終了時に開始位置からのリピート再生を処理。
 *
 * @note
 * RepeatAdapter は MessagePipeline の全フレームを受信するため、
 * 子コンポーネントの仮想 DOM 比較に影響を与えないよう
 * 独立したコンポーネントとして実装されている。
 *
 * @algorithm
 * 1. MessagePipeline の状態監視
 * 2. currentTime >= endTime の検出
 * 3. startTime へのシーク実行
 * 4. 再生の自動開始
 *
 * @param props - コンポーネントのプロパティ
 * @returns 空の JSX 要素（UI は持たない）
 */
export function RepeatAdapter(props: RepeatAdapterProps): React.JSX.Element {
  const { play, seek, repeatEnabled } = props;

  const activeData = useMessagePipeline(activeDataSelector);

  useLayoutEffect(() => {
    if (!repeatEnabled) {
      return;
    }

    const currentTime = activeData?.currentTime;
    const endTime = activeData?.endTime;
    const startTime = activeData?.startTime;

    // リピートロジックは MessagePipeline 内でも実装可能だが、
    // 再生コントロールからのみトリガーされるため、
    // 現在はここで実装している。
    // 他の場所からリピート切り替えが必要になった場合は、
    // このロジックを MessagePipeline に移動することが可能。
    if (startTime && currentTime && endTime && compare(currentTime, endTime) >= 0) {
      seek(startTime);
      // ユーザーがリピートを有効にして再生が終了している場合、
      // 一時停止状態でも開始位置から再生を開始する。
      play();
    }
  }, [activeData, play, repeatEnabled, seek]);

  return <></>;
}
