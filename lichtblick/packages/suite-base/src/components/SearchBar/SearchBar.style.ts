// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

/**
 * SearchBar スタイル定義
 *
 * @overview
 * SearchBar コンポーネントのスタイル定義。
 * tss-react/mui を使用してテーマ対応のスタイルを提供。
 *
 * @features
 * - スティッキーポジション対応のフィルターバー
 * - アプリケーションバーよりも上位の z-index
 * - テーマに基づいた背景色とスペーシング
 * - 開始アドーンメントの flex 表示
 *
 * @architecture
 * - tss-react/mui の makeStyles を使用
 * - Material UI のテーマシステムと統合
 * - 再利用可能なスタイルクラスを提供
 *
 * @styleClasses
 * - filterStartAdornment: 開始アドーンメント用のスタイル
 * - filterSearchBar: メインの検索バー用のスタイル
 *
 * @returns useStyles hook とスタイルクラス
 */
export const useStyles = makeStyles()((theme) => ({
  /**
   * 開始アドーンメント（検索アイコン等）のスタイル
   *
   * @style
   * - display: flex - アイコンを flex 表示
   */
  filterStartAdornment: {
    display: "flex",
  },

  /**
   * 検索バーのメインコンテナスタイル
   *
   * @style
   * - position: sticky - スクロール時も固定表示
   * - top: 0 - 上端に固定
   * - zIndex: theme.zIndex.appBar - アプリケーションバーより上位
   * - padding: theme.spacing(0.5) - テーマに基づいた適切な余白
   * - backgroundColor: theme.palette.background.paper - テーマの背景色
   *
   * @purpose
   * フィルタリング機能を提供する際、常に見えるように上部に固定表示。
   * 長いリストでもスクロール時にアクセス可能。
   */
  filterSearchBar: {
    top: 0,
    zIndex: theme.zIndex.appBar,
    padding: theme.spacing(0.5),
    position: "sticky",
    backgroundColor: theme.palette.background.paper,
  },
}));
