// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ReactNode, useState } from "react";
import { AsyncState } from "react-use/lib/useAsyncFn";
import { createStore } from "zustand";

import {
  EventsContext,
  EventsStore,
  TimelinePositionedEvent,
} from "@lichtblick/suite-base/context/EventsContext";

/** イベントが存在しない場合のデフォルト値 */
const NO_EVENTS: TimelinePositionedEvent[] = [];

/**
 * イベントストアを作成する関数
 *
 * Zustandを使用してタイムラインイベントの状態管理を行うストアを作成します。
 * イベントの取得、フィルタリング、選択、デバイス管理の機能を提供します。
 *
 * @returns Zustandストア（EventsStore型）
 *
 * @example
 * ```typescript
 * const store = createEventsStore();
 * // イベントを更新
 * store.getState().refreshEvents();
 * // フィルタを設定
 * store.getState().setFilter('error');
 * // イベントを選択
 * store.getState().selectEvent('event-123');
 * ```
 */
function createEventsStore() {
  return createStore<EventsStore>((set) => ({
    /** イベント取得の実行回数カウンター */
    eventFetchCount: 0,
    /** イベントの非同期状態（ローディング状態とデータ） */
    events: { loading: false, value: NO_EVENTS },
    /** イベントフィルタリング用の文字列 */
    filter: "",
    /** 現在選択されているイベントのID */
    selectedEventId: undefined,
    /** イベント機能がサポートされているかのフラグ */
    eventsSupported: false,
    /** 関連するデバイスのID */
    deviceId: undefined,

    /**
     * イベントを再取得する
     * フェッチカウンターをインクリメントしてイベントの再取得をトリガーします
     */
    refreshEvents: () => {
      set((old) => ({ eventFetchCount: old.eventFetchCount + 1 }));
    },
    /**
     * イベントを選択する
     * @param id - 選択するイベントのID（undefinedで選択解除）
     */
    selectEvent: (id: undefined | string) => {
      set({ selectedEventId: id });
    },
    /**
     * イベントデータを設定する
     * @param events - 非同期状態のイベントデータ
     */
    setEvents: (events: AsyncState<TimelinePositionedEvent[]>) => {
      set({ events, selectedEventId: undefined });
    },
    /**
     * イベントフィルタを設定する
     * @param filter - フィルタリング文字列
     */
    setFilter: (filter: string) => {
      set({ filter });
    },
    /**
     * イベントサポート状態を設定する
     * @param eventsSupported - イベント機能がサポートされているか
     */
    // eslint-disable-next-line @lichtblick/no-boolean-parameters
    setEventsSupported: (eventsSupported: boolean) => {
      set({ eventsSupported });
    },
    /**
     * デバイスIDを設定する
     * @param deviceId - デバイスの識別子
     */
    setDeviceId: (deviceId: string | undefined) => {
      set({ deviceId });
    },
  }));
}

/**
 * EventsProvider
 *
 * タイムラインイベントの管理を行うProviderコンポーネントです。
 * Zustandストアを使用してイベントの状態を管理し、子コンポーネントに
 * イベントの取得・フィルタリング・選択機能を提供します。
 *
 * ## 主な機能
 * - タイムラインイベントの状態管理
 * - イベントの非同期取得とローディング状態管理
 * - イベントフィルタリング機能
 * - 個別イベントの選択・選択解除
 * - デバイス固有のイベント管理
 * - イベント機能のサポート状態管理
 *
 * ## 使用場面
 * - タイムラインビューでのイベント表示
 * - イベントログの管理
 * - デバッグ用のイベント追跡
 * - ユーザーインタラクションの記録
 * - システムイベントの監視
 *
 * ## 状態管理
 * - `eventFetchCount`: イベント再取得のトリガー
 * - `events`: イベントデータと読み込み状態
 * - `filter`: イベントフィルタリング条件
 * - `selectedEventId`: 選択中のイベント
 * - `eventsSupported`: イベント機能の利用可否
 * - `deviceId`: 関連デバイスの識別子
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @returns React.JSX.Element
 *
 * @example
 * ```typescript
 * // アプリケーションでの使用
 * <EventsProvider>
 *   <TimelineView />
 *   <EventLog />
 * </EventsProvider>
 *
 * // 子コンポーネントでの使用
 * const eventsStore = useContext(EventsContext);
 * const events = eventsStore.getState().events;
 * const refreshEvents = eventsStore.getState().refreshEvents;
 *
 * // イベントを取得
 * useEffect(() => {
 *   refreshEvents();
 * }, []);
 * ```
 */
export default function EventsProvider({ children }: { children?: ReactNode }): React.JSX.Element {
  const [store] = useState(createEventsStore);

  return <EventsContext.Provider value={store}>{children}</EventsContext.Provider>;
}
