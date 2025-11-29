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

import { createContext, useCallback } from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { Immutable } from "@lichtblick/suite";
import { TimelinePositionedEvent } from "@lichtblick/suite-base/context/EventsContext";
import type { HoverValue } from "@lichtblick/suite-base/types/hoverValue";

/**
 * 同期範囲設定
 *
 * 同期されたプロット間で共有されるグローバル範囲を表現します。
 * その範囲を設定したコンポーネントのIDも含まれます。
 */
export type SyncBounds = {
  /** 最小値 */
  min: number;
  /** 最大値 */
  max: number;
  /** この範囲を設定したコンポーネントのID */
  sourceId: string;
  /** ユーザーの直接的な操作によるものかどうか */
  userInteraction: boolean;
};

/**
 * TimelineInteractionStateStore - タイムライン相互作用状態管理
 *
 * このストアは、アプリケーション内でのデータとの動的なユーザー相互作用に
 * 関連する状態を管理します。ホバー時間値やプロットのグローバル範囲などが
 * ここで管理されます。
 *
 * 主な責任:
 * - ホバー状態の管理（時間値、イベント）
 * - 同期プロットのグローバル範囲管理
 * - タイムライン上でのイベント表示管理
 * - コンポーネント間の相互作用調整
 */
export type TimelineInteractionStateStore = Immutable<{
  /** 現在のホバー時間と重複するイベント（存在する場合） */
  eventsAtHoverValue: Record<string, TimelinePositionedEvent>;

  /** 同期プロットの共有時間範囲（存在する場合） */
  globalBounds: undefined | SyncBounds;

  /** ユーザーが直接ホバーしているイベント（存在する場合） */
  hoveredEvent: undefined | TimelinePositionedEvent;

  /** ユーザーがホバーしている時間ポイント */
  hoverValue: undefined | HoverValue;

  /** 現在のホバー値をクリアする */
  clearHoverValue: (componentId: string) => void;

  /** 現在のホバー時間と重複するイベントを設定する */
  setEventsAtHoverValue: (events: TimelinePositionedEvent[]) => void;

  /** 新しいグローバル範囲を設定する */
  setGlobalBounds: (
    newBounds:
      | undefined
      | SyncBounds
      | ((oldValue: undefined | SyncBounds) => undefined | SyncBounds),
  ) => void;

  /** 直接ホバーされているイベントを設定またはクリアする */
  setHoveredEvent: (hoveredEvent: undefined | TimelinePositionedEvent) => void;

  /** 新しいホバー値を設定する */
  setHoverValue: (value: HoverValue) => void;
}>;

/**
 * TimelineInteractionStateContext - タイムライン相互作用状態コンテキスト
 *
 * Zustandストアを使用してタイムライン相互作用状態を管理するコンテキスト
 */
export const TimelineInteractionStateContext = createContext<
  undefined | StoreApi<TimelineInteractionStateStore>
>(undefined);

const selectClearHoverValue = (store: TimelineInteractionStateStore) => store.clearHoverValue;

/**
 * useClearHoverValue - ホバー値クリア関数を取得するカスタムフック
 *
 * @returns ホバー値をクリアする関数
 *
 * 使用例:
 * ```typescript
 * const clearHoverValue = useClearHoverValue();
 * const handleMouseLeave = () => {
 *   clearHoverValue("my-component-id");
 * };
 * ```
 */
export function useClearHoverValue(): TimelineInteractionStateStore["clearHoverValue"] {
  return useTimelineInteractionState(selectClearHoverValue);
}

const selectSetHoverValue = (store: TimelineInteractionStateStore) => {
  return store.setHoverValue;
};

/**
 * useSetHoverValue - ホバー値設定関数を取得するカスタムフック
 *
 * @returns ホバー値を設定する関数
 *
 * 使用例:
 * ```typescript
 * const setHoverValue = useSetHoverValue();
 * const handleMouseMove = (time: number) => {
 *   setHoverValue({
 *     type: "PLAYBACK_SECONDS",
 *     value: time,
 *     componentId: "my-component-id"
 *   });
 * };
 * ```
 */
export function useSetHoverValue(): TimelineInteractionStateStore["setHoverValue"] {
  return useTimelineInteractionState(selectSetHoverValue);
}

const undefinedSelector = () => undefined;

/**
 * useHoverValue - 現在のホバー値を取得するカスタムフック
 *
 * デフォルトでは、このフックは発生元に関係なく最新のホバー値を返します。
 * オプションを使用して、ホバー値の更新がフックに更新された値を返させる
 * タイミングを制御できます。
 *
 * @param opt.componentId このcomponentIdに一致するホバー値からの更新を許可。undefinedの場合、任意のコンポーネントのホバー値が返される
 * @param opt.disableUpdates 発生元に関係なく更新を無効化。設定されている場合、他のオプションが一致を引き起こしてもホバー値で更新されない
 * @param opt.isPlaybackSeconds PLAYBACK_SECONDSのホバー値からの更新を許可
 * @returns HoverValue | undefined 現在のホバー値
 *
 * 使用例:
 * ```typescript
 * // 任意のコンポーネントからのホバー値を取得
 * const hoverValue = useHoverValue();
 *
 * // 特定のコンポーネントからのホバー値のみを取得
 * const myHoverValue = useHoverValue({
 *   componentId: "my-component-id"
 * });
 *
 * // 再生時間ベースのホバー値のみを取得
 * const playbackHoverValue = useHoverValue({
 *   isPlaybackSeconds: true
 * });
 *
 * // 更新を無効化（静的な値として使用）
 * const staticHoverValue = useHoverValue({
 *   disableUpdates: true
 * });
 * ```
 */
export function useHoverValue(opt?: {
  componentId?: string;
  disableUpdates?: boolean;
  isPlaybackSeconds?: boolean;
}): HoverValue | undefined {
  const enabled = opt?.disableUpdates !== true;
  const componentId = opt?.componentId;
  const isPlaybackSeconds = opt?.isPlaybackSeconds ?? false;

  const selector = useCallback(
    (store: TimelineInteractionStateStore) => {
      if (store.hoverValue == undefined) {
        return undefined;
      }
      if (store.hoverValue.type === "PLAYBACK_SECONDS" && isPlaybackSeconds) {
        // タイムスタンプベースのチャートでは常に再生時間のホバー値を表示
        return store.hoverValue;
      }
      // それ以外の場合は、ホバー値を設定したコンポーネントにホバーしている時のみホバーバーを表示
      return componentId == undefined || store.hoverValue.componentId === componentId
        ? store.hoverValue
        : undefined;
    },
    [componentId, isPlaybackSeconds],
  );

  return useTimelineInteractionState(enabled ? selector : undefinedSelector);
}

/**
 * useTimelineInteractionState - タイムライン相互作用状態ストアへのアクセスフック
 *
 * このフックは、相互作用状態ストアへのすべてのアクセスをラップします。
 * セレクターを渡してストアの一部にアクセスしてください。
 *
 * @param selector ストアから値を選択するセレクター関数
 * @returns T セレクターが選択した値
 *
 * 使用例:
 * ```typescript
 * // グローバル範囲を取得
 * const globalBounds = useTimelineInteractionState(
 *   (store) => store.globalBounds
 * );
 *
 * // ホバーされているイベントを取得
 * const hoveredEvent = useTimelineInteractionState(
 *   (store) => store.hoveredEvent
 * );
 *
 * // ホバー時間でのイベントを取得
 * const eventsAtHover = useTimelineInteractionState(
 *   (store) => store.eventsAtHoverValue
 * );
 * ```
 */
export function useTimelineInteractionState<T>(
  selector: (store: TimelineInteractionStateStore) => T,
): T {
  const context = useGuaranteedContext(TimelineInteractionStateContext);
  return useStore(context, selector);
}
