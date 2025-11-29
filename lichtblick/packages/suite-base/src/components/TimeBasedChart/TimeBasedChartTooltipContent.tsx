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
 * TimeBasedChartTooltipContent - 時系列チャートツールチップ表示コンポーネント
 *
 * このコンポーネントは、TimeBasedChartでマウスホバー時に表示される
 * ツールチップの内容を描画します。単一・複数データセットの両方に対応し、
 * 効率的で読みやすいデータ表示を提供します。
 *
 * ## 主な機能
 *
 * ### 1. 適応的レイアウト
 * - **単一データセット**: シンプルな縦積みレイアウト
 * - **複数データセット**: グリッドレイアウト（アイコン・ラベル・値）
 * - 自動的なレイアウト切り替え
 *
 * ### 2. データ表示最適化
 * - **値の型変換**: number/bigint/boolean/stringの統一表示
 * - **定数名表示**: 値に対応する定数名の併記
 * - **オーバーフロー処理**: 複数値存在時の警告表示
 *
 * ### 3. 視覚的識別
 * - **カラーアイコン**: データセット別の色分け表示
 * - **ラベル表示**: データセット名の明示
 * - **等幅フォント**: 数値の見やすい整列
 *
 * ### 4. パフォーマンス最適化
 * - **useMemo**: 重複データの効率的グループ化
 * - **条件付きレンダリング**: 不要な要素の描画回避
 * - **Fragment使用**: 余分なDOM要素の削減
 *
 * ## 使用例
 *
 * ### 単一データセット用
 * ```tsx
 * <TimeBasedChartTooltipContent
 *   content={[{
 *     configIndex: 0,
 *     value: 42.5,
 *     constantName: "TEMPERATURE"
 *   }]}
 *   multiDataset={false}
 * />
 * ```
 *
 * ### 複数データセット用
 * ```tsx
 * <TimeBasedChartTooltipContent
 *   content={tooltipData}
 *   multiDataset={true}
 *   colorsByConfigIndex={colorMap}
 *   labelsByConfigIndex={labelMap}
 * />
 * ```
 *
 * ## Props仕様
 *
 * @param content - 表示するツールチップデータ配列
 * @param multiDataset - 複数データセットモードの有効化
 * @param colorsByConfigIndex - データセット別カラーマップ（オプション）
 * @param labelsByConfigIndex - データセット別ラベルマップ（オプション）
 *
 * ## 内部実装の特徴
 *
 * ### データグループ化アルゴリズム
 * ```typescript
 * // 同一configIndexの項目をグループ化
 * const grouped = new Map<number, {
 *   tooltip: TimeBasedChartTooltipData;
 *   hasMultipleValues: boolean;
 * }>();
 * ```
 *
 * ### 型安全な値変換
 * ```typescript
 * const value = typeof tooltip.value === "string"
 *   ? tooltip.value
 *   : typeof tooltip.value === "bigint"
 *     ? tooltip.value.toString()
 *     : JSON.stringify(tooltip.value);
 * ```
 *
 * ## スタイリング
 *
 * ### グリッドレイアウト（複数データセット）
 * - 3列構成: アイコン | ラベル | 値
 * - 自動サイズ調整による最適な表示
 * - 適切なスペーシングとアライメント
 *
 * ### タイポグラフィ
 * - 等幅フォント使用による数値の整列
 * - キャプションサイズでの読みやすい表示
 * - 改行処理による長いテキスト対応
 *
 * ## 関連コンポーネント
 *
 * - `TimeBasedChart` - 親チャートコンポーネント
 * - `HoverBar` - ホバー位置表示
 * - `VerticalBarWrapper` - 垂直線表示
 *
 * ## 注意事項
 *
 * - multiDatasetフラグは表示形式を大きく変更する
 * - 大量のデータポイントでは表示を制限する
 * - カラーマップとラベルマップは同期を保つ必要がある
 * - パフォーマンス重視のため、不要な再レンダリングを避ける
 */

import { Square12Filled } from "@fluentui/react-icons";
import * as _ from "lodash-es";
import { Fragment, PropsWithChildren, useMemo } from "react";
import { makeStyles } from "tss-react/mui";

import { Immutable } from "@lichtblick/suite";
import Stack from "@lichtblick/suite-base/components/Stack";
import { customTypography } from "@lichtblick/theme";

/**
 * TimeBasedChartTooltipData - ツールチップ表示データ
 *
 * 単一のデータポイントに関する表示情報を格納する型定義
 */
export type TimeBasedChartTooltipData = {
  /** データセットのインデックス（色・ラベル特定用） */
  configIndex: number;
  /** 表示する値（数値、文字列、真偽値、BigInt対応） */
  value: number | bigint | boolean | string;
  /** 値に対応する定数名（オプション） */
  constantName?: string;
};

/**
 * Props - TimeBasedChartTooltipContentのプロパティ型定義
 */
type Props = Immutable<{
  /** データセット別カラーマップ（configIndex -> color） */
  colorsByConfigIndex?: Record<string, undefined | string>;
  /** 表示するツールチップデータ配列 */
  content: TimeBasedChartTooltipData[];
  /** データセット別ラベルマップ（configIndex -> label） */
  labelsByConfigIndex?: Record<string, undefined | string>;
  /** 複数データセットモードフラグ */
  multiDataset: boolean;
}>;

const useStyles = makeStyles()((theme) => ({
  root: {
    fontFamily: customTypography.fontMonospace,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    overflowWrap: "break-word",
  },
  grid: {
    columnGap: theme.spacing(0.5),
    display: "grid",
    gridTemplateColumns: "auto minmax(0px, max-content) minmax(auto, max-content)",
    alignItems: "center",
    fontFamily: customTypography.fontMonospace,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    overflowWrap: "break-word",
  },
  icon: {
    gridColumn: "1",
    height: 12,
    width: 12,
  },
  colorIconReplacement: {
    gridColumn: "1",
  },
  path: {
    opacity: 0.9,
    whiteSpace: "nowrap",
  },
  value: {
    fontWeight: 600,
    paddingLeft: theme.spacing(2),
  },
  overflow: {
    gridColumn: "2/4",
    opacity: theme.palette.action.disabledOpacity,
    fontStyle: "italic",

    ":not(:last-child)": {
      marginBottom: theme.spacing(0.5),
    },
  },
}));

/**
 * OverflowMessage - 複数値存在警告メッセージ
 *
 * 同一位置に複数のデータポイントが存在する場合に表示される
 * 警告メッセージコンポーネント
 */
function OverflowMessage(): React.JSX.Element {
  const { classes } = useStyles();

  return <div className={classes.overflow}>&lt;multiple values under cursor&gt;</div>;
}

/**
 * TimeBasedChartTooltipContent - メインツールチップコンポーネント
 *
 * 単一・複数データセットに応じて適切なレイアウトでツールチップを表示する
 */
export default function TimeBasedChartTooltipContent(
  props: PropsWithChildren<Props>,
): React.ReactElement {
  const {
    colorsByConfigIndex: colorsByDatasetIndex,
    content,
    labelsByConfigIndex: labelsByDatasetIndex,
    multiDataset,
  } = props;
  const { classes, cx } = useStyles();

  // 複数データセット用のデータグループ化処理
  // 同一configIndexの項目をまとめ、複数値の存在を検出する
  const sortedItems = useMemo(() => {
    // 単一データセットの場合はグループ化不要
    if (!multiDataset) {
      return [];
    }

    const out = new Map<
      number,
      { tooltip: TimeBasedChartTooltipData; hasMultipleValues: boolean }
    >();

    // configIndex別にグループ化
    for (const item of content) {
      const datasetIndex = item.configIndex;
      const existing = out.get(datasetIndex);
      if (existing) {
        existing.hasMultipleValues = true;
        continue;
      }

      out.set(datasetIndex, {
        tooltip: item,
        hasMultipleValues: false,
      });
    }

    // 設定順序を保持するためconfigIndexでソート
    return _.sortBy([...out.entries()], ([, items]) => items.tooltip.configIndex);
  }, [content, multiDataset]);

  // 単一データセットモード: シンプルな縦積みレイアウト
  // スペース節約のためラベルは表示しない
  if (!multiDataset) {
    const tooltip = content[0];
    if (!tooltip) {
      return <></>;
    }

    // 型安全な値の文字列変換
    const value =
      typeof tooltip.value === "string"
        ? tooltip.value
        : typeof tooltip.value === "bigint"
          ? tooltip.value.toString()
          : JSON.stringify(tooltip.value);

    return (
      <Stack className={classes.root} data-testid="TimeBasedChartTooltipContent">
        <div>
          {value}
          {tooltip.constantName != undefined ? ` (${tooltip.constantName})` : ""}
        </div>
        {content.length > 1 && <OverflowMessage />}
      </Stack>
    );
  }

  // 複数データセットモード: グリッドレイアウト
  // アイコン・ラベル・値の3列構成
  return (
    <div className={cx(classes.root, classes.grid)} data-testid="TimeBasedChartTooltipContent">
      {sortedItems.map(([datasetIndex, item], idx) => {
        const color = colorsByDatasetIndex?.[datasetIndex];
        const label = labelsByDatasetIndex?.[datasetIndex];
        const tooltip = item.tooltip;

        // 型安全な値の文字列変換
        const value =
          typeof tooltip.value === "string"
            ? tooltip.value
            : typeof tooltip.value === "bigint"
              ? tooltip.value.toString()
              : JSON.stringify(tooltip.value);

        return (
          <Fragment key={idx}>
            {color ? (
              <Square12Filled className={classes.icon} primaryFill={color} />
            ) : (
              <span className={classes.colorIconReplacement} />
            )}
            <div className={classes.path}>{label ?? ""}</div>
            <div className={classes.value}>
              {value}
              {tooltip.constantName != undefined ? ` (${tooltip.constantName})` : ""}
            </div>
            {item.hasMultipleValues && <OverflowMessage />}
          </Fragment>
        );
      })}
    </div>
  );
}
