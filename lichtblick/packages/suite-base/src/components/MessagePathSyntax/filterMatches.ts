// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessagePathFilter } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";

/**
 * メッセージパスフィルタの条件評価を行う関数
 *
 * 指定されたフィルタ条件と値を比較し、フィルタ条件にマッチするかどうかを判定します。
 * ROSメッセージの複雑なネストされたオブジェクト構造に対して、
 * パス指定による値の取得と比較演算子による条件評価を実行します。
 *
 * @param filter - 評価するフィルタ条件（イミュータブル）
 *                 - path: 値を取得するためのオブジェクトパス
 *                 - operator: 比較演算子（==, !=, >=, <=, >, <）
 *                 - value: 比較対象の値（グローバル変数が解決済みである必要がある）
 * @param value - 評価対象の値（通常はROSメッセージオブジェクト）
 * @returns フィルタ条件にマッチする場合はtrue、そうでなければfalse
 *
 * @throws {Error} フィルタ値がオブジェクト型の場合（グローバル変数が未解決）
 *
 * @example
 * ```typescript
 * const filter = {
 *   path: ["pose", "x"],
 *   operator: ">",
 *   value: 10.0
 * };
 * const message = { pose: { x: 15.0, y: 20.0 } };
 * const result = filterMatches(filter, message); // true
 * ```
 *
 * @example
 * ```typescript
 * // 配列要素のフィルタリング
 * const filter = {
 *   path: ["items", "0", "id"],
 *   operator: "==",
 *   value: 42
 * };
 * const message = { items: [{ id: 42, name: "test" }] };
 * const result = filterMatches(filter, message); // true
 * ```
 */
export function filterMatches(filter: Immutable<MessagePathFilter>, value: unknown): boolean {
  // グローバル変数が未解決の場合はエラーを投げる
  if (typeof filter.value === "object") {
    throw new Error("filterMatches only works on paths where global variables have been filled in");
  }

  // フィルタ値がundefinedの場合は常にfalse
  if (filter.value == undefined) {
    return false;
  }

  // パスを辿って目的の値を取得
  let currentValue = value;
  for (const name of filter.path) {
    // 現在の値がオブジェクトでない、またはundefinedの場合は失敗
    if (typeof currentValue !== "object" || currentValue == undefined) {
      return false;
    }
    // 次の階層の値を取得
    currentValue = (currentValue as Record<string, unknown>)[name];
    // 値が存在しない場合は失敗
    if (currentValue == undefined) {
      return false;
    }
  }

  // 柔軟な型比較を行うため、非厳密等価演算子を使用
  // これにより、boolean vs integer、number vs string、bigint vs number等の比較が可能
  if (currentValue != undefined) {
    switch (filter.operator) {
      case "==":
        // eslint-disable-next-line @lichtblick/strict-equality
        return currentValue == filter.value;
      case "!=":
        // eslint-disable-next-line @lichtblick/strict-equality
        return currentValue != filter.value;
      case ">=":
        return currentValue >= filter.value;
      case "<=":
        return currentValue <= filter.value;
      case ">":
        return currentValue > filter.value;
      case "<":
        return currentValue < filter.value;
      default:
        // 未知の演算子の場合は常にfalse
        return false;
    }
  }
  return false;
}
