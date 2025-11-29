// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * EndTimestamp Storybook Stories - EndTimestampコンポーネントのStorybookストーリー
 *
 * EndTimestampコンポーネントの様々な時刻表示形式とタイムゾーン対応をテストするためのストーリー集。
 * 絶対時刻、相対時刻、異なる時刻フォーマットの表示確認が可能です。
 *
 * 主なテストケース：
 * - デフォルト表示（絶対時刻・UTC）
 * - 時刻フォーマット切り替え（秒数・時刻表示）
 * - 相対時刻表示
 * - タイムゾーン対応
 * - Player状態との連動
 *
 * 技術仕様：
 * - AppConfigurationContext による設定管理
 * - MockMessagePipelineProvider による時刻データ提供
 * - Time型（ROSTime）による高精度時刻処理
 * - 複数の時刻フォーマット対応
 *
 * @example
 * ```bash
 * # Storybookでの確認方法
 * npm run storybook
 * # AppBar > EndTimestamp を選択
 * ```
 */

import { Meta, StoryFn, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Time } from "@lichtblick/rostime";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import MockMessagePipelineProvider from "@lichtblick/suite-base/components/MessagePipeline/MockMessagePipelineProvider";
import AppConfigurationContext from "@lichtblick/suite-base/context/AppConfigurationContext";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";
import { makeMockAppConfiguration } from "@lichtblick/suite-base/util/makeMockAppConfiguration";

import { EndTimestamp } from "./EndTimestamp";

/**
 * Story Arguments - ストーリー引数の型定義
 *
 * EndTimestampコンポーネントのテストに必要なプロパティを定義。
 * 時刻データ、タイムゾーン、表示フォーマットの制御に使用されます。
 */
type StoryArgs = {
  /** 表示する時刻データ（ROSTime形式） */
  time?: Time;
  /** タイムゾーン設定 */
  timezone?: string;
  /** 時刻表示フォーマット */
  timeFormat?: "SEC" | "TOD";
};

/**
 * Test Time Constants - テスト用時刻定数
 *
 * 様々な時刻表示パターンをテストするための固定時刻データ。
 */
// 絶対時刻テスト用（2022-02-02 12:15:42.222 UTC）
const ABSOLUTE_TIME = { sec: 1643800942, nsec: 222222222 };
// 相対時刻テスト用（約7日と3時間の経過時間）
const RELATIVE_TIME = { sec: 630720000, nsec: 597648236 };

/**
 * Meta Configuration - Storybookメタ設定
 *
 * EndTimestampストーリーの基本設定と共通デコレーターを定義。
 * アプリケーション設定とメッセージパイプラインの模擬環境を提供します。
 */
export default {
  title: "components/AppBar/EndTimestamp",
  component: EndTimestamp,
  args: {
    timezone: "UTC",
    time: ABSOLUTE_TIME,
  },
  decorators: [
    /**
     * Story Decorator - ストーリーデコレーター
     *
     * 各ストーリーに必要な設定環境とデータプロバイダーを提供：
     * - AppConfigurationContext: タイムゾーンと時刻フォーマット設定
     * - MockMessagePipelineProvider: 時刻データとPlayer状態の模擬
     * - スタイリング環境: パディングとレイアウト調整
     *
     * @param Story - ラップするストーリーコンポーネント
     * @param ctx - ストーリーコンテキスト（引数を含む）
     * @returns 装飾されたストーリー
     */
    (Story: StoryFn, ctx): React.JSX.Element => {
      const {
        args: { timeFormat, timezone, time, ...args },
      } = ctx;

      // アプリケーション設定の模擬（タイムゾーンと時刻フォーマット）
      const [value] = useState(() =>
        makeMockAppConfiguration([
          [AppSetting.TIMEZONE, timezone],
          [AppSetting.TIME_FORMAT, timeFormat],
        ]),
      );

      return (
        <AppConfigurationContext.Provider value={value}>
          <MockMessagePipelineProvider endTime={time} presence={PlayerPresence.PRESENT}>
            <div style={{ padding: 16 }}>
              <Story {...args} />
            </div>
          </MockMessagePipelineProvider>
        </AppConfigurationContext.Provider>
      );
    },
  ],
} satisfies Meta<StoryArgs>;

type Story = StoryObj<StoryArgs>;

/**
 * Default Story - デフォルト表示ストーリー
 *
 * EndTimestampの基本的な表示状態を確認するストーリー。
 * 絶対時刻をUTCタイムゾーンで表示し、標準的な使用パターンを確認できます。
 */
export const Default: Story = {};

/**
 * Time Format Seconds - 秒数フォーマット表示
 *
 * 時刻を秒数形式（SEC）で表示するストーリー。
 * Unix時刻やROSの標準時刻形式での表示を確認できます。
 */
export const TimeFormatSeconds: Story = {
  args: { timeFormat: "SEC" },
};

/**
 * Time Format TOD - 時刻フォーマット表示
 *
 * 時刻を時刻形式（TOD: Time of Day）で表示するストーリー。
 * 人間が読みやすい時刻表示形式を確認できます。
 */
export const TimeFormatTOD: StoryObj = {
  args: { timeFormat: "TOD" },
};

/**
 * Time Format Relative - 相対時刻表示
 *
 * 相対時刻（経過時間）を表示するストーリー。
 * データ再生時の経過時間表示や、記録開始からの時間表示を確認できます。
 */
export const TimeFormatRelative: StoryObj = {
  args: { time: RELATIVE_TIME },
};
