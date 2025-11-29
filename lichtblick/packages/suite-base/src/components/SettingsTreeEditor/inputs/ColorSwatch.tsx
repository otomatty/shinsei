// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Theme } from "@mui/material";
import tinycolor from "tinycolor2";
import { makeStyles } from "tss-react/mui";

/**
 * 色に対するコントラスト境界線の色を計算する関数
 *
 * 指定された色に対して最適な視認性を持つ境界線色を算出します。
 * tinycolorを使用して色の妥当性を検証し、テーマのコントラストカラーを適用します。
 *
 * @param theme - Material-UIテーマオブジェクト
 * @param color - 境界線色を計算する対象の色
 * @returns 計算されたコントラスト境界線色
 */
function calculateBorderColor(theme: Theme, color: string): string {
  const parsedColor = tinycolor(color);
  return parsedColor.isValid()
    ? theme.palette.getContrastText(parsedColor.toHexString())
    : theme.palette.text.primary;
}

/**
 * ColorSwatchコンポーネントのプロパティ
 */
type ColorSwatchProps = {
  /** 表示する色の値 */
  color: string;
  /** 色見本のサイズ */
  size?: "small" | "medium" | "large";
} & React.HTMLAttributes<HTMLDivElement>;

/** 色見本のスタイル定義 */
const useStyles = makeStyles()((theme) => ({
  root: {
    // Color on top of white/black diagonal gradient. Color must be specified as a gradient because a
    // background color can't be stacked on top of a background image.
    backgroundImage: `linear-gradient(to bottom right, white 50%, black 50%)`,
    borderRadius: theme.shape.borderRadius,
    display: "inline-flex",
    aspectRatio: "1/1",
    flexShrink: 0,
  },
  swatch: {
    aspectRatio: "1/1",
  },
  sizeSmall: {
    height: theme.spacing(2),
    width: theme.spacing(2),
  },
  sizeMedium: {
    height: theme.spacing(2),
    width: theme.spacing(2),
  },
  sizeLarge: {
    height: theme.spacing(3),
    width: theme.spacing(3),
  },
}));

/**
 * **ColorSwatch** - 色見本表示コンポーネント
 *
 * 指定された色を視覚的に表示するための色見本コンポーネント。
 * 透明度のある色や無効な色値も適切に表示し、クリック可能な色選択UI要素として機能します。
 *
 * @features
 * - **Transparency Support**: 透明度のある色を背景パターンで表示
 * - **Size Variants**: small、medium、largeの3つのサイズオプション
 * - **Contrast Border**: 色に応じた最適なコントラスト境界線
 * - **Color Validation**: 無効な色値の安全な処理
 * - **Accessibility**: HTMLAttributes継承によるアクセシビリティ対応
 * - **Responsive**: アスペクト比1:1の正方形を維持
 *
 * @transparency_handling
 * - **Background Pattern**: 白黒対角グラデーションで透明度を可視化
 * - **Color Overlay**: 指定色をグラデーション上に重ね合わせ
 * - **Alpha Channel**: RGBA値の透明度を正確に表示
 *
 * @sizing_system
 * - **Small**: 16px × 16px（theme.spacing(2)）
 * - **Medium**: 16px × 16px（theme.spacing(2)）- デフォルト
 * - **Large**: 24px × 24px（theme.spacing(3)）
 *
 * @border_calculation
 * - **Contrast Detection**: 色の明度に基づく境界線色の算出
 * - **Theme Integration**: Material-UIのgetContrastText関数を使用
 * - **Fallback Handling**: 無効な色の場合はプライマリテキスト色を使用
 *
 * @interaction_support
 * - **Click Events**: React.HTMLAttributes継承による標準イベント対応
 * - **Keyboard Navigation**: フォーカス可能な要素としての機能
 * - **Custom Styling**: className propによるカスタムスタイル適用
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <ColorSwatch
 *   color="#FF0000"
 *   onClick={() => setSelectedColor("#FF0000")}
 * />
 *
 * // サイズ指定
 * <ColorSwatch
 *   color="#00FF00"
 *   size="large"
 *   onClick={handleColorClick}
 * />
 *
 * // 透明度のある色
 * <ColorSwatch
 *   color="rgba(255, 0, 0, 0.5)"
 *   title="半透明の赤"
 * />
 *
 * // カスタムスタイル
 * <ColorSwatch
 *   color="#0000FF"
 *   className="custom-swatch"
 *   style={{ margin: 8 }}
 * />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされた色見本コンポーネント
 */
export function ColorSwatch(props: ColorSwatchProps): React.JSX.Element {
  const { color, size = "medium", className, ...rest } = props;
  const { classes, cx, theme } = useStyles();

  return (
    <div
      className={cx(
        classes.root,
        {
          [classes.sizeSmall]: size === "small",
          [classes.sizeMedium]: size === "medium",
          [classes.sizeLarge]: size === "large",
        },
        className,
      )}
      {...rest}
    >
      <div
        title={color}
        className={classes.swatch}
        style={{
          backgroundColor: color,
          border: `1px solid ${calculateBorderColor(theme, color)}`,
        }}
      />
    </div>
  );
}
