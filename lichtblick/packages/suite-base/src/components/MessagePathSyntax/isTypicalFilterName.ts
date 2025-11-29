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

/**
 * 典型的なフィルタ名のリスト
 *
 * メッセージパスクエリでフィルタとして一般的に使用される名前のリストです。
 * これらの名前は、ROSメッセージ内でオブジェクトの識別や検索に頻繁に使用されるため、
 * 自動補完やフィルタ候補の優先表示に活用されます。
 *
 * 含まれる名前：
 * - "id": 一般的な識別子
 * - "_id": アンダースコア付き識別子
 * - "ID": 大文字の識別子
 * - "Id": パスカルケースの識別子
 * - "key": キー値
 *
 * @example
 * ```typescript
 * // フィルタ候補の生成時に使用
 * const filterSuggestions = messageFields.filter(field =>
 *   TypicalFilterNames.includes(field.name)
 * );
 * ```
 */
export const TypicalFilterNames = ["id", "_id", "ID", "Id", "key"];

/**
 * 典型的なフィルタ名を判定するための正規表現
 *
 * パフォーマンス最適化のため、正規表現を一度だけ作成して再利用します。
 * 以下のパターンにマッチします：
 * - 行頭の"id"または行末の"id"
 * - 行末の"_id"
 * - 行末の"ID"または"Id"
 * - 行頭の"key"
 *
 * 正規表現パターン: /^id$|_id$|I[dD]$|^key$/
 */
const typicalFilterNameRegex = /^id$|_id$|I[dD]$|^key$/;

/**
 * 指定された名前が典型的なフィルタ名かどうかを判定する関数
 *
 * メッセージパスの自動補完機能で、フィルタとして適切な候補を
 * 優先的に表示するために使用されます。事前に定義された
 * 典型的なフィルタ名のパターンに対して高速な正規表現マッチングを行います。
 *
 * @param name - 判定対象の名前文字列
 * @returns 典型的なフィルタ名の場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * console.log(isTypicalFilterName("id"));    // true
 * console.log(isTypicalFilterName("_id"));   // true
 * console.log(isTypicalFilterName("ID"));    // true
 * console.log(isTypicalFilterName("Id"));    // true
 * console.log(isTypicalFilterName("key"));   // true
 * console.log(isTypicalFilterName("name"));  // false
 * console.log(isTypicalFilterName("value")); // false
 * ```
 *
 * @example
 * ```typescript
 * // フィルタ候補の優先順位付けでの使用例
 * const sortedFields = messageFields.sort((a, b) => {
 *   const aIsTypical = isTypicalFilterName(a.name);
 *   const bIsTypical = isTypicalFilterName(b.name);
 *   if (aIsTypical && !bIsTypical) return -1;
 *   if (!aIsTypical && bIsTypical) return 1;
 *   return a.name.localeCompare(b.name);
 * });
 * ```
 */
export function isTypicalFilterName(name: string): boolean {
  return typicalFilterNameRegex.test(name);
}
