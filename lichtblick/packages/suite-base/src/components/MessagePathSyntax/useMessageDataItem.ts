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

import { useCallback, useMemo } from "react";

import { useMessageReducer } from "@lichtblick/suite-base/PanelAPI";
import { subscribePayloadFromMessagePath } from "@lichtblick/suite-base/players/subscribePayloadFromMessagePath";
import { MessageEvent, SubscribePayload } from "@lichtblick/suite-base/players/types";

import {
  MessageAndData,
  useCachedGetMessagePathDataItems,
} from "./useCachedGetMessagePathDataItems";

/**
 * useMessageDataItemフックのオプション設定
 */
type Options = {
  /** 保持する履歴サイズ（マッチしたメッセージの数） */
  historySize: number;
};

/**
 * メッセージリデューサーの状態型定義
 *
 * useMessageDataItemフックの内部状態を表現します。
 * マッチしたメッセージの履歴、最新のメッセージイベント、使用されたパスを保持します。
 */
type ReducedValue = {
  /** マッチしたメッセージ（イベント）の配列。最も古いメッセージが最初 */
  matches: MessageAndData[];
  /** addMessagesに受信された最新のメッセージイベントセット */
  messageEvents: readonly Readonly<MessageEvent>[];
  /** これらのメッセージをマッチするために使用されたパス */
  path: string;
};

/**
 * 指定されたメッセージパスにマッチするメッセージのデータ項目を取得するフック
 *
 * 指定されたメッセージパスに対してマッチするメッセージの配列を返します。
 * 配列の最初の項目が最も古いマッチしたメッセージで、最後の項目が最新のものです。
 *
 * 主な特徴：
 * - リアルタイムでメッセージをフィルタリングし、パスにマッチするもののみを保持
 * - 設定可能な履歴サイズによるメモリ効率的な運用
 * - メッセージリデューサーを使用した効率的な状態管理
 * - パスの変更時の自動的な再フィルタリング
 *
 * @param path - マッチング対象のメッセージパス
 * @param options - オプション設定（historySize等）
 * @returns マッチしたメッセージとデータのペア配列（古いものから順）
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const matches = useMessageDataItem("/robot/pose.pose.x");
 * // 最新のマッチしたメッセージのみを取得
 *
 * // 履歴サイズを指定した使用例
 * const matches = useMessageDataItem("/sensors/data[0].value", { historySize: 10 });
 * // 最大10個のマッチしたメッセージを保持
 *
 * // 結果の使用例
 * if (matches.length > 0) {
 *   const latestMatch = matches[matches.length - 1];
 *   console.log("Latest value:", latestMatch.queriedData[0]?.value);
 *   console.log("Message timestamp:", latestMatch.messageEvent.receiveTime);
 * }
 * ```
 */
export function useMessageDataItem(path: string, options?: Options): ReducedValue["matches"] {
  const { historySize = 1 } = options ?? {};

  // メッセージパスからサブスクリプションペイロードを生成
  const topics: SubscribePayload[] = useMemo(() => {
    const payload = subscribePayloadFromMessagePath(path, "partial");
    if (payload) {
      return [payload];
    }
    return [];
  }, [path]);

  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([path]);

  /**
   * 新しいメッセージイベントを処理して状態を更新するコールバック
   *
   * 受信したメッセージイベントの配列を処理し、指定されたパスにマッチするものを
   * 既存の履歴に追加します。パフォーマンス最適化のため、逆順で処理します。
   *
   * @param prevValue - 前の状態値
   * @param messageEvents - 新しく受信したメッセージイベント配列
   * @returns 更新された状態値
   */
  const addMessages = useCallback(
    (prevValue: ReducedValue, messageEvents: Readonly<MessageEvent[]>): ReducedValue => {
      if (messageEvents.length === 0) {
        return prevValue;
      }

      const newMatches: MessageAndData[] = [];

      // デフォルトの履歴サイズが1で、すべてのメッセージを訪問する必要がない可能性があるため、
      // 逆順で反復処理。これは、古いアイテムを最初に保存したいため、newMatchesを反転する必要があることを意味する
      for (let i = messageEvents.length - 1; i >= 0 && newMatches.length < historySize; --i) {
        const messageEvent = messageEvents[i]!;
        const queriedData = cachedGetMessagePathDataItems(path, messageEvent);
        if (queriedData && queriedData.length > 0) {
          newMatches.push({ messageEvent, queriedData });
        }
      }

      // 古いアイテムを配列の最初に配置したい。逆順で反復処理したため、マッチを反転する
      const reversed = newMatches.reverse();
      if (newMatches.length === historySize) {
        return {
          matches: reversed,
          messageEvents,
          path,
        };
      }

      const prevMatches = prevValue.matches;
      return {
        matches: prevMatches.concat(reversed).slice(-historySize),
        messageEvents,
        path,
      };
    },
    [cachedGetMessagePathDataItems, historySize, path],
  );

  /**
   * 状態の復元処理を行うコールバック
   *
   * パスが変更された場合や、データソースが変更された場合に、
   * 前回のメッセージバッチを再フィルタリングして状態を復元します。
   *
   * @param prevValue - 前の状態値（存在しない場合はundefined）
   * @returns 復元された状態値
   */
  const restore = useCallback(
    (prevValue?: ReducedValue): ReducedValue => {
      if (!prevValue) {
        return {
          matches: [],
          messageEvents: [],
          path,
        };
      }

      // 前回のメッセージバッチを再フィルタリング
      const newMatches: MessageAndData[] = [];
      for (const messageEvent of prevValue.messageEvents) {
        const queriedData = cachedGetMessagePathDataItems(path, messageEvent);
        if (queriedData && queriedData.length > 0) {
          newMatches.push({ messageEvent, queriedData });
        }
      }

      // マッチするメッセージがあるか、メッセージの前のセットを取得するために使用された
      // パスとは異なるパスの場合、新しいメッセージセットを返す
      if (newMatches.length > 0 || path !== prevValue.path) {
        return {
          matches: newMatches.slice(-historySize),
          messageEvents: prevValue.messageEvents,
          path,
        };
      }

      return prevValue;
    },
    [cachedGetMessagePathDataItems, historySize, path],
  );

  // メッセージリデューサーを使用して状態を管理
  const reducedValue = useMessageReducer<ReducedValue>({
    topics,
    addMessages,
    restore,
  });

  return reducedValue.matches;
}
