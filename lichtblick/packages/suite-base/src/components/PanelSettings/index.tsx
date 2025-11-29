// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Divider, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUnmount } from "react-use";

import { SettingsTree } from "@lichtblick/suite";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { useConfigById } from "@lichtblick/suite-base/PanelAPI";
import { useMessagePipelineGetter } from "@lichtblick/suite-base/components/MessagePipeline";
import { ActionMenu } from "@lichtblick/suite-base/components/PanelSettings/ActionMenu";
import { EmptyWrapper } from "@lichtblick/suite-base/components/PanelSettings/EmptyWrapper";
import { buildSettingsTree } from "@lichtblick/suite-base/components/PanelSettings/settingsTree";
import SettingsTreeEditor from "@lichtblick/suite-base/components/SettingsTreeEditor";
import { ShareJsonModal } from "@lichtblick/suite-base/components/ShareJsonModal";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";
import Stack from "@lichtblick/suite-base/components/Stack";
import {
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
  useSelectedPanels,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { usePanelCatalog } from "@lichtblick/suite-base/context/PanelCatalogContext";
import {
  PanelStateStore,
  usePanelStateStore,
} from "@lichtblick/suite-base/context/PanelStateContext";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";
import { PanelConfig } from "@lichtblick/suite-base/types/panels";
import { TAB_PANEL_TYPE } from "@lichtblick/suite-base/util/globalConstants";
import { getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";

/**
 * レイアウト状態から単一パネルIDを取得するセレクター
 *
 * @description レイアウトが文字列の場合（単一パネル）、そのIDを返す。
 * 複数パネルの場合は undefined を返す。
 *
 * @param state - レイアウト状態
 * @returns 単一パネルのID、または undefined
 */
const singlePanelIdSelector = (state: LayoutState) =>
  typeof state.selectedLayout?.data?.layout === "string"
    ? state.selectedLayout.data.layout
    : undefined;

/**
 * パネル状態ストアからシーケンス番号増加関数を取得するセレクター
 *
 * @param store - パネル状態ストア
 * @returns シーケンス番号増加関数
 */
const selectIncrementSequenceNumber = (store: PanelStateStore) => store.incrementSequenceNumber;

/**
 * 空の設定ツリーの定数
 *
 * @description 設定が存在しない場合に使用するフォールバック設定ツリー
 */
const EMPTY_SETTINGS_TREE: SettingsTree = Object.freeze({
  actionHandler: () => undefined,
  nodes: {},
});

/**
 * PanelSettingsコンポーネントのプロパティ
 *
 * @interface PanelSettingsProps
 */
type PanelSettingsProps = React.PropsWithChildren<{
  /** ツールバーを無効化するかどうか */
  disableToolbar?: boolean;
  /** テスト用の選択されたパネルID（テスト時のみ使用） */
  selectedPanelIdsForTests?: readonly string[];
}>;

/**
 * パネル設定管理のメインコンポーネント
 *
 * @description 選択されたパネルの設定を管理・表示する中核コンポーネント。
 * 以下の機能を提供する：
 * - パネル設定の動的構築と表示
 * - 設定のインポート/エクスポート機能
 * - 設定のデフォルト値へのリセット機能
 * - 新旧TopNavUIの切り替え対応
 * - 単一パネルの自動選択
 * - 設定変更時のリアルタイム反映
 *
 * @param props - PanelSettingsのプロパティ
 * @param props.disableToolbar - ツールバーを無効化するかどうか
 * @param props.selectedPanelIdsForTests - テスト用の選択されたパネルID
 *
 * @returns パネル設定管理コンポーネント
 *
 * @example
 * ```typescript
 * <PanelSettings disableToolbar={false} />
 * ```
 */
export default function PanelSettings({
  disableToolbar = false,
  selectedPanelIdsForTests,
}: PanelSettingsProps): React.JSX.Element {
  const { t } = useTranslation("panelSettings");
  const singlePanelId = useCurrentLayoutSelector(singlePanelIdSelector);
  const {
    selectedPanelIds: originalSelectedPanelIds,
    setSelectedPanelIds,
    selectAllPanels,
  } = useSelectedPanels();
  const selectedPanelIds = selectedPanelIdsForTests ?? originalSelectedPanelIds;

  const [enableNewTopNav = true] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);

  /**
   * 単一パネルの自動選択効果
   *
   * @description パネルが選択されておらず、レイアウトに単一パネルのみが
   * 存在する場合、自動的にそのパネルを選択する。
   */
  useEffect(() => {
    if (selectedPanelIds.length === 0 && singlePanelId != undefined) {
      selectAllPanels();
    }
  }, [selectAllPanels, selectedPanelIds, singlePanelId]);

  /**
   * 選択されたパネルのIDを取得
   *
   * @description 選択されたパネルが1つだけの場合、そのIDを返す。
   * 複数選択または未選択の場合は undefined を返す。
   */
  const selectedPanelId = useMemo(
    () => (selectedPanelIds.length === 1 ? selectedPanelIds[0] : undefined),
    [selectedPanelIds],
  );

  /**
   * 設定サイドバーが閉じられた時の自動選択解除
   *
   * @description コンポーネントがアンマウントされる際に、
   * 選択されたパネルがあれば自動的に選択を解除する。
   */
  useUnmount(() => {
    if (selectedPanelId != undefined) {
      setSelectedPanelIds([]);
    }
  });

  const panelCatalog = usePanelCatalog();
  const { getCurrentLayoutState: getCurrentLayout, savePanelConfigs } = useCurrentLayoutActions();

  /**
   * 選択されたパネルのタイプを取得
   */
  const panelType = useMemo(
    () => (selectedPanelId != undefined ? getPanelTypeFromId(selectedPanelId) : undefined),
    [selectedPanelId],
  );

  /**
   * パネルカタログからパネル情報を取得
   */
  const panelInfo = useMemo(
    () => (panelType != undefined ? panelCatalog.getPanelByType(panelType) : undefined),
    [panelCatalog, panelType],
  );

  const incrementSequenceNumber = usePanelStateStore(selectIncrementSequenceNumber);

  const [showShareModal, setShowShareModal] = useState(false);

  /**
   * 設定共有モーダルのメモ化
   *
   * @description 設定の共有（JSON形式でのインポート/エクスポート）を
   * 行うモーダルダイアログを管理する。
   */
  const shareModal = useMemo(() => {
    const panelConfigById = getCurrentLayout().selectedLayout?.data?.configById;
    if (selectedPanelId == undefined || !showShareModal || !panelConfigById) {
      return ReactNull;
    }
    return (
      <ShareJsonModal
        onRequestClose={() => {
          setShowShareModal(false);
        }}
        initialValue={panelConfigById[selectedPanelId] ?? {}}
        onChange={(config) => {
          savePanelConfigs({
            configs: [{ id: selectedPanelId, config: config as PanelConfig, override: true }],
          });
          incrementSequenceNumber(selectedPanelId);
        }}
        title={t("importOrExportSettings")}
      />
    );
  }, [
    getCurrentLayout,
    selectedPanelId,
    showShareModal,
    savePanelConfigs,
    incrementSequenceNumber,
    t,
  ]);

  const [config, , extensionSettings] = useConfigById(selectedPanelId);
  const messagePipelineState = useMessagePipelineGetter();

  const storedSettingsTrees = usePanelStateStore(({ settingsTrees }) => settingsTrees);

  /**
   * 設定ツリーの構築
   *
   * @description パネルの基本設定と拡張設定を統合した
   * 設定ツリーを動的に構築する。
   */
  const settingsTree = useMemo(
    () =>
      buildSettingsTree({
        config,
        extensionSettings,
        messagePipelineState,
        panelType,
        selectedPanelId,
        settingsTrees: storedSettingsTrees,
      }),
    [
      config,
      extensionSettings,
      messagePipelineState,
      panelType,
      selectedPanelId,
      /**
       * The core issue is that settingsTrees object in the PanelStateStore is being
       * mutated on each render, leading to unnecessary calls to buildSettingsTree
       * To address this, we need to ensure that settingsTrees remains
       * referentially stable unless its actual content changes.
       */
      storedSettingsTrees,
    ],
  );

  /**
   * 設定をデフォルト値にリセットするコールバック
   *
   * @description 選択されたパネルの設定を空のオブジェクトに設定し、
   * デフォルト値を適用する。
   */
  const resetToDefaults = useCallback(() => {
    if (selectedPanelId) {
      savePanelConfigs({
        configs: [{ id: selectedPanelId, config: {}, override: true }],
      });
      incrementSequenceNumber(selectedPanelId);
    }
  }, [incrementSequenceNumber, savePanelConfigs, selectedPanelId]);

  // パネルが選択されていない場合の空状態表示
  if (selectedPanelId == undefined) {
    return <EmptyWrapper enableNewTopNav>{t("selectAPanelToEditItsSettings")}</EmptyWrapper>;
  }

  // 設定がまだロードされていない場合の表示
  if (!config) {
    return <EmptyWrapper enableNewTopNav>{t("loadingPanelSettings")}</EmptyWrapper>;
  }

  const showTitleField = panelInfo != undefined && panelInfo.hasCustomToolbar !== true;
  const title = panelInfo?.title ?? t("unknown");
  const isSettingTreeDefined = settingsTree != undefined;

  return (
    <SidebarContent
      disablePadding={enableNewTopNav || isSettingTreeDefined}
      disableToolbar={disableToolbar}
      title={t("currentSettingsPanelName", { title })}
      trailingItems={[
        <ActionMenu
          key={1}
          allowShare={panelType !== TAB_PANEL_TYPE}
          onReset={resetToDefaults}
          onShare={() => {
            setShowShareModal(true);
          }}
        />,
      ]}
    >
      {shareModal}
      <Stack gap={2} justifyContent="flex-start" flex="auto">
        <Stack flex="auto">
          {settingsTree && enableNewTopNav && (
            <>
              <Stack
                paddingLeft={0.75}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle2">{t("panelName", { title })}</Typography>
                <ActionMenu
                  key={1}
                  fontSize="small"
                  allowShare={panelType !== TAB_PANEL_TYPE}
                  onReset={resetToDefaults}
                  onShare={() => {
                    setShowShareModal(true);
                  }}
                />
              </Stack>
              <Divider />
            </>
          )}
          {settingsTree || showTitleField ? (
            <SettingsTreeEditor
              key={selectedPanelId}
              settings={settingsTree ?? EMPTY_SETTINGS_TREE}
              variant="panel"
            />
          ) : (
            <Stack
              flex="auto"
              alignItems="center"
              justifyContent="center"
              paddingX={enableNewTopNav ? 1 : 0}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                {t("panelDoesNotHaveSettings")}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </SidebarContent>
  );
}
