// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Fzf, FzfResultItem, basicMatch } from "fzf";
import * as _ from "lodash-es";
import { useMemo } from "react";

import { MessageDefinition } from "@lichtblick/message-definition";
import { Immutable } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/players/types";

import { MessagePathSearchItem, getMessagePathSearchItems } from "./getMessagePathSearchItems";

/**
 * トピックをFZF結果形式に変換するヘルパー関数
 * @param item - 変換するトピック
 * @returns FZF結果形式のトピック（スコア0、ハイライト位置なし）
 */
function topicToFzfResult(item: Topic): FzfResultItem<Topic> {
  return {
    item,
    score: 0,
    positions: new Set<number>(),
    start: 0,
    end: 0,
  };
}

/**
 * TopicListで表示される項目の型定義
 * - topic: ROSトピック項目
 * - schema: メッセージパス（スキーマフィールド）項目
 */
export type TopicListItem =
  | { type: "topic"; item: FzfResultItem<Topic> }
  | { type: "schema"; item: FzfResultItem<MessagePathSearchItem> };

/**
 * useTopicListSearchフックのパラメータ型定義
 */
export type UseTopicListSearchParams = {
  topics: Immutable<Topic[]>;
  datatypes: Immutable<Map<string, MessageDefinition>>;
  filterText: string;
};

/**
 * useTopicListSearch - トピックとメッセージパスの検索・フィルタリングフック
 *
 * @description
 * このフックは、TopicListコンポーネントで使用される検索・フィルタリング機能を提供します。
 * FZF（Fuzzy Finder）アルゴリズムを使用して、高性能なファジー検索を実現しています。
 *
 * **主要機能:**
 * - 🔍 トピック名とスキーマ名での検索
 * - 🔍 メッセージパス（フィールド）での検索
 * - 📊 スコアベースのソート
 * - 🎯 ハイライト位置の計算
 * - 🌳 階層的な結果構造
 *
 * **検索対象:**
 * 1. **トピック検索**: `トピック名|スキーマ名` の形式で検索
 * 2. **メッセージパス検索**: フルパス（例: `/odom.pose.position.x`）で検索
 *
 * **検索ロジック:**
 * - フィルターテキストが空の場合: 全トピックを表示
 * - フィルターテキストがある場合: FZFによるファジー検索を実行
 * - メッセージパス検索では、トピック名のみにマッチした場合は除外
 *
 * **結果のソート順:**
 * 1. 最大スコア順（降順）
 * 2. 直接マッチしたトピック優先
 * 3. トピック名のアルファベット順
 *
 * **結果構造:**
 * ```
 * トピック1 (直接マッチ)
 *   ├─ メッセージパス1 (マッチ)
 *   └─ メッセージパス2 (マッチ)
 * トピック2 (パスマッチのみ)
 *   └─ メッセージパス3 (マッチ)
 * ```
 *
 * **パフォーマンス最適化:**
 * - useMemoによる計算結果のキャッシュ
 * - FZFインスタンスの再利用
 * - 依存関係の最小化
 *
 * **使用例:**
 * ```typescript
 * const treeItems = useTopicListSearch({
 *   topics: [{ name: "/odom", schemaName: "nav_msgs/Odometry" }],
 *   datatypes: new Map([["nav_msgs/Odometry", definition]]),
 *   filterText: "position"
 * });
 * ```
 *
 * **依存関係:**
 * - FZF: ファジー検索エンジン
 * - getMessagePathSearchItems: メッセージパス検索項目の生成
 * - lodash-es: グループ化処理
 *
 * @param params - 検索パラメータ
 * @param params.topics - 検索対象のトピック一覧
 * @param params.datatypes - メッセージ定義のマップ
 * @param params.filterText - フィルター文字列
 * @returns 検索・フィルタリングされたトピックリスト項目
 */
export function useTopicListSearch(params: UseTopicListSearchParams): TopicListItem[] {
  const { topics, datatypes, filterText } = params;

  // トピック名とスキーマ名での検索用FZFインスタンス
  const topicsAndSchemaNamesFzf = useMemo(
    () =>
      new Fzf(topics, {
        selector: (item) => `${item.name}|${item.schemaName}`,
      }),
    [topics],
  );

  // メッセージパス検索項目の生成
  const messagePathSearchItems = useMemo(
    () => getMessagePathSearchItems(topics, datatypes),
    [topics, datatypes],
  );

  // メッセージパス検索用FZFインスタンス
  const messagePathsFzf = useMemo(
    () =>
      new Fzf(messagePathSearchItems.items, {
        selector: (item) => item.fullPath,
        // カスタムマッチャー: トピック名のみのマッチを除外
        match(query) {
          const results = basicMatch.call<
            typeof this,
            [string],
            FzfResultItem<MessagePathSearchItem>[]
          >(this, query);
          // `offset` はサフィックス（パス部分）の開始位置を示す
          // マッチ終了位置がオフセットより大きい場合のみ有効とする
          return results.filter((result) => result.end > result.item.offset);
        },
      }),
    [messagePathSearchItems],
  );

  // フィルタリングされたトピック結果
  const filteredTopics: FzfResultItem<Topic>[] = useMemo(
    () => (filterText ? topicsAndSchemaNamesFzf.find(filterText) : topics.map(topicToFzfResult)),
    [filterText, topics, topicsAndSchemaNamesFzf],
  );

  // メッセージパス検索結果
  const messagePathResults = useMemo(
    () => (filterText ? messagePathsFzf.find(filterText) : []),
    [filterText, messagePathsFzf],
  );

  // 最終的なツリー項目の構築
  const treeItems = useMemo(() => {
    const results: TopicListItem[] = [];

    // メッセージパス結果をトピック名でグループ化
    const messagePathResultsByTopicName = _.groupBy(
      messagePathResults,
      (item) => item.item.topic.name,
    );

    // 表示すべき全トピックの収集（直接マッチまたはパスマッチを含む）
    const allTopicsToShowByName = new Map<string, { topic: Topic; maxScore: number }>();
    const matchedTopicsByName = new Map<string, FzfResultItem<Topic>>();

    // 直接マッチしたトピックを追加
    for (const topic of filteredTopics) {
      allTopicsToShowByName.set(topic.item.name, { topic: topic.item, maxScore: topic.score });
      matchedTopicsByName.set(topic.item.name, topic);
    }

    // メッセージパスマッチによるトピックを追加
    for (const {
      item: { topic },
      score,
    } of messagePathResults) {
      const existingTopic = allTopicsToShowByName.get(topic.name);
      if (existingTopic == undefined) {
        allTopicsToShowByName.set(topic.name, { topic, maxScore: score });
      } else if (score > existingTopic.maxScore) {
        existingTopic.maxScore = score;
      }
    }

    // トピックのソート: 最大スコア順 → 直接マッチ優先 → 名前順
    const sortedTopics = Array.from(allTopicsToShowByName.values()).sort((a, b) => {
      if (a.maxScore !== b.maxScore) {
        return b.maxScore - a.maxScore;
      }

      const aMatched = matchedTopicsByName.has(a.topic.name);
      const bMatched = matchedTopicsByName.has(b.topic.name);
      if (aMatched !== bMatched) {
        return aMatched ? -1 : 1;
      }

      return a.topic.name.localeCompare(b.topic.name);
    });

    // 最終結果の構築: トピック → その下にマッチしたメッセージパス
    for (const { topic } of sortedTopics) {
      results.push({
        type: "topic",
        item: matchedTopicsByName.get(topic.name) ?? topicToFzfResult(topic),
      });
      const matchedMessagePaths = messagePathResultsByTopicName[topic.name];
      if (matchedMessagePaths == undefined) {
        continue;
      }
      for (const messagePathResult of matchedMessagePaths) {
        results.push({ type: "schema", item: messagePathResult });
      }
    }
    return results;
  }, [filteredTopics, messagePathResults]);

  return treeItems;
}
