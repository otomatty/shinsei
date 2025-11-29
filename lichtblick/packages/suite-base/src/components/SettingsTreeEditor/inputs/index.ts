// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview SettingsTreeEditor 入力コンポーネント エクスポート
 *
 * SettingsTreeEditorで使用される各種入力コンポーネントのエクスポート定義です。
 * このモジュールは、様々な入力タイプに対応した特化コンポーネントを提供します。
 *
 * エクスポートされるコンポーネント：
 * - **ColorPickerInput**: RGB/RGBA色選択入力
 * - **ColorGradientInput**: グラデーション色設定入力
 * - **NumberInput**: 数値入力（範囲制限、精度、ステップ対応）
 * - **Vec2Input**: 2次元ベクトル入力（X, Y）
 * - **Vec3Input**: 3次元ベクトル入力（X, Y, Z）
 *
 * 使用例：
 * ```tsx
 * import { NumberInput, ColorPickerInput, Vec3Input } from "./inputs";
 *
 * // 数値入力
 * <NumberInput value={speed} onChange={setSpeed} min={0} max={100} />
 *
 * // 色選択
 * <ColorPickerInput alphaType="rgba" value={color} onChange={setColor} />
 *
 * // 3Dベクトル入力
 * <Vec3Input value={position} onChange={setPosition} />
 * ```
 */

export * from "./ColorPickerInput";
export * from "./ColorGradientInput";
export * from "./NumberInput";
export * from "./Vec2Input";
export * from "./Vec3Input";
