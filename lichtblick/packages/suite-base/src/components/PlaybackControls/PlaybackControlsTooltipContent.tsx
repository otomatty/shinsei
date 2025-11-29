// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * PlaybackControlsTooltipContent - 再生コントロールツールチップ内容コンポーネント
 *
 * @overview
 * スクラブバーのホバー時に表示されるツールチップの内容を生成。
 * 時刻情報、イベント情報、経過時間を統合的に表示し、
 * アプリケーションの時間フォーマット設定に対応。
 *
 * @features
 * - 時刻表示（TOD/SEC フォーマット対応）
 * - ホバー中のイベント情報表示
 * - イベントメタデータの展開表示
 * - 経過時間の計算と表示
 * - グリッドレイアウトによる整理された表示
 *
 * @architecture
 * - TimelineInteractionStateContext によるイベント情報取得
 * - MessagePipeline による開始時刻取得
 * - アプリケーション時間フォーマット設定の適用
 * - Material UI Typography と Divider による構造化
 *
 * @layout
 * グリッドレイアウト（2列）でキー・値のペアを表示。
 * イベント情報 → 時刻情報 → 経過時間の順序で配置。
 *
 * @usageExample
 * ```tsx
 * <Tooltip
 *   title={<PlaybackControlsTooltipContent stamp={currentTime} />}
 * >
 *   <div>Hover target</div>
 * </Tooltip>
 * ```
 */

import { Divider, Typography } from "@mui/material";
import * as _ from "lodash-es";
import { Fragment } from "react";
import { makeStyles } from "tss-react/mui";

import { subtract as subtractTimes, toSec, Time } from "@lichtblick/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import {
  TimelineInteractionStateStore,
  useTimelineInteractionState,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { customTypography } from "@lichtblick/theme";

/**
 * ツールチップアイテムの型定義
 *
 * @type PlaybackControlsTooltipItem
 */
type PlaybackControlsTooltipItem =
  | { type: "divider" }
  | { type: "item"; title: string; value: string };

/**
 * PlaybackControlsTooltipContent のスタイル定義
 *
 * @returns スタイルクラス
 */
const useStyles = makeStyles()((theme) => ({
  /**
   * セクション区切り線のスタイル
   *
   * @style
   * - グリッド: 2列にわたって配置
   * - マージン: 上下にスペースを設定
   * - 不透明度: 半透明で控えめに表示
   */
  tooltipDivider: {
    gridColumn: "span 2",
    marginBlock: theme.spacing(0.5),
    opacity: 0.5,
  },
  /**
   * ツールチップ全体のラッパースタイル
   *
   * @style
   * - フォント: 等幅フォント機能と body フォント
   * - レイアウト: 2列グリッドでキー・値ペアを配置
   * - 改行: 禁止（コンパクト表示）
   * - 配置: 縦方向中央揃え
   */
  tooltipWrapper: {
    fontFeatureSettings: `${customTypography.fontFeatureSettings}, "zero"`,
    fontFamily: theme.typography.body1.fontFamily,
    whiteSpace: "nowrap",
    columnGap: theme.spacing(0.5),
    display: "grid",
    alignItems: "center",
    gridTemplateColumns: "auto auto",
    width: "100%",
    flexDirection: "column",
  },
  /**
   * キー項目（ラベル）のスタイル
   *
   * @style
   * - サイズ: 小さめのフォント
   * - 不透明度: 控えめに表示
   * - 配置: 右寄せ（値との関連性を明確化）
   * - 変換: 小文字化
   */
  itemKey: {
    fontSize: "0.7rem",
    opacity: 0.7,
    textAlign: "end",
    textTransform: "lowercase",
  },
}));

// Context セレクター関数群
/** ホバー中のイベント情報を取得 */
const selectHoveredEvents = (store: TimelineInteractionStateStore) => store.eventsAtHoverValue;
/** MessagePipeline から開始時刻を取得 */
const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;

/**
 * PlaybackControlsTooltipContent のプロパティ
 *
 * @interface
 */
export function PlaybackControlsTooltipContent(params: {
  /** 表示対象の時刻 */
  stamp: Time;
}): ReactNull | React.JSX.Element {
  const { stamp } = params;
  const { timeFormat, formatTime, formatDate } = useAppTimeFormat();
  const hoveredEvents = useTimelineInteractionState(selectHoveredEvents);
  const startTime = useMessagePipeline(selectStartTime);
  const { classes } = useStyles();

  if (!startTime) {
    return ReactNull;
  }

  /** 開始時刻からの経過時間 */
  const timeFromStart = subtractTimes(stamp, startTime);

  /** ツールチップに表示するアイテムの配列 */
  const tooltipItems: PlaybackControlsTooltipItem[] = [];

  /**
   * ホバー中のイベント情報をアイテムに追加
   *
   * @description
   * 各イベントの開始・終了時刻とメタデータを展開して表示。
   * 複数イベントがある場合は区切り線で分離。
   */
  if (!_.isEmpty(hoveredEvents)) {
    Object.values(hoveredEvents).forEach(({ event }) => {
      tooltipItems.push({
        type: "item",
        title: "Start",
        value: formatTime(event.startTime),
      });
      tooltipItems.push({
        type: "item",
        title: "End",
        value: formatTime(event.endTime),
      });
      if (!_.isEmpty(event.metadata)) {
        Object.entries(event.metadata).forEach(([metaKey, metaValue]) => {
          tooltipItems.push({ type: "item", title: metaKey, value: metaValue });
        });
      }
      tooltipItems.push({ type: "divider" });
    });
  }

  /**
   * 時刻情報の追加
   *
   * @description
   * アプリケーションの時間フォーマット設定に基づいて、
   * TOD（Time of Day）または SEC（Seconds）形式で表示。
   */
  switch (timeFormat) {
    case "TOD":
      tooltipItems.push({ type: "item", title: "Date", value: formatDate(stamp) });
      tooltipItems.push({ type: "item", title: "Time", value: formatTime(stamp) });
      break;
    case "SEC":
      tooltipItems.push({ type: "item", title: "SEC", value: formatTime(stamp) });
      break;
  }

  /**
   * 経過時間の追加
   *
   * @description
   * 開始時刻からの経過時間を秒単位（小数点以下9桁）で表示。
   */
  tooltipItems.push({
    type: "item",
    title: "Elapsed",
    value: `${toSec(timeFromStart).toFixed(9)} sec`,
  });

  return (
    <div className={classes.tooltipWrapper}>
      {tooltipItems.map((item, idx) => {
        if (item.type === "divider") {
          return <Divider key={`divider_${idx}`} className={classes.tooltipDivider} />;
        }
        return (
          <Fragment key={`${item.title}_${idx}`}>
            <Typography className={classes.itemKey} noWrap>
              {item.title}
            </Typography>
            <Typography variant="subtitle2" noWrap>
              {item.value}
            </Typography>
          </Fragment>
        );
      })}
    </div>
  );
}
