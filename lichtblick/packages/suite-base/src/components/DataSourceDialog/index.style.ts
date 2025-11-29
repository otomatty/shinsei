// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import tinycolor from "tinycolor2";
import { makeStyles } from "tss-react/mui";

/**
 * DataSourceDialog 共通スタイル定義
 *
 * DataSourceDialogコンポーネント群で共有されるスタイル定義を提供します。
 * レスポンシブデザイン、グリッドレイアウト、テーマ統合を実装し、
 * 一貫性のあるUI体験を提供します。
 *
 * 主な機能:
 * - レスポンシブグリッドレイアウト（デスクトップ/モバイル対応）
 * - テーマ統合（ライト/ダークモード対応）
 * - アクセシビリティ対応（画面高さ制限への対応）
 * - 視覚的階層構造（ヘッダー、コンテンツ、サイドバー）
 *
 * @example
 * ```tsx
 * import { useStyles } from './index.style';
 *
 * function MyComponent() {
 *   const { classes } = useStyles();
 *   return <div className={classes.grid}>...</div>;
 * }
 * ```
 */
export const useStyles = makeStyles()((theme) => ({
  /**
   * ロゴスタイル
   * Lichtblickロゴの表示サイズと位置調整を定義
   */
  logo: {
    width: 212,
    height: "auto",
    marginLeft: theme.spacing(-1),
  },
  grid: {
    [theme.breakpoints.up("md")]: {
      display: "grid",
      gridTemplateAreas: `
          "header spacer"
          "content sidebar"
        `,
      gridTemplateRows: `content auto`,
      gridTemplateColumns: `1fr 375px`,
    },
  },
  header: {
    padding: theme.spacing(6),
    gridArea: "header",

    [theme.breakpoints.down("md")]: {
      padding: theme.spacing(4),
    },
    [`@media (max-height: ${theme.breakpoints.values.sm})`]: {
      display: "none",
    },
  },
  content: {
    padding: theme.spacing(0, 6, 6),
    overflow: "hidden",
    gridArea: "content",

    [theme.breakpoints.down("md")]: {
      padding: theme.spacing(0, 4, 4),
    },
    [`@media (max-height: ${theme.breakpoints.values.sm})`]: {
      paddingTop: theme.spacing(6),
    },
  },
  spacer: {
    gridArea: "spacer",
    backgroundColor: tinycolor(theme.palette.text.primary).setAlpha(0.04).toRgbString(),

    [`@media (max-height: ${theme.breakpoints.values.sm})`]: {
      display: "none",
    },
  },
  sidebar: {
    gridArea: "sidebar",
    backgroundColor: tinycolor(theme.palette.text.primary).setAlpha(0.04).toRgbString(),
    padding: theme.spacing(0, 5, 5),

    [theme.breakpoints.down("md")]: {
      padding: theme.spacing(4),
    },
    [`@media (max-height: ${theme.breakpoints.values.sm})`]: {
      paddingTop: theme.spacing(6),
    },
  },
  button: {
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  connectionButton: {
    textAlign: "left",
    justifyContent: "flex-start",
    padding: theme.spacing(2, 3),
    gap: theme.spacing(1.5),
    borderColor: theme.palette.divider,

    ".MuiButton-startIcon .MuiSvgIcon-fontSizeLarge": {
      fontSize: 28,
    },
  },
  recentListItemButton: {
    overflow: "hidden",
    color: theme.palette.primary.main,

    "&:hover": {
      backgroundColor: "transparent",
      color: theme.palette.primary[theme.palette.mode === "dark" ? "light" : "dark"],
    },
  },
  recentSourceSecondary: {
    color: "inherit",
  },
}));
