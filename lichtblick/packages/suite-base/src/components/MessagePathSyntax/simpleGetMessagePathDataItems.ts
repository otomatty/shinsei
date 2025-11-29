// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessagePath } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import { MessageEvent } from "@lichtblick/suite-base/players/types";
import { isTypedArray } from "@lichtblick/suite-base/types/isTypedArray";

import { filterMatches } from "./filterMatches";

/**
 * 指定されたメッセージパスを実行してメッセージからアイテムを抽出する関数
 *
 * ROSメッセージに対してメッセージパス（トピック名 + メッセージパス）を適用し、
 * 条件に合致するデータ項目を抽出します。複雑なネストされたオブジェクト構造、
 * 配列のスライス、フィルタ条件、プロパティアクセスを組み合わせた
 * 高度なデータ抽出を可能にします。
 *
 * サポートされるメッセージパス要素：
 * - name: オブジェクトプロパティへのアクセス（例：.pose.x）
 * - slice: 配列の範囲指定（例：[0:5]、[10]）
 * - filter: 条件フィルタ（例：{id==42}）
 *
 * @param message - 処理対象のメッセージイベント（イミュータブル）
 * @param filledInPath - 実行するメッセージパス（グローバル変数が解決済み）
 * @returns 抽出されたデータ項目の配列。条件に合致するアイテムが見つからない場合は空配列
 *
 * @throws {Error} スライス内に未解決の変数が含まれている場合
 *
 * @example
 * ```typescript
 * // 基本的なプロパティアクセス
 * const message = {
 *   topic: "/robot/pose",
 *   message: { pose: { x: 10.5, y: 20.3 } }
 * };
 * const path = {
 *   topicName: "/robot/pose",
 *   messagePath: [{ type: "name", name: "pose" }, { type: "name", name: "x" }]
 * };
 * const result = simpleGetMessagePathDataItems(message, path); // [10.5]
 * ```
 *
 * @example
 * ```typescript
 * // 配列スライスとフィルタの組み合わせ
 * const message = {
 *   topic: "/robot/sensors",
 *   message: {
 *     sensors: [
 *       { id: 1, value: 100 },
 *       { id: 2, value: 200 },
 *       { id: 3, value: 300 }
 *     ]
 *   }
 * };
 * const path = {
 *   topicName: "/robot/sensors",
 *   messagePath: [
 *     { type: "name", name: "sensors" },
 *     { type: "slice", start: 0, end: 2 },
 *     { type: "filter", path: ["id"], operator: ">=", value: 2 },
 *     { type: "name", name: "value" }
 *   ]
 * };
 * const result = simpleGetMessagePathDataItems(message, path); // [200]
 * ```
 */
export function simpleGetMessagePathDataItems(
  message: Immutable<MessageEvent>,
  filledInPath: Immutable<MessagePath>,
): unknown[] {
  // 指定されたトピックと異なるメッセージは無視
  if (message.topic !== filledInPath.topicName) {
    return [];
  }

  const results: unknown[] = [];

  /**
   * メッセージパスを再帰的に走査してデータを抽出する内部関数
   *
   * @param value - 現在処理中の値
   * @param pathIndex - 現在のパス要素のインデックス
   */
  function traverse(value: unknown, pathIndex: number): void {
    const pathPart = filledInPath.messagePath[pathIndex];

    // パスの終端に到達した場合、結果に追加
    if (pathPart == undefined) {
      results.push(value);
      return;
    }

    // 値がundefinedの場合は処理を中断
    if (value == undefined) {
      return;
    }

    switch (pathPart.type) {
      case "slice": {
        // 配列またはTypedArrayでない場合は処理を中断
        if (!Array.isArray(value) && !isTypedArray(value)) {
          return;
        }

        // スライス内に変数が含まれている場合はエラー
        if (typeof pathPart.start === "object" || typeof pathPart.end === "object") {
          throw new Error("Variables in slices are not supported");
        }

        // 指定された範囲の要素を再帰的に処理
        const { start, end } = pathPart;
        for (let i = start; i < value.length && i <= end; i++) {
          traverse(value[i], pathIndex + 1);
        }
        return;
      }

      case "filter":
        // フィルタ条件に合致しない場合は処理を中断
        if (!filterMatches(pathPart, value)) {
          return undefined;
        }
        // フィルタ条件に合致する場合は次のパス要素を処理
        traverse(value, pathIndex + 1);
        return;

      case "name":
        // オブジェクトでない場合は処理を中断
        if (typeof value !== "object") {
          return undefined;
        }
        // 指定されたプロパティの値を再帰的に処理
        traverse((value as Record<string, unknown>)[pathPart.name], pathIndex + 1);
        return;
    }
  }

  // メッセージの内容から走査を開始
  traverse(message.message, 0);

  return results;
}
