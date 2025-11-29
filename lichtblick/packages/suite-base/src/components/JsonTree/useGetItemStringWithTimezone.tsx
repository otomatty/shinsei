// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { ReactNode, useCallback } from "react";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";
import { getItemString } from "@lichtblick/suite-base/util/getItemString";

/**
 * @fileoverview JsonTree - タイムゾーン対応JSON表示カスタムフック
 *
 * このファイルは、react-json-treeライブラリで使用するカスタムフックを提供します。
 * 主な機能：
 * - アプリケーション設定からタイムゾーン情報を取得
 * - JSON表示時にタイムゾーンを考慮したアイテム文字列生成
 * - パフォーマンス最適化のためのuseCallback使用
 *
 * 使用場面：
 * - JSONデータの視覚化
 * - ログデータの表示
 * - デバッグ情報の表示
 * - タイムスタンプを含むデータの表示
 */

/**
 * タイムゾーン対応のJSON表示用カスタムフック
 *
 * react-json-treeライブラリのgetItemStringプロパティに渡すコールバック関数を生成します。
 * アプリケーション設定からタイムゾーン情報を取得し、JSON表示時にタイムゾーンを
 * 考慮したアイテム文字列を生成します。
 *
 * @returns {function} react-json-tree用のgetItemString関数
 *   - type: string - JSON値の型（'Object', 'Array', 'String', etc.）
 *   - data: unknown - 実際のJSON値
 *   - itemType: ReactNode - react-json-treeが提供する型表示要素
 *   - itemString: string - デフォルトのアイテム文字列
 *   - returns: ReactNode - 表示用のReact要素
 *
 * @example
 * ```tsx
 * import JSONTree from 'react-json-tree';
 * import useGetItemStringWithTimezone from './useGetItemStringWithTimezone';
 *
 * function MyJsonViewer({ data }) {
 *   const getItemString = useGetItemStringWithTimezone();
 *
 *   return (
 *     <JSONTree
 *       data={data}
 *       getItemString={getItemString}
 *       theme="monokai"
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * タイムスタンプを含むデータの表示例：
 * ```tsx
 * const data = {
 *   timestamp: { sec: 1640995200, nsec: 0 },
 *   message: "Hello World"
 * };
 * // タイムゾーン設定に基づいて適切な時刻表示が行われる
 * ```
 */
export default function useGetItemStringWithTimezone(): (
  type: string,
  data: unknown,
  itemType: ReactNode,
  itemString: string,
) => ReactNode {
  // アプリケーション設定からタイムゾーン情報を取得
  // TIMEZONE設定が変更されると自動的に再レンダリングされる
  const [timezone] = useAppConfigurationValue<string>(AppSetting.TIMEZONE);

  // パフォーマンス最適化：タイムゾーンが変更された場合のみ関数を再生成
  // useCallbackにより、不要な再レンダリングを防止
  return useCallback(
    (type: string, data: unknown, itemType: ReactNode, itemString: string) =>
      // getItemString関数を呼び出し、タイムゾーン情報を渡す
      // 空配列[]は追加のパラメータ（現在は未使用）
      getItemString(type, data, itemType, itemString, [], timezone),
    [timezone], // 依存配列：タイムゾーンが変更された場合のみ再生成
  );
}
