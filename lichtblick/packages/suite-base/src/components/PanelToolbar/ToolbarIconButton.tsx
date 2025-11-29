// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IconButton, IconButtonProps } from "@mui/material";
import { ForwardedRef, forwardRef } from "react";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  root: {
    padding: theme.spacing(0.375),
    fontSize: "0.875rem",

    ".MuiSvgIcon-root, svg:not(.MuiSvgIcon-root)": {
      height: "1em",
      width: "1em",
      fontSize: "inherit",
    },
  },
}));

/**
 * **ToolbarIconButton** - ツールバー用アイコンボタン
 *
 * パネルツールバーで使用される統一されたスタイルのアイコンボタンコンポーネント。
 * Material-UIのIconButtonをベースに、ツールバーに最適化されたスタイリングを適用します。
 *
 * @features
 * - **統一スタイル**: 全ツールバーで一貫したアイコンボタンサイズ
 * - **forwardRef対応**: 親コンポーネントからのref転送
 * - **カスタムスタイル**: ツールバー専用のパディングとフォントサイズ
 * - **SVGアイコン対応**: Material-UIアイコンと独自SVGアイコンの両方に対応
 * - **アクセシビリティ**: Material-UIのIconButtonの全機能を継承
 *
 * @styling
 * - **パディング**: 0.375rem（6px）の一律パディング
 * - **フォントサイズ**: 0.875rem（14px）
 * - **アイコンサイズ**: 1em（フォントサイズ継承）
 * - **レスポンシブ**: テーマに基づく適応的サイズ調整
 *
 * @architecture
 * - **Material-UI統合**: IconButtonPropsの完全継承
 * - **テーマ対応**: TSS-React MUIによるテーマ統合
 * - **スタイル最適化**: CSSセレクターによる効率的なスタイル適用
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <ToolbarIconButton title="設定" onClick={openSettings}>
 *   <SettingsIcon />
 * </ToolbarIconButton>
 *
 * // ref付きの使用方法
 * <ToolbarIconButton ref={buttonRef} title="メニュー">
 *   <MenuIcon />
 * </ToolbarIconButton>
 * ```
 *
 * @param props - Material-UIのIconButtonProps
 * @param ref - DOM要素への参照
 * @returns JSX.Element - レンダリングされたアイコンボタン
 */
export default forwardRef(function ToolbarIconButton(
  props: IconButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
): React.ReactElement {
  const { className, ...rest } = props;
  const { classes, cx } = useStyles();

  return <IconButton ref={ref} className={cx(classes.root, className)} {...rest} />;
});
