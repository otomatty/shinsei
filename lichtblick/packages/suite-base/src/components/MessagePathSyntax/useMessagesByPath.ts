// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useMemo } from "react";

import { filterMap } from "@lichtblick/den/collection";
import { useShallowMemo } from "@lichtblick/hooks";
import * as PanelAPI from "@lichtblick/suite-base/PanelAPI";
import {
  MessageDataItemsByPath,
  useDecodeMessagePathsForMessagesByTopic,
} from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { subscribePayloadFromMessagePath } from "@lichtblick/suite-base/players/subscribePayloadFromMessagePath";

/**
 * メッセージパスセットに基づいてメッセージをサブスクライブし、デコードされたデータを取得するフック
 *
 * 指定されたメッセージパスのセットに対して、適切なトピックをサブスクライブし、
 * 各パスに対してクエリされたデータがデコードされたメッセージを返します。
 *
 * 主な機能：
 * - 複数のメッセージパスの同時処理
 * - 自動的なトピックサブスクリプション管理
 * - 設定可能な履歴サイズによるメモリ効率化
 * - パスごとのデータ項目の自動デコード
 * - メモ化による最適化
 *
 * @param paths - 処理するメッセージパスの配列
 * @param historySize - 各トピックで保持するメッセージの履歴サイズ（デフォルト: Infinity）
 * @returns パスごとのメッセージデータ項目のマッピング
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const paths = [
 *   "/robot/pose.pose.x",
 *   "/robot/pose.pose.y",
 *   "/sensors/data[0].value"
 * ];
 * const messagesByPath = useMessagesByPath(paths);
 *
 * // 特定のパスのデータを取得
 * const poseXData = messagesByPath["/robot/pose.pose.x"];
 * if (poseXData && poseXData.length > 0) {
 *   const latestMessage = poseXData[poseXData.length - 1];
 *   console.log("Latest X position:", latestMessage.queriedData[0]?.value);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 履歴サイズを制限した使用例
 * const paths = ["/high_frequency_topic.data"];
 * const messagesByPath = useMessagesByPath(paths, 100); // 最大100メッセージを保持
 *
 * // 時系列データの処理
 * const timeSeriesData = messagesByPath["/high_frequency_topic.data"]?.map(item => ({
 *   timestamp: item.messageEvent.receiveTime,
 *   value: item.queriedData[0]?.value
 * }));
 * ```
 *
 * @example
 * ```typescript
 * // 複雑なメッセージパスの使用例
 * const paths = [
 *   "/robot/sensors[:]{id==1}.temperature",
 *   "/robot/sensors[:]{id==2}.humidity",
 *   "/robot/status.battery_level"
 * ];
 * const messagesByPath = useMessagesByPath(paths, 50);
 *
 * // 各センサーデータの処理
 * const temperature = messagesByPath["/robot/sensors[:]{id==1}.temperature"];
 * const humidity = messagesByPath["/robot/sensors[:]{id==2}.humidity"];
 * const battery = messagesByPath["/robot/status.battery_level"];
 * ```
 */
export default function useMessagesByPath(
  paths: string[],
  historySize: number = Infinity,
): MessageDataItemsByPath {
  const memoizedPaths: string[] = useShallowMemo(paths);

  // メッセージパスからサブスクリプションペイロードを生成
  const subscribeTopics = useMemo(
    () => filterMap(memoizedPaths, (path) => subscribePayloadFromMessagePath(path)),
    [memoizedPaths],
  );

  // 必要なトピックのメッセージを取得
  const messagesByTopic = PanelAPI.useMessagesByTopic({
    topics: subscribeTopics,
    historySize,
  });

  // メッセージパスのデコード関数を取得
  const decodeMessagePathsForMessagesByTopic =
    useDecodeMessagePathsForMessagesByTopic(memoizedPaths);

  // トピック別メッセージをパス別データ項目にデコード
  return useMemo(
    () => decodeMessagePathsForMessagesByTopic(messagesByTopic),
    [decodeMessagePathsForMessagesByTopic, messagesByTopic],
  );
}
