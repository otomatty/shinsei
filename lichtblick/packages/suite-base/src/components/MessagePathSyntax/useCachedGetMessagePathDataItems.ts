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

import * as _ from "lodash-es";
import { useCallback, useMemo } from "react";

import { filterMap } from "@lichtblick/den/collection";
import { useDeepMemo, useShallowMemo } from "@lichtblick/hooks";
import {
  quoteTopicNameIfNeeded,
  parseMessagePath,
  MessagePathStructureItem,
  MessagePathStructureItemMessage,
  MessagePath,
} from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import * as PanelAPI from "@lichtblick/suite-base/PanelAPI";
import useGlobalVariables, {
  GlobalVariables,
} from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { MessageEvent, Topic } from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import {
  enumValuesByDatatypeAndField,
  extractTypeFromStudioEnumAnnotation,
} from "@lichtblick/suite-base/util/enums";

import { filterMatches } from "./filterMatches";
import { TypicalFilterNames } from "./isTypicalFilterName";
import { messagePathStructures } from "./messagePathsForDatatype";

/**
 * ROSデータ型マップから値の型を抽出するユーティリティ型
 */
type ValueInMapRecord<T> = T extends Map<unknown, infer I> ? I : never;

/**
 * メッセージパスから抽出されたデータ項目の型定義
 *
 * メッセージパスクエリの結果として返される個別のデータ項目を表現します。
 * 値、パス、定数名（該当する場合）の情報を含みます。
 */
export type MessagePathDataItem = {
  /** 実際の値 */
  value: unknown;
  /** この値にアクセスするためのパス。可能な限り `[:]{some_id==123}` のような「わかりやすいID」を使用 */
  path: string;
  /** 値が一致する定数の名前（該当する場合） */
  constantName?: string;
};

/**
 * メッセージパスのキャッシュされたデータ項目取得フック
 *
 * 指定されたメッセージパスのセットに対して、単一のパスとメッセージを
 * `MessagePathDataItem`オブジェクトの配列に解決する関数を返します。
 *
 * 主な特徴：
 * - パフォーマンス最適化のため、結果をキャッシュ
 * - トピック/データ型/グローバル変数が変更されない限り、配列とオブジェクトは参照で同じ
 * - 関連するトピックとデータ型のみを処理対象として絞り込み
 * - グローバル変数の解決と埋め込み
 *
 * @param paths - キャッシュするメッセージパスの配列
 * @returns パスと メッセージを受け取り、MessagePathDataItem配列を返す関数
 *
 * @example
 * ```typescript
 * const paths = ["/robot/pose.pose.x", "/sensors/data[0].value"];
 * const getDataItems = useCachedGetMessagePathDataItems(paths);
 *
 * // 使用時
 * const message = { topic: "/robot/pose", message: { pose: { x: 10.5 } } };
 * const dataItems = getDataItems("/robot/pose.pose.x", message);
 * // [{ value: 10.5, path: "/robot/pose.pose.x", constantName: undefined }]
 * ```
 */
export function useCachedGetMessagePathDataItems(
  paths: readonly string[],
): (path: string, message: MessageEvent) => MessagePathDataItem[] | undefined {
  const { topics: providerTopics, datatypes } = PanelAPI.useDataSourceInfo();
  const { globalVariables } = useGlobalVariables();
  const memoizedPaths = useShallowMemo(paths);

  // メッセージパスの解析とキャッシュ
  const parsedPaths = useMemo(() => {
    return filterMap(memoizedPaths, (path) => {
      const rosPath = parseMessagePath(path);
      return rosPath ? ([path, rosPath] satisfies [string, MessagePath]) : undefined;
    });
  }, [memoizedPaths]);

  // グローバル変数をパスに埋め込み、後でグローバル変数が変更されたときに
  // どのパスが実際に変更されたかを確認できるようにする
  const unmemoizedFilledInPaths = useMemo(() => {
    const filledInPaths: Record<string, MessagePath> = {};
    for (const [path, parsedPath] of parsedPaths) {
      filledInPaths[path] = fillInGlobalVariablesInPath(parsedPath, globalVariables);
    }
    return filledInPaths;
  }, [globalVariables, parsedPaths]);
  const memoizedFilledInPaths = useDeepMemo(unmemoizedFilledInPaths);

  const topicsByName = useMemo(() => _.keyBy(providerTopics, ({ name }) => name), [providerTopics]);

  // 要求されたパスを処理するために必要なトピックとデータ型のみにフィルタリング
  // これにより、結果は関連するトピックのみに依存するようになる
  const unmemoizedRelevantTopics = useMemo(() => {
    const seenNames = new Set<string>();
    const result: Topic[] = [];
    for (const [, parsedPath] of parsedPaths) {
      if (seenNames.has(parsedPath.topicName)) {
        continue;
      }
      seenNames.add(parsedPath.topicName);
      const topic = topicsByName[parsedPath.topicName];
      if (topic) {
        result.push(topic);
      }
    }
    return result;
  }, [topicsByName, parsedPaths]);
  const relevantTopics = useDeepMemo(unmemoizedRelevantTopics);

  // 関連するデータ型の再帰的な収集
  const unmemoizedRelevantDatatypes = useMemo(() => {
    const relevantDatatypes = new Map<string, Immutable<ValueInMapRecord<RosDatatypes>>>();

    /**
     * 指定されたデータ型とその依存関係を再帰的に追加
     * @param datatypeName - 追加するデータ型名
     * @param seen - 循環参照を避けるための既に処理済みの型名
     */
    function addRelevantDatatype(datatypeName: string, seen: string[]) {
      if (seen.includes(datatypeName)) {
        return;
      }

      const type = datatypes.get(datatypeName);
      if (type) {
        relevantDatatypes.set(datatypeName, type);
        for (const field of type.definitions) {
          if (
            field.isComplex === true ||
            extractTypeFromStudioEnumAnnotation(field.name) != undefined
          ) {
            addRelevantDatatype(field.type, [...seen, datatypeName]);
          }
        }
      }
    }

    for (const { schemaName } of relevantTopics.values()) {
      if (schemaName != undefined) {
        addRelevantDatatype(schemaName, []);
      }
    }
    return relevantDatatypes;
  }, [datatypes, relevantTopics]);
  const relevantDatatypes = useDeepMemo(unmemoizedRelevantDatatypes);

  // メッセージパス構造の生成
  const structures = useMemo(() => messagePathStructures(relevantDatatypes), [relevantDatatypes]);

  // 列挙値のマッピング
  const enumValues = useMemo(
    () => enumValuesByDatatypeAndField(relevantDatatypes),
    [relevantDatatypes],
  );

  return useCallback(
    (path: string, message: MessageEvent): MessagePathDataItem[] | undefined => {
      if (!memoizedPaths.includes(path)) {
        throw new Error(`path (${path}) was not in the list of cached paths`);
      }
      const filledInPath = memoizedFilledInPaths[path];
      if (!filledInPath) {
        return;
      }
      const messagePathDataItems = getMessagePathDataItems(
        message,
        filledInPath,
        topicsByName,
        structures,
        enumValues,
      );
      return messagePathDataItems;
    },
    [memoizedPaths, memoizedFilledInPaths, topicsByName, structures, enumValues],
  );
}

/**
 * メッセージパス内のグローバル変数を実際の値で埋め込む関数
 *
 * メッセージパスに含まれるグローバル変数参照を、現在のグローバル変数の値で置き換えます。
 * スライスのstart/endやフィルタの値に含まれる変数参照を処理します。
 *
 * @param rosPath - グローバル変数を含む可能性のあるメッセージパス
 * @param globalVariables - 現在のグローバル変数の値
 * @returns グローバル変数が解決されたメッセージパス
 *
 * @example
 * ```typescript
 * const path = {
 *   messagePath: [
 *     { type: "slice", start: { variableName: "startIdx" }, end: 10 },
 *     { type: "filter", value: { variableName: "targetId" } }
 *   ]
 * };
 * const variables = { startIdx: 5, targetId: 42 };
 * const filledPath = fillInGlobalVariablesInPath(path, variables);
 * // { messagePath: [{ type: "slice", start: 5, end: 10 }, { type: "filter", value: 42 }] }
 * ```
 */
export function fillInGlobalVariablesInPath(
  rosPath: MessagePath,
  globalVariables: GlobalVariables,
): MessagePath {
  return {
    ...rosPath,
    messagePath: rosPath.messagePath.map((messagePathPart) => {
      if (messagePathPart.type === "slice") {
        const start =
          typeof messagePathPart.start === "object"
            ? Number(globalVariables[messagePathPart.start.variableName])
            : messagePathPart.start;
        const end =
          typeof messagePathPart.end === "object"
            ? Number(globalVariables[messagePathPart.end.variableName])
            : messagePathPart.end;

        return {
          ...messagePathPart,
          start: isNaN(start) ? 0 : start,
          end: isNaN(end) ? Infinity : end,
        };
      } else if (messagePathPart.type === "filter" && typeof messagePathPart.value === "object") {
        let value;
        const variable = globalVariables[messagePathPart.value.variableName];
        if (typeof variable === "number" || typeof variable === "string") {
          value = variable;
        }
        return { ...messagePathPart, value };
      }

      return messagePathPart;
    }),
  };
}

/**
 * メッセージパスからデータ項目を抽出する関数
 *
 * 指定されたメッセージとメッセージパスから、条件に合致するデータ項目を抽出します。
 * 複雑なネストされたオブジェクト構造、配列のスライス、フィルタ条件を処理し、
 * 適切なパス表現と定数名の解決を行います。
 *
 * @param message - 処理対象のメッセージイベント
 * @param filledInPath - グローバル変数が解決済みのメッセージパス
 * @param topicsByName - トピック名でインデックスされたトピック情報
 * @param structures - データ型の構造情報
 * @param enumValues - 列挙値のマッピング
 * @returns 抽出されたデータ項目の配列、または該当なしの場合はundefined
 *
 * @example
 * ```typescript
 * const message = { topic: "/robot/pose", message: { pose: { x: 10.5 } } };
 * const path = { topicName: "/robot/pose", messagePath: [{ type: "name", name: "pose" }] };
 * const topics = { "/robot/pose": { name: "/robot/pose", schemaName: "geometry_msgs/Pose" } };
 * const result = getMessagePathDataItems(message, path, topics, structures, enumValues);
 * ```
 */
export function getMessagePathDataItems(
  message: MessageEvent,
  filledInPath: MessagePath,
  topicsByName: Record<string, Topic>,
  structures: Record<string, MessagePathStructureItemMessage>,
  enumValues: ReturnType<typeof enumValuesByDatatypeAndField>,
): MessagePathDataItem[] | undefined {
  const topic = topicsByName[filledInPath.topicName];

  // 探しているトピックと一致しないメッセージは無視
  if (!topic || message.topic !== filledInPath.topicName) {
    return;
  }

  // トップレベルのフィルタを最初に適用
  // メッセージがすべてのトップレベルフィルタに一致する場合、この関数は*常に*履歴項目を返す
  for (const item of filledInPath.messagePath) {
    if (item.type === "filter") {
      if (!filterMatches(item, message.message)) {
        return [];
      }
    } else {
      break;
    }
  }

  const queriedData: MessagePathDataItem[] = [];

  /**
   * メッセージとメッセージパスを同時に走査する内部関数
   *
   * @param value - 現在の値
   * @param pathIndex - 現在のパスインデックス
   * @param path - 表示用のパス文字列
   * @param structureItem - 現在の構造項目
   */
  function traverse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    pathIndex: number,
    path: string,
    structureItem: MessagePathStructureItem | undefined,
  ) {
    if (value == undefined) {
      return;
    }
    const pathItem = filledInPath.messagePath[pathIndex];
    const nextPathItem = filledInPath.messagePath[pathIndex + 1];

    if (!pathItem) {
      // メッセージパスの終端に到達した場合、データ項目として保存
      let constantName: string | undefined;
      const prevPathItem = filledInPath.messagePath[pathIndex - 1];
      if (prevPathItem && prevPathItem.type === "name") {
        const fieldName = prevPathItem.name;
        const enumMap = structureItem != undefined ? enumValues[structureItem.datatype] : undefined;
        constantName = enumMap?.[fieldName]?.[value];
      }
      queriedData.push({ value, path, constantName });
    } else if (
      pathItem.type === "name" &&
      (structureItem == undefined || structureItem.structureType === "message")
    ) {
      // パス項目が名前の場合、その名前を使用して走査を続行
      const next = structureItem?.nextByName[pathItem.name];
      traverse(value[pathItem.name], pathIndex + 1, `${path}.${pathItem.repr}`, next);
    } else if (
      pathItem.type === "slice" &&
      (structureItem == undefined || structureItem.structureType === "array")
    ) {
      const { start, end } = pathItem;
      if (typeof start === "object" || typeof end === "object") {
        throw new Error(
          "getMessagePathDataItems only works on paths where global variables have been filled in",
        );
      }
      const startIdx: number = start;
      const endIdx: number = end;
      if (typeof startIdx !== "number" || typeof endIdx !== "number") {
        return;
      }

      // パス項目がスライスの場合、配列内の関連するすべての要素を反復処理
      const arrayLength = value.length as number;
      for (let i = startIdx; i <= Math.min(endIdx, arrayLength - 1); i++) {
        const index = i >= 0 ? i : arrayLength + i;
        const arrayElement = value[index];
        if (arrayElement == undefined) {
          continue;
        }

        // 理想的には `/topic.object[:]{some_id=123}` のようなパスを表示するが、
        // 必要に応じて `/topic.object[10]` にフォールバック
        let newPath;
        if (nextPathItem && nextPathItem.type === "filter") {
          // この後にフィルタセットがある場合、適切にパスを更新
          newPath = `${path}[:]`;
        } else if (typeof arrayElement === "object") {
          // `arrayElement`が通常フィルタリングするプロパティを持っているかを確認
          const name = TypicalFilterNames.find((id) => id in arrayElement);
          if (name != undefined) {
            newPath = `${path}[:]{${name}==${arrayElement[name]}}`;
          } else {
            // `index`の代わりに`i`を使用（負の値の場合の表示のため）
            newPath = `${path}[${i}]`;
          }
        } else {
          newPath = `${path}[${i}]`;
        }
        traverse(arrayElement, pathIndex + 1, newPath, structureItem?.next);
      }
    } else if (pathItem.type === "filter") {
      if (filterMatches(pathItem, value)) {
        traverse(value, pathIndex + 1, `${path}{${pathItem.repr}}`, structureItem);
      }
    } else {
      console.warn(
        `Unknown pathItem.type ${pathItem.type} for structureType: ${structureItem?.structureType}`,
      );
    }
  }

  const structure: MessagePathStructureItemMessage | undefined =
    // トピックにスキーマがない場合でも、少なくともルートメッセージへのアクセスを許可
    topic.schemaName == undefined
      ? { structureType: "message", datatype: "", nextByName: {} }
      : structures[topic.schemaName];
  if (structure) {
    traverse(message.message, 0, quoteTopicNameIfNeeded(filledInPath.topicName), structure);
  }
  return queriedData;
}

/**
 * メッセージイベントとクエリされたデータのペア
 */
export type MessageAndData = {
  messageEvent: MessageEvent;
  queriedData: MessagePathDataItem[];
};

/**
 * パスごとのメッセージデータ項目のマッピング型
 */
export type MessageDataItemsByPath = {
  readonly [key: string]: readonly MessageAndData[];
};

/**
 * トピック別メッセージからメッセージパスをデコードするフック
 *
 * 指定されたパスのセットに対して、トピック別にグループ化されたメッセージから
 * メッセージパスデータ項目を抽出する関数を返します。
 *
 * @param paths - 処理するメッセージパスの配列
 * @returns トピック別メッセージマップを受け取り、パス別データ項目マップを返す関数
 *
 * @example
 * ```typescript
 * const paths = ["/robot/pose.pose.x", "/sensors/data[0].value"];
 * const decodeMessages = useDecodeMessagePathsForMessagesByTopic(paths);
 *
 * const messagesByTopic = {
 *   "/robot/pose": [{ topic: "/robot/pose", message: { pose: { x: 10.5 } } }],
 *   "/sensors/data": [{ topic: "/sensors/data", message: { data: [{ value: 42 }] } }]
 * };
 *
 * const result = decodeMessages(messagesByTopic);
 * // {
 * //   "/robot/pose.pose.x": [{ messageEvent: ..., queriedData: [{ value: 10.5, path: ... }] }],
 * //   "/sensors/data[0].value": [{ messageEvent: ..., queriedData: [{ value: 42, path: ... }] }]
 * // }
 * ```
 */
export function useDecodeMessagePathsForMessagesByTopic(
  paths: readonly string[],
): (messagesByTopic: { [topicName: string]: readonly MessageEvent[] }) => MessageDataItemsByPath {
  const memoizedPaths = useShallowMemo(paths);
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems(memoizedPaths);

  // 注意: 呼び出し元がmessagesByTopicに対して独自のメモ化スキームを定義させる
  // 通常の再生にはuseMemoが適切だが、ブロックにはweakMemoがより良い可能性がある
  return useCallback(
    (messagesByTopic) => {
      const obj: { [path: string]: MessageAndData[] } = {};
      for (const path of memoizedPaths) {
        // 無効なパスと、messagesByTopicにエントリがある有効なパスの配列を作成
        const rosPath = parseMessagePath(path);
        if (!rosPath) {
          obj[path] = [];
          continue;
        }
        const messages = messagesByTopic[rosPath.topicName];
        if (!messages) {
          // 再生パイプラインの場合、messagesByTopicには常にすべてのトピックのエントリが含まれる
          // ブロックの場合、欠落したエントリは意味的に興味深く、情報が下流に伝達されるように
          // 出力で欠落した（空ではない）エントリになるべき
          continue;
        }

        const messagesForThisPath: MessageAndData[] = [];
        obj[path] = messagesForThisPath;

        for (const message of messages) {
          // 項目（存在する場合）を配列に追加
          const queriedData = cachedGetMessagePathDataItems(path, message);
          if (queriedData) {
            messagesForThisPath.push({ messageEvent: message, queriedData });
          }
        }
      }
      return obj;
    },
    [memoizedPaths, cachedGetMessagePathDataItems],
  );
}
