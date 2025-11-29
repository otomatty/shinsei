// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppBarDropdownButton - アプリケーションバー用ドロップダウンボタンコンポーネント
 *
 * AppBar内でドロップダウンメニューを開くためのボタンコンポーネントです。
 * 以下の機能を提供：
 * - タイトルとサブヘッダーの表示
 * - テキストの中央省略（長いテキストの場合）
 * - 選択状態の視覚的フィードバック
 * - シェブロンアイコンによるドロップダウン表示
 * - AppBarテーマとの統合
 *
 * @example
 * ```typescript
 * <AppBarDropdownButton
 *   title="現在のレイアウト"
 *   subheader="レイアウト"
 *   selected={isMenuOpen}
 *   onClick={handleMenuToggle}
 * />
 * ```
 */

import { ChevronDown12Filled } from "@fluentui/react-icons";
import { ButtonBase, ButtonBaseProps, Typography } from "@mui/material";
import { forwardRef } from "react";
import tinycolor2 from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";
import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";

import { APP_BAR_HEIGHT } from "./constants";

/**
 * AppBarDropdownButtonスタイル定義
 *
 * AppBarテーマに最適化されたドロップダウンボタンのスタイル：
 * - レスポンシブなテキスト省略（ビューポート幅に応じて調整）
 * - 階層的な情報表示（サブヘッダー + メインタイトル）
 * - 統一されたホバー・選択状態のスタイリング
 */
const useStyles = makeStyles()((theme) => ({
  /** テキスト省略コンテナ */
  textTruncate: {
    /** レスポンシブな最大幅（ビューポート幅の18%） */
    maxWidth: "18vw",
    /** テキストオーバーフロー時の非表示 */
    overflow: "hidden",
  },
  /** サブヘッダーのスタイル */
  subheader: {
    /** 小さなフォントサイズ */
    fontSize: 8,
    /** 半透明で控えめな表示 */
    opacity: 0.6,
  },
  /** ドロップダウンボタンのメインスタイル */
  layoutButton: {
    /** 親要素のフォント継承 */
    font: "inherit",
    /** AppBarの高さに合わせた固定高さ */
    height: APP_BAR_HEIGHT,
    /** テーマから継承したフォントサイズ */
    fontSize: theme.typography.body2.fontSize,
    /** 左右の要素を両端に配置 */
    justifyContent: "space-between",
    /** 最小幅の設定（レイアウト安定性） */
    minWidth: 120,
    /** 内部パディングの調整 */
    padding: theme.spacing(1.125, 1.5),
    /** 要素間のギャップ */
    gap: theme.spacing(1.5),
    /** 角丸を無効化してシャープな外観 */
    borderRadius: 0,

    /** ホバー状態のスタイル */
    ":hover": {
      backgroundColor: tinycolor2(theme.palette.common.white).setAlpha(0.08).toString(),
    },
    /** 選択状態のスタイル */
    "&.Mui-selected": {
      backgroundColor: theme.palette.appBar.primary,
    },
  },
}));

/**
 * AppBarDropdownButton Props - ドロップダウンボタンコンポーネントのプロパティ
 *
 * Material-UIのButtonBasePropsを拡張し、ドロップダウン固有のプロパティを追加。
 */
type Props = {
  /** メインタイトル（必須） */
  title: string;
  /** サブヘッダー（オプション、小さく表示される説明文） */
  subheader?: string;
  /** 選択状態（true時は選択状態のスタイルを適用） */
  selected: boolean;
  /** クリック時のイベントハンドラー */
  onClick: () => void;
} & ButtonBaseProps;

/**
 * AppBarDropdownButton - アプリケーションバー用ドロップダウンボタン
 *
 * AppBar内でドロップダウンメニューを開くためのボタンコンポーネント。
 * 階層的な情報表示（サブヘッダー + メインタイトル）と視覚的フィードバックを提供します。
 *
 * 主な特徴：
 * - 2段階の情報表示（サブヘッダー + タイトル）
 * - レスポンシブなテキスト省略（長いタイトルの場合）
 * - 選択状態の視覚的フィードバック
 * - シェブロンアイコンによるドロップダウン表示
 * - AppBarテーマとの統合されたスタイリング
 * - アクセシビリティ対応（aria-haspopup属性）
 *
 * @param props - コンポーネントのプロパティ
 * @param ref - ボタン要素への参照
 * @returns AppBarドロップダウンボタンのJSX要素
 */
const AppBarDropdownButton = forwardRef<HTMLButtonElement, Props>((props, ref) => {
  const { title, subheader, onClick, selected, ...rest } = props;
  const { classes, cx } = useStyles();

  return (
    <ButtonBase
      className={cx(classes.layoutButton, { "Mui-selected": selected })}
      aria-haspopup="true"
      onClick={onClick}
      ref={ref}
      {...rest}
    >
      {/* 左側: 階層的な情報表示エリア */}
      <Stack alignItems="flex-start">
        {/* サブヘッダー（オプション） */}
        {subheader && (
          <Typography variant="overline" className={classes.subheader}>
            {subheader}
          </Typography>
        )}
        {/* メインタイトル（中央省略対応） */}
        <div className={classes.textTruncate}>
          <TextMiddleTruncate text={title} />
        </div>
      </Stack>
      {/* 右側: ドロップダウン表示のシェブロンアイコン */}
      <ChevronDown12Filled />
    </ButtonBase>
  );
});
AppBarDropdownButton.displayName = "AppBarDropdownButton";

// ts-unused-exports:disable-next-line
export { AppBarDropdownButton };
