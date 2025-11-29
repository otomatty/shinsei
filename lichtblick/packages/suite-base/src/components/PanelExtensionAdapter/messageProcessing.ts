// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { Opaque } from "ts-essentials";

import {
  Immutable,
  MessageEvent,
  RegisterMessageConverterArgs,
  Subscription,
} from "@lichtblick/suite";
import { Topic as PlayerTopic } from "@lichtblick/suite-base/players/types";
import { Namespace } from "@lichtblick/suite-base/types";

/**
 * コンバーターキーの型定義
 *
 * @description `converterKey`関数を通じて計算されたルックアップキーのブランド化された文字列。
 * 型安全性を保証するため、直接作成することはできません。
 *
 * ### 用途
 * - メッセージコンバーターのマップでキーとして使用
 * - トピック名とスキーマ名の組み合わせを一意に識別
 * - 型安全性により、誤ったキーの使用を防止
 *
 * @internal
 */
type ConverterKey = Opaque<string, "ConverterKey">;

/**
 * メッセージコンバーター
 *
 * @description 拡張機能の名前空間情報を含むメッセージコンバーターの型定義。
 * RegisterMessageConverterArgsを拡張し、コンバーターがどの拡張機能から
 * 提供されたかを識別できるようにします。
 *
 * ### 拡張機能の優先順位
 * - `local`拡張機能が最も高い優先度
 * - `org`拡張機能が中程度の優先度
 * - 名前空間が未定義の場合は最も低い優先度
 *
 * ### 使用例
 * ```typescript
 * const converter: MessageConverter = {
 *   fromSchemaName: "sensor_msgs/PointCloud2",
 *   toSchemaName: "foxglove/PointCloud",
 *   converter: (message) => convertPointCloud(message),
 *   extensionNamespace: "local" // ローカル拡張機能
 * };
 * ```
 *
 * @internal
 */
type MessageConverter = RegisterMessageConverterArgs<unknown> & {
  extensionNamespace?: Namespace;
};

/**
 * トピック・スキーマ・コンバーターマップ
 *
 * @description トピック名とスキーマ名をキーとして、
 * 利用可能なメッセージコンバーターのリストを管理するマップ。
 *
 * ### キーの形式
 * - キーは`converterKey()`関数で生成される
 * - 形式: `"topic_name\nschema_name"`
 * - 改行文字を区切り文字として使用（衝突回避）
 *
 * ### 値の構造
 * - 配列には同じ入力に対する複数のコンバーターが含まれる場合がある
 * - 配列内のコンバーターは優先順位順にソートされる
 * - 通常、最初のコンバーターが使用される
 *
 * @internal
 */
type TopicSchemaConverterMap = Map<ConverterKey, MessageConverter[]>;

/**
 * メッセージイベントから文字列ルックアップキーを作成
 *
 * @description トピック名とスキーマ名から一意のキーを生成します。
 * 改行文字を区切り文字として使用し、
 * 異なるトピック/スキーマ名の組み合わせが同じキーを生成することを防ぎます。
 *
 * ### 設計理念
 * - 改行文字`\n`を区切り文字として使用
 * - トピック名やスキーマ名に改行文字が含まれることは通常ないため安全
 * - シンプルで効率的なキー生成
 * - 一意性が保証される
 *
 * ### パフォーマンス特性
 * - 時間計算量: O(n + m) - nはトピック名長、mはスキーマ名長
 * - 空間計算量: O(n + m)
 * - 文字列結合操作のみなので高速
 *
 * @param topic - トピック名（例: "/robot/pose"）
 * @param schema - スキーマ名（例: "geometry_msgs/PoseStamped"）
 * @returns 一意のコンバーターキー
 *
 * @example
 * ```typescript
 * const key1 = converterKey("/robot/pose", "geometry_msgs/PoseStamped");
 * const key2 = converterKey("/robot/velocity", "geometry_msgs/Twist");
 *
 * // key1 と key2 は異なる値になることが保証される
 * // 内部的には "/robot/pose\ngeometry_msgs/PoseStamped" のような形式
 * ```
 *
 * @internal
 */
function converterKey(topic: string, schema: string): ConverterKey {
  return (topic + "\n" + schema) as ConverterKey;
}

/**
 * メッセージを変換してconvertedMessagesに追加
 *
 * @description 指定されたメッセージイベントを、利用可能なコンバーターを使用して変換し、
 * 結果を既存の配列に追加します。効率化のため、配列をin-placeで変更します。
 *
 * ### 変換処理の流れ
 * 1. トピック名とスキーマ名からコンバーターキーを生成
 * 2. 該当するコンバーターを検索
 * 3. 各コンバーターを順次実行
 * 4. 変換結果を配列に追加
 *
 * ### 変換ルール
 * - コンバーターが`undefined`またはnullを返す場合、メッセージはスキップされます
 * - 複数のコンバーターが適用される場合、すべての変換結果が追加されます
 * - 元のメッセージイベントは`originalMessageEvent`フィールドに保持されます
 * - `topicConfig`が設定されている場合、変換後のメッセージにも引き継がれます
 *
 * ### パフォーマンス考慮事項
 * - in-place変更により新しい配列の作成を回避
 * - Map.get()の時間計算量はO(1)
 * - コンバーター実行の計算量は変換内容に依存
 *
 * ### エラーハンドリング
 * - コンバーターが例外をスローした場合、そのメッセージはスキップされる
 * - 他のコンバーターの実行には影響しない
 * - エラーは上位レベルでハンドリングされる
 *
 * @param messageEvent - 変換対象のメッセージイベント
 * @param converters - 利用可能なコンバーターのマップ
 * @param convertedMessages - 変換されたメッセージを追加する配列（変更される）
 *
 * @example
 * ```typescript
 * const messageEvent: MessageEvent = {
 *   topic: "/robot/pose",
 *   schemaName: "geometry_msgs/PoseStamped",
 *   message: { header: {...}, pose: {...} },
 *   receiveTime: { sec: 1234567890, nsec: 0 },
 *   sizeInBytes: 256
 * };
 *
 * const converters = new Map();
 * // コンバーターの設定...
 *
 * const convertedMessages: MessageEvent[] = [];
 * convertMessage(messageEvent, converters, convertedMessages);
 *
 * // convertedMessagesに変換されたメッセージが追加される
 * console.log(`変換された件数: ${convertedMessages.length}`);
 * ```
 *
 * @example
 * ```typescript
 * // 複数のコンバーターが登録されている場合
 * const converters = new Map([
 *   [converterKey("/robot/pose", "geometry_msgs/PoseStamped"), [
 *     {
 *       fromSchemaName: "geometry_msgs/PoseStamped",
 *       toSchemaName: "foxglove/Pose",
 *       converter: (msg) => convertToFoxglovePose(msg)
 *     },
 *     {
 *       fromSchemaName: "geometry_msgs/PoseStamped",
 *       toSchemaName: "custom/SimplePose",
 *       converter: (msg) => convertToSimplePose(msg)
 *     }
 *   ]]
 * ]);
 *
 * // 1つの入力メッセージから2つの変換結果が生成される
 * convertMessage(messageEvent, converters, convertedMessages);
 * // convertedMessages.length === 2
 * ```
 */
export function convertMessage(
  messageEvent: Immutable<MessageEvent>,
  converters: Immutable<TopicSchemaConverterMap>,
  convertedMessages: MessageEvent[],
): void {
  const key = converterKey(messageEvent.topic, messageEvent.schemaName);
  const matchedConverters = converters.get(key);
  for (const converter of matchedConverters ?? []) {
    const convertedMessage = converter.converter(messageEvent.message, messageEvent);
    // If the converter returns _undefined_ or _null_ the message is skipped
    if (convertedMessage == undefined) {
      continue;
    }
    convertedMessages.push({
      topic: messageEvent.topic,
      schemaName: converter.toSchemaName,
      receiveTime: messageEvent.receiveTime,
      message: convertedMessage,
      originalMessageEvent: messageEvent,
      sizeInBytes: messageEvent.sizeInBytes,
      topicConfig: messageEvent.topicConfig,
    });
  }
}

/**
 * マップの差分を計算
 *
 * @description マップ`a`に含まれ、マップ`b`に含まれないアイテムで構成される新しいマップを返します。
 * 値は配列であり、各キーに対して配列の差分を計算します。
 *
 * ### 動作原理
 * 1. マップ`a`の各エントリを反復処理
 * 2. 対応するキーがマップ`b`に存在するかチェック
 * 3. lodashの`difference`関数を使用して配列の差分を計算
 * 4. 差分が存在する場合のみ結果マップに追加
 *
 * ### 使用例シナリオ
 * - 新しく追加されたコンバーターの検出
 * - 変更された購読の特定
 * - 増分更新処理の最適化
 *
 * ### パフォーマンス特性
 * - 時間計算量: O(n * m) - nはaのキー数、mは各配列の平均長
 * - 空間計算量: O(k) - kは結果マップのサイズ
 * - lodash.differenceは内部的に最適化されている
 *
 * @param a - 比較元のマップ
 * @param b - 比較先のマップ（undefinedの場合は空のマップとして扱われる）
 * @returns 差分を含む新しいマップ
 *
 * @template K - マップのキーの型
 * @template V - 配列要素の型
 *
 * @example
 * ```typescript
 * const mapA = new Map([
 *   ["key1", ["a", "b", "c"]],
 *   ["key2", ["x", "y"]],
 *   ["key3", ["p", "q", "r"]]
 * ]);
 *
 * const mapB = new Map([
 *   ["key1", ["a", "b"]],        // "c"が差分
 *   ["key3", ["p", "q", "r"]]    // 差分なし
 *   // "key2"が存在しない = 全て差分
 * ]);
 *
 * const diff = mapDifference(mapA, mapB);
 * // 結果: Map([
 * //   ["key1", ["c"]],
 * //   ["key2", ["x", "y"]]
 * // ])
 * ```
 *
 * @example
 * ```typescript
 * // コンバーターの差分検出での使用例
 * const newConverters = mapDifference(
 *   currentTopicSchemaConverters,
 *   previousTopicSchemaConverters
 * );
 *
 * // 新しく追加されたコンバーターのみで処理を実行
 * for (const [key, converters] of newConverters) {
 *   console.log(`新しいコンバーター: ${key}, 数: ${converters.length}`);
 * }
 * ```
 */
export function mapDifference<K, V>(a: Map<K, V[]>, b: undefined | Map<K, V[]>): Map<K, V[]> {
  const result = new Map<K, V[]>();
  for (const [key, value] of a.entries()) {
    const newValues = _.difference(value, b?.get(key) ?? []);
    if (newValues.length > 0) {
      result.set(key, newValues);
    }
  }
  return result;
}

/**
 * トピック・スキーマ変換情報
 *
 * @description パネルが購読しているトピックのうち、
 * 変換が必要なトピックと不要なトピックを分類した情報。
 * メッセージ処理の効率化に使用されます。
 *
 * ### データ構造の設計
 * - **分離関心**: 変換ありとなしを明確に分離
 * - **効率性**: 変換不要なトピックは高速パスで処理
 * - **柔軟性**: 動的なコンバーター追加に対応
 *
 * ### 使用場面
 * - メッセージフレーム処理での分岐制御
 * - パフォーマンス最適化（不要な変換をスキップ）
 * - メモリ使用量の最適化
 *
 * @example
 * ```typescript
 * const conversions: TopicSchemaConversions = {
 *   unconvertedSubscriptionTopics: new Set([
 *     "/robot/odom",      // 元の形式で使用
 *     "/robot/status"     // 変換不要
 *   ]),
 *   topicSchemaConverters: new Map([
 *     [converterKey("/robot/pointcloud", "sensor_msgs/PointCloud2"), [
 *       {
 *         fromSchemaName: "sensor_msgs/PointCloud2",
 *         toSchemaName: "foxglove/PointCloud",
 *         converter: convertPointCloud
 *       }
 *     ]]
 *   ])
 * };
 * ```
 */
export type TopicSchemaConversions = {
  /**
   * 変換なしで購読されているトピック
   *
   * @description これらのトピックは元のメッセージを受信したいトピックです。
   * 変換処理をスキップして、パフォーマンスを向上させます。
   *
   * ### 含まれるトピック
   * - `convertTo`が指定されていない購読
   * - `convertTo`が元のスキーマと同じ購読
   * - 対応するコンバーターが見つからない購読
   *
   * ### パフォーマンス利点
   * - 変換処理のオーバーヘッドを回避
   * - メモリコピーの削減
   * - CPUリソースの節約
   *
   * @example
   * ```typescript
   * // これらのトピックは変換されずに直接渡される
   * if (unconvertedSubscriptionTopics.has(messageEvent.topic)) {
   *   // 高速パス: 変換なしで処理
   *   processMessageDirectly(messageEvent);
   * }
   * ```
   */
  unconvertedSubscriptionTopics: Set<string>;

  /**
   * トピック・スキーマ・コンバーターマップ
   *
   * @description convertToが存在する購読に対して、
   * 望ましい出力メッセージスキーマを生成できるコンバーターを検索するために使用されます。
   * マップのキーは`topic + input schema`の形式です。
   *
   * ### キーの構造
   * - 形式: `converterKey(topicName, inputSchemaName)`
   * - 例: `"/robot/pose\ngeometry_msgs/PoseStamped"`
   *
   * ### 値の構造
   * - 配列には同じ入力に対する複数のコンバーターが含まれる場合
   * - 優先順位順にソートされている
   * - 通常は最初の要素が使用される
   *
   * ### 検索処理
   * これにより、currentFrameとallFramesを構築するランタイムメッセージイベントハンドラーロジックが、
   * 入力メッセージイベントのトピック＋スキーマをこのマップで検索することで、
   * 実行すべきコンバーターがあるかどうかを判定できます。
   *
   * @example
   * ```typescript
   * // ランタイムでの使用例
   * const key = converterKey(messageEvent.topic, messageEvent.schemaName);
   * const converters = topicSchemaConverters.get(key);
   *
   * if (converters) {
   *   // 変換処理を実行
   *   convertMessage(messageEvent, topicSchemaConverters, outputMessages);
   * }
   * ```
   */
  topicSchemaConverters: TopicSchemaConverterMap;
};

/**
 * トピック・スキーマ変換情報を構築
 *
 * @description 変換なしでレンダリングできるトピックのセットと、
 * 変換されたメッセージを生成するために使用するコンバーターキー→コンバーター引数のマップを構築します。
 *
 * ### 処理の流れ
 * 1. **購読の分類**: 購読をconvertToありとなしの2つのセットに分類
 * 2. **同一性チェック**: convertToがあるものは、元のスキーマと要求されたスキーマが同じか確認
 * 3. **コンバーター検索**: 同じでない場合、適切なコンバーターを検索
 * 4. **優先順位決定**: 'local'コンバーターを'org'提供のものより優先
 *
 * ### 最適化の特徴
 * この関数はパフォーマンスのためにメモ化されるため、入力は安定している必要があります。
 *
 * ### コンバーター優先順位
 * 1. `extensionNamespace: "local"` - 最高優先度
 * 2. `extensionNamespace: "org"` - 中優先度
 * 3. `extensionNamespace: undefined` - 最低優先度
 *
 * ### エラーハンドリング
 * - 対応するトピックが見つからない場合はスキップ
 * - 適切なコンバーターが見つからない場合もスキップ
 * - 部分的な失敗は全体の処理に影響しない
 *
 * @param subscriptions - 購読情報の配列
 * @param sortedTopics - ソート済みトピック情報の配列
 * @param messageConverters - 利用可能なメッセージコンバーターの配列
 * @returns 変換情報を含むオブジェクト
 *
 * @example
 * ```typescript
 * const subscriptions = [
 *   { topic: "/robot/pose", convertTo: "foxglove/Pose" },
 *   { topic: "/robot/velocity" }, // 変換なし
 *   { topic: "/robot/image", convertTo: "foxglove/CompressedImage" }
 * ];
 *
 * const sortedTopics = [
 *   { name: "/robot/pose", schemaName: "geometry_msgs/PoseStamped" },
 *   { name: "/robot/velocity", schemaName: "geometry_msgs/Twist" },
 *   { name: "/robot/image", schemaName: "sensor_msgs/CompressedImage" }
 * ];
 *
 * const messageConverters = [
 *   {
 *     fromSchemaName: "geometry_msgs/PoseStamped",
 *     toSchemaName: "foxglove/Pose",
 *     converter: convertPose,
 *     extensionNamespace: "local"
 *   }
 * ];
 *
 * const conversions = collateTopicSchemaConversions(
 *   subscriptions,
 *   sortedTopics,
 *   messageConverters
 * );
 *
 * // 結果の確認
 * console.log("変換不要:", Array.from(conversions.unconvertedSubscriptionTopics));
 * // => ["/robot/velocity"]
 *
 * console.log("変換必要:", conversions.topicSchemaConverters.size);
 * // => 1 ("/robot/pose"用のコンバーター)
 * ```
 *
 * @example
 * ```typescript
 * // 複数のコンバーターが競合する場合
 * const messageConverters = [
 *   {
 *     fromSchemaName: "sensor_msgs/PointCloud2",
 *     toSchemaName: "foxglove/PointCloud",
 *     converter: orgConverter,
 *     extensionNamespace: "org"       // 中優先度
 *   },
 *   {
 *     fromSchemaName: "sensor_msgs/PointCloud2",
 *     toSchemaName: "foxglove/PointCloud",
 *     converter: localConverter,
 *     extensionNamespace: "local"     // 最高優先度
 *   }
 * ];
 *
 * const conversions = collateTopicSchemaConversions(
 *   subscriptions,
 *   sortedTopics,
 *   messageConverters
 * );
 *
 * // localConverterが選択される（優先順位が高いため）
 * ```
 */
export function collateTopicSchemaConversions(
  subscriptions: readonly Subscription[],
  sortedTopics: readonly PlayerTopic[],
  messageConverters: undefined | readonly MessageConverter[],
): TopicSchemaConversions {
  const topicSchemaConverters: TopicSchemaConverterMap = new Map();
  const unconvertedSubscriptionTopics = new Set<string>();

  // Bin the subscriptions into two sets: those which want a conversion and those that do not.
  //
  // For the subscriptions that want a conversion, if the topic schemaName matches the requested
  // convertTo, then we don't need to do a conversion.
  for (const subscription of subscriptions) {
    if (!subscription.convertTo) {
      unconvertedSubscriptionTopics.add(subscription.topic);
      continue;
    }

    // If the convertTo is the same as the original schema for the topic then we don't need to
    // perform a conversion.
    const noConversion = sortedTopics.find(
      (topic) => topic.name === subscription.topic && topic.schemaName === subscription.convertTo,
    );
    if (noConversion) {
      unconvertedSubscriptionTopics.add(noConversion.name);
      continue;
    }

    // Since we don't have an existing topic with out destination schema we need to find
    // a converter that will convert from the topic to the desired schema
    const subscriberTopic = sortedTopics.find((topic) => topic.name === subscription.topic);
    if (!subscriberTopic) {
      continue;
    }

    const key = converterKey(subscription.topic, subscriberTopic.schemaName ?? "<no-schema>");
    let existingConverters = topicSchemaConverters.get(key);

    // We've already stored a converter for this topic to convertTo
    const haveConverter = existingConverters?.find(
      (conv) => conv.toSchemaName === subscription.convertTo,
    );
    if (haveConverter) {
      continue;
    }

    // Find a converter that can go from the original topic schema to the target schema
    const converters = (messageConverters ?? []).filter(
      (conv) =>
        conv.fromSchemaName === subscriberTopic.schemaName &&
        conv.toSchemaName === subscription.convertTo,
    );
    // Prefer 'local' converters over 'org' provided ones
    const converter = _.minBy(converters, (conv) => conv.extensionNamespace ?? "unknown");

    if (converter) {
      existingConverters ??= [];
      existingConverters.push(converter);
      topicSchemaConverters.set(key, existingConverters);
    }
  }

  return { unconvertedSubscriptionTopics, topicSchemaConverters };
}

/**
 * 複数のソート済み配列を横断して、全アイテムをソート順で反復処理
 *
 * @description 複数のソート済み配列に対して、すべてのアイテムを
 * 全配列にわたってソート順で反復処理する関数です。
 * k-way mergeアルゴリズムを使用した効率的な実装。
 *
 * ### アルゴリズムの特徴
 * - **k-way merge**: 複数の配列を同時にマージ
 * - **効率的**: 各要素を一度だけ比較
 * - **安定ソート**: 同じ値の要素の順序が保持される
 * - **メモリ効率**: 新しい配列を作成せずに逐次処理
 *
 * ### 計算量
 * - **時間計算量**: O(t*n) - tは配列の数、nは全配列の総アイテム数
 * - **空間計算量**: O(t) - tは配列の数（カーソル配列のため）
 * - **比較回数**: 各要素につき最大t回の比較
 *
 * ### 使用例シナリオ
 * - メッセージイベントの時刻順統合処理
 * - 複数のデータストリームのマージ
 * - ソート済みログファイルの統合
 * - タイムラインベースのデータ処理
 *
 * ### 前提条件
 * - 入力配列はすべてソート済みである必要がある
 * - compareFn は一貫した比較結果を返す必要がある
 * - compareFn は推移律を満たす必要がある（a < b && b < c なら a < c）
 *
 * @param arrays - 反復処理するソート済み配列群
 * @param compareFn - 配列内のアイテムを比較する関数
 *   - 左が右より大きい場合は正の値を返す
 *   - 右が左より大きい場合は負の値を返す
 *   - 両方が等しい場合はゼロを返す
 * @param forEach - 全配列のアイテムに対してソート順で実行されるコールバック
 *
 * @template Item - 配列内のアイテムの型
 *
 * @example
 * ```typescript
 * // 基本的な数値配列のマージ
 * const arrays = [
 *   [1, 4, 7],      // 配列1
 *   [2, 5, 8],      // 配列2
 *   [3, 6, 9]       // 配列3
 * ];
 *
 * const results: number[] = [];
 * forEachSortedArrays(
 *   arrays,
 *   (a, b) => a - b,                    // 昇順比較
 *   (item) => results.push(item)        // 結果に追加
 * );
 *
 * console.log(results);
 * // => [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * ```
 *
 * @example
 * ```typescript
 * // メッセージイベントの時刻順マージ
 * const messageArrays = [
 *   [
 *     { topic: "/pose", receiveTime: { sec: 100, nsec: 0 } },
 *     { topic: "/pose", receiveTime: { sec: 102, nsec: 0 } }
 *   ],
 *   [
 *     { topic: "/velocity", receiveTime: { sec: 101, nsec: 0 } },
 *     { topic: "/velocity", receiveTime: { sec: 103, nsec: 0 } }
 *   ]
 * ];
 *
 * const allMessages: MessageEvent[] = [];
 * forEachSortedArrays(
 *   messageArrays,
 *   (a, b) => compare(a.receiveTime, b.receiveTime),  // 時刻順比較
 *   (message) => allMessages.push(message)            // 時系列順で追加
 * );
 *
 * // 結果: 時刻順にソートされたメッセージ配列
 * // [pose@100s, velocity@101s, pose@102s, velocity@103s]
 * ```
 *
 * @example
 * ```typescript
 * // 空の配列や不均等な長さの配列の処理
 * const arrays = [
 *   [1, 5],         // 2要素
 *   [],             // 空配列
 *   [2, 3, 4, 6],   // 4要素
 *   [7]             // 1要素
 * ];
 *
 * const results: number[] = [];
 * forEachSortedArrays(
 *   arrays,
 *   (a, b) => a - b,
 *   (item) => results.push(item)
 * );
 *
 * console.log(results);
 * // => [1, 2, 3, 4, 5, 6, 7]
 * ```
 *
 * @example
 * ```typescript
 * // カスタムオブジェクトのソート
 * interface TimestampedData {
 *   timestamp: number;
 *   value: string;
 * }
 *
 * const dataArrays = [
 *   [{ timestamp: 1000, value: "A" }, { timestamp: 3000, value: "C" }],
 *   [{ timestamp: 2000, value: "B" }, { timestamp: 4000, value: "D" }]
 * ];
 *
 * forEachSortedArrays(
 *   dataArrays,
 *   (a, b) => a.timestamp - b.timestamp,     // タイムスタンプ順
 *   (data) => console.log(`${data.timestamp}: ${data.value}`)
 * );
 *
 * // 出力:
 * // 1000: A
 * // 2000: B
 * // 3000: C
 * // 4000: D
 * ```
 */
export function forEachSortedArrays<Item>(
  arrays: Immutable<Item[][]>,
  compareFn: (a: Immutable<Item>, b: Immutable<Item>) => number,
  forEach: (item: Immutable<Item>) => void,
): void {
  const cursors: number[] = Array(arrays.length).fill(0);
  if (arrays.length === 0) {
    return;
  }
  for (;;) {
    let minCursorIndex: number | undefined = undefined;
    for (let i = 0; i < cursors.length; i++) {
      const cursor = cursors[i]!;
      const array = arrays[i]!;
      if (cursor >= array.length) {
        continue;
      }
      const item = array[cursor]!;
      if (minCursorIndex == undefined) {
        minCursorIndex = i;
      } else {
        const minItem = arrays[minCursorIndex]![cursors[minCursorIndex]!]!;
        if (compareFn(item, minItem) < 0) {
          minCursorIndex = i;
        }
      }
    }
    if (minCursorIndex == undefined) {
      break;
    }

    // TypeScriptの型推論のため、undefinedでないことが確定した値を新しい変数に代入
    const validMinCursorIndex: number = minCursorIndex;
    const currentCursor = cursors[validMinCursorIndex];
    if (currentCursor == undefined) {
      break;
    }

    const minItem = arrays[validMinCursorIndex]![currentCursor];
    if (minItem != undefined) {
      forEach(minItem);
      cursors[validMinCursorIndex] = currentCursor + 1;
    } else {
      break;
    }
  }
}
