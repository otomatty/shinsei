// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppBar Storybook Stories - AppBarコンポーネントの総合Storybookストーリー
 *
 * AppBarコンポーネントの様々な状態と機能をテストするためのストーリー集。
 * プレイヤー状態、データソース、ウィンドウコントロール、多言語対応の確認が可能です。
 *
 * 主なテストケース：
 * - デフォルト表示状態
 * - カスタムウィンドウコントロール（デスクトップアプリ用）
 * - プレイヤー状態の変化（接続・エラー・バッファリング等）
 * - データソースの種類別表示
 * - アラート表示機能
 * - 多言語対応（日本語、中国語、英語）
 * - デバッグ機能（ドラッグ領域の可視化）
 *
 * 技術仕様：
 * - MockMessagePipelineProvider による状態管理
 * - PlayerPresence による接続状態制御
 * - Storybook Actions による操作確認
 * - グリッドレイアウトによる比較表示
 * - 複数言語・テーマの組み合わせテスト
 *
 * @example
 * ```bash
 * # Storybookでの確認方法
 * npm run storybook
 * # AppBar を選択
 * ```
 */

import { Meta, StoryFn, StoryObj } from "@storybook/react";
import { action } from "storybook/actions";

import MockMessagePipelineProvider, {
  MockMessagePipelineProps,
} from "@lichtblick/suite-base/components/MessagePipeline/MockMessagePipelineProvider";
import Stack from "@lichtblick/suite-base/components/Stack";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";

import { AppBar } from ".";
import { StorybookDecorator } from "./StorybookDecorator.stories";

/**
 * Meta Configuration - Storybookメタ設定
 *
 * AppBarストーリーの基本設定と共通デコレーターを定義。
 * ウィンドウコントロールのアクション監視と両カラムテーマ表示を提供します。
 */
export default {
  title: "components/AppBar",
  component: AppBar,
  decorators: [StorybookDecorator],
  args: {
    // ウィンドウコントロールのアクション監視（デスクトップアプリ用）
    onMinimizeWindow: action("onMinimizeWindow"),
    onMaximizeWindow: action("onMaximizeWindow"),
    onUnmaximizeWindow: action("onUnmaximizeWindow"),
    onCloseWindow: action("onCloseWindow"),
  },
  parameters: { colorScheme: "both-column" },
} satisfies Meta<typeof AppBar>;

type Story = StoryObj<typeof AppBar>;

// ========================================
// Basic Display Stories - 基本表示ストーリー群
// ========================================

/**
 * Default Story - デフォルト表示ストーリー
 *
 * AppBarの基本的な表示状態を確認するストーリー。
 * 標準的なWebアプリケーション表示での使用パターンを確認できます。
 */
export const Default: Story = {};

/**
 * Default Chinese - デフォルト表示（中国語）
 *
 * 中国語ローカライゼーションでのAppBar表示テスト。
 * 中国語文字の表示とレイアウト調整を確認できます。
 */
export const DefaultChinese: Story = { parameters: { forceLanguage: "zh" } };

/**
 * Default Japanese - デフォルト表示（日本語）
 *
 * 日本語ローカライゼーションでのAppBar表示テスト。
 * 日本語文字の表示とレイアウト調整を確認できます。
 */
export const DefaultJapanese: Story = { parameters: { forceLanguage: "ja" } };

// ========================================
// Custom Window Controls Stories - カスタムウィンドウコントロールストーリー群
// ========================================

/**
 * Custom Window Controls - カスタムウィンドウコントロール
 *
 * デスクトップアプリケーション用のカスタムウィンドウコントロール表示。
 * 最小化・最大化・閉じるボタンの表示と機能を確認できます。
 */
export const CustomWindowControls: Story = {
  args: { showCustomWindowControls: true },
};

/**
 * Custom Window Controls Maximized - カスタムウィンドウコントロール（最大化状態）
 *
 * ウィンドウが最大化された状態でのコントロール表示。
 * 最大化解除ボタンの表示と機能を確認できます。
 */
export const CustomWindowControlsMaximized: Story = {
  args: { isMaximized: true, showCustomWindowControls: true },
};

/**
 * Custom Window Controls Drag Region - ドラッグ領域デバッグ表示
 *
 * ウィンドウのドラッグ可能領域を可視化するデバッグストーリー。
 * WebkitAppRegionの適用範囲を確認できます。
 */
export const CustomWindowControlsDragRegion: Story = {
  args: { showCustomWindowControls: true, debugDragRegion: true },
};

/**
 * Grid Layout Decorator - グリッドレイアウトデコレーター
 *
 * 複数の状態を比較表示するためのグリッドレイアウト。
 * プレイヤー状態やデータソースの一覧比較に使用されます。
 *
 * @param Story - ラップするストーリーコンポーネント
 * @returns グリッドレイアウトでラップされたストーリー
 */
const Grid = (Story: StoryFn): React.JSX.Element => (
  <Stack overflowY="auto">
    <div style={{ display: "grid", gridTemplateColumns: "max-content auto", alignItems: "center" }}>
      <Story />
    </div>
  </Stack>
);

/**
 * Test Alert Data - テスト用アラートデータ
 *
 * プレイヤー状態テストで使用するアラートメッセージ。
 * エラーと警告の両方のケースを含みます。
 */
const alerts: MockMessagePipelineProps["alerts"] = [
  { severity: "error", message: "example error" },
  { severity: "warn", message: "example warn" },
];

// ========================================
// Player States Stories - プレイヤー状態ストーリー群
// ========================================

/**
 * Player States - プレイヤー状態一覧
 *
 * 様々なプレイヤー接続状態でのAppBar表示を確認するストーリー。
 * 接続状態に応じたUI変化とアラート表示を確認できます。
 *
 * テスト状態：
 * - NOT_PRESENT: 未接続状態
 * - INITIALIZING: 初期化中
 * - RECONNECTING: 再接続中
 * - BUFFERING: バッファリング中
 * - PRESENT: 接続済み
 * - ERROR: エラー状態
 */
export const PlayerStates: Story = {
  decorators: [
    (Story: StoryFn): React.JSX.Element => {
      const playerStates: (MockMessagePipelineProps & { label?: string })[] = [
        // 基本的なプレイヤー状態のテスト
        ...[
          PlayerPresence.NOT_PRESENT,
          PlayerPresence.INITIALIZING,
          PlayerPresence.RECONNECTING,
          PlayerPresence.BUFFERING,
          PlayerPresence.PRESENT,
        ].map((presence) => ({
          name: "https://exampleurl:2002",
          presence,
        })),
        // エラー状態とアラート表示のテスト
        {
          name: "https://exampleurl:2002",
          presence: PlayerPresence.ERROR,
          alerts,
        },
        // 初期化中とアラートの組み合わせテスト
        {
          label: "INITIALIZING + alerts",
          name: "https://exampleurl:2002",
          presence: PlayerPresence.INITIALIZING,
          alerts,
        },
        // 名前なし状態のテスト
        {
          label: "INITIALIZING + no name",
          name: undefined,
          presence: PlayerPresence.INITIALIZING,
          alerts,
        },
      ];

      return (
        <>
          {playerStates.map((props) => (
            <MockMessagePipelineProvider
              key={props.presence}
              name={props.name}
              presence={props.presence}
              alerts={props.alerts}
            >
              <div style={{ padding: 8 }}>{props.label ?? props.presence}</div>
              <div>
                <Story />
              </div>
            </MockMessagePipelineProvider>
          ))}
        </>
      );
    },
    Grid,
  ],
  parameters: { colorScheme: "light" },
};

/**
 * Player States Chinese - プレイヤー状態一覧（中国語）
 *
 * 中国語ローカライゼーションでのプレイヤー状態表示テスト。
 */
export const PlayerStatesChinese: Story = {
  ...PlayerStates,
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

/**
 * Player States Japanese - プレイヤー状態一覧（日本語）
 *
 * 日本語ローカライゼーションでのプレイヤー状態表示テスト。
 */
export const PlayerStatesJapanese: Story = {
  ...PlayerStates,
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};

// ========================================
// Data Sources Stories - データソースストーリー群
// ========================================

/**
 * File Data Sources - ファイルデータソース一覧
 *
 * 様々なファイル形式のデータソースを定義。
 * ローカルファイルとリモートファイルの表示テストに使用されます。
 */
const fileSources: MockMessagePipelineProps[] = [
  "mcap-local-file",
  "ros1-local-bagfile",
  "ros2-local-bagfile",
  "ulog-local-file",
  "remote-file",
].map((sourceId) => ({
  name: "longexampleurlwith_specialcharaters-and-portnumber.ext",
  urlState: { sourceId },
}));

/**
 * Remote Data Sources - リモートデータソース一覧
 *
 * 様々なリモート接続タイプのデータソースを定義。
 * ネットワーク接続とデバイス接続の表示テストに使用されます。
 */
const remoteSources: MockMessagePipelineProps[] = [
  "ros1-socket",
  "ros2-socket",
  "rosbridge-websocket",
  "foxglove-websocket",
  "velodyne-device",
  "some other source type",
].map((sourceId) => ({
  name: "https://longexampleurlwith_specialcharaters-and-portnumber:3030",
  urlState: { sourceId },
}));

/**
 * Data Sources - データソース一覧
 *
 * 様々なデータソースタイプでのAppBar表示を確認するストーリー。
 * ファイル、リモート接続、デバイス接続の表示パターンを確認できます。
 *
 * テストケース：
 * - サンプルデータセット（nuScenes）
 * - ローカルファイル（MCAP、ROS Bag、ULog）
 * - リモート接続（ROS、Rosbridge、Foxglove WebSocket）
 * - デバイス接続（Velodyne Lidar）
 * - エラー状態とアラート表示
 */
export const DataSources: Story = {
  decorators: [
    (Story: StoryFn): React.JSX.Element => {
      const playerStates: (MockMessagePipelineProps & { label?: string })[] = [
        // サンプルデータセットのテスト
        {
          name: "Adapted from nuScenes dataset. Copyright © 2020 nuScenes. https://www.nuscenes.org/terms-of-use",
          urlState: { sourceId: "sample-nuscenes" },
        },
        // ファイルデータソースのテスト
        ...fileSources,
        // リモートデータソースのテスト
        ...remoteSources,
        // エラー状態のテスト
        {
          label: "with alerts",
          name: "https://longexampleurlwith_error-and-portnumber:3030",
          alerts,
        },
      ];

      return (
        <>
          {playerStates.map((props) => (
            <MockMessagePipelineProvider
              key={props.urlState?.sourceId}
              name={props.name}
              presence={PlayerPresence.PRESENT}
              urlState={props.urlState}
              alerts={props.alerts}
              seekPlayback={() => {}}
            >
              <div style={{ padding: 8 }}>{props.label ?? props.urlState?.sourceId}</div>
              <div>
                <Story />
              </div>
            </MockMessagePipelineProvider>
          ))}
        </>
      );
    },
    Grid,
  ],
  parameters: { colorScheme: "light" },
};

/**
 * Data Sources Chinese - データソース一覧（中国語）
 *
 * 中国語ローカライゼーションでのデータソース表示テスト。
 */
export const DataSourcesChinese: Story = {
  ...DataSources,
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

/**
 * Data Sources Japanese - データソース一覧（日本語）
 *
 * 日本語ローカライゼーションでのデータソース表示テスト。
 */
export const DataSourcesJapanese: Story = {
  ...DataSources,
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};
