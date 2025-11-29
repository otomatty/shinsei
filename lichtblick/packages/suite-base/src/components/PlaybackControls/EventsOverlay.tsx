// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * EventsOverlay - タイムライン上のイベント表示オーバーレイ
 *
 * @overview
 * スクラブバー上にイベントマーカーを表示するオーバーレイコンポーネント。
 * イベントの時間範囲を視覚的に表現し、ホバーや選択状態を管理。
 *
 * @features
 * - イベントの時間範囲マーカー表示
 * - ホバー状態のビジュアルフィードバック
 * - 選択状態の強調表示
 * - 時間位置に基づく自動配置
 *
 * @architecture
 * - EventsContext との統合
 * - TimelineInteractionStateContext によるインタラクション管理
 * - React.memo による個別イベントの最適化
 * - Material UI テーマ統合
 *
 * @visualBehavior
 * - 通常状態: 半透明の info カラー
 * - ホバー状態: サイズ拡大と境界線表示
 * - 選択状態: 不透明度増加と強調表示
 *
 * @usageExample
 * ```tsx
 * <div style={{ position: 'relative' }}>
 *   <Scrubber />
 *   <EventsOverlay />
 * </div>
 * ```
 */

import { alpha } from "@mui/material";
import * as _ from "lodash-es";
import { makeStyles } from "tss-react/mui";

import {
  EventsStore,
  TimelinePositionedEvent,
  useEvents,
} from "@lichtblick/suite-base/context/EventsContext";
import {
  TimelineInteractionStateStore,
  useTimelineInteractionState,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";

/**
 * EventsOverlay のスタイル定義
 *
 * @returns スタイルクラス
 */
const useStyles = makeStyles()(({ transitions, palette }) => ({
  /**
   * オーバーレイのルートコンテナ
   *
   * @style
   * - 位置: 絶対位置で親要素全体を覆う
   * - ポインターイベント: 無効（下層要素の操作を妨げない）
   * - レイアウト: flex で子要素を配置
   */
  root: {
    inset: 0,
    pointerEvents: "none",
    position: "absolute",
    display: "flex",
    alignItems: "center",
  },
  /**
   * 通常状態のイベントティック
   *
   * @style
   * - 高さ: 6px（コンパクト表示）
   * - 背景: 半透明の info カラー
   * - トランジション: スムーズな高さ変更
   */
  tick: {
    transition: transitions.create("height", { duration: transitions.duration.shortest }),
    backgroundBlendMode: "overlay",
    backgroundColor: alpha(palette.info.main, 0.58),
    position: "absolute",
    height: 6,
  },
  /**
   * ホバー状態のイベントティック
   *
   * @style
   * - 高さ: 12px（拡大表示）
   * - 境界線: info カラーのボーダー
   * - トランジション: スムーズな状態変更
   */
  tickHovered: {
    transition: transitions.create("height", { duration: transitions.duration.shortest }),
    backgroundColor: alpha(palette.info.main, 0.58),
    border: `1px solid ${palette.info.main}`,
    height: 12,
  },
  /**
   * 選択状態のイベントティック
   *
   * @style
   * - 高さ: 12px（拡大表示）
   * - 背景: より不透明な info カラー
   * - トランジション: スムーズな状態変更
   */
  tickSelected: {
    transition: transitions.create("height", {
      duration: transitions.duration.shortest,
    }),
    backgroundColor: alpha(palette.info.main, 0.67),
    height: 12,
  },
}));

// Context セレクター関数群
/** イベント一覧の取得 */
const selectEvents = (store: EventsStore) => store.events;
/** ホバー中のイベントの取得 */
const selectHoveredEvent = (store: TimelineInteractionStateStore) => store.hoveredEvent;
/** ホバー位置のイベント一覧の取得 */
const selectEventsAtHoverValue = (store: TimelineInteractionStateStore) => store.eventsAtHoverValue;
/** 選択中のイベントIDの取得 */
const selectSelectedEventId = (store: EventsStore) => store.selectedEventId;

/**
 * 個別イベントティックコンポーネント
 *
 * @param props - コンポーネントのプロパティ
 * @param props.event - 表示するイベント情報
 * @returns イベントティック要素
 */
function EventTick({ event }: { event: TimelinePositionedEvent }): React.JSX.Element {
  const eventsAtHoverValue = useTimelineInteractionState(selectEventsAtHoverValue);
  const hoveredEvent = useTimelineInteractionState(selectHoveredEvent);
  const selectedEventId = useEvents(selectSelectedEventId);
  const { classes, cx } = useStyles();

  // イベントの時間範囲を percentage で計算
  const left = `calc(${_.clamp(event.startPosition, 0, 1) * 100}% - 1px)`;
  const right = `calc(100% - ${_.clamp(event.endPosition, 0, 1) * 100}% - 1px)`;

  return (
    <div
      className={cx(classes.tick, {
        [classes.tickHovered]: hoveredEvent
          ? event.event.id === hoveredEvent.event.id
          : eventsAtHoverValue[event.event.id] != undefined,
        [classes.tickSelected]: selectedEventId === event.event.id,
      })}
      style={{ left, right }}
    />
  );
}

/**
 * メモ化されたイベントティックコンポーネント
 *
 * @description
 * 個別イベントの再レンダリングを最適化するためのメモ化。
 * イベント情報が変更されない限り再レンダリングを回避。
 */
const MemoEventTick = React.memo(EventTick);

/**
 * EventsOverlay コンポーネント
 *
 * @description
 * タイムライン上の全イベントを表示するオーバーレイ。
 * スクラブバーの上層に配置され、イベントの視覚的表現を提供。
 *
 * @returns イベントオーバーレイコンポーネント
 */
export function EventsOverlay(): React.JSX.Element {
  const events = useEvents(selectEvents);
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      {(events.value ?? []).map((event) => (
        <MemoEventTick key={event.event.id} event={event} />
      ))}
    </div>
  );
}
