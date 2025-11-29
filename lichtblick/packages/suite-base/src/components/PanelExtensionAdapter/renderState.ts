// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import memoizeWeak from "memoize-weak";
import { Writable } from "ts-essentials";

import { filterMap } from "@lichtblick/den/collection";
import { compare, toSec } from "@lichtblick/rostime";
import {
  AppSettingValue,
  Immutable,
  MessageEvent,
  ParameterValue,
  RegisterMessageConverterArgs,
  RenderState,
  Subscription,
  Topic,
} from "@lichtblick/suite";
import {
  EMPTY_GLOBAL_VARIABLES,
  GlobalVariables,
} from "@lichtblick/suite-base/hooks/useGlobalVariables";
import {
  MessageBlock,
  PlayerState,
  Topic as PlayerTopic,
} from "@lichtblick/suite-base/players/types";
import { HoverValue } from "@lichtblick/suite-base/types/hoverValue";

import {
  collateTopicSchemaConversions,
  convertMessage,
  forEachSortedArrays,
  mapDifference,
  TopicSchemaConversions,
} from "./messageProcessing";

/**
 * 空のパラメーターマップ
 *
 * @description パラメーターが利用できない場合のデフォルト値として使用される空のマップ。
 *
 * @constant
 */
const EmptyParameters = new Map<string, ParameterValue>();

/**
 * レンダリング状態設定
 *
 * @description パネルのレンダリング状態を構築するために必要な設定情報。
 * 現在はトピック固有の設定のみを含んでいますが、
 * 将来的には他の設定項目も追加される可能性があります。
 */
export type RenderStateConfig = {
  /**
   * トピック設定
   *
   * @description 各トピックに対する設定情報のマップ。
   * キーはトピック名、値は任意の設定オブジェクトです。
   */
  topics: Record<string, unknown>;
};

/**
 * レンダリング状態ビルダーの入力パラメーター
 *
 * @description buildRenderState関数が受け取るすべての入力パラメーターを定義します。
 * これらのパラメーターはレンダリング状態を構築するために必要な情報を含んでいます。
 */
export type BuilderRenderStateInput = Immutable<{
  /**
   * アプリケーション設定
   *
   * @description ユーザーが設定したアプリケーション全体の設定値。
   * undefinedの場合、設定が利用できないことを示します。
   */
  appSettings: Map<string, AppSettingValue> | undefined;

  /**
   * カラースキーム
   *
   * @description 現在のテーマ（ライト/ダーク）。
   * undefinedの場合、デフォルトのカラースキームが使用されます。
   */
  colorScheme: RenderState["colorScheme"] | undefined;

  /**
   * 現在のフレームメッセージ
   *
   * @description 現在のフレームで受信したメッセージイベントの配列。
   * undefinedの場合、新しいメッセージがないことを示します。
   */
  currentFrame: MessageEvent[] | undefined;

  /**
   * グローバル変数
   *
   * @description システム全体で利用可能な変数の値。
   * パネル間で共有される状態情報を含みます。
   */
  globalVariables: GlobalVariables;

  /**
   * ホバー値
   *
   * @description ユーザーがタイムラインなどでホバーしている時刻の情報。
   * undefinedの場合、ホバー操作が行われていないことを示します。
   */
  hoverValue: HoverValue | undefined;

  /**
   * メッセージコンバーター
   *
   * @description メッセージを別のスキーマに変換するためのコンバーター群。
   * 省略可能で、変換が不要な場合は提供されません。
   */
  messageConverters?: readonly RegisterMessageConverterArgs<unknown>[];

  /**
   * プレイヤー状態
   *
   * @description 現在のプレイヤー（データソース）の状態。
   * undefinedの場合、プレイヤーが利用できないことを示します。
   */
  playerState: PlayerState | undefined;

  /**
   * 共有パネル状態
   *
   * @description 同じタイプのパネル間で共有される状態情報。
   * undefinedの場合、共有状態が利用できないことを示します。
   */
  sharedPanelState: Record<string, unknown> | undefined;

  /**
   * ソート済みトピック一覧
   *
   * @description 利用可能なトピックのソート済みリスト。
   * メッセージ変換やフィルタリングに使用されます。
   */
  sortedTopics: readonly PlayerTopic[];
  sortedServices?: readonly string[];

  /**
   * 購読情報
   *
   * @description パネルが購読しているトピックとその設定の配列。
   */
  subscriptions: Subscription[];

  /**
   * 監視対象フィールド
   *
   * @description パネルが監視しているRenderStateのフィールド名のセット。
   * パフォーマンス最適化のため、変更が必要なフィールドのみが処理されます。
   */
  watchedFields: Set<string>;

  /**
   * 設定オブジェクト
   *
   * @description パネル固有の設定情報。
   * undefinedの場合、設定が利用できないことを示します。
   */
  config?: RenderStateConfig | undefined;
}>;

/**
 * レンダリング状態構築関数の型定義
 *
 * @description 入力パラメーターから新しいRenderStateを構築する関数の型。
 *
 * @param input - レンダリング状態構築に必要な入力パラメーター
 * @returns 新しいRenderState、または更新が不要な場合はundefined
 */
type BuildRenderStateFn = (input: BuilderRenderStateInput) => Immutable<RenderState> | undefined;

/**
 * レンダリング状態ビルダーを初期化
 *
 * @description レンダリング状態の入力を新しいRenderStateに変換する関数を作成します。
 * この関数は以前の入力を追跡し、既存のレンダリング状態のどの部分を更新するか、
 * または更新があるかどうかを決定します。
 *
 * ### 主要な機能
 * - **差分検出**: 前回の状態と比較して変更されたフィールドのみを更新
 * - **メモ化**: パフォーマンス向上のため、重い計算結果をキャッシュ
 * - **最適化**: 不要な更新を防ぎ、レンダリングパフォーマンスを向上
 *
 * ### 処理の流れ
 * 1. 入力パラメーターを前回の値と比較
 * 2. 変更されたフィールドのみを更新
 * 3. メッセージ変換処理を実行
 * 4. 新しいRenderStateを返すか、変更がない場合はundefinedを返す
 *
 * @returns レンダリング状態構築関数
 *
 * @example
 * ```typescript
 * const buildRenderState = initRenderStateBuilder();
 *
 * // 入力パラメーターを使用してレンダリング状態を構築
 * const renderState = buildRenderState({
 *   appSettings: new Map([["theme", "dark"]]),
 *   colorScheme: "dark",
 *   currentFrame: messages,
 *   globalVariables: { robotName: "robot1" },
 *   // ... その他のパラメーター
 * });
 *
 * if (renderState) {
 *   // レンダリング状態が更新された場合の処理
 *   panel.render(renderState);
 * }
 * ```
 */
function initRenderStateBuilder(): BuildRenderStateFn {
  let prevVariables: Immutable<GlobalVariables> = EMPTY_GLOBAL_VARIABLES;
  let prevBlocks: undefined | Immutable<(undefined | MessageBlock)[]>;
  let prevSeekTime: number | undefined;
  let prevSortedTopics: BuilderRenderStateInput["sortedTopics"] | undefined;
  let prevMessageConverters: BuilderRenderStateInput["messageConverters"] | undefined;
  let prevSharedPanelState: BuilderRenderStateInput["sharedPanelState"];
  let prevCurrentFrame: Immutable<RenderState["currentFrame"]>;
  let prevCollatedConversions: undefined | TopicSchemaConversions;
  const lastMessageByTopic = new Map<string, MessageEvent>();

  // Pull these memoized versions into the closure so they are scoped to the lifetime of
  // the panel.
  const memoMapDifference = memoizeWeak(mapDifference);
  const memoCollateTopicSchemaConversions = memoizeWeak(collateTopicSchemaConversions);

  const prevRenderState: Writable<Immutable<RenderState>> = {};

  /**
   * レンダリング状態のフィールドを更新
   *
   * @description 指定されたフィールドの値が変更されている場合、
   * レンダリング状態を更新し、shouldRenderフラグを設定します。
   *
   * @param field - 更新するRenderStateのフィールド名
   * @param newValue - 新しい値
   * @param prevValue - 前回の値
   * @param shouldRender - レンダリングが必要かどうかを示すオブジェクト
   */
  function updateRenderStateField<T>(
    field: keyof RenderState,
    newValue: T,
    prevValue: T,
    shouldRender: { value: boolean },
  ): void {
    if (newValue !== prevValue) {
      (prevRenderState[field] as T) = newValue;
      shouldRender.value = true;
    }
  }

  /**
   * レンダリング状態構築関数
   *
   * @description 入力パラメーターから新しいRenderStateを構築します。
   * 変更されたフィールドのみを更新し、パフォーマンスを最適化します。
   *
   * @param input - 構築に必要な入力パラメーター
   * @returns 新しいRenderState、または更新が不要な場合はundefined
   */
  return function buildRenderState(input: BuilderRenderStateInput) {
    const {
      appSettings,
      colorScheme,
      currentFrame,
      globalVariables,
      hoverValue,
      messageConverters,
      playerState,
      sharedPanelState,
      sortedTopics,
      sortedServices,
      subscriptions,
      watchedFields,
      config,
    } = input;

    const configTopics = config?.topics ?? {};

    const topicToSchemaNameMap = _.mapValues(
      _.keyBy(sortedTopics, "name"),
      ({ schemaName }) => schemaName,
    );

    // Should render indicates whether any fields of render state are updated
    const shouldRender = { value: false };

    // Hoisted active data to shorten some of the code below that repeatedly uses active data
    const activeData = playerState?.activeData;

    // The render state starts with the previous render state and changes are applied as detected
    const renderState = prevRenderState;

    const collatedConversions = memoCollateTopicSchemaConversions(
      subscriptions,
      sortedTopics,
      messageConverters,
    );
    const { unconvertedSubscriptionTopics, topicSchemaConverters } = collatedConversions;
    const conversionsChanged = prevCollatedConversions !== collatedConversions;
    const newConverters = memoMapDifference(
      topicSchemaConverters,
      prevCollatedConversions?.topicSchemaConverters,
    );

    if (prevSeekTime !== activeData?.lastSeekTime) {
      lastMessageByTopic.clear();
    }

    if (watchedFields.has("didSeek")) {
      updateRenderStateField(
        "didSeek",
        prevSeekTime !== activeData?.lastSeekTime,
        renderState.didSeek,
        shouldRender,
      );
      prevSeekTime = activeData?.lastSeekTime;
    }

    if (watchedFields.has("parameters")) {
      updateRenderStateField(
        "parameters",
        activeData?.parameters ?? EmptyParameters,
        renderState.parameters,
        shouldRender,
      );
    }

    if (watchedFields.has("sharedPanelState")) {
      updateRenderStateField(
        "sharedPanelState",
        sharedPanelState,
        prevSharedPanelState,
        shouldRender,
      );
    }

    if (watchedFields.has("variables")) {
      if (globalVariables !== prevVariables) {
        shouldRender.value = true;
        prevVariables = globalVariables;
        renderState.variables = new Map(Object.entries(globalVariables));
      }
    }

    if (watchedFields.has("topics")) {
      if (sortedTopics !== prevSortedTopics || prevMessageConverters !== messageConverters) {
        shouldRender.value = true;

        const topics = sortedTopics.map((topic): Topic => {
          const newTopic: Topic = {
            name: topic.name,
            schemaName: topic.schemaName ?? "",
          };

          if (messageConverters) {
            const convertibleTo: string[] = [];

            // find any converters that can convert _from_ the schema name of the topic
            // the _to_ names of the converter become additional schema names for the topic entry
            for (const converter of messageConverters) {
              if (converter.fromSchemaName === topic.schemaName) {
                if (!convertibleTo.includes(converter.toSchemaName)) {
                  convertibleTo.push(converter.toSchemaName);
                }
              }
            }

            if (convertibleTo.length > 0) {
              newTopic.convertibleTo = convertibleTo;
            }
          }

          return newTopic;
        });

        renderState.topics = topics;
        prevSortedTopics = sortedTopics;
      }
    }

    if (watchedFields.has("services")) {
      updateRenderStateField("services", sortedServices ?? [], renderState.services, shouldRender);
    }

    if (watchedFields.has("currentFrame")) {
      if (currentFrame && currentFrame !== prevCurrentFrame) {
        // If we have a new frame, emit that frame and process all messages on that frame.
        // Unconverted messages are only processed on a new frame.
        const postProcessedFrame: MessageEvent[] = [];
        for (const messageEvent of currentFrame) {
          if (unconvertedSubscriptionTopics.has(messageEvent.topic)) {
            postProcessedFrame.push(messageEvent);
          }

          const schemaName = topicToSchemaNameMap[messageEvent.topic];
          if (schemaName) {
            convertMessage(
              { ...messageEvent, topicConfig: configTopics[messageEvent.topic] },
              topicSchemaConverters,
              postProcessedFrame,
            );
          }
          lastMessageByTopic.set(messageEvent.topic, messageEvent);
        }
        renderState.currentFrame = postProcessedFrame;
        shouldRender.value = true;
      } else if (conversionsChanged) {
        // If we don't have a new frame but our conversions have changed, run
        // only the new conversions on our most recent message on each topic.
        const postProcessedFrame: MessageEvent[] = [];
        for (const messageEvent of lastMessageByTopic.values()) {
          const schemaName = topicToSchemaNameMap[messageEvent.topic];
          if (schemaName) {
            convertMessage(
              { ...messageEvent, topicConfig: configTopics[messageEvent.topic] },
              newConverters,
              postProcessedFrame,
            );
          }
        }
        renderState.currentFrame = postProcessedFrame;
        shouldRender.value = true;
      } else if (currentFrame !== prevCurrentFrame) {
        // Otherwise if we're replacing a non-empty frame with an empty frame and
        // conversions haven't changed, include the empty frame in the new render state.
        renderState.currentFrame = currentFrame;
        shouldRender.value = true;
      }

      prevCurrentFrame = currentFrame;
    }

    if (watchedFields.has("allFrames")) {
      // Rebuild allFrames if we have new blocks or if our conversions have changed.
      const newBlocks = playerState?.progress.messageCache?.blocks;
      if ((newBlocks != undefined && prevBlocks !== newBlocks) || conversionsChanged) {
        shouldRender.value = true;
        const blocksToProcess = newBlocks ?? prevBlocks ?? [];
        const frames: MessageEvent[] = (renderState.allFrames = []);
        // only populate allFrames with topics that the panel wants to preload
        const topicsToPreloadForPanel = Array.from(
          new Set<string>(
            filterMap(subscriptions, (sub) => (sub.preload === true ? sub.topic : undefined)),
          ),
        );

        for (const block of blocksToProcess) {
          if (!block) {
            continue;
          }

          // Given that messagesByTopic should be in order by receiveTime, we need to
          // combine all of the messages into a single array and sorted by receive time.
          forEachSortedArrays(
            topicsToPreloadForPanel.map((topic) => block.messagesByTopic[topic] ?? []),
            (a, b) => compare(a.receiveTime, b.receiveTime),
            (messageEvent) => {
              // Message blocks may contain topics that we are not subscribed to so we
              // need to filter those out. We use unconvertedSubscriptionTopics to
              // determine if we should include the message event. Clients expect
              // allFrames to be a complete set of messages for all subscribed topics so
              // we include all unconverted and converted messages, unlike in
              // currentFrame.
              if (unconvertedSubscriptionTopics.has(messageEvent.topic)) {
                frames.push(messageEvent);
              }

              const schemaName = topicToSchemaNameMap[messageEvent.topic];
              if (schemaName) {
                convertMessage(
                  { ...messageEvent, topicConfig: configTopics[messageEvent.topic] },
                  topicSchemaConverters,
                  frames,
                );
              }
            },
          );
        }
      }
      prevBlocks = newBlocks;
    }

    if (watchedFields.has("currentTime")) {
      updateRenderStateField(
        "currentTime",
        activeData?.currentTime,
        renderState.currentTime,
        shouldRender,
      );
    }

    if (watchedFields.has("startTime")) {
      updateRenderStateField(
        "startTime",
        activeData?.startTime,
        renderState.startTime,
        shouldRender,
      );
    }

    if (watchedFields.has("endTime")) {
      updateRenderStateField("endTime", activeData?.endTime, renderState.endTime, shouldRender);
    }

    if (watchedFields.has("previewTime")) {
      const startTime = activeData?.startTime;
      const newPreviewTime =
        startTime != undefined && hoverValue != undefined
          ? toSec(startTime) + hoverValue.value
          : undefined;
      updateRenderStateField("previewTime", newPreviewTime, renderState.previewTime, shouldRender);
    }

    if (watchedFields.has("colorScheme")) {
      updateRenderStateField("colorScheme", colorScheme, renderState.colorScheme, shouldRender);
    }

    if (watchedFields.has("appSettings")) {
      updateRenderStateField("appSettings", appSettings, renderState.appSettings, shouldRender);
    }

    // Update the prev fields with the latest values at the end of all the watch steps
    // Several of the watch steps depend on the comparison against prev and new values
    prevMessageConverters = messageConverters;
    prevCollatedConversions = collatedConversions;

    if (!shouldRender.value) {
      return undefined;
    }

    return renderState;
  };
}

export { initRenderStateBuilder };
