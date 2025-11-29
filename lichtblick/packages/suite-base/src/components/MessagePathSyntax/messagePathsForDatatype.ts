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

import {
  MessagePathFilter,
  quoteFieldNameIfNeeded,
  MessagePathPart,
  PrimitiveType,
  MessagePathStructureItem,
  MessagePathStructureItemMessage,
} from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import { isTypicalFilterName } from "@lichtblick/suite-base/components/MessagePathSyntax/isTypicalFilterName";
import {
  MessagePathsForStructure,
  MessagePathsForStructureArgs,
} from "@lichtblick/suite-base/components/MessagePathSyntax/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import { assertNever } from "@lichtblick/suite-base/util/assertNever";
import naturalSort from "@lichtblick/suite-base/util/naturalSort";

/**
 * 整数型のプリミティブ型リスト
 *
 * フィルター条件の生成時に整数型かどうかを判定するために使用される。
 * ROSメッセージの整数型フィールドに対する適切なフィルター値を生成する際に参照される。
 */
const STRUCTURE_ITEM_INTEGER_TYPES = [
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
];

/**
 * 指定された型がROSプリミティブ型かどうかを判定する
 *
 * ROSメッセージの型システムにおいて、プリミティブ型（基本型）と
 * 複合型（メッセージ型）を区別するために使用される。
 *
 * @param type - 判定対象の型名
 * @returns プリミティブ型の場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * isPrimitiveType("string")    // true
 * isPrimitiveType("int32")     // true
 * isPrimitiveType("MyMessage") // false
 * isPrimitiveType("geometry_msgs/Pose") // false
 * ```
 */
function isPrimitiveType(type: string): type is PrimitiveType {
  // TypeScriptエラーを出すためにPrimitiveTypeとしてキャスト
  switch (type as PrimitiveType) {
    case "bool":
    case "int8":
    case "uint8":
    case "int16":
    case "uint16":
    case "int32":
    case "uint32":
    case "int64":
    case "uint64":
    case "float32":
    case "float64":
    case "string":
      return true;
  }
}

/**
 * 構造アイテムが整数型のプリミティブかどうかを判定する
 *
 * フィルター条件の自動補完において、整数型フィールドに対して
 * 適切なサンプル値（例：0, 1, -1）を提供するために使用される。
 *
 * @param item - 判定対象の構造アイテム
 * @returns 整数型プリミティブの場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const item = { structureType: "primitive", primitiveType: "int32" };
 * structureItemIsIntegerPrimitive(item) // true
 *
 * const floatItem = { structureType: "primitive", primitiveType: "float64" };
 * structureItemIsIntegerPrimitive(floatItem) // false
 * ```
 */
function structureItemIsIntegerPrimitive(item: MessagePathStructureItem) {
  return (
    item.structureType === "primitive" && STRUCTURE_ITEM_INTEGER_TYPES.includes(item.primitiveType)
  );
}

/**
 * ROSデータ型定義から簡単にナビゲート可能な平坦な構造を生成する
 *
 * ROSメッセージの複雑な階層構造を、メッセージパスの自動補完や検証に
 * 適した平坦な構造に変換する。この関数は、データ型定義から以下のような
 * 構造を生成する：
 *
 * ```
 * {
 *   "geometry_msgs/Pose": {
 *     structureType: "message",
 *     nextByName: {
 *       "position": {
 *         structureType: "message",
 *         nextByName: {
 *           "x": { structureType: "primitive", primitiveType: "float64" },
 *           "y": { structureType: "primitive", primitiveType: "float64" },
 *           "z": { structureType: "primitive", primitiveType: "float64" }
 *         }
 *       },
 *       "orientation": { ... }
 *     }
 *   }
 * }
 * ```
 *
 * データ型はプレイヤー接続後に変更されないため、この結果は緩くキャッシュされる。
 * 循環参照を持つデータ型（自己参照型）も適切に処理される。
 *
 * @param datatypes - ROSデータ型定義のマップ
 * @returns データ型名をキーとする構造アイテムのレコード
 *
 * @example
 * ```typescript
 * const structures = messagePathStructures(datatypes);
 * const poseStructure = structures["geometry_msgs/Pose"];
 * console.log(poseStructure.nextByName.position.structureType); // "message"
 *
 * // 配列型の場合
 * const arrayStructure = structures["sensor_msgs/PointCloud2"];
 * console.log(arrayStructure.nextByName.data.structureType); // "array"
 * ```
 */
export function messagePathStructures(
  datatypes: Immutable<RosDatatypes>,
): Record<string, MessagePathStructureItemMessage> {
  const structureFor = _.memoize(
    (datatype: string, seenDatatypes: string[]): MessagePathStructureItemMessage => {
      const nextByName: Record<string, MessagePathStructureItem> = {};
      const rosDatatype = datatypes.get(datatype);
      if (!rosDatatype) {
        // "time"と"duration"はROSの"組み込み"型として扱われる
        // データ型リストで見つからない場合は、ハードコードされたバージョンにフォールバック
        if (datatype === "time" || datatype === "duration") {
          return {
            structureType: "message",
            nextByName: {
              sec: {
                structureType: "primitive",
                primitiveType: "uint32",
                datatype: "",
              },
              nsec: {
                structureType: "primitive",
                primitiveType: "uint32",
                datatype: "",
              },
            },
            datatype,
          };
        }

        throw new Error(`datatype not found: "${datatype}"`);
      }
      for (const msgField of rosDatatype.definitions) {
        if (msgField.isConstant === true) {
          continue;
        }

        if (seenDatatypes.includes(msgField.type)) {
          continue;
        }

        const next: MessagePathStructureItem = isPrimitiveType(msgField.type)
          ? {
              structureType: "primitive",
              primitiveType: msgField.type,
              datatype,
            }
          : structureFor(msgField.type, [...seenDatatypes, msgField.type]);

        if (msgField.isArray === true) {
          nextByName[msgField.name] = { structureType: "array", next, datatype };
        } else {
          nextByName[msgField.name] = next;
        }
      }
      return { structureType: "message", nextByName, datatype };
    },
  );

  const structures: Record<string, MessagePathStructureItemMessage> = {};
  for (const [datatype] of datatypes) {
    structures[datatype] = structureFor(datatype, []);
  }
  return structures;
}

/**
 * 指定された構造アイテムが有効な終端として使用できるかどうかを判定する
 *
 * メッセージパスの自動補完において、特定の型制約（validTypes）に基づいて
 * パスの終端として適切かどうかを判定する。例えば、プリミティブ型のみを
 * 許可する場合、メッセージ型や配列型は無効な終端となる。
 *
 * @param structureItem - 判定対象の構造アイテム
 * @param validTypes - 有効な型のリスト（未指定の場合は全て有効）
 * @returns 有効な終端の場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const primitiveItem = { structureType: "primitive", primitiveType: "float64" };
 * validTerminatingStructureItem(primitiveItem, ["primitive"]) // true
 * validTerminatingStructureItem(primitiveItem, ["message"])   // false
 *
 * const messageItem = { structureType: "message", nextByName: {} };
 * validTerminatingStructureItem(messageItem, ["message"])     // true
 * validTerminatingStructureItem(messageItem, ["primitive"])   // false
 * ```
 */
export function validTerminatingStructureItem(
  structureItem?: MessagePathStructureItem,
  validTypes?: readonly string[],
): boolean {
  return (
    !!structureItem &&
    (!validTypes ||
      validTypes.includes(structureItem.structureType) ||
      validTypes.includes(structureItem.datatype) ||
      (structureItem.structureType === "primitive" &&
        validTypes.includes(structureItem.primitiveType)))
  );
}

/**
 * 指定された構造からすべての可能なメッセージパスを生成する
 *
 * ROSメッセージの構造を再帰的に走査し、アクセス可能なすべてのフィールドパスを
 * 生成する。自動補完の候補として使用される。型制約やスライス制御オプションに
 * 基づいて、適切なパスのみを生成する。
 *
 * 生成されるパスの例：
 * - "": ルートメッセージ
 * - ".position": 単一フィールド
 * - ".position.x": ネストされたフィールド
 * - ".points[:]": 配列全体
 * - ".points[0]": 配列の特定要素
 * - ".objects[:]{id==0}": フィルター付き配列
 *
 * 配列内のメッセージ型の場合、典型的なフィルター名（id、name等）を持つフィールドを
 * 検索し、適切なフィルター条件を自動生成する。既存のメッセージパスにフィルターが
 * 含まれている場合は、それを保持する。
 *
 * @param structure - 走査対象のメッセージ構造
 * @param options - 生成オプション
 * @param options.validTypes - 有効な型のリスト
 * @param options.noMultiSlices - 複数値スライス（[:]）を無効にするかどうか
 * @param options.messagePath - 既存のメッセージパス（フィルター保持用）
 * @returns パス文字列と終端構造アイテムのペアの配列（自然順でソート済み）
 *
 * @example
 * ```typescript
 * const structure = structures["geometry_msgs/Pose"];
 * const paths = messagePathsForStructure(structure, {
 *   validTypes: ["primitive"],
 *   noMultiSlices: true
 * });
 *
 * // 結果例:
 * // [
 * //   { path: ".position.x", terminatingStructureItem: { structureType: "primitive", primitiveType: "float64" } },
 * //   { path: ".position.y", terminatingStructureItem: { structureType: "primitive", primitiveType: "float64" } },
 * //   { path: ".position.z", terminatingStructureItem: { structureType: "primitive", primitiveType: "float64" } },
 * //   ...
 * // ]
 * ```
 */
export function messagePathsForStructure(
  structure: MessagePathStructureItemMessage,
  messagePathsStructureArgs?: MessagePathsForStructureArgs,
): MessagePathsForStructure {
  const { validTypes, noMultiSlices, messagePath = [] } = messagePathsStructureArgs ?? {};

  let clonedMessagePath = [...messagePath];
  const messagePaths: MessagePathsForStructure = [];
  function traverse(structureItem: MessagePathStructureItem, builtString: string) {
    if (validTerminatingStructureItem(structureItem, validTypes)) {
      messagePaths.push({ path: builtString, terminatingStructureItem: structureItem });
    }
    if (structureItem.structureType === "message") {
      for (const [name, item] of Object.entries(structureItem.nextByName)) {
        traverse(item, `${builtString}.${quoteFieldNameIfNeeded(name)}`);
      }
    } else if (structureItem.structureType === "array") {
      if (structureItem.next.structureType === "message") {
        // When we have an array of messages, you probably want to filter on
        // some field, like `/topic.object{some_id=123}`. If we can't find a
        // typical filter name, fall back to `/topic.object[0]`.
        const typicalFilterItem = Object.entries(structureItem.next.nextByName).find(([name]) =>
          isTypicalFilterName(name),
        );
        if (typicalFilterItem) {
          const [typicalFilterName, typicalFilterValue] = typicalFilterItem;

          // Find matching filter from clonedMessagePath
          const matchingFilterPart = clonedMessagePath.find(
            (pathPart): pathPart is MessagePathFilter =>
              pathPart.type === "filter" && pathPart.path[0] === typicalFilterName,
          );

          // Format the displayed filter value
          if (matchingFilterPart) {
            // Remove the matching filter from clonedMessagePath, for future searches
            clonedMessagePath = clonedMessagePath.filter(
              (pathPart) => pathPart !== matchingFilterPart,
            );
            traverse(structureItem.next, `${builtString}[:]{${matchingFilterPart.repr}}`);
          } else if (structureItemIsIntegerPrimitive(typicalFilterValue)) {
            traverse(structureItem.next, `${builtString}[:]{${typicalFilterName}==0}`);
          } else if (
            typicalFilterValue.structureType === "primitive" &&
            typicalFilterValue.primitiveType === "string"
          ) {
            traverse(structureItem.next, `${builtString}[:]{${typicalFilterName}==""}`);
          } else {
            traverse(structureItem.next, `${builtString}[0]`);
          }
        } else {
          traverse(structureItem.next, `${builtString}[0]`);
        }
      } else if (noMultiSlices !== true) {
        // When dealing with an array of primitives, you likely just want a
        // scatter plot (if we can do multi-slices).
        traverse(structureItem.next, `${builtString}[:]`);
      } else {
        traverse(structureItem.next, `${builtString}[0]`);
      }
    }
  }

  traverse(structure, "");
  return messagePaths.sort(naturalSort("path"));
}

/**
 * 構造走査の結果を表す型定義
 *
 * メッセージパスの検証時に、走査の結果として返される情報を定義する。
 * 無効なパスの場合、問題のある部分と到達した構造アイテムを含む。
 */
export type StructureTraversalResult = {
  /** パスが有効かどうか */
  valid: boolean;
  /** 無効だった場合の問題のあるメッセージパス部分 */
  msgPathPart?: MessagePathPart;
  /** 走査結果の構造アイテム */
  structureItem?: MessagePathStructureItem;
};

/**
 * 指定されたメッセージパスに沿って構造を走査し、有効性を検証する
 *
 * メッセージパスの各部分（フィールドアクセス、配列インデックス、フィルター）を
 * 順次処理し、構造的に有効かどうかを判定する。無効な場合は、問題のある部分と
 * その時点での構造アイテムを返す。
 *
 * 処理されるパス要素：
 * - name: フィールド名によるアクセス（メッセージ型でのみ有効）
 * - slice: 配列インデックスによるアクセス（配列型でのみ有効）
 * - filter: フィルター条件による絞り込み（メッセージ型でのみ有効、値が定義されている必要がある）
 *
 * この関数はmemoizeWeakを使用して最適化されており、複数の引数に対応し、
 * WeakMapを使用してオブジェクトを強く保持しない。
 *
 * @param initialStructureItem - 走査開始点の構造アイテム
 * @param messagePath - 走査対象のメッセージパス
 * @returns 走査結果（有効性、問題部分、到達構造アイテム）
 *
 * @example
 * ```typescript
 * const structure = structures["geometry_msgs/Pose"];
 * const path = [
 *   { type: "name", name: "position", repr: "position" },
 *   { type: "name", name: "x", repr: "x" }
 * ];
 *
 * const result = traverseStructure(structure, path);
 * // result.valid === true
 * // result.structureItem.structureType === "primitive"
 * // result.structureItem.primitiveType === "float64"
 *
 * // 無効なパスの例
 * const invalidPath = [
 *   { type: "name", name: "invalid_field", repr: "invalid_field" }
 * ];
 * const invalidResult = traverseStructure(structure, invalidPath);
 * // invalidResult.valid === false
 * // invalidResult.msgPathPart.name === "invalid_field"
 * ```
 */
// Traverse down the structure given a `messagePath`. Return if the path
// is valid, given the structure, `validTypes`, and `noMultiSlices`.
//
// We return the `msgPathPart` that was invalid to determine what sort
// of autocomplete we should show.
//
// We use memoizeWeak because it works with multiple arguments (lodash's memoize
// does not) and does not hold onto objects as strongly (it uses WeakMap).
export const traverseStructure = (
  initialStructureItem: MessagePathStructureItem | undefined,
  messagePath: MessagePathPart[],
): StructureTraversalResult => {
  let structureItem = initialStructureItem;
  if (!structureItem) {
    return { valid: false, msgPathPart: undefined, structureItem: undefined };
  }
  for (const msgPathPart of messagePath) {
    if (!structureItem) {
      return { valid: false, msgPathPart, structureItem };
    }
    if (msgPathPart.type === "name") {
      if (structureItem.structureType !== "message") {
        return { valid: false, msgPathPart, structureItem };
      }
      const next: MessagePathStructureItem | undefined = structureItem.nextByName[msgPathPart.name];
      structureItem = next;
    } else if (msgPathPart.type === "slice") {
      if (structureItem.structureType !== "array") {
        return { valid: false, msgPathPart, structureItem };
      }
      structureItem = structureItem.next;
      //eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (msgPathPart.type === "filter") {
      if (
        structureItem.structureType !== "message" ||
        msgPathPart.path.length === 0 ||
        msgPathPart.value == undefined
      ) {
        return { valid: false, msgPathPart, structureItem };
      }
      let currentItem: MessagePathStructureItem | undefined = structureItem;
      for (const name of msgPathPart.path) {
        if (currentItem.structureType !== "message") {
          return { valid: false, msgPathPart, structureItem };
        }
        currentItem = currentItem.nextByName[name];
        if (currentItem == undefined) {
          return { valid: false, msgPathPart, structureItem };
        }
      }
    } else {
      assertNever(
        msgPathPart,
        `Invalid msgPathPart.type: ${(msgPathPart as MessagePathPart).type} `,
      );
    }
  }
  return { valid: true, msgPathPart: undefined, structureItem };
};
