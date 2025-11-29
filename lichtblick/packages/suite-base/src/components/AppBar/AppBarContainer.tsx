// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppBarContainer - アプリケーションバーコンテナコンポーネント
 *
 * AppBarの最外側コンテナとして機能し、以下の責務を持ちます：
 * - Material-UIのAppBarコンポーネントをラップ
 * - プラットフォーム固有のウィンドウ制御サポート
 * - ドラッグ可能なタイトルバー機能（デスクトップアプリ用）
 * - 左側インセット対応（システムウィンドウコントロール用の余白）
 * - ダブルクリックによるウィンドウ操作
 *
 * @example
 * ```typescript
 * <AppBarContainer leftInset={20} onDoubleClick={handleMaximize}>
 *   <AppBarContent />
 * </AppBarContainer>
 * ```
 */

import { AppBar as MuiAppBar } from "@mui/material";
import { CSSProperties, PropsWithChildren, useCallback, useMemo } from "react";
import { makeStyles } from "tss-react/mui";

import { APP_BAR_HEIGHT } from "./constants";

/**
 * AppBarContainer Props - コンテナコンポーネントのプロパティ
 *
 * @interface Props
 */
type Props = PropsWithChildren<{
  /** 左側インセット（ピクセル）- システムウィンドウコントロール用の余白 */
  leftInset?: number;
  /** ダブルクリック時のイベントハンドラー（ウィンドウ最大化/復元など） */
  onDoubleClick?: () => void;
}>;

/**
 * AppBarContainerスタイル定義
 *
 * プラットフォーム固有の機能とテーマシステムの統合を提供：
 * - WebkitAppRegion: ドラッグ可能なタイトルバー（Electron/PWA用）
 * - paddingRight: システムウィンドウコントロール用の余白計算
 * - env()関数: CSS環境変数によるプラットフォーム適応
 */
const useStyles = makeStyles()((theme) => {
  return {
    root: {
      /** グリッドレイアウト内での配置エリア */
      gridArea: "appbar",
      /** Material-UIデフォルトの影を無効化 */
      boxShadow: "none",
      /** テーマカラーの適用 */
      backgroundColor: theme.palette.appBar.main,
      /** 下部境界線を無効化 */
      borderBottom: "none",
      /** テキストカラーを白に設定 */
      color: theme.palette.common.white,
      /** 固定高さの適用 */
      height: APP_BAR_HEIGHT,

      /**
       * システムウィンドウコントロール用の右側余白
       * CSS環境変数を使用してプラットフォーム固有の値を取得
       * - titlebar-area-x: タイトルバーエリアのX座標
       * - titlebar-area-width: タイトルバーエリアの幅
       */
      paddingRight: "calc(100% - env(titlebar-area-x) - env(titlebar-area-width))",

      /**
       * Webkitアプリリージョン設定（デスクトップアプリ用）
       * "drag": この領域をドラッグしてウィンドウを移動可能にする
       * Electronアプリやフレームレスウィンドウで使用
       */
      WebkitAppRegion: "drag",
    },
  };
});

/**
 * AppBarContainer - アプリケーションバーコンテナコンポーネント
 *
 * Material-UIのAppBarをベースとしたカスタムコンテナ。
 * デスクトップアプリケーションでのウィンドウ制御機能を提供し、
 * プラットフォーム固有の動作をサポートします。
 *
 * 主な機能：
 * - ドラッグ可能なタイトルバー（WebkitAppRegion）
 * - システムウィンドウコントロール用の余白調整
 * - ダブルクリックによるウィンドウ操作
 * - 左側インセット対応（macOSのトラフィックライト用）
 *
 * @param props - コンポーネントのプロパティ
 * @returns AppBarコンテナのJSX要素
 */
export function AppBarContainer(props: Props): React.JSX.Element {
  const { children, leftInset, onDoubleClick } = props;
  const { classes } = useStyles();

  /**
   * 動的スタイル計算
   *
   * システムウィンドウコントロールの位置に応じて左側の余白を調整。
   * - Windows: env()関数による自動計算
   * - macOS: 固定値による手動調整（見た目の最適化）
   */
  const extraStyle = useMemo<CSSProperties>(() => ({ paddingLeft: leftInset }), [leftInset]);

  /**
   * ダブルクリックイベントハンドラー
   *
   * ウィンドウの最大化/復元操作を実行します。
   * イベントの伝播を停止して、子要素への影響を防ぎます。
   *
   * @param event - マウスイベント
   */
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      onDoubleClick?.();
    },
    [onDoubleClick],
  );

  return (
    <MuiAppBar
      className={classes.root}
      style={extraStyle}
      position="relative"
      color="inherit"
      elevation={0}
      onDoubleClick={handleDoubleClick}
      data-tourid="app-bar"
    >
      {children}
    </MuiAppBar>
  );
}
