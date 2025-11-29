// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * DataSourceInfoView - データソース情報表示コンポーネント
 *
 * このコンポーネントは、現在接続されているデータソースの詳細情報を
 * 表示するためのUIコンポーネントです。データの開始時刻、終了時刻、
 * 継続時間、ソース名などの重要な情報を統一的に表示します。
 *
 * ## 主な機能
 *
 * ### 1. データソース情報の表示
 * - **ソース名**: 現在接続中のデータソース名
 * - **開始時刻**: データの最初のタイムスタンプ
 * - **終了時刻**: データの最後のタイムスタンプ（ライブ接続時は非表示）
 * - **継続時間**: データの総再生時間
 *
 * ### 2. 接続状態の視覚化
 * - **初期化中**: スケルトンローダーによる待機状態表示
 * - **再接続中**: 接続待機メッセージの表示
 * - **接続済み**: 実際のデータ情報の表示
 * - **ライブ接続**: リアルタイムデータ用の特別表示
 *
 * ### 3. パフォーマンス最適化
 * - **直接DOM操作**: 高頻度更新される時刻情報の効率的更新
 * - **React.memo**: 不要な再レンダリングの防止
 * - **選択的更新**: 変更された部分のみの更新
 *
 * ### 4. 国際化対応
 * - `react-i18next`による多言語対応
 * - 地域別時刻フォーマット
 * - ローカライズされたラベル表示
 *
 * ## 使用例
 *
 * ### 基本的な使用（全情報表示）
 * ```tsx
 * <DataSourceInfoView />
 * ```
 *
 * ### ソース情報非表示（時刻情報のみ）
 * ```tsx
 * <DataSourceInfoView disableSource />
 * ```
 *
 * ## Props仕様
 *
 * @param disableSource - ソース名の表示を無効化するかどうか
 *
 * ## 実装の特徴
 *
 * ### MessagePipeline統合
 * - `useMessagePipeline`による状態監視
 * - 複数のセレクター関数による効率的な状態取得
 * - リアルタイムデータ更新への対応
 *
 * ### DOM直接操作によるパフォーマンス最適化
 * ```typescript
 * // React状態更新を避けて直接DOM更新
 * if (durationRef.current) {
 *   durationRef.current.innerText = durationStr;
 * }
 * ```
 *
 * ### 条件付きレンダリング
 * - ライブ接続時は終了時刻を非表示
 * - 初期化状態に応じたUI切り替え
 * - データ有無による表示制御
 *
 * ## 内部コンポーネント
 *
 * ### DataSourceInfoContent
 * - 実際の表示ロジックを担当
 * - React.memoによる最適化
 * - プロパティ変更時のみ再レンダリング
 *
 * ### セレクター関数
 * - `selectStartTime`: 開始時刻の取得
 * - `selectEndTime`: 終了時刻の取得
 * - `selectPlayerName`: プレイヤー名の取得
 * - `selectPlayerPresence`: 接続状態の取得
 * - `selectSeek`: シーク機能の有無確認
 *
 * ## スタイリング
 *
 * ### Material-UIテーマ統合
 * - `overline`スタイルによるラベル表示
 * - 数値表示用フォント機能の活用
 * - 一貫性のあるスペーシング
 *
 * ### レスポンシブデザイン
 * - Stackレイアウトによる柔軟な配置
 * - 長いテキストの適切な処理
 * - 多言語対応レイアウト
 *
 * ## 関連コンポーネント
 *
 * - `Timestamp` - 時刻表示コンポーネント
 * - `MultilineMiddleTruncate` - 長いテキストの省略表示
 * - `MessagePipeline` - データパイプライン統合
 * - `Skeleton` - ローディング状態表示
 *
 * ## 注意事項
 *
 * - 高頻度更新によるパフォーマンス影響に注意
 * - DOM直接操作は慎重に使用
 * - ライブ接続とファイル再生で表示内容が異なる
 * - 国際化設定の変更時は再レンダリングが必要
 */

import { Skeleton, Typography } from "@mui/material";
import { MutableRefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

import { subtract as subtractTimes, Time } from "@lichtblick/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";
import Timestamp from "@lichtblick/suite-base/components/Timestamp";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";
import { formatDuration } from "@lichtblick/suite-base/util/formatTime";
import { formatTimeRaw, isAbsoluteTime } from "@lichtblick/suite-base/util/time";
import { customTypography } from "@lichtblick/theme";

import { MultilineMiddleTruncate } from "./MultilineMiddleTruncate";

const useStyles = makeStyles()(() => ({
  overline: {
    opacity: 0.6,
  },
  numericValue: {
    fontFeatureSettings: `${customTypography.fontFeatureSettings}, "zero"`,
  },
}));

// MessagePipelineセレクター関数群
const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;

/**
 * DataSourceInfoContent - データソース情報表示の内部コンポーネント
 *
 * 実際の表示ロジックを担当し、React.memoによる最適化を行う。
 * 親コンポーネントから渡されたpropsに基づいて、適切なUI状態を表示する。
 */
function DataSourceInfoContent(props: {
  disableSource?: boolean;
  durationRef: MutableRefObject<ReactNull | HTMLDivElement>;
  endTimeRef: MutableRefObject<ReactNull | HTMLDivElement>;
  playerName?: string;
  playerPresence: PlayerPresence;
  startTime?: Time;
  isLiveConnection: boolean;
}): React.JSX.Element {
  const {
    disableSource = false,
    durationRef,
    endTimeRef,
    playerName,
    playerPresence,
    startTime,
  } = props;
  const { classes } = useStyles();
  const { t } = useTranslation("dataSourceInfo");

  const isLiveConnection = props.isLiveConnection;

  return (
    <Stack gap={1.5}>
      {!disableSource && (
        <Stack>
          <Typography className={classes.overline} display="block" variant="overline">
            {t("currentSource")}
          </Typography>
          {playerPresence === PlayerPresence.INITIALIZING ? (
            <Typography variant="inherit">
              <Skeleton animation="wave" width="40%" />
            </Typography>
          ) : playerPresence === PlayerPresence.RECONNECTING ? (
            <Typography variant="inherit">{t("waitingForConnection")}</Typography>
          ) : playerName ? (
            <Typography variant="inherit" component="span">
              <MultilineMiddleTruncate text={playerName} />
            </Typography>
          ) : (
            <Typography className={classes.numericValue} variant="inherit">
              &mdash;
            </Typography>
          )}
        </Stack>
      )}

      <Stack>
        <Typography className={classes.overline} variant="overline">
          {t("startTime")}
        </Typography>
        {playerPresence === PlayerPresence.INITIALIZING ? (
          <Skeleton animation="wave" width="50%" />
        ) : startTime ? (
          <Timestamp horizontal time={startTime} />
        ) : (
          <Typography className={classes.numericValue} variant="inherit">
            &mdash;
          </Typography>
        )}
      </Stack>

      {!isLiveConnection && (
        <Stack>
          <Typography className={classes.overline} variant="overline">
            {t("endTime")}
          </Typography>
          {playerPresence === PlayerPresence.INITIALIZING ? (
            <Skeleton animation="wave" width="50%" />
          ) : (
            <Typography className={classes.numericValue} variant="inherit" ref={endTimeRef}>
              &mdash;
            </Typography>
          )}
        </Stack>
      )}

      <Stack>
        <Typography className={classes.overline} variant="overline">
          {t("duration")}
        </Typography>
        {playerPresence === PlayerPresence.INITIALIZING ? (
          <Skeleton animation="wave" width={100} />
        ) : (
          <Typography className={classes.numericValue} variant="inherit" ref={durationRef}>
            &mdash;
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

// パフォーマンス最適化のためのメモ化
const MemoDataSourceInfoContent = React.memo(DataSourceInfoContent);

const EmDash = "\u2014";

/**
 * DataSourceInfoView - メインエクスポートコンポーネント
 *
 * MessagePipelineから必要な情報を取得し、DataSourceInfoContentに渡す。
 * 高頻度更新される時刻情報は直接DOM操作で効率的に更新する。
 */
export function DataSourceInfoView({
  disableSource,
}: {
  disableSource?: boolean;
}): React.JSX.Element {
  const startTime = useMessagePipeline(selectStartTime);
  const endTime = useMessagePipeline(selectEndTime);
  const playerName = useMessagePipeline(selectPlayerName);
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const seek = useMessagePipeline(selectSeek);

  const durationRef = useRef<HTMLDivElement>(ReactNull);
  const endTimeRef = useRef<HTMLDivElement>(ReactNull);
  const { formatDate, formatTime } = useAppTimeFormat();

  // パフォーマンス最適化: React状態更新を避けて直接DOM更新
  useEffect(() => {
    if (durationRef.current) {
      const duration = endTime && startTime ? subtractTimes(endTime, startTime) : undefined;
      if (duration) {
        const durationStr = formatDuration(duration);
        durationRef.current.innerText = durationStr;
      } else {
        durationRef.current.innerText = EmDash;
      }
    }
    if (endTimeRef.current) {
      if (endTime) {
        const date = formatDate(endTime);
        endTimeRef.current.innerText = !isAbsoluteTime(endTime)
          ? formatTimeRaw(endTime)
          : `${date} ${formatTime(endTime)}`;
      } else {
        endTimeRef.current.innerHTML = EmDash;
      }
    }
  }, [endTime, formatTime, startTime, playerPresence, formatDate]);

  return (
    <MemoDataSourceInfoContent
      disableSource={disableSource}
      durationRef={durationRef}
      endTimeRef={endTimeRef}
      playerName={playerName}
      playerPresence={playerPresence}
      startTime={startTime}
      isLiveConnection={seek == undefined}
    />
  );
}
