// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

/**
 * ActionMenuコンポーネントのスタイル定義
 *
 * @description ActionMenuコンポーネントで使用するスタイル定義を提供する。
 * 特に小さなアイコンボタンのスタイルを最適化し、一貫したUI体験を提供する。
 *
 * @returns ActionMenuのスタイルクラス
 *
 * @example
 * ```typescript
 * const { classes, cx } = useStyles();
 * <IconButton className={cx({ [classes.iconButtonSmall]: fontSize === "small" })} />
 * ```
 */
export const useStyles = makeStyles()((theme) => ({
  /**
   * 小さなアイコンボタンのスタイル
   *
   * @description 小さなアイコンボタンの外観を調整する。
   * 全体の高さを30pxに統一し、角丸を無効化して
   * 密度の高いUIレイアウトに適合させる。
   */
  iconButtonSmall: {
    padding: theme.spacing(0.91125), // round out the overall height to 30px
    borderRadius: 0,
  },
}));
