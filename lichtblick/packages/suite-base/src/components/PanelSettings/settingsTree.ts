// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as _ from "lodash-es";

import { Immutable, SettingsTree, SettingsTreeNode } from "@lichtblick/suite";
import { getTopicToSchemaNameMap } from "@lichtblick/suite-base/components/MessagePipeline/selectors";
import { BuildSettingsTreeProps } from "@lichtblick/suite-base/components/PanelSettings/types";
import { maybeCast } from "@lichtblick/suite-base/util/maybeCast";

/**
 * パネル設定のツリー構造を動的に構築する関数
 *
 * @description 選択されたパネルの基本設定と拡張設定を統合し、
 * トピック固有の設定を含む完全な設定ツリーを構築する。
 * メッセージパイプラインの状態を利用して、利用可能なトピックの
 * スキーマ情報を取得し、対応する拡張設定を適用する。
 *
 * @param props - 設定ツリー構築に必要なプロパティ
 * @param props.config - パネルの現在の設定オブジェクト
 * @param props.extensionSettings - 拡張機能固有の設定管理オブジェクト
 * @param props.messagePipelineState - メッセージパイプラインの状態取得関数
 * @param props.panelType - パネルタイプの識別子
 * @param props.selectedPanelId - 選択されたパネルの一意識別子
 * @param props.settingsTrees - PanelStateStoreから取得した設定ツリー群
 *
 * @returns 構築された設定ツリー、または構築不可能な場合は undefined
 *
 * @example
 * ```typescript
 * const settingsTree = buildSettingsTree({
 *   config: { topics: { '/camera/image': { visible: true } } },
 *   extensionSettings: extensionSettings,
 *   messagePipelineState: () => messagePipelineContext,
 *   panelType: "3d",
 *   selectedPanelId: "panel-1",
 *   settingsTrees: storedSettingsTrees
 * });
 * ```
 */
export const buildSettingsTree = ({
  config,
  extensionSettings,
  messagePipelineState,
  panelType,
  selectedPanelId,
  settingsTrees,
}: BuildSettingsTreeProps): Immutable<SettingsTree> | undefined => {
  // 必要なパラメータが揃っていない場合は構築不可能
  if (selectedPanelId == undefined || panelType == undefined) {
    return undefined;
  }

  // 指定されたパネルの設定ツリーを取得
  const set = settingsTrees[selectedPanelId];
  if (!set) {
    return undefined;
  }

  // メッセージパイプラインからトピック→スキーマ名のマッピングを取得
  const topicToSchemaNameMap = getTopicToSchemaNameMap(messagePipelineState());

  // 設定ツリーに含まれるトピック一覧を取得
  const topics = Object.keys(set.nodes.topics?.children ?? {});

  // パネル設定からトピック設定を抽出
  const topicsConfig = maybeCast<{ topics: Record<string, unknown> }>(config)?.topics;

  // 各トピックに対する設定ノードを構築
  const topicsSettings = topics.reduce<Record<string, SettingsTreeNode | undefined>>(
    (acc, topic) => {
      const schemaName = topicToSchemaNameMap[topic];
      // スキーマ名が存在し、対応する拡張設定が存在する場合のみ設定を適用
      if (schemaName != undefined) {
        acc[topic] = extensionSettings[panelType]?.[schemaName]?.settings(topicsConfig?.[topic]);
      }
      return acc;
    },
    {},
  );

  // 基本設定ツリーと拡張設定を統合した新しい設定ツリーを返す
  return {
    ...set,
    nodes: {
      ...set.nodes,
      topics: {
        ...set.nodes.topics,
        children: _.merge({}, set.nodes.topics?.children, topicsSettings),
      },
    },
  };
};
