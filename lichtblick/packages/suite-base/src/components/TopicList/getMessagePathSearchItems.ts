// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Message Path Search Items Generator - メッセージパス検索アイテム生成器
 *
 * TopicListコンポーネントで使用するメッセージパス検索機能のコアロジック。
 * 全トピックのスキーマを解析し、ネストされたメッセージパスを再帰的に生成して
 * ファジー検索（fzf）用の検索アイテムリストを構築します。
 *
 * 主な機能：
 * - スキーマベースのメッセージパス自動生成
 * - 再帰的なネストフィールド探索
 * - 循環参照の検出・回避
 * - 配列型・複合型の適切な処理
 * - トピック名の引用符処理
 * - 検索最適化用のインデックス構築
 *
 * 技術仕様：
 * - MessageDefinitionスキーマ解析
 * - Generator関数による効率的なイテレーション
 * - Immutableデータ構造による安全性
 * - lodash-esによる高性能グルーピング
 * - fzfライブラリとの完全連携
 *
 * パフォーマンス最適化：
 * - 遅延評価による大量データ処理
 * - トピック別インデックスによる高速検索
 * - 循環参照回避による無限ループ防止
 * - メモリ効率的なデータ構造
 *
 * @example
 * ```typescript
 * const { items, itemsByTopicName } = getMessagePathSearchItems(topics, schemas);
 * // items: [{ topic: { name: "/pose" }, suffix: { pathSuffix: ".position.x" }, ... }]
 * // itemsByTopicName: Map("/pose" => [MessagePathSearchItem[]])
 * ```
 */

import * as _ from "lodash-es";

import { MessageDefinition } from "@lichtblick/message-definition";
import { quoteFieldNameIfNeeded, quoteTopicNameIfNeeded } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/src/players/types";

/**
 * Message Path Suffix - メッセージパスサフィックス
 *
 * 特定のスキーマ内でのメッセージパスを表現するデータ構造。
 * トピック名に追加される形でフルパスを構成します。
 *
 * 用途：
 * - ネストされたフィールドへのアクセスパス表現
 * - 型情報の保持とUI表示
 * - 検索結果のハイライト表示
 * - パス補完機能のサポート
 *
 * @example
 * ```typescript
 * // 例：geometry_msgs/PoseStampedの場合
 * {
 *   pathSuffix: ".pose.position.x",
 *   type: "float64",
 *   isLeaf: true
 * }
 * ```
 */
type MessagePathSuffix = Immutable<{
  /**
   * Message Path Suffix - メッセージパスサフィックス
   *
   * トピック名に追加されるパス部分。ドット記法で表現されます。
   *
   * 形式：
   * - 単純フィールド: `.field_name`
   * - ネストフィールド: `.parent.child.grandchild`
   * - 配列要素: `.array_field[:]`
   * - 引用符付きフィールド: `.["special-field"]`
   *
   * @example ".header.stamp", ".pose.position.x", ".data[:]"
   */
  pathSuffix: string;

  /**
   * Value Type - 値の型
   *
   * このパスが指す値またはサブメッセージの人間可読型名。
   * UI表示やツールチップでの型情報提供に使用されます。
   *
   * 型表現：
   * - プリミティブ型: `string`, `float64`, `bool`
   * - 配列型: `string[]`, `geometry_msgs/Point[]`
   * - 複合型: `geometry_msgs/Pose`, `foxglove.Point2`
   *
   * @example "float64", "string[]", "geometry_msgs/Point"
   */
  type: string;

  /**
   * Is Leaf Node - リーフノード判定
   *
   * このパスが末端の値（子要素を持たない）かどうかを示します。
   * 検索結果の表示制御や、さらなる展開可能性の判定に使用されます。
   *
   * - `true`: プリミティブ値（int32, string等）
   * - `false`: 複合型（サブメッセージ、配列等）
   */
  isLeaf: boolean;
}>;

/**
 * Generate Message Path Suffixes For Schema - スキーマ用メッセージパスサフィックス生成
 *
 * 指定されたスキーマを再帰的に解析し、全ての有効なメッセージパスサフィックスを生成します。
 * Generator関数により、大量のパスを効率的に遅延生成します。
 *
 * アルゴリズム：
 * 1. スキーマの全フィールドを順次処理
 * 2. 定数フィールドをスキップ
 * 3. 各フィールドのパスサフィックスを生成
 * 4. 複合型の場合、再帰的にサブスキーマを処理
 * 5. 循環参照の検出・回避
 * 6. 配列型の特別処理（[:]記法）
 *
 * 循環参照対策：
 * - seenSchemaNamesによる訪問済みスキーマ追跡
 * - 同一スキーマの再訪問防止
 * - 無限ループの回避
 *
 * @param schema - 解析対象のメッセージスキーマ定義
 * @param schemasByName - 全スキーマのマップ（参照解決用）
 * @param prefix - 現在のパスプレフィックス（再帰時に蓄積）
 * @param seenSchemaNames - 循環参照検出用の訪問済みスキーマ名リスト
 *
 * @yields MessagePathSuffix - 生成されたメッセージパスサフィックス
 *
 * @example
 * ```typescript
 * // geometry_msgs/PoseStampedスキーマの場合
 * // 生成されるパス例：
 * // .header
 * // .header.seq
 * // .header.stamp
 * // .header.stamp.sec
 * // .header.stamp.nsec
 * // .header.frame_id
 * // .pose
 * // .pose.position
 * // .pose.position.x
 * // .pose.position.y
 * // .pose.position.z
 * // .pose.orientation
 * // .pose.orientation.x
 * // .pose.orientation.y
 * // .pose.orientation.z
 * // .pose.orientation.w
 * ```
 */
function* generateMessagePathSuffixesForSchema(
  schema: Immutable<MessageDefinition>,
  schemasByName: Immutable<Map<string, MessageDefinition>>,
  prefix: string,
  seenSchemaNames: readonly string[],
): Iterable<MessagePathSuffix> {
  // スキーマの全フィールド定義を順次処理
  for (const { name, isArray, isConstant, isComplex, type } of schema.definitions) {
    // 定数フィールドはスキップ（実行時に変更されない値）
    if (isConstant === true) {
      continue;
    }

    // フィールド名を適切に引用符処理してパスサフィックスを構築
    const pathSuffix = `${prefix}.${quoteFieldNameIfNeeded(name)}`;

    // 現在のフィールドのパスサフィックスを生成
    yield {
      pathSuffix,
      // 配列型の場合は[]記法を追加
      type: isArray === true ? `${type}[]` : type,
      // 複合型でない場合はリーフノード
      isLeaf: isComplex !== true,
    };

    // 複合型（サブメッセージ）の場合、再帰的に処理
    if (isComplex === true) {
      // 循環参照チェック：既に訪問済みのスキーマは処理しない
      if (seenSchemaNames.includes(type)) {
        continue;
      }

      // 参照先スキーマの取得
      const fieldSchema = schemasByName.get(type);
      if (!fieldSchema) {
        // スキーマが見つからない場合はスキップ
        continue;
      }

      // 再帰的にサブスキーマを処理
      yield* generateMessagePathSuffixesForSchema(
        fieldSchema,
        schemasByName,
        // 配列型の場合は[:]記法でインデックスアクセスを表現
        isArray === true ? `${pathSuffix}[:]` : pathSuffix,
        // 訪問済みスキーマリストに現在のスキーマを追加
        [...seenSchemaNames, type],
      );
    }
  }
}

/**
 * Message Path Search Item - メッセージパス検索アイテム
 *
 * ファジー検索（fzf）で使用される個別の検索対象アイテム。
 * トピックとメッセージパスの組み合わせを表現し、検索結果の
 * 表示とナビゲーションに必要な全情報を含みます。
 *
 * 構造：
 * - topic: 対象トピックの完全情報
 * - suffix: メッセージパスサフィックス情報
 * - fullPath: 完全なメッセージパス文字列
 * - offset: ハイライト表示用のオフセット情報
 *
 * 用途：
 * - fzfライブラリでの検索対象
 * - 検索結果のハイライト表示
 * - 選択されたパスの解析・実行
 * - UI表示用の型情報提供
 *
 * @example
 * ```typescript
 * {
 *   topic: { name: "/robot/pose", schemaName: "geometry_msgs/PoseStamped" },
 *   suffix: { pathSuffix: ".pose.position.x", type: "float64", isLeaf: true },
 *   fullPath: "/robot/pose.pose.position.x",
 *   offset: 11  // ".pose.position.x"の開始位置
 * }
 * ```
 */
export type MessagePathSearchItem = {
  /** Topic Information - トピック情報 */
  topic: Topic;

  /** Path Suffix Information - パスサフィックス情報 */
  suffix: MessagePathSuffix;

  /**
   * Full Message Path - 完全メッセージパス
   *
   * トピック名とパスサフィックスを結合した完全なメッセージパス。
   * 実際のデータアクセスや表示に使用される最終的なパス文字列です。
   *
   * 形式：
   * - 通常: `/topic_name.field.subfield`
   * - 引用符付き: `/["topic-name"].field.subfield`
   * - 配列: `/topic_name.array_field[:].element`
   *
   * @example "/robot/pose.pose.position.x", "/my-topic.data[0].value"
   */
  fullPath: string;

  /**
   * Suffix Offset - サフィックスオフセット
   *
   * fullPath内でのsuffix.pathSuffixの開始位置。
   * 検索結果のハイライト表示で、トピック名部分と
   * パス部分を区別するために使用されます。
   *
   * 計算：
   * - 通常: topic.name.length
   * - 引用符付きトピック名の場合: 引用符処理後の長さ
   *
   * 用途：
   * - 検索結果のハイライト表示
   * - UI上でのトピック名/パス部分の色分け
   * - 検索マッチ位置の正確な特定
   */
  offset: number;
};

/**
 * Get Message Path Search Items - メッセージパス検索アイテム取得
 *
 * TopicListで使用する全メッセージパス検索アイテムのリストを生成します。
 * 各トピックの下にネストされた全メッセージパスを含む包括的な検索対象を構築し、
 * ファジー検索（fzf）での高速検索を可能にします。
 *
 * 処理フロー：
 * 1. スキーマ名でトピックをグループ化
 * 2. 各スキーマのメッセージパスサフィックスを生成
 * 3. 各トピックとパスサフィックスの組み合わせでアイテム作成
 * 4. トピック別インデックスの構築
 * 5. 検索最適化用データ構造の返却
 *
 * パフォーマンス特性：
 * - 時間計算量: O(T × S × D) (T:トピック数, S:スキーマ数, D:最大深度)
 * - 空間計算量: O(T × P) (P:平均パス数)
 * - 遅延評価による効率的なメモリ使用
 * - lodashによる高速グルーピング
 *
 * 生成例：
 * ```
 * トピック: /robot/pose (geometry_msgs/PoseStamped)
 * 生成アイテム:
 * - /robot/pose.header
 * - /robot/pose.header.seq
 * - /robot/pose.header.stamp
 * - /robot/pose.header.stamp.sec
 * - /robot/pose.header.stamp.nsec
 * - /robot/pose.header.frame_id
 * - /robot/pose.pose
 * - /robot/pose.pose.position
 * - /robot/pose.pose.position.x
 * - /robot/pose.pose.position.y
 * - /robot/pose.pose.position.z
 * - /robot/pose.pose.orientation
 * - /robot/pose.pose.orientation.x
 * - /robot/pose.pose.orientation.y
 * - /robot/pose.pose.orientation.z
 * - /robot/pose.pose.orientation.w
 * ```
 *
 * @param allTopics - 解析対象の全トピックリスト
 * @param schemasByName - スキーマ名をキーとする全スキーマ定義のマップ
 *
 * @returns 検索アイテムリストとトピック別インデックス
 * - items: fzfに渡される全検索アイテムの配列
 * - itemsByTopicName: トピック名をキーとするアイテムマップ（高速アクセス用）
 *
 * @example
 * ```typescript
 * const topics = [
 *   { name: "/robot/pose", schemaName: "geometry_msgs/PoseStamped" },
 *   { name: "/robot/twist", schemaName: "geometry_msgs/Twist" }
 * ];
 *
 * const { items, itemsByTopicName } = getMessagePathSearchItems(topics, schemas);
 *
 * // 全検索アイテム（fzf用）
 * console.log(items.length); // 例: 42個のパス
 *
 * // 特定トピックのアイテム取得
 * const poseItems = itemsByTopicName.get("/robot/pose");
 * console.log(poseItems?.length); // 例: 18個のパス
 * ```
 */
export function getMessagePathSearchItems(
  allTopics: readonly Topic[],
  schemasByName: Immutable<Map<string, MessageDefinition>>,
): { items: MessagePathSearchItem[]; itemsByTopicName: Map<string, MessagePathSearchItem[]> } {
  // 結果格納用の配列とマップを初期化
  const items: MessagePathSearchItem[] = [];
  const itemsByTopicName = new Map<string, MessagePathSearchItem[]>();

  // パフォーマンス最適化：スキーマ名でトピックをグループ化
  // 同一スキーマのトピックは同じパスサフィックスを共有するため
  const topicsBySchemaName = _.groupBy(
    // スキーマ名が定義されているトピックのみを対象
    allTopics.filter((topic) => topic.schemaName != undefined),
    (topic) => topic.schemaName,
  );

  // 各スキーマグループを処理
  for (const [schemaName, topics] of Object.entries(topicsBySchemaName)) {
    // スキーマ定義の取得
    const schema = schemasByName.get(schemaName);
    if (!schema) {
      // スキーマが見つからない場合はスキップ
      continue;
    }

    // 現在のスキーマの全パスサフィックスを生成
    for (const suffix of generateMessagePathSuffixesForSchema(schema, schemasByName, "", [
      schemaName,
    ])) {
      // 同一スキーマの全トピックに対してアイテムを生成
      for (const topic of topics) {
        // トピック名の引用符処理（特殊文字対応）
        const quotedTopicName = quoteTopicNameIfNeeded(topic.name);

        // 検索アイテムの構築
        const item: MessagePathSearchItem = {
          topic,
          suffix,
          // 完全パス = 引用符処理済みトピック名 + パスサフィックス
          fullPath: quotedTopicName + suffix.pathSuffix,
          // ハイライト用オフセット = 引用符処理済みトピック名の長さ
          offset: quotedTopicName.length,
        };

        // 全アイテムリストに追加
        items.push(item);

        // トピック別インデックスに追加（高速アクセス用）
        let itemsForTopic = itemsByTopicName.get(topic.name);
        if (!itemsForTopic) {
          itemsForTopic = [];
          itemsByTopicName.set(topic.name, itemsForTopic);
        }
        itemsForTopic.push(item);
      }
    }
  }

  // 検索アイテムリストとトピック別インデックスを返却
  return { items, itemsByTopicName };
}
