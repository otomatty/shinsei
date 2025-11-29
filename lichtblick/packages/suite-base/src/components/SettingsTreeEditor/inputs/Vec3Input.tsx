// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview SettingsTreeEditor用3次元ベクトル入力コンポーネント
 *
 * 3次元ベクトル（X, Y, Z座標）の入力・編集機能を提供するコンポーネントです。
 * 3つのNumberInputコンポーネントを垂直に配置し、統一されたベクトル入力体験を提供します。
 *
 * 主な機能：
 * - **3軸対応**: X, Y, Z軸の独立した数値入力
 * - **統一設定**: 全軸に共通の精度、ステップ、範囲制限
 * - **個別プレースホルダー**: 各軸に異なるプレースホルダー指定可能
 * - **部分値対応**: 一部の軸のみundefinedを許可
 * - **無効化対応**: disabled/readOnlyモードの完全サポート
 * - **コンパクトレイアウト**: 垂直スタックによる省スペース配置
 *
 * 使用例：
 * ```tsx
 * // 3D位置ベクトル
 * <Vec3Input
 *   value={position}
 *   onChange={setPosition}
 *   placeholder={["X", "Y", "Z"]}
 *   step={0.1}
 *   precision={2}
 * />
 *
 * // 回転ベクトル（度数法）
 * <Vec3Input
 *   value={rotation}
 *   onChange={setRotation}
 *   min={-180}
 *   max={180}
 *   step={1}
 *   placeholder={["Roll", "Pitch", "Yaw"]}
 * />
 * ```
 */

import { useCallback } from "react";

import Stack from "@lichtblick/suite-base/components/Stack";

import { NumberInput } from "./NumberInput";

/**
 * Vec3Inputコンポーネントのプロパティ型定義
 */
type Vec3Props = {
  /** コンポーネントの無効化状態 */
  disabled?: boolean;
  /** ベクトル値変更時のコールバック関数 */
  onChange: (
    value: undefined | [undefined | number, undefined | number, undefined | number],
  ) => void;
  /** 数値の精度（小数点以下桁数） */
  precision?: number;
  /** 読み取り専用モード */
  readOnly?: boolean;
  /** 増減ステップ値 */
  step?: number;
  /** 各軸のプレースホルダー配列 [X, Y, Z] */
  placeholder?: readonly [undefined | string, undefined | string, undefined | string];
  /** 現在のベクトル値 [X, Y, Z] */
  value: undefined | readonly [undefined | number, undefined | number, undefined | number];
  /** 最小値制限 */
  min?: number;
  /** 最大値制限 */
  max?: number;
};

/**
 * 3次元ベクトル入力コンポーネント
 *
 * X, Y, Z軸の3つの数値入力フィールドを持つコンポーネントです。
 * 各軸は独立して編集可能で、共通の設定（精度、ステップ、範囲）を適用できます。
 *
 * @param props - Vec3Propsプロパティ
 * @returns 3次元ベクトル入力コンポーネント
 *
 * @example
 * ```tsx
 * // 基本的な3D座標入力
 * <Vec3Input
 *   value={cameraPosition}
 *   onChange={(newPosition) => setCameraPosition(newPosition)}
 *   placeholder={["X座標", "Y座標", "Z座標"]}
 *   step={0.1}
 *   precision={2}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // 範囲制限付きのベクトル入力
 * <Vec3Input
 *   value={normalizedVector}
 *   onChange={setNormalizedVector}
 *   min={-1}
 *   max={1}
 *   step={0.01}
 *   precision={3}
 *   disabled={!enableEdit}
 * />
 * ```
 */
export function Vec3Input(props: Vec3Props): React.JSX.Element {
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

  const onChangeCallback = useCallback(
    (position: number, inputValue: undefined | number) => {
      const newValue: [undefined | number, undefined | number, undefined | number] = [
        ...(value ?? [0, 0, 0]),
      ];
      newValue[position] = inputValue;
      onChange(newValue);
    },
    [onChange, value],
  );

  return (
    <Stack gap={0.25}>
      <NumberInput
        data-testid="Vec3Input-0"
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
        data-testid="Vec3Input-1"
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
      <NumberInput
        data-testid="Vec3Input-2"
        size="small"
        disabled={disabled}
        readOnly={readOnly}
        variant="filled"
        fullWidth
        precision={precision}
        step={step}
        placeholder={placeholder?.[2]}
        value={value?.[2]}
        min={min}
        max={max}
        onChange={(newValue) => {
          onChangeCallback(2, newValue);
        }}
      />
    </Stack>
  );
}
