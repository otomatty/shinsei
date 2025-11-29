// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";

import { Immutable, SettingsTreeNode, SettingsTreeNodes } from "@lichtblick/suite";

/**
 * @fileoverview SettingsTreeEditor ユーティリティ関数
 *
 * このファイルは、SettingsTreeEditorコンポーネントで使用される
 * データ処理とフィルタリングのユーティリティ関数を提供します。
 *
 * 主な機能：
 * - 設定ノードの準備とソート処理
 * - 階層構造を持つ設定項目の検索・フィルタリング
 * - パフォーマンス最適化のためのデータ前処理
 *
 * 使用場面：
 * - 設定ツリーの表示前処理
 * - 検索機能の実装
 * - 設定項目の順序制御
 */

/**
 * 設定ノードを表示用に準備し、ソートする関数
 *
 * 設定ノードの配列を受け取り、表示に適した形式に変換します。
 * undefined値をフィルタリングし、order プロパティに基づいて安定ソートを実行します。
 *
 * @param roots - 処理対象の設定ノード群（Immutable）
 * @returns {Array<[string, SettingsTreeNode]>} ソート済みの[キー, ノード]配列
 *
 * @example
 * ```typescript
 * const nodes = {
 *   nodeA: { label: "Node A", order: 2 },
 *   nodeB: { label: "Node B", order: 1 },
 *   nodeC: undefined, // フィルタリングされる
 * };
 *
 * const prepared = prepareSettingsNodes(nodes);
 * // 結果: [["nodeB", {...}], ["nodeA", {...}]]
 * // order値に基づいて昇順ソートされる
 * ```
 *
 * @example
 * orderが未定義の場合の動作：
 * ```typescript
 * const nodes = {
 *   nodeA: { label: "Node A" }, // order未定義
 *   nodeB: { label: "Node B", order: 1 },
 * };
 *
 * const prepared = prepareSettingsNodes(nodes);
 * // order未定義の項目は最後に配置される
 * ```
 */
export function prepareSettingsNodes(
  roots: Immutable<SettingsTreeNodes>,
): Immutable<Array<[string, SettingsTreeNode]>> {
  // lodashのsortByを使用して安定ソートを実行
  // 同じorder値を持つ項目の順序は元の順序を保持
  return _.sortBy(
    // Object.entriesでキー・値ペアの配列に変換
    Object.entries(roots).filter(
      // TypeScriptの型ガードを使用してundefined値をフィルタリング
      // これにより、後続の処理で安全にノードにアクセス可能
      (entry): entry is [string, SettingsTreeNode] => entry[1] != undefined,
    ),
    // ソートキーとしてorder プロパティを使用
    // order未定義の場合はundefinedとなり、最後に配置される
    (entry) => entry[1].order,
  );
}

/**
 * 設定ツリーを再帰的にフィルタリングする関数
 *
 * 指定された検索フィルターに基づいて、階層構造を持つ設定ノードを
 * 再帰的に検索し、マッチする項目のみを含む新しいツリーを生成します。
 *
 * フィルタリングルール：
 * 1. 子ノードがフィルターにマッチする場合、親ノードも含める
 * 2. ノードのラベルまたはキーがフィルターにマッチする場合、そのノードを含める
 * 3. 大文字小文字を区別しない部分一致検索
 *
 * @param nodes - フィルタリング対象の設定ノード群（Immutable）
 * @param filter - 検索フィルター文字列
 * @returns {SettingsTreeNodes} フィルタリング後の設定ノード群
 *
 * @example
 * ```typescript
 * const nodes = {
 *   camera: {
 *     label: "Camera Settings",
 *     children: {
 *       resolution: { label: "Resolution" },
 *       frameRate: { label: "Frame Rate" }
 *     }
 *   },
 *   audio: {
 *     label: "Audio Settings",
 *     children: {
 *       volume: { label: "Volume" }
 *     }
 *   }
 * };
 *
 * const filtered = filterTreeNodes(nodes, "camera");
 * // 結果: camera ノードとその子ノードが全て含まれる
 *
 * const filtered2 = filterTreeNodes(nodes, "volume");
 * // 結果: audio ノード（volume の親）と volume ノードが含まれる
 * ```
 *
 * @example
 * 複雑な階層構造での動作：
 * ```typescript
 * const nodes = {
 *   sensors: {
 *     label: "Sensors",
 *     children: {
 *       lidar: {
 *         label: "LiDAR",
 *         children: {
 *           pointSize: { label: "Point Size" }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const filtered = filterTreeNodes(nodes, "point");
 * // 結果: sensors -> lidar -> pointSize の階層全体が含まれる
 * ```
 */
export function filterTreeNodes(
  nodes: Immutable<SettingsTreeNodes>,
  filter: string,
): Immutable<SettingsTreeNodes> {
  const result: Record<string, Immutable<SettingsTreeNode>> = {};

  // 各ノードを順次処理
  Object.entries(nodes).forEach(([key, node]) => {
    // undefined ノードはスキップ
    if (node == undefined) {
      return;
    }

    // 子ノードを再帰的にフィルタリング
    // 子ノードがマッチする場合、親ノードも結果に含める
    const filtered = filterTreeNodes(node.children ?? {}, filter);
    if (Object.values(filtered).length > 0) {
      // 子ノードがフィルターにマッチした場合
      // 親ノードも含め、フィルタリング後の子ノードで更新
      result[key] = { ...node, children: filtered };
    }

    // ノード自体のラベルまたはキーがフィルターにマッチするかチェック
    // ラベルが未定義の場合はキーを使用
    const stringToMatch = (node.label ?? key).toLocaleLowerCase();
    if (stringToMatch.includes(filter.toLocaleLowerCase())) {
      // 大文字小文字を区別しない部分一致検索
      // マッチした場合、ノード全体（子ノード含む）を結果に含める
      result[key] = node;
    }
    return;
  });

  return result;
}
