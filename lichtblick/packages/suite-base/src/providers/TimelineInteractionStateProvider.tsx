// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { ReactNode, useState } from "react";
import { createStore, StoreApi } from "zustand";

import { TimelinePositionedEvent } from "@lichtblick/suite-base/context/EventsContext";
import {
  TimelineInteractionStateContext,
  TimelineInteractionStateStore,
  SyncBounds,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { HoverValue } from "@lichtblick/suite-base/types/hoverValue";

/**
 * タイムライン相互作用状態ストアを作成する関数
 *
 * Zustandを使用してタイムラインの相互作用状態を管理するストアを作成します。
 * ホバー値、イベント、グローバル境界の管理機能を提供します。
 *
 * @returns タイムライン相互作用状態管理用のZustandストア
 *
 * @example
 * ```typescript
 * const store = createTimelineInteractionStateStore();
 *
 * // ホバー値を設定
 * store.getState().setHoverValue({
 *   componentId: 'timeline',
 *   type: 'PLAYBACK_SECONDS',
 *   value: 123.456
 * });
 *
 * // イベントをホバー
 * store.getState().setHoveredEvent(event);
 *
 * // グローバル境界を設定
 * store.getState().setGlobalBounds({ min: 0, max: 1000 });
 * ```
 */
function createTimelineInteractionStateStore(): StoreApi<TimelineInteractionStateStore> {
  return createStore((set) => {
    return {
      /** ホバー値位置にあるイベントのマップ（イベントID -> イベント） */
      eventsAtHoverValue: {},
      /** タイムラインのグローバル境界値 */
      globalBounds: undefined,
      /** 現在ホバーされているイベント */
      hoveredEvent: undefined,
      /** 現在のホバー値 */
      hoverValue: undefined,

      /**
       * 指定されたコンポーネントのホバー値をクリア
       * @param componentId - クリアするコンポーネントのID
       */
      clearHoverValue: (componentId: string) => {
        set((store) => ({
          hoverValue: store.hoverValue?.componentId === componentId ? undefined : store.hoverValue,
        }));
      },

      /**
       * ホバー値位置にあるイベントを設定
       * @param eventsAtHoverValue - ホバー値位置のイベント配列
       */
      setEventsAtHoverValue: (eventsAtHoverValue: TimelinePositionedEvent[]) => {
        set({ eventsAtHoverValue: _.keyBy(eventsAtHoverValue, (event) => event.event.id) });
      },

      /**
       * グローバル境界値を設定
       * @param newBounds - 新しい境界値、関数、またはundefined
       */
      setGlobalBounds: (
        newBounds:
          | undefined
          | SyncBounds
          | ((oldValue: undefined | SyncBounds) => undefined | SyncBounds),
      ) => {
        if (typeof newBounds === "function") {
          set((store) => ({ globalBounds: newBounds(store.globalBounds) }));
        } else {
          set({ globalBounds: newBounds });
        }
      },

      /**
       * ホバーされているイベントを設定
       * イベントが設定された場合、自動的にホバー値も更新されます
       * @param hoveredEvent - ホバーするイベント（undefinedでクリア）
       */
      setHoveredEvent: (hoveredEvent: undefined | TimelinePositionedEvent) => {
        if (hoveredEvent) {
          set({
            hoveredEvent,
            hoverValue: {
              componentId: `event_${hoveredEvent.event.id}`,
              type: "PLAYBACK_SECONDS",
              value: hoveredEvent.secondsSinceStart,
            },
          });
        } else {
          set({ hoveredEvent: undefined, hoverValue: undefined });
        }
      },

      /**
       * ホバー値を設定
       * 既存の値と同じ場合は、同じオブジェクト参照を保持してパフォーマンスを最適化
       * @param newValue - 新しいホバー値
       */
      setHoverValue: (newValue: HoverValue) => {
        set((store) => ({
          hoverValue: _.isEqual(newValue, store.hoverValue) ? store.hoverValue : newValue,
        }));
      },
    };
  });
}

/**
 * TimelineInteractionStateProvider
 *
 * タイムラインの相互作用状態を管理するProviderコンポーネントです。
 * ホバー値、イベント選択、グローバル境界などのタイムライン関連の
 * ユーザーインタラクション状態を一元管理します。
 *
 * ## 主な機能
 * - ホバー値の管理（マウスカーソル位置の時間値）
 * - イベントホバー状態の管理
 * - タイムライングローバル境界の管理
 * - ホバー位置にあるイベントの管理
 * - コンポーネント間での状態同期
 *
 * ## 管理される状態
 * - **hoverValue**: 現在のホバー値（時間、位置等）
 * - **hoveredEvent**: ホバーされているイベント
 * - **eventsAtHoverValue**: ホバー位置にあるイベント群
 * - **globalBounds**: タイムラインの表示範囲
 *
 * ## 使用場面
 * - タイムラインコンポーネントでのマウス追跡
 * - イベント表示の同期
 * - 複数パネル間でのタイムライン状態共有
 * - ホバー時の詳細情報表示
 * - タイムライン範囲の同期
 *
 * ## パフォーマンス最適化
 * - lodashによる効率的な等価性チェック
 * - 同じ値の場合はオブジェクト参照を保持
 * - イベントIDによる高速なキー検索
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @returns React.JSX.Element
 *
 * @example
 * ```typescript
 * // アプリケーションでの使用
 * <TimelineInteractionStateProvider>
 *   <Timeline />
 *   <EventPanel />
 *   <TimelineCursor />
 * </TimelineInteractionStateProvider>
 *
 * // 子コンポーネントでの使用
 * const timelineState = useContext(TimelineInteractionStateContext);
 *
 * // ホバー値を設定
 * const handleMouseMove = (timeValue: number) => {
 *   timelineState.getState().setHoverValue({
 *     componentId: 'timeline-main',
 *     type: 'PLAYBACK_SECONDS',
 *     value: timeValue
 *   });
 * };
 *
 * // イベントをホバー
 * const handleEventHover = (event: TimelinePositionedEvent) => {
 *   timelineState.getState().setHoveredEvent(event);
 * };
 *
 * // ホバー値をクリア
 * const handleMouseLeave = () => {
 *   timelineState.getState().clearHoverValue('timeline-main');
 * };
 * ```
 */
export default function TimelineInteractionStateProvider({
  children,
}: {
  children?: ReactNode;
}): React.JSX.Element {
  const [store] = useState(createTimelineInteractionStateStore());

  return (
    <TimelineInteractionStateContext.Provider value={store}>
      {children}
    </TimelineInteractionStateContext.Provider>
  );
}
