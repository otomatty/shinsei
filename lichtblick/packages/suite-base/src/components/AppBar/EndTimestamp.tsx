// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * EndTimestamp - 終了タイムスタンプ表示コンポーネント
 *
 * データソースの終了時刻を表示するコンポーネントです。
 * ライブ接続時にAppBarに表示され、現在時刻やデータの終了時刻を
 * ユーザーが設定した時間フォーマットで表示します。
 *
 * 主な機能：
 * - 終了時刻の動的表示
 * - 時間フォーマットの切り替え（SEC/時刻形式）
 * - タイムゾーン対応
 * - 絶対時間と相対時間の判定
 * - パフォーマンス最適化（直接DOM操作）
 *
 * パフォーマンス最適化：
 * - React の再レンダリングを回避するため、直接DOM操作を使用
 * - 高頻度で更新される時刻表示に最適化
 *
 * @example
 * ```typescript
 * // DataSource内での使用
 * <EndTimestamp />
 * ```
 */

import { useTheme } from "@mui/material";
import { useEffect, useRef } from "react";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { useAppConfigurationValue, useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { format } from "@lichtblick/suite-base/util/formatTime";
import { formatTimeRaw, isAbsoluteTime } from "@lichtblick/suite-base/util/time";

/**
 * Message Pipeline Selector - メッセージパイプライン状態セレクター
 *
 * 終了時刻の取得に特化したセレクター関数。
 * パフォーマンス最適化のため、必要な状態のみを抽出。
 */

/** アクティブデータの終了時刻を取得 */
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;

/**
 * EndTimestamp - 終了タイムスタンプ表示コンポーネント
 *
 * データソースの終了時刻を表示するコンポーネント。
 * 高頻度で更新される可能性があるため、パフォーマンス最適化として
 * React の再レンダリングを回避し、直接DOM操作を使用しています。
 *
 * 時間表示の仕様：
 * - SEC フォーマット: 秒単位の生時間（例: 1234.567）
 * - 時刻フォーマット: 人間が読みやすい時刻表示（例: 14:30:45）
 * - 相対時間: 常に秒単位で表示
 * - 絶対時間: 設定に応じて時刻またはSEC形式で表示
 *
 * タイムゾーン対応：
 * - アプリケーション設定のタイムゾーンを使用
 * - 時刻フォーマット時のみ適用
 *
 * パフォーマンス最適化：
 * - useEffect内で直接DOM操作を実行
 * - React の再レンダリングサイクルを回避
 * - 高頻度更新に対応
 *
 * @returns EndTimestampのJSX要素、または終了時刻がない場合はnull
 */
export function EndTimestamp(): React.JSX.Element | ReactNull {
  /** 終了時刻の取得 */
  const endTime = useMessagePipeline(selectEndTime);

  /** アプリケーション設定の取得 */
  const [timezone] = useAppConfigurationValue<string>(AppSetting.TIMEZONE);
  const { timeFormat } = useAppTimeFormat();

  /** テーマ情報（フォント設定用） */
  const theme = useTheme();

  /** DOM要素への直接参照 */
  const timeRef = useRef<HTMLDivElement>(ReactNull);

  /**
   * 時刻表示の更新処理
   *
   * パフォーマンス最適化のため、React の再レンダリングを回避し、
   * 直接DOM操作で時刻テキストを更新します。
   *
   * 更新ロジック：
   * 1. 終了時刻が未定義の場合は空文字を表示
   * 2. 時刻フォーマットに基づいて適切な文字列を生成
   * 3. 直接DOM要素のinnerTextを更新
   */
  useEffect(() => {
    if (!timeRef.current) {
      return;
    }

    // 終了時刻が未定義の場合は空文字を表示
    if (endTime == undefined) {
      timeRef.current.innerText = "";
      return;
    }

    // 時刻フォーマットに応じた文字列を生成
    const timeOfDayString = format(endTime, timezone);
    const timeRawString = formatTimeRaw(endTime);

    // 表示する文字列を決定
    // - SEC フォーマットまたは相対時間の場合: 生時間
    // - それ以外の場合: 時刻フォーマット
    timeRef.current.innerText =
      timeFormat === "SEC" || !isAbsoluteTime(endTime) ? timeRawString : timeOfDayString;
  }, [endTime, timeFormat, timezone]);

  return (
    <div
      style={{
        // 等幅数字フォントを使用（数字の幅を統一）
        fontFeatureSettings: `${theme.typography.fontFamily}, "zero"`,
      }}
      ref={timeRef}
    />
  );
}
