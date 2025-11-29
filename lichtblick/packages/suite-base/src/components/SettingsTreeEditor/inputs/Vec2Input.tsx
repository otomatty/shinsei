// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback } from "react";

import Stack from "@lichtblick/suite-base/components/Stack";

import { NumberInput } from "./NumberInput";

/**
 * Vec2Inputコンポーネントのプロパティ
 */
type Vec2Props = {
  /** コンポーネントの無効化状態 */
  disabled?: boolean;
  /** ベクトル値変更時のコールバック */
  onChange: (value: undefined | [undefined | number, undefined | number]) => void;
  /** 表示する小数点以下の桁数 */
  precision?: number;
  /** 読み取り専用モード */
  readOnly?: boolean;
  /** 数値の増減ステップ */
  step?: number;
  /** 各軸のプレースホルダーテキスト */
  placeholder?: readonly [undefined | string, undefined | string];
  /** 現在のベクトル値 [x, y] */
  value: undefined | readonly [undefined | number, undefined | number];
  /** 最小値 */
  min?: number;
  /** 最大値 */
  max?: number;
};

/**
 * **Vec2Input** - 2次元ベクトル入力コンポーネント
 *
 * 2次元ベクトル（x, y座標）を入力・編集するためのコンポーネント。
 * 2つの独立したNumberInputを垂直に配置し、座標値やサイズ等の2次元データを効率的に入力できます。
 *
 * @features
 * - **2軸入力**: X軸とY軸の独立した数値入力
 * - **柔軟な値管理**: undefined許容による部分的な値設定
 * - **数値制約**: 最小値・最大値・ステップ値の設定
 * - **精度制御**: 小数点以下の桁数制限
 * - **プレースホルダー**: 各軸に個別のプレースホルダー設定
 * - **状態管理**: 無効化・読み取り専用モードの対応
 *
 * @vector_handling
 * - **Partial Values**: 各軸がundefinedを許容（部分的な入力状態）
 * - **Default Fallback**: 未定義値の場合は[0, 0]で初期化
 * - **Independent Update**: 各軸の値変更が他軸に影響しない
 * - **Type Safety**: TypeScriptによる型安全なベクトル操作
 *
 * @use_cases
 * - **Position Vectors**: 2D空間の位置座標
 * - **Size Dimensions**: 幅・高さのサイズ設定
 * - **Velocity Vectors**: 2次元の速度ベクトル
 * - **Offset Values**: X・Y方向のオフセット値
 * - **Scale Factors**: 水平・垂直のスケール係数
 *
 * @layout
 * - **Vertical Stack**: 縦方向に並んだ2つの入力フィールド
 * - **Compact Spacing**: 0.25の小さなギャップで密な配置
 * - **Uniform Sizing**: 両方の入力フィールドが同じサイズ
 * - **Filled Variant**: Material-UIのfilled入力スタイル
 *
 * @validation
 * - **Range Validation**: min/maxによる値の範囲制限
 * - **Precision Control**: 小数点以下桁数の制御
 * - **Step Validation**: 指定されたステップ値での入力制限
 * - **Real-time Feedback**: 入力中のリアルタイム検証
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <Vec2Input
 *   value={[10, 20]}
 *   onChange={([x, y]) => {
 *     console.log(`Position: x=${x}, y=${y}`);
 *   }}
 * />
 *
 * // 座標入力（プレースホルダー付き）
 * <Vec2Input
 *   value={position}
 *   placeholder={["X座標", "Y座標"]}
 *   onChange={setPosition}
 *   min={0}
 *   max={100}
 * />
 *
 * // サイズ入力（精度制御）
 * <Vec2Input
 *   value={[width, height]}
 *   onChange={([w, h]) => setSize({width: w, height: h})}
 *   precision={2}
 *   step={0.1}
 *   placeholder={["幅", "高さ"]}
 * />
 *
 * // 読み取り専用モード
 * <Vec2Input
 *   value={currentPosition}
 *   onChange={() => {}}
 *   readOnly
 * />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされた2次元ベクトル入力コンポーネント
 */
export function Vec2Input(props: Vec2Props): React.JSX.Element {
  const {
    disabled = false,
    onChange,
    precision,
    readOnly = false,
    step,
    value,
    min,
    max,
    placeholder,
  } = props;

  /**
   * 個別軸の値変更ハンドラー
   * 指定された軸の値を更新し、他軸の値は保持する
   *
   * @param position - 更新する軸のインデックス（0:X軸、1:Y軸）
   * @param inputValue - 新しい値
   */
  const onChangeCallback = useCallback(
    (position: number, inputValue: undefined | number) => {
      const newValue: [undefined | number, undefined | number] = [...(value ?? [0, 0])];
      newValue[position] = inputValue;
      onChange(newValue);
    },
    [onChange, value],
  );

  return (
    <Stack gap={0.25}>
      <NumberInput
        data-testid="Vec2Input-0"
        size="small"
        disabled={disabled}
        readOnly={readOnly}
        variant="filled"
        fullWidth
        precision={precision}
        step={step}
        placeholder={placeholder?.[0]}
        value={value?.[0]}
        min={min}
        max={max}
        onChange={(newValue) => {
          onChangeCallback(0, newValue);
        }}
      />
      <NumberInput
        data-testid="Vec2Input-1"
        size="small"
        disabled={disabled}
        readOnly={readOnly}
        variant="filled"
        fullWidth
        precision={precision}
        step={step}
        placeholder={placeholder?.[1]}
        value={value?.[1]}
        min={min}
        max={max}
        onChange={(newValue) => {
          onChangeCallback(1, newValue);
        }}
      />
    </Stack>
  );
}
