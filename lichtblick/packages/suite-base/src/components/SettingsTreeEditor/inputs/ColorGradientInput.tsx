// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Popover, TextField, useTheme } from "@mui/material";
import { useCallback, useState } from "react";
import tinycolor from "tinycolor2";

import Stack from "@lichtblick/suite-base/components/Stack";

import { ColorPickerControl, useColorPickerControl } from "./ColorPickerControl";
import { ColorSwatch } from "./ColorSwatch";

/**
 * ColorGradientInputコンポーネントのプロパティ
 */
type ColorGradientInputProps = {
  /** グラデーションの色ペア（左側、右側） */
  colors: undefined | readonly [string, string];
  /** コンポーネントの無効化状態 */
  disabled?: boolean;
  /** 色変更時のコールバック */
  onChange: (colors: [left: string, right: string]) => void;
  /** 読み取り専用モード */
  readOnly?: boolean;
};

/**
 * **ColorGradientInput** - 2色グラデーション入力コンポーネント
 *
 * 2つの色を組み合わせてグラデーションを作成・編集するための入力コンポーネント。
 * 左右の色見本をクリックして個別に色を選択できるインターフェースを提供します。
 *
 * @features
 * - **2色グラデーション**: 左右の色を個別に選択可能
 * - **リアルタイムプレビュー**: 背景でグラデーションを即座に確認
 * - **透明度対応**: RGBA値とアルファチャンネルをサポート
 * - **カラーピッカー統合**: Popoverで高機能な色選択UI
 * - **バリデーション**: 無効な色値の安全な処理
 * - **アクセシビリティ**: 読み取り専用モードとDisabled状態
 *
 * @color_validation
 * - **Color Safety**: tinycolorによる色値バリデーション
 * - **Fallback Colors**: 無効な色の場合は#000000/#FFFFFFにフォールバック
 * - **Format Support**: HEX、RGB、RGBA、HSL等の複数フォーマット対応
 *
 * @ui_behavior
 * - **Exclusive Selection**: 左右どちらか一方のピッカーのみ表示
 * - **Click Away**: 外部クリックで色選択ポップアップを閉じる
 * - **Visual Feedback**: 選択中の色見本にフォーカス状態表示
 *
 * @gradient_rendering
 * - **CSS Gradient**: linear-gradientによる背景レンダリング
 * - **Transparency Pattern**: 透明度表示のためのチェッカーパターン
 * - **Theme Integration**: Material-UIテーマシステムとの統合
 *
 * @interactions
 * - **Left Color**: 左側の色見本クリックで左色を編集
 * - **Right Color**: 右側の色見本クリックで右色を編集
 * - **Real-time Update**: 色変更時に即座にonChangeを呼び出し
 * - **Keyboard Navigation**: カラーピッカー内でのキーボード操作対応
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <ColorGradientInput
 *   colors={["#FF0000", "#0000FF"]}
 *   onChange={([left, right]) => {
 *     console.log(`Gradient: ${left} to ${right}`);
 *   }}
 * />
 *
 * // 無効状態での使用
 * <ColorGradientInput
 *   colors={gradientColors}
 *   onChange={handleGradientChange}
 *   disabled={isLoading}
 * />
 *
 * // 読み取り専用モード
 * <ColorGradientInput
 *   colors={previewColors}
 *   onChange={() => {}}
 *   readOnly
 * />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされた2色グラデーション入力コンポーネント
 */
export function ColorGradientInput({
  colors,
  disabled = false,
  onChange,
  readOnly = false,
}: ColorGradientInputProps): React.JSX.Element {
  const [leftAnchor, setLeftAnchor] = useState<undefined | HTMLDivElement>(undefined);
  const [rightAnchor, setRightAnchor] = useState<undefined | HTMLDivElement>(undefined);

  /**
   * 左側の色見本クリックハンドラー
   * 読み取り専用モードでない場合に左側のカラーピッカーを表示
   */
  const handleLeftClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) {
        return;
      }

      setLeftAnchor(event.currentTarget);
      setRightAnchor(undefined);
    },
    [readOnly],
  );

  /**
   * 右側の色見本クリックハンドラー
   * 読み取り専用モードでない場合に右側のカラーピッカーを表示
   */
  const handleRightClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) {
        return;
      }

      setLeftAnchor(undefined);
      setRightAnchor(event.currentTarget);
    },
    [readOnly],
  );

  /**
   * ポップアップを閉じるハンドラー
   * 左右両方のカラーピッカーを非表示にする
   */
  const handleClose = useCallback(() => {
    setLeftAnchor(undefined);
    setRightAnchor(undefined);
  }, []);

  const leftColor = colors?.[0] ?? "#000000";
  const rightColor = colors?.[1] ?? "#FFFFFF";
  const safeLeftColor = tinycolor(leftColor).isValid() ? leftColor : "#000000";
  const safeRightColor = tinycolor(rightColor).isValid() ? rightColor : "#FFFFFF";

  const theme = useTheme();

  /** 左側の色選択コントロール */
  const leftSwatch = useColorPickerControl({
    alphaType: "alpha",
    onChange: (newValue) => {
      onChange([newValue, rightColor]);
    },
    value: leftColor,
  });

  /** 右側の色選択コントロール */
  const rightSwatch = useColorPickerControl({
    alphaType: "alpha",
    onChange: (newValue) => {
      onChange([leftColor, newValue]);
    },
    value: rightColor,
  });

  return (
    <Stack
      direction="row"
      alignItems="center"
      position="relative"
      paddingX={0.75}
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        background: `linear-gradient(to right, ${safeLeftColor}, ${safeRightColor}), repeating-conic-gradient(transparent 0 90deg, ${theme.palette.action.disabled} 90deg 180deg) top left/10px 10px repeat`,
      }}
    >
      <ColorSwatch color={safeLeftColor} onClick={handleLeftClick} />
      <TextField
        variant="filled"
        size="small"
        fullWidth
        value={`${leftColor} / ${rightColor}`}
        style={{ visibility: "hidden" }}
      />
      <ColorSwatch color={safeRightColor} onClick={handleRightClick} />
      <Popover
        open={leftAnchor != undefined}
        anchorEl={leftAnchor}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ColorPickerControl onEnterKey={handleClose} {...leftSwatch} />
      </Popover>
      <Popover
        open={rightAnchor != undefined}
        anchorEl={rightAnchor}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ColorPickerControl onEnterKey={handleClose} {...rightSwatch} />
      </Popover>
    </Stack>
  );
}
