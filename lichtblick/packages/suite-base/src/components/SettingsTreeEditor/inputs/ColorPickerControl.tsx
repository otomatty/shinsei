// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import TagIcon from "@mui/icons-material/Tag";
import { TextField } from "@mui/material";
import { useCallback, useState, useMemo } from "react";
import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import tinycolor from "tinycolor2";
import { makeStyles } from "tss-react/mui";
import { useDebouncedCallback } from "use-debounce";

import Stack from "@lichtblick/suite-base/components/Stack";
import { customTypography } from "@lichtblick/theme";

/** カラーピッカーのスタイル定義 */
const useStyles = makeStyles()((theme) => ({
  picker: {
    "&.react-colorful": {
      width: "100%",
      gap: theme.spacing(0.25),
    },
    ".react-colorful__saturation": {
      borderBottom: 0,
    },
    ".react-colorful__saturation, .react-colorful__hue, .react-colorful__alpha": {
      borderRadius: theme.shape.borderRadius,
    },
    ".react-colorful__hue": {
      order: -1,
    },
    ".react-colorful__hue-pointer, .react-colorful__alpha-pointer": {
      width: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
    },
    ".react-colorful__hue-pointer": {
      zIndex: 4,
    },
    ".react-colorful__saturation-pointer": {
      width: theme.spacing(2),
      height: theme.spacing(2),
    },
  },
}));

/**
 * カラーピッカーの基本プロパティ
 */
type ColorPickerProps = {
  /** 現在の色の値 */
  value: undefined | string;
  /** 透明度の処理タイプ */
  alphaType: "none" | "alpha";
  /** 色変更時のコールバック */
  onChange: (value: string) => void;
};

/**
 * カラーピッカー入力コンポーネントのプロパティ
 */
type ColorPickerInputProps = {
  /** Enterキー押下時のコールバック */
  onEnterKey?: () => void;
  /** 色見本として表示する色 */
  swatchColor: string;
  /** プレフィックス付き色値の更新関数 */
  updatePrefixedColor: (newValue: string) => void;
  /** 編集中の値が無効かどうか */
  editedValueIsInvalid: boolean;
  /** 編集中の値 */
  editedValue: string;
  /** 編集値の更新関数 */
  updateEditedValue: (newValue: string) => void;
  /** 入力フィールドのblurイベントハンドラー */
  onInputBlur: () => void;
} & Omit<ColorPickerProps, "value">;

/**
 * **ColorPickerControl** - 高機能色選択コントロール
 *
 * React Colorfulを使用した包括的な色選択UIコンポーネント。
 * 視覚的な色選択とHEX入力の両方をサポートし、透明度の有無を選択できます。
 *
 * @features
 * - **Dual Interface**: 視覚的ピッカーとHEX入力の両方
 * - **Alpha Support**: 透明度チャンネルの動的対応
 * - **Real-time Preview**: 選択中の色をリアルタイムで反映
 * - **Input Validation**: HEX値のリアルタイム検証
 * - **Keyboard Support**: Enterキーでの確定操作
 * - **Focus Management**: 入力フィールドのフォーカス時に全選択
 *
 * @color_formats
 * - **HEX**: #RRGGBB形式（6桁）
 * - **HEX with Alpha**: #RRGGBBAA形式（8桁）
 * - **Short HEX**: #RGB形式（3桁）
 * - **Short HEX with Alpha**: #RGBA形式（4桁）
 *
 * @ui_components
 * - **Saturation Area**: 色の彩度と明度を調整
 * - **Hue Slider**: 色相を選択
 * - **Alpha Slider**: 透明度を調整（alphaType="alpha"の場合）
 * - **HEX Input**: 手動でのHEX値入力
 *
 * @styling
 * - **Theme Integration**: Material-UIテーマシステムとの統合
 * - **Custom Layout**: 色相スライダーを上部に配置
 * - **Consistent Borders**: 統一されたボーダー半径
 * - **Pointer Styling**: カスタムポインタースタイル
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <ColorPickerControl
 *   alphaType="alpha"
 *   onChange={handleColorChange}
 *   swatchColor="#FF0000"
 *   updatePrefixedColor={updateColor}
 *   editedValueIsInvalid={false}
 *   editedValue="FF0000"
 *   updateEditedValue={updateValue}
 *   onInputBlur={handleBlur}
 * />
 *
 * // Enterキー対応
 * <ColorPickerControl
 *   onEnterKey={() => setPickerOpen(false)}
 *   // ... other props
 * />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされた色選択コントロール
 */
export function ColorPickerControl(props: ColorPickerInputProps): React.JSX.Element {
  const {
    alphaType,
    onChange,
    onEnterKey,
    swatchColor,
    updatePrefixedColor,
    editedValueIsInvalid,
    editedValue,
    updateEditedValue,
    onInputBlur,
  } = props;

  const { classes } = useStyles();

  return (
    <Stack padding={1.5} gap={1}>
      {alphaType === "alpha" ? (
        <HexAlphaColorPicker
          className={classes.picker}
          color={swatchColor}
          onChange={updatePrefixedColor}
        />
      ) : (
        <HexColorPicker
          className={classes.picker}
          color={swatchColor}
          onChange={updatePrefixedColor}
        />
      )}
      <TextField
        size="small"
        error={editedValueIsInvalid}
        slotProps={{
          input: {
            onFocus: (event) => {
              event.target.select();
            },
            role: "input",
            startAdornment: <TagIcon fontSize="small" />,
            style: { fontFamily: customTypography.fontMonospace },
          },
        }}
        placeholder={alphaType === "alpha" ? "RRGGBBAA" : "RRGGBB"}
        value={editedValue}
        onKeyDown={(event) => event.key === "Enter" && onEnterKey?.()}
        onChange={(event) => {
          onChange(event.target.value);
          updateEditedValue(event.target.value);
        }}
        onBlur={onInputBlur}
      />
    </Stack>
  );
}

/** HEX色値の正規表現パターン */
const hexMatcher = /^#?([0-9A-F]{3,8})$/i;

/**
 * HEX色値の妥当性を検証する関数
 *
 * @param color - 検証する色値
 * @param alphaType - 透明度の処理タイプ
 * @returns 色値が有効かどうか
 */
function isValidHexColor(color: string, alphaType: "none" | "alpha") {
  const match = hexMatcher.exec(color);
  const length = match?.[1]?.length ?? 0;

  // 3 and 6 are always valid color values
  // 4 and 8 are valid only if using alpha
  return length === 3 || length === 6 || (alphaType === "alpha" && (length === 4 || length === 8));
}

/**
 * **useColorPickerControl** - カラーピッカーの状態管理フック
 *
 * ColorPickerControlコンポーネントの内部ロジックを管理するカスタムフック。
 * 色値の変換、バリデーション、編集状態の管理を行います。
 *
 * @features
 * - **Color Parsing**: tinycolorによる色値の解析と変換
 * - **Format Conversion**: HEX、HEX8形式への変換
 * - **Edit State**: 編集中の値と表示値の分離管理
 * - **Validation**: リアルタイムな色値バリデーション
 * - **Debounced Updates**: 色変更のデバウンス処理
 * - **Fallback Handling**: 無効な色値の安全な処理
 *
 * @color_processing
 * - **Input Parsing**: 様々な色形式の統一的な処理
 * - **Alpha Handling**: 透明度の有無による処理の切り分け
 * - **Display Format**: ユーザーフレンドリーな表示形式の生成
 * - **Safe Defaults**: 無効な色値の場合の安全なフォールバック
 *
 * @state_management
 * - **editedValue**: 編集中のHEX値（プレフィックスなし）
 * - **displayValue**: 表示用のHEX値（プレフィックス付き）
 * - **swatchColor**: 色見本として表示する色
 * - **editedValueIsInvalid**: 編集中の値の妥当性フラグ
 *
 * @validation_logic
 * - **Hex Pattern**: 正規表現による基本的な形式チェック
 * - **Length Validation**: 3,4,6,8桁の長さチェック
 * - **Alpha Consideration**: 透明度の有無による桁数の調整
 * - **Real-time Feedback**: 入力中のリアルタイム検証
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * const colorControl = useColorPickerControl({
 *   alphaType: "alpha",
 *   onChange: handleColorChange,
 *   value: "#FF0000"
 * });
 *
 * // 透明度なしの場合
 * const simpleColorControl = useColorPickerControl({
 *   alphaType: "none",
 *   onChange: handleColorChange,
 *   value: "#00FF00"
 * });
 * ```
 *
 * @param props - フックのプロパティ
 * @returns カラーピッカーコントロールの状態と関数
 */
// Internal business logic hook for ColorPickerControl
//
// Exported for tests and we disable the eslint requirement to specify a return value because this
// hook is considered "internal" and we are ok inferring the return type
//
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useColorPickerControl(props: ColorPickerProps) {
  const { alphaType, onChange, value } = props;

  const parsedValue = useMemo(() => (value ? tinycolor(value) : undefined), [value]);
  const hex = alphaType === "alpha" ? parsedValue?.toHex8() : parsedValue?.toHex();
  const displayValue =
    alphaType === "alpha" ? parsedValue?.toHex8String() : parsedValue?.toHexString();
  const swatchColor = displayValue ?? "#00000044";

  const [editedValue, setEditedValue] = useState(hex ?? "");

  const editedValueIsInvalid = editedValue.length > 0 && !isValidHexColor(editedValue, alphaType);

  /** デバウンスされた色更新処理 */
  const updateColor = useDebouncedCallback((newValue: string) => {
    onChange(`#${newValue}`);
    setEditedValue(newValue);
  });

  /**
   * プレフィックス付き色値の更新ハンドラー
   * HexColorPickerから提供される「#」付きの値を処理
   */
  // HexColorPicker onChange provides a leading `#` for values and updateColor needs
  // un-prefixed values so it can update the edited field
  const updatePrefixedColor = useCallback(
    (newValue: string) => {
      const parsed = tinycolor(newValue);
      updateColor(alphaType === "alpha" ? parsed.toHex8() : parsed.toHex());
    },
    [alphaType, updateColor],
  );

  /**
   * 編集値の更新ハンドラー
   * 手動入力された値をバリデーションして適用
   */
  const updateEditedValue = useCallback(
    (newValue: string) => {
      setEditedValue(newValue);

      // if it is a valid color then we can emit the new value
      if (isValidHexColor(newValue, alphaType)) {
        const parsed = tinycolor(newValue);
        const settingValue = alphaType === "alpha" ? parsed.toHex8String() : parsed.toHexString();
        onChange(settingValue);
      }
    },
    [alphaType, onChange],
  );

  /**
   * 入力フィールドのblurイベントハンドラー
   * フォーカスが外れた際に表示を正規化
   */
  // When the input blurs we update the edited value to the latest input value to show the user
  // the expanded form that is the actual setting value.
  const onInputBlur = useCallback(() => {
    setEditedValue(hex ?? "");
  }, [hex]);

  return {
    alphaType,
    swatchColor,
    displayValue,
    updatePrefixedColor,
    editedValueIsInvalid,
    editedValue,
    updateEditedValue,
    onInputBlur,
    onChange,
  };
}
