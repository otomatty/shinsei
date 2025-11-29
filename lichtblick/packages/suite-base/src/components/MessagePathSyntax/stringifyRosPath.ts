// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessagePathFilter, MessagePathPart, MessagePath } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";

/**
 * スライス部分の型定義
 * 数値またはグローバル変数参照を表現します
 */
type SlicePart = number | { variableName: string; startLoc: number };

/**
 * スライス型の定義
 * 配列の範囲指定に使用される開始位置と終了位置を表現します
 */
type Slice = {
  start: SlicePart;
  end: SlicePart;
};

/**
 * メッセージパスの文字列表現を生成する関数
 *
 * MessagePathオブジェクトを人間が読みやすい文字列形式に変換します。
 * ROSメッセージパスの標準的な記法に従い、トピック名、メッセージパス、
 * 修飾子を組み合わせた完全な文字列を生成します。
 *
 * 生成される文字列の形式：
 * - トピック名 + メッセージパス + 修飾子（オプション）
 * - 例："/robot/pose.pose.x.@derivative"
 *
 * @param path - 文字列化するメッセージパス（イミュータブル）
 * @returns メッセージパスの文字列表現
 *
 * @example
 * ```typescript
 * const path = {
 *   topicNameRepr: "/robot/pose",
 *   messagePath: [
 *     { type: "name", repr: "pose" },
 *     { type: "name", repr: "x" }
 *   ],
 *   modifier: "derivative"
 * };
 * const result = stringifyMessagePath(path); // "/robot/pose.pose.x.@derivative"
 * ```
 *
 * @example
 * ```typescript
 * // フィルタとスライスを含む複雑なパス
 * const path = {
 *   topicNameRepr: "/sensors/data",
 *   messagePath: [
 *     { type: "name", repr: "sensors" },
 *     { type: "slice", start: 0, end: 5 },
 *     { type: "filter", path: ["id"], operator: "==", value: 42 },
 *     { type: "name", repr: "value" }
 *   ]
 * };
 * const result = stringifyMessagePath(path); // "/sensors/data.sensors[0:5]{id==42}.value"
 * ```
 */
export function stringifyMessagePath(path: Immutable<MessagePath>): string {
  return (
    path.topicNameRepr +
    path.messagePath.map(stringifyMessagePathPart).join("") +
    (path.modifier ? `.@${path.modifier}` : "")
  );
}

/**
 * メッセージパスの個別部分を文字列化する関数
 *
 * メッセージパスの各要素（name、filter、slice）を
 * 適切な文字列表現に変換します。
 *
 * @param part - 文字列化するパス部分（イミュータブル）
 * @returns パス部分の文字列表現
 *
 * @example
 * ```typescript
 * // プロパティアクセス
 * const namePart = { type: "name", repr: "pose" };
 * const result = stringifyMessagePathPart(namePart); // ".pose"
 * ```
 */
function stringifyMessagePathPart(part: Immutable<MessagePathPart>): string {
  switch (part.type) {
    case "name":
      return `.${part.repr}`;
    case "filter":
      return filterToString(part);
    case "slice":
      return sliceToString(part);
  }
  return "";
}

/**
 * スライス部分を文字列化する関数
 *
 * 配列のスライス指定を適切な文字列表現に変換します。
 * 単一インデックス、範囲指定、無限大、グローバル変数参照を処理します。
 *
 * 処理パターン：
 * - 同じ開始・終了位置: [index]
 * - 0から開始: [:end]
 * - 無限大: [start:] または [:]
 * - 通常の範囲: [start:end]
 *
 * @param slice - 文字列化するスライス（イミュータブル）
 * @returns スライスの文字列表現
 *
 * @example
 * ```typescript
 * // 単一インデックス
 * const slice = { start: 5, end: 5 };
 * const result = sliceToString(slice); // "[5]"
 *
 * // 範囲指定
 * const slice = { start: 0, end: 10 };
 * const result = sliceToString(slice); // "[:10]"
 *
 * // グローバル変数
 * const slice = {
 *   start: { variableName: "start_idx", startLoc: 0 },
 *   end: { variableName: "end_idx", startLoc: 10 }
 * };
 * const result = sliceToString(slice); // "[$start_idx:$end_idx]"
 * ```
 */
function sliceToString(slice: Immutable<Slice>): string {
  if (typeof slice.start === "number" && typeof slice.end === "number") {
    // 同じ開始・終了位置の場合は単一インデックス表記
    if (slice.start === slice.end) {
      return `[${slice.start}]`;
    }
    // 0から開始の場合は省略記法
    if (slice.start === 0) {
      return `[:${slice.end === Infinity ? "" : slice.end}]`;
    }
    // 通常の範囲指定
    return `[${slice.start === Infinity ? "" : slice.start}:${
      slice.end === Infinity ? "" : slice.end
    }]`;
  }

  // グローバル変数を含む場合の処理
  const startStr = slicePartToString(slice.start);
  const endStr = slicePartToString(slice.end);
  if (startStr === endStr) {
    return `[${startStr}]`;
  }

  return `[${startStr}:${endStr}]`;
}

/**
 * スライス部分の個別要素を文字列化する関数
 *
 * 数値またはグローバル変数参照を適切な文字列表現に変換します。
 *
 * @param slicePart - 文字列化するスライス部分（イミュータブル）
 * @returns スライス部分の文字列表現
 *
 * @example
 * ```typescript
 * // 数値の場合
 * const result = slicePartToString(42); // "42"
 *
 * // 無限大の場合
 * const result = slicePartToString(Infinity); // ""
 *
 * // グローバル変数の場合
 * const variable = { variableName: "index", startLoc: 0 };
 * const result = slicePartToString(variable); // "$index"
 * ```
 */
function slicePartToString(slicePart: Immutable<SlicePart>): string {
  if (typeof slicePart === "number") {
    if (slicePart === Infinity) {
      return "";
    }
    return String(slicePart);
  }

  return `$${slicePart.variableName}`;
}

/**
 * フィルタ部分を文字列化する関数
 *
 * メッセージパスのフィルタ条件を適切な文字列表現に変換します。
 * グローバル変数が未解決の場合は元の表現を使用し、
 * 解決済みの場合は具体的な値を使用した表現を生成します。
 *
 * @param filter - 文字列化するフィルタ（イミュータブル）
 * @returns フィルタの文字列表現
 *
 * @example
 * ```typescript
 * // 未解決のグローバル変数を含む場合
 * const filter = {
 *   repr: "id==$global_var",
 *   value: { variableName: "global_var" }
 * };
 * const result = filterToString(filter); // "{id==$global_var}"
 *
 * // 解決済みの値を含む場合
 * const filter = {
 *   path: ["id"],
 *   operator: "==",
 *   value: 42
 * };
 * const result = filterToString(filter); // "{id==42}"
 *
 * // 文字列値の場合
 * const filter = {
 *   path: ["name"],
 *   operator: "==",
 *   value: "sensor_1"
 * };
 * const result = filterToString(filter); // "{name==\"sensor_1\"}"
 *
 * // BigInt値の場合
 * const filter = {
 *   path: ["timestamp"],
 *   operator: ">=",
 *   value: 1234567890123456789n
 * };
 * const result = filterToString(filter); // "{timestamp>=1234567890123456789}"
 * ```
 */
function filterToString(filter: Immutable<MessagePathFilter>): string {
  // グローバル変数が未解決の場合は元の表現を使用
  if (typeof filter.value === "object") {
    return `{${filter.repr}}`;
  }

  // 解決済みの値を使用してフィルタ文字列を生成
  return `{${filter.path.join(".")}==${
    typeof filter.value === "bigint" ? filter.value.toString() : JSON.stringify(filter.value)
  }}`;
}
