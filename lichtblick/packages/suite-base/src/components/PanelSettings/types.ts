// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { SvgIconProps } from "@mui/material";

import { PanelSettings } from "@lichtblick/suite";
import { MessagePipelineContext } from "@lichtblick/suite-base/components/MessagePipeline";
import { PanelStateStore } from "@lichtblick/suite-base/context/PanelStateContext";

/**
 * パネル拡張機能の設定を管理するための型定義
 *
 * @description 各パネルタイプとスキーマ名の組み合わせで、
 * パネル固有の設定を管理するためのネストされた設定オブジェクト
 *
 * @example
 * ```typescript
 * const extensionSettings: ExtensionSettings = {
 *   "3d": {
 *     "geometry_msgs/Point": {
 *       settings: (config) => ({ ... })
 *     }
 *   }
 * };
 * ```
 */
export type ExtensionSettings = Record<string, Record<string, PanelSettings<unknown>>>;

/**
 * 設定ツリーを構築するために必要なプロパティ
 *
 * @description パネルの設定ツリーを動的に構築するための
 * 設定データと状態情報を統合したプロパティ群
 *
 * @interface BuildSettingsTreeProps
 */
export type BuildSettingsTreeProps = {
  /** パネルの現在の設定オブジェクト */
  config: Record<string, unknown> | undefined;
  /** 拡張機能固有の設定管理オブジェクト */
  extensionSettings: ExtensionSettings;
  /** メッセージパイプラインの状態取得関数 */
  messagePipelineState: () => MessagePipelineContext;
  /** パネルタイプの識別子 */
  panelType: string | undefined;
  /** 選択されたパネルの一意識別子 */
  selectedPanelId: string | undefined;
} & Pick<PanelStateStore, "settingsTrees">;

/**
 * アクションメニューコンポーネントのプロパティ
 *
 * @description パネル設定のアクションメニューで使用する
 * 各種アクションとUI設定を定義するプロパティ
 *
 * @interface ActionMenuProps
 */
export type ActionMenuProps = {
  /** 設定の共有機能を有効にするかどうか */
  allowShare: boolean;
  /** 設定をデフォルトにリセットするコールバック */
  onReset: () => void;
  /** 設定を共有するためのコールバック */
  onShare: () => void;
  /** アイコンのサイズ（デフォルト: "medium"） */
  fontSize?: SvgIconProps["fontSize"];
};
