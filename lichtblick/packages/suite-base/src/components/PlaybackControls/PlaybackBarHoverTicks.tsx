// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * PlaybackBarHoverTicks - 再生バーホバーティック表示コンポーネント
 *
 * @overview
 * スクラブバーでのホバー時に、他のコンポーネントからのホバー値を
 * 視覚的に表示するコンポーネント。HoverBar と連携してクロスコンポーネント
 * でのホバー状態を統一的に管理。
 *
 * @features
 * - 他コンポーネントからのホバー値表示
 * - 時間フォーマット対応のツールチップ
 * - 自動リサイズ対応のスケール計算
 * - TimelineInteractionStateContext との統合
 *
 * @architecture
 * - MessagePipeline による時間範囲取得
 * - HoverBar コンポーネントによる統一的ホバー管理
 * - react-resize-detector による動的サイズ対応
 * - Material UI Tooltip による時間表示
 *
 * @behavior
 * - 自コンポーネント発のホバーは表示しない
 * - 他コンポーネント発のホバー値を視覚化
 * - ツールチップで詳細な時間情報を提供
 *
 * @usageExample
 * ```tsx
 * <PlaybackBarHoverTicks componentId="scrubber" />
 * ```
 */

import { Tooltip } from "@mui/material";
import { useMemo } from "react";
import { useResizeDetector } from "react-resize-detector";
import { makeStyles } from "tss-react/mui";

import { add, fromSec, toSec } from "@lichtblick/rostime";
import { RpcScales } from "@lichtblick/suite-base/components/Chart/types";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";
import HoverBar from "@lichtblick/suite-base/components/TimeBasedChart/HoverBar";
import { useHoverValue } from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { customTypography } from "@lichtblick/theme";

/**
 * PlaybackBarHoverTicks のスタイル定義
 *
 * @returns スタイルクラス
 */
const useStyles = makeStyles()((theme) => ({
  /**
   * ホバーティックのスタイル
   *
   * @style
   * - 位置: 絶対位置で中央に配置
   * - サイズ: 高さ16px、幅2px
   * - 色: warning カラー（注意を引く色）
   * - 形状: 角丸のバー形状
   * - 変形: X軸中央揃え
   */
  tick: {
    position: "absolute",
    height: 16,
    borderRadius: 1,
    width: 2,
    top: 8,
    transform: "translate(-50%, 0)",
    backgroundColor: theme.palette.warning.main,
  },
  /**
   * 時間表示テキストのスタイル
   *
   * @style
   * - 配置: 中央揃え
   * - フォント: モノスペースフォント（数字の配置統一）
   * - サイズ: caption サイズ（小さめ）
   * - 改行: 禁止（ツールチップ内での一行表示）
   */
  time: {
    textAlign: "center",
    fontFamily: customTypography.fontMonospace,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: theme.typography.caption.letterSpacing,
    whiteSpace: "nowrap",
  },
  /**
   * ツールチップのポジション調整
   *
   * @style
   * - 上部配置時のマージン調整
   * - important による強制適用
   */
  tooltip: {
    '&[data-popper-placement*="top"] .MuiTooltip-tooltip': {
      marginBottom: `${theme.spacing(1)} !important`,
    },
  },
}));

/**
 * MessagePipeline から開始時刻を取得するセレクター
 *
 * @param ctx - MessagePipelineContext
 * @returns 開始時刻または undefined
 */
function getStartTime(ctx: MessagePipelineContext) {
  return ctx.playerState.activeData?.startTime;
}

/**
 * MessagePipeline から終了時刻を取得するセレクター
 *
 * @param ctx - MessagePipelineContext
 * @returns 終了時刻または undefined
 */
function getEndTime(ctx: MessagePipelineContext) {
  return ctx.playerState.activeData?.endTime;
}

/**
 * PlaybackBarHoverTicks のプロパティ
 *
 * @interface Props
 */
type Props = {
  /** このコンポーネントの識別子（自己発信ホバーの除外に使用） */
  componentId: string;
};

/**
 * PlaybackBarHoverTicks コンポーネント
 *
 * @param props - コンポーネントのプロパティ
 * @returns ホバーティック表示コンポーネント
 */
export default function PlaybackBarHoverTicks(props: Props): React.JSX.Element {
  const { componentId } = props;
  const { classes } = useStyles();

  const startTime = useMessagePipeline(getStartTime);
  const endTime = useMessagePipeline(getEndTime);
  const hoverValue = useHoverValue({ componentId, isPlaybackSeconds: true });
  const { formatTime } = useAppTimeFormat();

  /**
   * リサイズ検出器の設定
   *
   * @description
   * デバウンスと0リフレッシュレートを使用して、
   * リサイズ観測中の再リサイズ観測トリガーを回避。
   *
   * @see https://github.com/maslianok/react-resize-detector/issues/45
   */
  const { width, ref } = useResizeDetector({
    handleHeight: false,
    refreshMode: "debounce",
    refreshRate: 0,
  });

  /**
   * ホバー時間の表示フォーマット
   *
   * @description
   * ホバー値から時刻を計算し、アプリケーションの
   * 時間フォーマット設定に従って表示文字列を生成。
   */
  const hoverTimeDisplay = useMemo(() => {
    if (
      !hoverValue ||
      hoverValue.type !== "PLAYBACK_SECONDS" ||
      !startTime ||
      hoverValue.value < 0
    ) {
      return undefined;
    }
    const stamp = add(startTime, fromSec(hoverValue.value));
    return formatTime(stamp);
  }, [formatTime, hoverValue, startTime]);

  /**
   * HoverBar 用のスケール境界計算
   *
   * @description
   * 開始・終了時刻とコンテナ幅から、
   * HoverBar で使用するスケールパラメータを計算。
   */
  const scaleBounds = useMemo<RpcScales | undefined>(() => {
    if (startTime == undefined || endTime == undefined) {
      return;
    }

    return {
      x: {
        min: 0,
        max: toSec(endTime) - toSec(startTime),
        pixelMin: 0,
        pixelMax: width ?? 0,
      },
    };
  }, [width, startTime, endTime]);

  /**
   * ホバー時間表示の制御
   *
   * @description
   * 他のコンポーネントからのホバー値のみ表示。
   * 自分自身のコンポーネントからのホバー値は除外。
   */
  const displayHoverTime = hoverValue != undefined && hoverValue.componentId !== componentId;

  return (
    <Stack ref={ref} flex="auto">
      {scaleBounds && (
        <HoverBar componentId={componentId} scales={scaleBounds} isPlaybackSeconds>
          <Tooltip
            arrow
            classes={{ popper: classes.tooltip }}
            placement="top"
            disableFocusListener
            disableHoverListener
            disableTouchListener
            disableInteractive
            slotProps={{ transition: { timeout: 0 } }}
            open={displayHoverTime}
            title={<div className={classes.time}>{hoverTimeDisplay}</div>}
          >
            <div className={classes.tick} />
          </Tooltip>
        </HoverBar>
      )}
    </Stack>
  );
}
