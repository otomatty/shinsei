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

import { MessageEvent } from "@lichtblick/suite-base/players/types";
import { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

/**
 * テスト用のROSデータ型定義
 *
 * MessagePathSyntaxコンポーネントのテストで使用される基本的なデータ型定義です。
 * シンプルなint32型のindexフィールドを持つ「some/datatype」を定義しています。
 *
 * @example
 * ```typescript
 * // テストでの使用例
 * const testDatatype = datatypes.get("some/datatype");
 * console.log(testDatatype.definitions[0].name); // "index"
 * ```
 */
export const datatypes: RosDatatypes = new Map(
  Object.entries({
    "some/datatype": { definitions: [{ name: "index", type: "int32" }] },
  }),
);

/**
 * テスト用のメッセージイベント配列
 *
 * MessagePathSyntaxコンポーネントのテストで使用される模擬メッセージデータです。
 * 3つの連続したタイムスタンプを持つメッセージを含み、それぞれ異なるindexの値を持ちます。
 *
 * 特徴：
 * - 全て同じトピック（/some/topic）からのメッセージ
 * - 1秒間隔でのタイムスタンプ（100, 101, 102秒）
 * - 連続したindex値（0, 1, 2）
 * - 統一されたスキーマ名（msgs/PoseDebug）
 *
 * @example
 * ```typescript
 * // メッセージの取得例
 * const firstMessage = messages[0];
 * console.log(firstMessage.message.index); // 0
 * console.log(firstMessage.receiveTime.sec); // 100
 * ```
 */
export const messages = Object.freeze<MessageEvent[]>([
  {
    topic: "/some/topic",
    receiveTime: { sec: 100, nsec: 0 },
    message: { index: 0 },
    schemaName: "msgs/PoseDebug",
    sizeInBytes: 0,
  },
  {
    topic: "/some/topic",
    receiveTime: { sec: 101, nsec: 0 },
    message: { index: 1 },
    schemaName: "msgs/PoseDebug",
    sizeInBytes: 0,
  },
  {
    topic: "/some/topic",
    receiveTime: { sec: 102, nsec: 0 },
    message: { index: 2 },
    schemaName: "msgs/PoseDebug",
    sizeInBytes: 0,
  },
]);

/**
 * MessagePathInputコンポーネント用のStorybook/テストフィクスチャ
 *
 * MessagePathInputコンポーネントのStorybookストーリーやテストで使用される
 * 包括的なテストデータセットです。複雑なROSメッセージ構造、トピック、
 * グローバル変数を含む実際のロボットアプリケーションを模擬した環境を提供します。
 *
 * 含まれるデータ型：
 * - msgs/PoseDebug: ヘッダーとポーズ情報を含む位置デバッグメッセージ
 * - msgs/Pose: 位置、速度、加速度、方向等の詳細なポーズ情報
 * - msgs/State: 複数のアイテムを含む状態メッセージ
 * - msgs/StateData: 単一の浮動小数点値を持つ状態データ
 * - msgs/OtherState: ID、速度、名前、有効性フラグ、データ配列を含む複合状態
 * - msgs/Log: IDと重要度を持つログメッセージ
 * - std_msgs/Header: 標準的なROSヘッダー（シーケンス、タイムスタンプ、フレームID）
 *
 * 提供されるトピック：
 * - /some_topic/location: 位置情報
 * - /some_topic/state: 状態情報
 * - /very_very_very_..._long_topic_name/state: 長いトピック名のテスト用
 * - /some_logs_topic: ログメッセージ
 *
 * グローバル変数：
 * - global_var_1: 42
 * - global_var_2: 10
 *
 * @example
 * ```typescript
 * // Storybookでの使用例
 * export const Default = {
 *   parameters: {
 *     lichtblick: MessagePathInputStoryFixture,
 *   },
 * };
 * ```
 *
 * @example
 * ```typescript
 * // テストでの使用例
 * const poseType = MessagePathInputStoryFixture.datatypes.get("msgs/Pose");
 * const topics = MessagePathInputStoryFixture.topics;
 * const variables = MessagePathInputStoryFixture.globalVariables;
 * ```
 */
export const MessagePathInputStoryFixture: Fixture = {
  datatypes: new Map(
    Object.entries({
      "msgs/PoseDebug": {
        definitions: [
          { name: "header", type: "std_msgs/Header", isArray: false },
          { name: "pose", type: "msgs/Pose", isArray: false },
        ],
      },
      "msgs/Pose": {
        definitions: [
          { name: "header", type: "std_msgs/Header", isArray: false },
          { name: "x", type: "float64", isArray: false },
          { name: "y", type: "float64", isArray: false },
          { name: "travel", type: "float64", isArray: false },
          { name: "velocity", type: "float64", isArray: false },
          { name: "acceleration", type: "float64", isArray: false },
          { name: "heading", type: "float64", isArray: false },
        ],
      },
      "msgs/State": {
        definitions: [
          { name: "header", type: "std_msgs/Header", isArray: false },
          { name: "items", type: "msgs/OtherState", isArray: true },
          { name: "foo_id", type: "uint32", isArray: false },
        ],
      },
      "msgs/StateData": {
        definitions: [{ name: "value", type: "float32", isArray: false }],
      },
      "msgs/OtherState": {
        definitions: [
          { name: "id", type: "int32", isArray: false },
          { name: "speed", type: "float32", isArray: false },
          { name: "name", type: "string", isArray: false },
          { name: "valid", type: "bool", isArray: false },
          { name: "data", type: "msgs/StateData", isArray: true },
        ],
      },
      "msgs/Log": {
        definitions: [
          { name: "id", type: "int32", isArray: false },
          { name: "severity", type: "float32", isArray: false },
        ],
      },
      "std_msgs/Header": {
        definitions: [
          { name: "seq", type: "uint32", isArray: false },
          {
            name: "stamp",
            type: "time",
            isArray: false,
          },
          { name: "frame_id", type: "string", isArray: false },
        ],
      },
    }),
  ),
  topics: [
    { name: "/some_topic/location", schemaName: "msgs/PoseDebug" },
    { name: "/some_topic/state", schemaName: "msgs/State" },
    {
      name: "/very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_very_long_topic_name/state",
      schemaName: "msgs/State",
    },
    { name: "/some_logs_topic", schemaName: "msgs/Log" },
  ],
  frame: {},
  globalVariables: { global_var_1: 42, global_var_2: 10 },
};
