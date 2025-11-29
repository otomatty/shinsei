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
 * PlaybackTimeDisplay - 再生時間表示コンポーネント（接続版）
 *
 * @overview
 * MessagePipeline に接続された再生時間表示コンポーネント。
 * UnconnectedPlaybackTimeDisplay のラッパーとして機能し、
 * 必要なデータを MessagePipeline から取得して渡す。
 *
 * @features
 * - MessagePipeline との自動接続
 * - 再生状態の監視と表示
 * - 時間フォーマットとタイムゾーン設定の適用
 * - シーク操作と一時停止機能
 *
 * @architecture
 * - MessagePipeline selector パターンの使用
 * - 設定値の自動取得（timezone）
 * - UnconnectedPlaybackTimeDisplay への props 転送
 * - React hooks による状態管理
 *
 * @dependency
 * - MessagePipeline: プレイヤー状態の監視
 * - AppConfiguration: タイムゾーン設定
 * - AppTimeFormat: 時間フォーマット設定
 * - UnconnectedPlaybackTimeDisplay: 実際の UI 描画
 *
 * @usageExample
 * ```tsx
 * <PlaybackTimeDisplay
 *   onSeek={(time) => player.seek(time)}
 *   onPause={() => player.pause()}
 * />
 * ```
 */

import { Time } from "@lichtblick/rostime";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";

import { UnconnectedPlaybackTimeDisplay } from "./UnconnectedPlaybackTimeDisplay";

/**
 * PlaybackTimeDisplay のプロパティ
 *
 * @interface Props
 */
type Props = {
  /** シーク操作のコールバック関数 */
  onSeek: (seekTo: Time) => void;
  /** 一時停止操作のコールバック関数 */
  onPause: () => void;
};

// MessagePipeline セレクター関数群
/** 再生状態の取得 */
const selectIsPlaying = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.isPlaying;
/** 開始時刻の取得 */
const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
/** 終了時刻の取得 */
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;
/** 現在時刻の取得 */
const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;

/**
 * PlaybackTimeDisplay コンポーネント
 *
 * @param props - コンポーネントのプロパティ
 * @returns 再生時間表示コンポーネント
 */
export default function PlaybackTimeDisplay(props: Props): React.JSX.Element {
  const [timezone] = useAppConfigurationValue<string>(AppSetting.TIMEZONE);

  const isPlaying = useMessagePipeline(selectIsPlaying);
  const startTime = useMessagePipeline(selectStartTime);
  const endTime = useMessagePipeline(selectEndTime);
  const currentTime = useMessagePipeline(selectCurrentTime);
  const appTimeFormat = useAppTimeFormat();

  return (
    <UnconnectedPlaybackTimeDisplay
      appTimeFormat={appTimeFormat}
      currentTime={currentTime}
      startTime={startTime}
      endTime={endTime}
      onSeek={props.onSeek}
      onPause={props.onPause}
      isPlaying={isPlaying ?? false}
      timezone={timezone}
    />
  );
}
