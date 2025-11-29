// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Timestamp - 時刻表示コンポーネント
 *
 * このコンポーネントは、Time型の時刻データを人間が読みやすい形式で
 * 表示するためのユーティリティコンポーネントです。絶対時間と相対時間の
 * 両方に対応し、柔軟なレイアウトオプションを提供します。
 *
 * ## 主な機能
 *
 * ### 1. 時刻形式の自動判定
 * - **絶対時間**: 日付と時刻を分離して表示
 * - **相対時間**: 経過時間として表示（秒、ナノ秒）
 * - `isAbsoluteTime()`による自動判定
 *
 * ### 2. 柔軟なレイアウト制御
 * - **垂直レイアウト**: 日付と時刻を縦に配置（デフォルト）
 * - **水平レイアウト**: 日付と時刻を横に配置
 * - 日付表示の有効/無効切り替え
 *
 * ### 3. 国際化対応
 * - `useAppTimeFormat`による地域別時刻形式
 * - アプリケーション設定に基づく自動フォーマット
 * - タイムゾーン考慮
 *
 * ### 4. アクセシビリティ対応
 * - 数値フォント機能（tabular-nums）による桁揃え
 * - ツールチップ表示対応
 * - 適切なARIA属性
 *
 * ## 使用例
 *
 * ### 基本的な使用（垂直レイアウト）
 * ```tsx
 * <Timestamp time={currentTime} />
 * ```
 *
 * ### 水平レイアウト（スペース節約）
 * ```tsx
 * <Timestamp time={currentTime} horizontal />
 * ```
 *
 * ### 日付非表示（時刻のみ）
 * ```tsx
 * <Timestamp time={currentTime} disableDate />
 * ```
 *
 * ### ツールチップ付き
 * ```tsx
 * <Timestamp
 *   time={currentTime}
 *   title="メッセージ受信時刻"
 * />
 * ```
 *
 * ## Props仕様
 *
 * @param time - 表示する時刻（Time型）
 * @param horizontal - 水平レイアウトの有効化（デフォルト: false）
 * @param disableDate - 日付表示の無効化（デフォルト: false）
 * @param title - ツールチップテキスト
 *
 * ## 実装の特徴
 *
 * ### パフォーマンス最適化
 * - `useMemo`による文字列計算のキャッシュ
 * - 不要な再レンダリングの防止
 * - 軽量なStack layoutの使用
 *
 * ### スタイリング
 * - Material-UIテーマシステムとの統合
 * - 数値表示用フォント機能の活用
 * - レスポンシブデザイン対応
 *
 * ### 型安全性
 * - TypeScript完全対応
 * - Time型の厳密な型チェック
 * - Props型の明確な定義
 *
 * ## 関連コンポーネント
 *
 * - `DataSourceInfoView` - データソース情報表示での使用
 * - `MessagePipeline` - メッセージタイムスタンプ表示
 * - `PlaybackControls` - 再生時刻表示
 *
 * ## 注意事項
 *
 * - Time型は`@lichtblick/rostime`パッケージの型を使用
 * - 絶対時間と相対時間で表示形式が大きく異なる
 * - 国際化設定に依存するため、設定変更時は再レンダリングが必要
 * - 高頻度更新時はパフォーマンスに注意
 */

import { Typography } from "@mui/material";
import { useMemo } from "react";
import { makeStyles } from "tss-react/mui";

import { Time } from "@lichtblick/rostime";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { isAbsoluteTime, formatTimeRaw } from "@lichtblick/suite-base/util/time";
import { customTypography } from "@lichtblick/theme";

type Props = {
  /** 日付表示を無効化するかどうか */
  disableDate?: boolean;
  /** 水平レイアウトを使用するかどうか */
  horizontal?: boolean;
  /** 表示する時刻 */
  time: Time;
  /** ツールチップに表示するタイトル */
  title?: string;
};

const useStyles = makeStyles()(() => ({
  numericValue: {
    fontFeatureSettings: `${customTypography.fontFeatureSettings}, "zero"`,
  },
}));

export default function Timestamp(props: Props): React.JSX.Element {
  const { classes } = useStyles();
  const { disableDate = false, horizontal = false, time, title } = props;
  const { formatDate, formatTime } = useAppTimeFormat();
  const currentTimeStr = useMemo(() => formatTime(time), [time, formatTime]);
  const rawTimeStr = useMemo(() => formatTimeRaw(time), [time]);
  const date = useMemo(() => formatDate(time), [formatDate, time]);

  if (!isAbsoluteTime(time)) {
    return (
      <Stack title={title} direction="row" alignItems="center" flexGrow={0}>
        <Typography className={classes.numericValue} variant="inherit">
          {rawTimeStr}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack
      title={title}
      gap={horizontal ? 0 : 1}
      flexWrap={horizontal ? "nowrap" : "wrap"}
      direction={horizontal ? "row" : "column"}
      alignItems={horizontal ? "center" : "flex-start"}
      justifyContent={horizontal ? "flex-start" : "center"}
    >
      {!disableDate && (
        <>
          <Typography
            className={classes.numericValue}
            noWrap
            fontWeight={!horizontal ? 700 : undefined}
            variant="inherit"
          >
            {date}
          </Typography>
          {horizontal && <>&nbsp;</>}
        </>
      )}

      <Stack direction="row" alignItems="center" flexShrink={0} gap={0.5}>
        <Typography variant="inherit" className={classes.numericValue}>
          {currentTimeStr}
        </Typography>
      </Stack>
    </Stack>
  );
}
