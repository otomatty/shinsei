// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * ProgressPlot - データ読み込み進捗表示コンポーネント
 *
 * @overview
 * 再生可能なデータ範囲と読み込み状態を視覚化するコンポーネント。
 * スクラブバーの背景として使用され、データの利用可能性を表示。
 *
 * @features
 * - 利用可能なデータ範囲の視覚化
 * - 読み込み中のアニメーション表示
 * - 範囲の統合とクランプ処理
 * - テーマ対応のスタイリング
 *
 * @architecture
 * - intervals-fn ライブラリによる範囲統合
 * - CSS keyframes を使用したアニメーション
 * - React.memo による最適化対応
 * - tss-react/mui でのテーマ統合
 *
 * @visualBehavior
 * - 読み込み完了: 半透明の背景色で表示
 * - 読み込み中: 縞模様のアニメーション
 * - 範囲の重複: 自動的に統合して表示
 *
 * @usageExample
 * ```tsx
 * <ProgressPlot
 *   loading={isLoading}
 *   availableRanges={[
 *     { start: 0.0, end: 0.3 },
 *     { start: 0.7, end: 1.0 }
 *   ]}
 * />
 * ```
 */

import { keyframes } from "@emotion/react";
import { simplify } from "intervals-fn";
import * as _ from "lodash-es";
import { useMemo } from "react";
import tinycolor from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import { filterMap } from "@lichtblick/den/collection";
import { Immutable } from "@lichtblick/suite";
import Stack from "@lichtblick/suite-base/components/Stack";
import { Range } from "@lichtblick/suite-base/util/ranges";

/**
 * ProgressPlot のプロパティ
 *
 * @interface ProgressProps
 */
type ProgressProps = Immutable<{
  /** 読み込み中かどうか */
  loading: boolean;
  /** 利用可能なデータ範囲の配列 */
  availableRanges?: Range[];
}>;

/** 縞模様のアニメーション幅（ピクセル） */
const STRIPE_WIDTH = 8;

/**
 * 読み込み中アニメーション用のキーフレーム
 *
 * @description
 * 縞模様が右に移動するアニメーション効果を定義。
 * 読み込み状態の視覚的フィードバックを提供。
 */
const animatedBackground = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: ${STRIPE_WIDTH * 2}px 0; }
`;

/**
 * ProgressPlot のスタイル定義
 *
 * @returns スタイルクラス
 */
const useStyles = makeStyles()((theme) => ({
  /**
   * 読み込み中インジケーターのスタイル
   *
   * @style
   * - アニメーション: 縞模様の右移動
   * - 背景: repeating-linear-gradient による縞模様
   * - 位置: 絶対位置で親要素全体を覆う
   */
  loadingIndicator: {
    label: "ProgressPlot-loadingIndicator",
    position: "absolute",
    width: "100%",
    height: "100%",
    animation: `${animatedBackground} 300ms linear infinite`,
    backgroundRepeat: "repeat-x",
    backgroundSize: `${STRIPE_WIDTH * 2}px 100%`,
    backgroundImage: `repeating-linear-gradient(${[
      "90deg",
      theme.palette.background.paper,
      `${theme.palette.background.paper} ${STRIPE_WIDTH / 2}px`,
      `transparent ${STRIPE_WIDTH / 2}px`,
      `transparent ${STRIPE_WIDTH}px`,
    ].join(",")})`,
  },
  /**
   * 利用可能範囲のスタイル
   *
   * @style
   * - 背景色: テーマに応じた半透明色
   * - 位置: 絶対位置で範囲に応じた幅
   * - 高さ: 親要素の100%
   */
  range: {
    label: "ProgressPlot-range",
    position: "absolute",
    backgroundColor:
      theme.palette.mode === "dark"
        ? tinycolor(theme.palette.text.secondary).darken(25).toHexString()
        : tinycolor(theme.palette.text.secondary).lighten(25).toHexString(),
    height: "100%",
  },
}));

/**
 * ProgressPlot コンポーネント
 *
 * @param props - コンポーネントのプロパティ
 * @returns 進捗表示コンポーネント
 */
export function ProgressPlot(props: ProgressProps): React.JSX.Element {
  const { availableRanges, loading } = props;
  const { classes } = useStyles();

  /**
   * 範囲の正規化処理
   *
   * @description
   * 0-1 の範囲内にクランプし、無効な範囲を除去。
   */
  const clampedRanges = useMemo(() => {
    if (!availableRanges) {
      return undefined;
    }

    return availableRanges.map((range) => ({
      start: _.clamp(range.start, 0, 1),
      end: _.clamp(range.end, 0, 1),
    }));
  }, [availableRanges]);

  /**
   * 統合された範囲要素の生成
   *
   * @description
   * 重複する範囲を統合し、DOM 要素として描画。
   * 幅が0の範囲は除外する。
   */
  const ranges = useMemo(() => {
    if (!clampedRanges) {
      return <></>;
    }
    const mergedRanges = simplify(clampedRanges);

    return filterMap(mergedRanges, (range, idx) => {
      const width = range.end - range.start;
      if (width === 0) {
        return;
      }

      return (
        <div
          className={classes.range}
          key={idx}
          style={{
            width: `${width * 100}%`,
            left: `${range.start * 100}%`,
          }}
        />
      );
    });
  }, [clampedRanges, classes.range]);

  return (
    <Stack position="relative" fullHeight>
      {loading && <div data-testid="progress-plot" className={classes.loadingIndicator} />}
      {ranges}
    </Stack>
  );
}
