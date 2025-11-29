// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessagePipelineContext } from "@lichtblick/suite-base/components/MessagePipeline/types";

/**
 * **MessagePipeline セレクター関数集**
 *
 * MessagePipelineContext から特定のデータを効率的に抽出するためのセレクター関数を提供。
 * データ変換、正規化、最適化されたアクセスパターンを実装する。
 *
 * ## 主な機能
 *
 * ### 🔍 データ抽出とマッピング
 * - MessagePipelineContext からの効率的なデータ抽出
 * - トピック名とスキーマ名の対応関係の構築
 * - 正規化されたデータ構造の提供
 *
 * ### ⚡ パフォーマンス最適化
 * - 計算結果のメモ化（呼び出し側で実装）
 * - 不要な再計算の回避
 * - 効率的なデータアクセスパターン
 *
 * ### 🔄 再利用可能な抽象化
 * - 共通的なデータアクセスパターンの抽象化
 * - 複数のコンポーネントで再利用可能
 * - 一貫したデータアクセスAPI
 *
 * ## 使用例
 *
 * ```typescript
 * import { useMessagePipeline } from '@lichtblick/suite-base/components/MessagePipeline';
 * import { getTopicToSchemaNameMap } from './selectors';
 *
 * function MyComponent() {
 *   const topicToSchemaMap = useMessagePipeline(getTopicToSchemaNameMap);
 *
 *   const schemaName = topicToSchemaMap['/robot/pose'];
 *   console.log('Topic schema:', schemaName); // "geometry_msgs/PoseStamped"
 * }
 * ```
 *
 * ## 設計思想
 *
 * ### 単一責任の原則
 * - 各セレクターは特定のデータ抽出に特化
 * - 明確で予測可能な動作
 * - テストしやすい純粋関数
 *
 * ### 型安全性
 * - TypeScript による完全な型チェック
 * - 実行時エラーの防止
 * - IDEでの自動補完サポート
 *
 * ### パフォーマンス重視
 * - 最小限の計算量
 * - 効率的なデータ構造の使用
 * - メモ化との組み合わせを考慮
 */

/**
 * **トピック名とスキーマ名のマッピング取得セレクター**
 *
 * MessagePipelineContext からトピック名をキー、スキーマ名を値とする
 * マッピングオブジェクトを生成する。ROSメッセージの型情報を
 * 効率的に検索するために使用される。
 *
 * ## 機能詳細
 *
 * ### データ変換処理
 * 1. `state.sortedTopics` から各トピック情報を取得
 * 2. トピック名をキーとするオブジェクトを構築
 * 3. スキーマ名（undefined の可能性あり）を値として設定
 *
 * ### 使用場面
 * - ROSメッセージの型チェック
 * - スキーマベースのデータ検証
 * - 動的なメッセージ処理
 * - パネルでのトピック型判定
 *
 * ### パフォーマンス特性
 * - O(n) の時間計算量（n = トピック数）
 * - 結果のメモ化推奨（useMessagePipeline で自動）
 * - 軽量なオブジェクト生成
 *
 * @param state - MessagePipelineContext の状態オブジェクト
 * @returns トピック名をキー、スキーマ名を値とするマッピングオブジェクト
 *
 * @example
 * ```typescript
 * // 基本的な使用方法
 * const topicToSchemaMap = getTopicToSchemaNameMap(messagePipelineState);
 * console.log(topicToSchemaMap);
 * // {
 * //   '/robot/pose': 'geometry_msgs/PoseStamped',
 * //   '/camera/image': 'sensor_msgs/Image',
 * //   '/unknown_topic': undefined
 * // }
 *
 * // useMessagePipeline での使用
 * function TopicSchemaChecker() {
 *   const topicToSchemaMap = useMessagePipeline(getTopicToSchemaNameMap);
 *
 *   const checkTopicSchema = (topicName: string) => {
 *     const schemaName = topicToSchemaMap[topicName];
 *     if (!schemaName) {
 *       console.warn(`Schema not found for topic: ${topicName}`);
 *       return false;
 *     }
 *     return schemaName === 'geometry_msgs/PoseStamped';
 *   };
 *
 *   return (
 *     <div>
 *       {Object.entries(topicToSchemaMap).map(([topic, schema]) => (
 *         <div key={topic}>
 *           {topic}: {schema ?? 'Unknown schema'}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 *
 * // パネルでの型チェック
 * function MessageProcessor() {
 *   const topicToSchemaMap = useMessagePipeline(getTopicToSchemaNameMap);
 *
 *   const processMessage = (topic: string, message: unknown) => {
 *     const expectedSchema = topicToSchemaMap[topic];
 *     if (expectedSchema === 'sensor_msgs/Image') {
 *       // 画像メッセージとして処理
 *       return processImageMessage(message);
 *     } else if (expectedSchema === 'geometry_msgs/PoseStamped') {
 *       // ポーズメッセージとして処理
 *       return processPoseMessage(message);
 *     }
 *     // 未知のスキーマ
 *     console.warn(`Unknown schema: ${expectedSchema} for topic: ${topic}`);
 *   };
 * }
 * ```
 *
 * ## 注意事項
 *
 * ### undefined の可能性
 * - スキーマ名は `undefined` の場合がある
 * - 適切なnullチェックが必要
 * - デフォルト値の設定を推奨
 *
 * ### メモ化の重要性
 * - 毎回新しいオブジェクトを生成
 * - useMessagePipeline でのメモ化が重要
 * - 不要な再レンダリングの防止
 *
 * ### トピック数への配慮
 * - 大量のトピックが存在する場合のパフォーマンス
 * - 必要に応じてフィルタリングを検討
 * - 部分的なマッピングの利用
 */
export const getTopicToSchemaNameMap = (
  state: MessagePipelineContext,
): Record<string, string | undefined> => {
  const result: Record<string, string | undefined> = {};

  for (const topic of state.sortedTopics) {
    result[topic.name] = topic.schemaName;
  }
  return result;
};
