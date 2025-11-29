// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * CustomWindowControls - カスタムウィンドウ制御コンポーネント
 *
 * デスクトップアプリケーション用のカスタムウィンドウ制御ボタンを提供します。
 * 標準的なOS ウィンドウ制御（最小化、最大化、閉じる）をアプリケーション内で
 * 実装し、統一されたUI体験を提供します。
 *
 * 主な機能：
 * - 最小化ボタン（ウィンドウをタスクバーに最小化）
 * - 最大化/復元ボタン（ウィンドウサイズの切り替え）
 * - 閉じるボタン（アプリケーションの終了）
 * - ズーム対応（AppBarのカウンターズーム動作）
 * - プラットフォーム固有の表示制御
 *
 * デザイン仕様：
 * - Windows/Linux スタイルのウィンドウ制御
 * - ホバー時の視覚的フィードバック
 * - 閉じるボタンの危険色表示
 * - アクセシビリティ対応（data-testid）
 *
 * @example
 * ```typescript
 * <CustomWindowControls
 *   isMaximized={windowMaximized}
 *   onMinimizeWindow={handleMinimize}
 *   onMaximizeWindow={handleMaximize}
 *   onUnmaximizeWindow={handleRestore}
 *   onCloseWindow={handleClose}
 * />
 * ```
 */

import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CloseIcon from "@mui/icons-material/Close";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import MinimizeIcon from "@mui/icons-material/Minimize";
import { IconButton } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";

/**
 * CustomWindowControls Props - カスタムウィンドウ制御コンポーネントのプロパティ
 *
 * デスクトップアプリケーションのウィンドウ制御に必要なプロパティを定義。
 * ズーム機能やプラットフォーム固有の動作をサポートします。
 */
export type CustomWindowControlsProps = {
  /** カスタムウィンドウ制御の表示フラグ */
  showCustomWindowControls?: boolean;
  /** ウィンドウの最大化状態 */
  isMaximized?: boolean;
  /**
   * 初期ズーム倍率
   *
   * ウィンドウの作成/リフレッシュ時に設定される初期ズーム倍率。
   * AppBarのカウンターズーム動作のベースラインとして使用され、
   * ブラウザウィンドウがズームイン/アウトしても
   * AppBarが同じサイズで表示されるようにします。
   */
  initialZoomFactor?: number;
  /** ウィンドウ最小化時のイベントハンドラー */
  onMinimizeWindow?: () => void;
  /** ウィンドウ最大化時のイベントハンドラー */
  onMaximizeWindow?: () => void;
  /** ウィンドウ復元時のイベントハンドラー */
  onUnmaximizeWindow?: () => void;
  /** ウィンドウ閉じる時のイベントハンドラー */
  onCloseWindow?: () => void;
};

/**
 * CustomWindowControlsスタイル定義
 *
 * ウィンドウ制御ボタンの外観を定義：
 * - 閉じるボタンのホバー時危険色表示
 * - 統一されたボタンサイズとスペーシング
 */
const useStyles = makeStyles()((theme) => ({
  /** 閉じるボタンのスタイル */
  closeButton: {
    /** ホバー時に危険色（赤）を表示 */
    ":hover": {
      backgroundColor: theme.palette.error.main,
    },
  },
}));

/**
 * CustomWindowControls - カスタムウィンドウ制御コンポーネント
 *
 * デスクトップアプリケーション用のウィンドウ制御ボタン群を提供。
 * 標準的なOS ウィンドウ制御機能をアプリケーション内で実装し、
 * 統一されたUI体験を提供します。
 *
 * ボタン構成：
 * 1. 最小化ボタン（MinimizeIcon）
 * 2. 最大化/復元ボタン（CheckBoxOutlineBlank/FilterNoneIcon）
 * 3. 閉じるボタン（CloseIcon、ホバー時赤色）
 *
 * 動作仕様：
 * - 最大化状態に応じてアイコンを切り替え
 * - 各ボタンにテスト用IDを付与
 * - ホバー時の視覚的フィードバック
 * - 継承色の使用によるテーマ対応
 *
 * アクセシビリティ：
 * - data-testid による自動テスト対応
 * - 適切なボタンサイズ（small）
 * - 色のコントラスト確保
 *
 * @param props - コンポーネントのプロパティ
 * @returns CustomWindowControlsのJSX要素
 */
export function CustomWindowControls({
  isMaximized = false,
  onMinimizeWindow,
  onMaximizeWindow,
  onUnmaximizeWindow,
  onCloseWindow,
}: Omit<CustomWindowControlsProps, "showCustomWindowControls">): React.JSX.Element {
  const { classes } = useStyles();

  return (
    <Stack direction="row" gap={1} paddingX={1}>
      {/* 最小化ボタン */}
      <IconButton
        size="small"
        color="inherit"
        onClick={onMinimizeWindow}
        data-testid="win-minimize"
      >
        <MinimizeIcon fontSize="inherit" color="inherit" />
      </IconButton>

      {/* 最大化/復元ボタン */}
      <IconButton
        size="small"
        color="inherit"
        onClick={isMaximized ? onUnmaximizeWindow : onMaximizeWindow}
        data-testid="win-maximize"
      >
        {isMaximized ? (
          // 最大化時: 復元アイコン（重なった四角）
          <FilterNoneIcon fontSize="inherit" color="inherit" />
        ) : (
          // 通常時: 最大化アイコン（空の四角）
          <CheckBoxOutlineBlankIcon fontSize="inherit" color="inherit" />
        )}
      </IconButton>

      {/* 閉じるボタン */}
      <IconButton
        className={classes.closeButton}
        size="small"
        color="inherit"
        onClick={onCloseWindow}
        data-testid="win-close"
      >
        <CloseIcon fontSize="inherit" color="inherit" />
      </IconButton>
    </Stack>
  );
}
