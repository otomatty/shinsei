// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext } from "react";
import { AsyncState } from "react-use/lib/useAsyncFn";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { Time } from "@lichtblick/rostime";
import { Immutable } from "@lichtblick/suite";

/**
 * データソースイベント
 *
 * データソース内の単一のイベントを表現します。
 * 時系列データの中で特定の時間範囲に関連付けられたイベントを管理します。
 */
export type DataSourceEvent = {
  /** イベントの一意識別子 */
  id: string;
  /** イベント作成日時（ISO文字列） */
  createdAt: string;
  /** デバイスID */
  deviceId: string;
  /** イベント継続時間（ナノ秒） */
  durationNanos: string;
  /** イベント終了時刻 */
  endTime: Time;
  /** イベント終了時刻（秒） */
  endTimeInSeconds: number;
  /** イベントメタデータ */
  metadata: Record<string, string>;
  /** イベント開始時刻 */
  startTime: Time;
  /** イベント開始時刻（秒） */
  startTimeInSeconds: number;
  /** イベントタイムスタンプ（ナノ秒） */
  timestampNanos: string;
  /** イベント更新日時（ISO文字列） */
  updatedAt: string;
};

/**
 * タイムライン上の位置情報付きイベント
 *
 * タイムライン上での相対位置情報を含むイベントを表現します。
 * 可視化やユーザーインタラクションで使用されます。
 */
export type TimelinePositionedEvent = {
  /** イベントデータ */
  event: DataSourceEvent;

  /** イベントの終了位置（タイムラインに対する0-1の相対値） */
  endPosition: number;

  /** イベントの開始位置（タイムラインに対する0-1の相対値） */
  startPosition: number;

  /** タイムライン開始からの経過時間（秒） */
  secondsSinceStart: number;
};

/**
 * EventsStore - イベント管理のZustandストア
 *
 * アプリケーション全体のイベント状態を管理します。
 * イベントの取得、フィルタリング、選択などの機能を提供します。
 *
 * 主な責任:
 * - イベントデータの取得と管理
 * - イベントフィルタリング
 * - イベント選択状態の管理
 * - デバイス管理
 * - イベントサポート状態の管理
 */
export type EventsStore = Immutable<{
  /** イベント更新をシグナルするために使用されるカウンター */
  eventFetchCount: number;

  /** 現在読み込まれているソースでイベントがサポートされているかどうか */
  eventsSupported: boolean;

  /** このセッションで取得されたイベント */
  events: AsyncState<TimelinePositionedEvent[]>;

  /** 現在のイベントフィルター式 */
  filter: string;

  /** 現在選択されているイベント（存在する場合） */
  selectedEventId: undefined | string;

  /** 新しいイベントを作成する際のアクティブなデバイス */
  deviceId: string | undefined;

  /** APIからイベントを更新する */
  refreshEvents: () => void;

  /** IDでイベントを選択するか、選択をクリアする */
  selectEvent: (id: undefined | string) => void;

  /** 取得したイベントを設定する */
  setEvents: (events: AsyncState<TimelinePositionedEvent[]>) => void;

  /** イベントのサポートを示すフラグを設定する */
  // eslint-disable-next-line @lichtblick/no-boolean-parameters
  setEventsSupported: (supported: boolean) => void;

  /** 現在のフィルター式を更新する */
  setFilter: (filter: string) => void;

  /** アクティブなデバイスを設定する */
  setDeviceId: (deviceId: string | undefined) => void;
}>;

/**
 * EventsContext - イベント管理コンテキスト
 *
 * Zustandストアを使用してイベント状態を管理するコンテキスト
 */
export const EventsContext = createContext<undefined | StoreApi<EventsStore>>(undefined);

/**
 * useEvents - イベントストアから値を取得するカスタムフック
 *
 * @param selector ストアから値を選択するセレクター関数
 * @returns T セレクターが選択した値
 *
 * 使用例:
 * ```typescript
 * // 全イベントを取得
 * const events = useEvents((store) => store.events);
 *
 * // 選択されたイベントIDを取得
 * const selectedEventId = useEvents((store) => store.selectedEventId);
 *
 * // フィルター文字列を取得
 * const filter = useEvents((store) => store.filter);
 *
 * // イベント選択アクションを取得
 * const selectEvent = useEvents((store) => store.selectEvent);
 * const handleEventSelect = (eventId: string) => {
 *   selectEvent(eventId);
 * };
 * ```
 */
export function useEvents<T>(selector: (store: EventsStore) => T): T {
  const context = useGuaranteedContext(EventsContext);
  return useStore(context, selector);
}
