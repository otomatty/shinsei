// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppMenu Storybook Stories - AppMenuコンポーネントのStorybookストーリー
 *
 * AppMenuコンポーネントの様々な表示状態とインタラクションをテストするためのストーリー集。
 * 多言語対応、テーマ対応、メニュー展開状態の確認が可能です。
 *
 * 主なテストケース：
 * - デフォルト表示状態
 * - 各サブメニューの展開（File, View, Help）
 * - ダークテーマ・ライトテーマ対応
 * - 多言語対応（日本語、中国語、英語）
 * - ホバーインタラクション
 * - 最近使用したファイル一覧の表示
 *
 * 技術仕様：
 * - Storybook Testing Library による自動インタラクション
 * - Mock Provider による依存関係の模擬
 * - 複数言語・テーマの組み合わせテスト
 *
 * @example
 * ```bash
 * # Storybookでの確認方法
 * npm run storybook
 * # AppBar > AppMenu を選択
 * ```
 */

import { PopoverPosition, PopoverReference } from "@mui/material";
import { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/testing-library";
import * as _ from "lodash-es";

import PlayerSelectionContext, {
  PlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import MockCurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";
import WorkspaceContextProvider from "@lichtblick/suite-base/providers/WorkspaceContextProvider";

import { AppMenu } from "./AppMenu";

/**
 * Story Arguments - ストーリー引数の型定義
 *
 * AppMenuコンポーネントのテストに必要なプロパティを定義。
 * Storybookでの表示制御とインタラクションテストに使用されます。
 */
type StoryArgs = {
  /** メニューを閉じるためのイベントハンドラー */
  handleClose: () => void;
  /** メニューのアンカー要素 */
  anchorEl?: HTMLElement;
  /** アンカーの参照方法 */
  anchorReference?: PopoverReference;
  /** アンカーの位置座標 */
  anchorPosition?: PopoverPosition;
  /** ポータルの無効化フラグ */
  disablePortal?: boolean;
  /** メニューの開閉状態 */
  open: boolean;
  /** テスト用ID（自動インタラクション用） */
  testId?: string;
};

/**
 * Meta Configuration - Storybookメタ設定
 *
 * AppMenuストーリーの基本設定と共通デコレーターを定義。
 * 全ストーリーで共有される設定とMockプロバイダーを提供します。
 */
export default {
  title: "components/AppBar/AppMenu",
  component: AppMenu,
  args: {
    open: true,
    anchorPosition: { top: 0, left: 0 },
    anchorReference: "anchorPosition",
    disablePortal: true,
    handleClose: _.noop,
  },
  decorators: [
    /**
     * Story Decorator - ストーリーデコレーター
     *
     * 各ストーリーに必要なMockプロバイダーを提供：
     * - MockCurrentLayoutProvider: レイアウト状態の模擬
     * - WorkspaceContextProvider: ワークスペース状態の模擬
     * - PlayerSelectionContext: プレイヤー選択状態の模擬
     *
     * @param Story - ラップするストーリーコンポーネント
     * @param args - ストーリー引数（testIdを除外）
     * @returns 装飾されたストーリー
     */
    (Story, { args: { testId: _testId, ...args } }): React.JSX.Element => (
      <MockCurrentLayoutProvider>
        <WorkspaceContextProvider>
          <PlayerSelectionContext.Provider value={playerSelection}>
            <Story {...args} />
          </PlayerSelectionContext.Provider>
        </WorkspaceContextProvider>
      </MockCurrentLayoutProvider>
    ),
  ],
  /**
   * Play Function - 自動インタラクション実行
   *
   * testIdが指定された場合、自動的にホバーインタラクションを実行。
   * サブメニューの展開状態をテストするために使用されます。
   *
   * @param canvasElement - Storybookキャンバス要素
   * @param args - ストーリー引数
   */
  play: async ({ canvasElement, args }) => {
    if (!args.testId) {
      return;
    }
    const canvas = within(canvasElement);
    await userEvent.hover(await canvas.findByTestId(args.testId));
  },
} satisfies Meta<StoryArgs>;

/**
 * Mock Player Selection - プレイヤー選択状態の模擬データ
 *
 * AppMenuのFile > Recent Files機能をテストするための模擬データ。
 * 様々なデータソースタイプと長いファイル名のテストケースを含みます。
 */
const playerSelection: PlayerSelection = {
  selectSource: () => {},
  selectRecent: () => {},
  recentSources: [
    // 長いファイル名のテスト（テキスト省略機能の確認）
    {
      id: "1111",
      title: "NuScenes-v1.0-mini-scene-0655-reallllllllly-long-name-8829908290831091.bag",
    },
    // ROS 1接続のテスト
    { id: "2222", title: "http://localhost:11311", label: "ROS 1" },
    // Rosbridge WebSocket接続のテスト
    { id: "3333", title: "ws://localhost:9090/", label: "Rosbridge (ROS 1 & 2)" },
    // Foxglove WebSocket接続のテスト
    { id: "4444", title: "ws://localhost:8765", label: "Foxglove WebSocket" },
    // Velodyne Lidarデバイス接続のテスト
    { id: "5555", title: "2369", label: "Velodyne Lidar" },
    // Storybook非表示項目（表示制限のテスト）
    { id: "6666", title: "THIS ITEM SHOULD BE HIDDEN IN STORYBOOKS", label: "!!!!!!!!!!!!" },
  ],
  availableSources: [],
};

type Story = StoryObj<StoryArgs>;

/**
 * Default Story - デフォルト表示ストーリー
 *
 * AppMenuの基本的な表示状態を確認するストーリー。
 * メニューが開いた状態で表示され、全体的なレイアウトを確認できます。
 */
export const Default: Story = {};

// ========================================
// File Menu Stories - Fileメニューストーリー群
// ========================================

/**
 * File Menu Dark Theme - Fileメニュー（ダークテーマ）
 *
 * Fileメニューの展開状態をダークテーマで表示。
 * Recent Files一覧とメニュー項目の確認が可能です。
 */
export const FileMenuDark: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "dark" },
};

/**
 * File Menu Dark Chinese - Fileメニュー（ダークテーマ・中国語）
 *
 * 中国語ローカライゼーションでのFileメニュー表示テスト。
 * 多言語対応とテキスト長の調整を確認できます。
 */
export const FileMenuDarkChinese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "dark", forceLanguage: "zh" },
};

/**
 * File Menu Dark Japanese - Fileメニュー（ダークテーマ・日本語）
 *
 * 日本語ローカライゼーションでのFileメニュー表示テスト。
 * 日本語文字の表示とレイアウト調整を確認できます。
 */
export const FileMenuDarkJapanese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "dark", forceLanguage: "ja" },
};

/**
 * File Menu Light Theme - Fileメニュー（ライトテーマ）
 *
 * Fileメニューの展開状態をライトテーマで表示。
 * ダークテーマとの視覚的差異を確認できます。
 */
export const FileMenuLight: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "light" },
};

/**
 * File Menu Light Chinese - Fileメニュー（ライトテーマ・中国語）
 */
export const FileMenuLightChinese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

/**
 * File Menu Light Japanese - Fileメニュー（ライトテーマ・日本語）
 */
export const FileMenuLightJapanese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};

// ========================================
// View Menu Stories - Viewメニューストーリー群
// ========================================

/**
 * View Menu Dark Theme - Viewメニュー（ダークテーマ）
 *
 * Viewメニューの展開状態をダークテーマで表示。
 * サイドバー制御とレイアウト管理機能を確認できます。
 */
export const ViewMenuDark: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "dark" },
};

/**
 * View Menu Dark Chinese - Viewメニュー（ダークテーマ・中国語）
 */
export const ViewMenuDarkChinese: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "dark", forceLanguage: "zh" },
};

/**
 * View Menu Dark Japanese - Viewメニュー（ダークテーマ・日本語）
 */
export const ViewMenuDarkJapanese: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "dark", forceLanguage: "ja" },
};

/**
 * View Menu Light Theme - Viewメニュー（ライトテーマ）
 */
export const ViewMenuLight: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "light" },
};

/**
 * View Menu Light Chinese - Viewメニュー（ライトテーマ・中国語）
 */
export const ViewMenuLightChinese: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

/**
 * View Menu Light Japanese - Viewメニュー（ライトテーマ・日本語）
 */
export const ViewMenuLightJapanese: Story = {
  ...ViewMenuLight,
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};

// ========================================
// Help Menu Stories - Helpメニューストーリー群
// ========================================

/**
 * Help Menu Dark Theme - Helpメニュー（ダークテーマ）
 *
 * Helpメニューの展開状態をダークテーマで表示。
 * ドキュメントリンクとサポート情報を確認できます。
 */
export const HelpMenuDark: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "dark" },
};

/**
 * Help Menu Dark Chinese - Helpメニュー（ダークテーマ・中国語）
 */
export const HelpMenuDarkChinese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "dark", forceLanguage: "zh" },
};

/**
 * Help Menu Dark Japanese - Helpメニュー（ダークテーマ・日本語）
 */
export const HelpMenuDarkJapanese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "dark", forceLanguage: "ja" },
};

/**
 * Help Menu Light Theme - Helpメニュー（ライトテーマ）
 */
export const HelpMenuLight: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "light" },
};

/**
 * Help Menu Light Chinese - Helpメニュー（ライトテーマ・中国語）
 */
export const HelpMenuLightChinese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

/**
 * Help Menu Light Japanese - Helpメニュー（ライトテーマ・日本語）
 */
export const HelpMenuLightJapanese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};
