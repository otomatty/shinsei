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
  MosaicNode,
  MosaicPath,
  createDragToUpdates,
  createHideUpdate,
  createRemoveUpdate,
  getLeaves,
  getNodeAtPath,
  updateTree,
} from "react-mosaic-component";
import { MarkOptional } from "ts-essentials";

import { filterMap } from "@lichtblick/den/collection";
import {
  AddPanelPayload,
  ChangePanelLayoutPayload,
  ClosePanelPayload,
  ConfigsPayload,
  CreateTabPanelPayload,
  DropPanelPayload,
  EndDragPayload,
  LayoutData,
  MoveTabPayload,
  PanelsActions,
  SaveConfigsPayload,
  SaveFullConfigPayload,
  SplitPanelPayload,
  StartDragPayload,
  SwapPanelPayload,
} from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { TabPanelConfig } from "@lichtblick/suite-base/types/layouts";
import { MosaicDropTargetPosition, PlaybackConfig } from "@lichtblick/suite-base/types/panels";
import { TAB_PANEL_TYPE } from "@lichtblick/suite-base/util/globalConstants";
import {
  DEFAULT_TAB_PANEL_CONFIG,
  addPanelToTab,
  createAddUpdates,
  getAllPanelIds,
  getConfigsForNestedPanelsInsideTab,
  getPanelIdForType,
  getPanelIdsInsideTabPanels,
  getPanelTypeFromId,
  getPathFromNode,
  getSaveConfigsPayloadForAddedPanel,
  inlineTabPanelLayouts,
  moveTabBetweenTabPanels,
  removePanelFromTabPanel,
  reorderTabWithinTabPanel,
  replaceAndRemovePanels,
  updateTabPanelLayout,
} from "@lichtblick/suite-base/util/layout";

import { isTabPanelConfig } from "../../util/layout";

/**
 * レイアウト管理システムのreducers
 *
 * このファイルは、Lichtblick Suiteのレイアウト管理システムの中核を担う
 * reducers関数群を定義しています。React Mosaicベースの複雑なレイアウト操作を
 * 関数型プログラミングのパターンで実装し、予測可能で安全な状態更新を提供します。
 *
 * ## アーキテクチャ概要
 * - **React Mosaic**: 分割可能なレイアウトシステム
 * - **タブパネル**: 複数パネルをタブで切り替え
 * - **ドラッグ&ドロップ**: 直感的なパネル配置
 * - **設定管理**: パネル個別設定の永続化
 * - **immutable更新**: 状態の不変性保証
 *
 * ## 主要機能
 * 1. **パネル操作**: 追加、削除、分割、交換
 * 2. **タブ管理**: タブ作成、移動、設定変更
 * 3. **ドラッグ処理**: 開始、終了、位置変更
 * 4. **設定保存**: パネル設定の管理
 * 5. **レイアウト変更**: 構造の動的変更
 *
 * ## 設計原則
 * - **純粋関数**: 副作用なしの状態変換
 * - **不変性**: 既存状態を変更せず新しい状態を返却
 * - **型安全**: TypeScriptによる厳密な型チェック
 * - **パフォーマンス**: 参照等価性による最適化
 *
 * @see PanelsActions - 実行可能なアクション定義
 * @see LayoutData - レイアウトデータの型定義
 * @see React Mosaic - 基盤となるレイアウトライブラリ
 */

/**
 * デフォルト再生設定
 *
 * アプリケーション全体で使用される標準的な再生設定です。
 * 新しいレイアウトやリセット時のベースライン値として使用されます。
 */
export const defaultPlaybackConfig: PlaybackConfig = {
  speed: 1.0,
};

/**
 * パネルレイアウト変更処理
 *
 * レイアウト構造を変更し、不要になったパネル設定のクリーンアップを行います。
 * パネルの追加・削除・移動時に呼び出され、メモリリークを防止します。
 *
 * ## 処理内容
 * 1. 新しいレイアウトから有効なパネルIDを抽出
 * 2. タブパネル内のネストしたパネルIDも取得
 * 3. 不要な設定を除去（trimConfigByIdが有効な場合）
 * 4. 新しい状態オブジェクトを返却
 *
 * ## 最適化ポイント
 * - `trimConfigById`: 不要な設定の自動削除
 * - メモリ効率: 使用されない設定の除去
 * - 参照等価性: 変更がない場合は同じオブジェクトを返却
 *
 * @param state - 現在のレイアウト状態
 * @param payload - レイアウト変更のペイロード
 * @param payload.layout - 新しいレイアウト構造
 * @param payload.trimConfigById - 不要な設定を削除するかどうか
 * @returns 更新されたレイアウト状態
 */
function changePanelLayout(
  state: LayoutData,
  { layout, trimConfigById = true }: ChangePanelLayoutPayload,
): LayoutData {
  // 新しいレイアウトから全パネルIDを取得（空文字列は除外）
  const panelIds: string[] = getLeaves(layout ?? ReactNull).filter(
    (panelId) => !_.isEmpty(panelId),
  );

  // タブパネル内にネストしたパネルIDも取得
  const panelIdsInsideTabPanels = getPanelIdsInsideTabPanels(panelIds, state.configById);

  // 不要になったパネル設定を除去（メモリリーク防止）
  const configById = trimConfigById
    ? _.pick(state.configById, [...panelIdsInsideTabPanels, ...panelIds])
    : state.configById;

  return { ...state, configById, layout };
}

/**
 * パネル設定保存処理
 *
 * 複数パネルの設定を一括で保存し、タブパネルの特別処理も行います。
 * 設定の変更検出による最適化と、ネストしたパネル設定の管理を担当します。
 *
 * ## 処理フロー
 * 1. 各パネルの新旧設定をマージ
 * 2. 変更検出による最適化
 * 3. タブパネル設定の特別処理
 * 4. 不要設定のクリーンアップ
 *
 * ## 設定マージ戦略
 * - `override=true`: 完全上書き
 * - `override=false`: デフォルト → 既存 → 新規の順でマージ
 *
 * ## パフォーマンス最適化
 * - 変更検出: `_.isEqual`による深い比較
 * - 参照保持: 変更がない場合は同じオブジェクトを返却
 * - 部分更新: 変更されたパネルのみ処理
 *
 * @param state - 現在のレイアウト状態
 * @param payload - 保存する設定のペイロード
 * @param payload.configs - パネル設定の配列
 * @returns 更新されたレイアウト状態
 */
function savePanelConfigs(state: LayoutData, payload: SaveConfigsPayload): LayoutData {
  const { configs } = payload;
  const prevConfigById = state.configById;

  // 新しい設定を既存設定にマージ
  // 注意: 設定が変更されていない場合、同じオブジェクト参照を維持
  const newConfigById = configs.reduce(
    (currentSavedProps, { id, config, defaultConfig = {}, override = false }) => {
      if (override) {
        // 完全上書きモード
        return { ...currentSavedProps, [id]: config };
      }

      const oldConfig = currentSavedProps[id];
      const newConfig = {
        // マージ優先順位: デフォルト設定 < 既存設定 < 新規設定
        ...defaultConfig,
        ...currentSavedProps[id],
        ...config,
      };

      // 設定が変更されていない場合は同じオブジェクトを返却（最適化）
      if (_.isEqual(oldConfig, newConfig)) {
        return currentSavedProps;
      }

      return { ...currentSavedProps, [id]: newConfig };
    },
    state.configById,
  );

  // タブパネルの設定が保存された場合の特別処理
  const tabPanelConfigSaved = configs.find(({ id }) => getPanelTypeFromId(id) === TAB_PANEL_TYPE);
  if (tabPanelConfigSaved) {
    // eslint-disable-next-line no-restricted-syntax
    const panelIds = getLeaves(state.layout ?? null);
    const panelIdsInsideTabPanels = getPanelIdsInsideTabPanels(panelIds, newConfigById);

    // タブ内から削除されたパネルの設定をクリーンアップ
    return {
      ...state,
      configById: _.pick(newConfigById, [...panelIdsInsideTabPanels, ...panelIds]),
    };
  }

  // 設定に変更がない場合は同じ状態オブジェクトを返却
  if (prevConfigById === newConfigById) {
    return state;
  }

  return { ...state, configById: newConfigById };
}

/**
 * 特定タイプのパネル設定一括更新処理
 *
 * 指定されたパネルタイプの全インスタンスに対して、
 * 同じ変換関数を適用して設定を一括更新します。
 *
 * ## 使用例
 * - 全3Dパネルのカメラ設定を統一
 * - 全プロットパネルの軸設定を変更
 * - テーマ変更時の色設定更新
 *
 * @param state - 現在のレイアウト状態
 * @param payload - 更新処理のペイロード
 * @param payload.panelType - 対象パネルタイプ
 * @param payload.perPanelFunc - 各パネルに適用する変換関数
 * @returns 更新されたレイアウト状態
 */
function saveFullPanelConfig(state: LayoutData, payload: SaveFullConfigPayload): LayoutData {
  const { panelType, perPanelFunc } = payload;
  const newProps = { ...state.configById };
  const fullConfig = state.configById;

  // 指定タイプの全パネルに変換関数を適用
  for (const [panelId, panelConfig] of Object.entries(fullConfig)) {
    if (getPanelTypeFromId(panelId) === panelType) {
      newProps[panelId] = perPanelFunc(panelConfig);
    }
  }

  return { ...state, configById: newProps };
}

/**
 * パネル閉じる処理
 *
 * 指定されたパネルをレイアウトから削除します。
 * タブパネル内のパネルと通常のパネルで異なる処理を行います。
 *
 * ## 処理パターン
 * 1. **タブ内パネル**: タブパネル設定からパネルを除去
 * 2. **単一パネル**: レイアウトを空にする
 * 3. **通常パネル**: Mosaicツリーからノードを削除
 *
 * ## 自動調整機能
 * - 削除後のレイアウト構造自動調整
 * - 隣接パネルの自動リサイズ
 * - 空になったタブの処理
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - 削除するパネルの情報
 * @param payload.tabId - タブパネルID（タブ内パネルの場合）
 * @param payload.root - ルートレイアウト
 * @param payload.path - パネルのパス
 * @returns 更新されたレイアウト状態
 */
const closePanel = (
  panelsState: LayoutData,
  { tabId, root, path }: ClosePanelPayload,
): LayoutData => {
  if (tabId != undefined) {
    // タブパネル内のパネルを削除
    const config = panelsState.configById[tabId] as TabPanelConfig;
    const saveConfigsPayload = removePanelFromTabPanel(path, config, tabId);
    return savePanelConfigs(panelsState, saveConfigsPayload);
  } else if (typeof root === "string") {
    // レイアウトが単一パネルの場合、レイアウトをクリア
    return changePanelLayout(panelsState, { layout: undefined });
  }

  // 通常のパネル削除（Mosaicツリーからノード除去）
  const update = createRemoveUpdate(root, path);
  const newLayout = updateTree(root, [update]);
  return changePanelLayout(panelsState, { layout: newLayout });
};

/**
 * パネル分割処理
 *
 * 既存のパネルを分割して新しいパネルを追加します。
 * 分割方向（縦・横）を指定でき、元パネルの設定を新パネルに複製できます。
 *
 * ## 分割パターン
 * 1. **タブ内分割**: タブパネル内のレイアウトを分割
 * 2. **通常分割**: メインレイアウトを分割
 *
 * ## 設定複製処理
 * - 新パネルのID生成
 * - 元パネル設定の複製
 * - タブパネル内ネストパネルの設定複製
 *
 * ## レイアウト更新
 * - Mosaicツリーの構造変更
 * - 分割方向の設定（horizontal/vertical）
 * - 自動リサイズ調整
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - 分割処理のペイロード
 * @param payload.id - 分割元パネルID
 * @param payload.tabId - タブパネルID（タブ内分割の場合）
 * @param payload.direction - 分割方向
 * @param payload.config - 新パネルの設定
 * @param payload.root - ルートレイアウト
 * @param payload.path - パネルのパス
 * @returns 更新されたレイアウト状態
 */
const splitPanel = (
  panelsState: LayoutData,
  { id, tabId, direction, config, root, path }: SplitPanelPayload,
): LayoutData => {
  const type = getPanelTypeFromId(id);
  const newId = getPanelIdForType(type);
  let newPanelsState = { ...panelsState };
  const { configById } = newPanelsState;

  // タブパネル内での分割処理
  if (tabId != undefined) {
    const prevConfig = configById[tabId] as TabPanelConfig;
    const activeTabLayout = prevConfig.tabs[prevConfig.activeTabIdx]?.layout;

    if (activeTabLayout != undefined) {
      // タブ内レイアウトを分割
      const newTabLayout = updateTree(activeTabLayout, [
        {
          path: getPathFromNode(id, activeTabLayout),
          spec: { $set: { first: id, second: newId, direction } },
        },
      ]);

      // タブパネル設定を更新
      const newTabConfig = updateTabPanelLayout(newTabLayout, prevConfig);
      newPanelsState = savePanelConfigs(newPanelsState, {
        configs: [
          { id: tabId, config: newTabConfig },
          { id: newId, config },
        ],
      });
    }
  } else {
    // メインレイアウトの分割
    newPanelsState = changePanelLayout(newPanelsState, {
      layout: updateTree(root, [{ path, spec: { $set: { first: id, second: newId, direction } } }]),
      trimConfigById: type !== TAB_PANEL_TYPE,
    });
  }

  // 新パネルの設定を保存（ネストパネルの設定複製も含む）
  newPanelsState = savePanelConfigs(
    newPanelsState,
    getSaveConfigsPayloadForAddedPanel({ id: newId, config, savedProps: configById }),
  );

  return newPanelsState;
};

/**
 * パネル交換処理
 *
 * 既存のパネルを異なるタイプのパネルに交換します。
 * 位置とサイズは保持され、新しいパネルタイプの設定が適用されます。
 *
 * ## 交換パターン
 * 1. **タブ内交換**: タブパネル内のパネルを交換
 * 2. **通常交換**: メインレイアウトのパネルを交換
 *
 * ## 処理内容
 * - 新しいパネルタイプのID生成
 * - レイアウト構造の更新
 * - 新パネルの設定適用
 * - 古いパネル設定の削除
 *
 * ## 設定継承
 * - 位置・サイズの保持
 * - 新タイプのデフォルト設定適用
 * - カスタム設定の上書き
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - 交換処理のペイロード
 * @param payload.tabId - タブパネルID（タブ内交換の場合）
 * @param payload.originalId - 交換元パネルID
 * @param payload.type - 新しいパネルタイプ
 * @param payload.config - 新パネルの設定
 * @param payload.root - ルートレイアウト
 * @param payload.path - パネルのパス
 * @returns 更新されたレイアウト状態
 */
const swapPanel = (
  panelsState: LayoutData,
  { tabId, originalId, type, config, root, path }: MarkOptional<SwapPanelPayload, "originalId">,
): LayoutData => {
  const newId = getPanelIdForType(type);
  let newPanelsState = { ...panelsState };

  // タブパネル内でのパネル交換
  if (tabId != undefined && originalId != undefined) {
    const tabSavedProps = newPanelsState.configById[tabId] as TabPanelConfig | undefined;

    if (tabSavedProps) {
      const activeTabLayout = tabSavedProps.tabs[tabSavedProps.activeTabIdx]?.layout;

      if (activeTabLayout != undefined) {
        // タブ内レイアウトでパネルを交換
        const newTabLayout = replaceAndRemovePanels({ originalId, newId }, activeTabLayout);
        const newTabConfig = updateTabPanelLayout(newTabLayout, tabSavedProps);

        newPanelsState = savePanelConfigs(newPanelsState, {
          configs: [{ id: tabId, config: newTabConfig }],
        });
      }
    }
  } else {
    // メインレイアウトでのパネル交換
    newPanelsState = changePanelLayout(newPanelsState, {
      layout: updateTree(root, [{ path, spec: { $set: newId } }]),
      trimConfigById: type !== TAB_PANEL_TYPE,
    });
  }

  // 新パネルの設定を保存
  newPanelsState = savePanelConfigs(
    newPanelsState,
    getSaveConfigsPayloadForAddedPanel({
      id: newId,
      config,
      savedProps: newPanelsState.configById,
    }),
  );

  return newPanelsState;
};

/**
 * 単一タブパネル作成処理
 *
 * 複数のパネルを1つのタブにまとめて新しいタブパネルを作成します。
 * 複雑なレイアウトを単純化したい場合に使用されます。
 *
 * ## 処理フロー
 * 1. 新しいタブパネルIDを生成
 * 2. 指定されたパネルをタブ内レイアウトに統合
 * 3. ネストしたタブパネルのレイアウトを展開
 * 4. 不要なパネルを除去してタブレイアウトを構築
 * 5. タブパネル設定とネストパネル設定を保存
 *
 * ## レイアウト変換
 * - 複数パネル → 単一タブ内のレイアウト
 * - ネストタブの展開処理
 * - パネル設定の移行・複製
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - タブパネル作成のペイロード
 * @param payload.idToReplace - 置き換え対象のパネルID
 * @param payload.layout - 元のレイアウト
 * @param payload.idsToRemove - 削除するパネルIDの配列
 * @returns 更新されたレイアウト状態
 */
const createTabPanelWithSingleTab = (
  panelsState: LayoutData,
  { idToReplace, layout, idsToRemove }: CreateTabPanelPayload,
): LayoutData => {
  const newId = getPanelIdForType(TAB_PANEL_TYPE);
  const { configById } = panelsState;

  // 新しいタブ用のレイアウトを構築
  const layoutWithInlinedTabs = inlineTabPanelLayouts(layout, configById, idsToRemove);
  const panelIdsNotInNewTab = getAllPanelIds(layout, configById).filter(
    (leaf: string) => !idsToRemove.includes(leaf),
  );

  // タブ内レイアウトから不要なパネルを除去
  const tabLayout = replaceAndRemovePanels(
    { idsToRemove: panelIdsNotInNewTab },
    layoutWithInlinedTabs,
  );

  // メインレイアウトを更新（指定パネルをタブパネルに置換）
  const newLayout = replaceAndRemovePanels({ originalId: idToReplace, newId, idsToRemove }, layout);
  let newPanelsState = changePanelLayout(panelsState, {
    layout: newLayout ?? "",
    trimConfigById: false,
  });

  // タブパネル設定を作成
  const tabPanelConfig = {
    id: newId,
    config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs: [{ title: "1", layout: tabLayout }] },
  };

  // ネストパネルの設定を取得
  const nestedPanelConfigs = getConfigsForNestedPanelsInsideTab(
    idToReplace,
    newId,
    idsToRemove,
    configById,
  );

  // 設定を一括保存
  newPanelsState = savePanelConfigs(newPanelsState, {
    configs: [tabPanelConfig, ...nestedPanelConfigs],
  });

  return newPanelsState;
};

/**
 * 複数タブパネル作成処理
 *
 * 複数のパネルをそれぞれ個別のタブとして新しいタブパネルを作成します。
 * 各パネルが独立したタブになるため、切り替えて使用できます。
 *
 * ## 処理フロー
 * 1. 新しいタブパネルIDを生成
 * 2. 各パネルを個別のタブとして設定
 * 3. メインレイアウトを更新
 * 4. タブパネル設定とネストパネル設定を保存
 *
 * ## タブ構成
 * - 各パネル = 1つのタブ
 * - タブタイトル = パネルタイプ名
 * - 独立したタブレイアウト
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - タブパネル作成のペイロード
 * @param payload.idToReplace - 置き換え対象のパネルID
 * @param payload.layout - 元のレイアウト
 * @param payload.idsToRemove - 削除するパネルIDの配列
 * @returns 更新されたレイアウト状態
 */
const createTabPanelWithMultipleTabs = (
  panelsState: LayoutData,
  { idToReplace, layout, idsToRemove }: CreateTabPanelPayload,
): LayoutData => {
  const { configById } = panelsState;
  const newId = getPanelIdForType(TAB_PANEL_TYPE);

  // メインレイアウトを更新
  const newLayout = replaceAndRemovePanels({ originalId: idToReplace, newId, idsToRemove }, layout);
  let newPanelsState = changePanelLayout(
    { ...panelsState },
    { layout: newLayout ?? "", trimConfigById: false },
  );

  // 各パネルを個別のタブとして設定
  const tabs = idsToRemove.map((panelId) => ({
    title: getPanelTypeFromId(panelId),
    layout: panelId,
  }));

  // タブパネル設定を作成
  const tabPanelConfig = { id: newId, config: { ...DEFAULT_TAB_PANEL_CONFIG, tabs } };

  // ネストパネルの設定を取得
  const nestedPanelConfigs = getConfigsForNestedPanelsInsideTab(
    idToReplace,
    newId,
    idsToRemove,
    configById,
  );

  // 設定を一括保存
  newPanelsState = savePanelConfigs(newPanelsState, {
    configs: [tabPanelConfig, ...nestedPanelConfigs],
  });

  return newPanelsState;
};

/**
 * タブ移動処理
 *
 * タブパネル内のタブを移動します。
 * 同一タブパネル内での順序変更と、異なるタブパネル間での移動の両方に対応します。
 *
 * ## 移動パターン
 * 1. **同一タブパネル内**: タブの順序を変更
 * 2. **異なるタブパネル間**: タブを別のタブパネルに移動
 *
 * ## 処理内容
 * - ソースタブパネルからタブを除去
 * - ターゲットタブパネルにタブを追加
 * - タブの順序調整
 * - 関連する設定の移行
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - タブ移動のペイロード
 * @param payload.source - 移動元の情報
 * @param payload.target - 移動先の情報
 * @returns 更新されたレイアウト状態
 */
const moveTab = (panelsState: LayoutData, { source, target }: MoveTabPayload): LayoutData => {
  const saveConfigsPayload =
    source.panelId === target.panelId
      ? // 同一タブパネル内での順序変更
        reorderTabWithinTabPanel({ source, target, savedProps: panelsState.configById })
      : // 異なるタブパネル間での移動
        moveTabBetweenTabPanels({ source, target, savedProps: panelsState.configById });

  return savePanelConfigs(panelsState, saveConfigsPayload);
};

/**
 * パネル追加処理
 *
 * 新しいパネルをレイアウトに追加します。
 * メインレイアウトまたはタブパネル内への追加に対応します。
 *
 * ## 追加パターン
 * 1. **メインレイアウト**: 既存レイアウトの左側に追加
 * 2. **タブパネル内**: アクティブタブのレイアウトに追加
 *
 * ## レイアウト調整
 * - 空のレイアウト: 新パネルが唯一のパネルになる
 * - 既存レイアウト: 水平分割で左側に配置
 * - 自動リサイズ: 既存パネルとの比率調整
 *
 * ## 設定管理
 * - 新パネルの設定適用
 * - ネストパネルの設定複製
 * - タブパネル設定の更新
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - パネル追加のペイロード
 * @param payload.tabId - タブパネルID（タブ内追加の場合）
 * @param payload.id - 新パネルのID
 * @param payload.config - 新パネルの設定
 * @returns 更新されたレイアウト状態
 */
const addPanel = (panelsState: LayoutData, { tabId, id, config }: AddPanelPayload) => {
  let newPanelsState = { ...panelsState };
  let saveConfigsPayload: { configs: ConfigsPayload[] } = { configs: [] };

  // 新パネルの設定を準備
  if (config) {
    saveConfigsPayload = getSaveConfigsPayloadForAddedPanel({
      id,
      config,
      savedProps: panelsState.configById,
    });
  }

  // 追加先のレイアウトを取得
  let layout: MosaicNode<string> | undefined;
  if (tabId != undefined) {
    // タブパネル内への追加
    const tabPanelConfig = panelsState.configById[tabId];
    if (isTabPanelConfig(tabPanelConfig)) {
      layout = tabPanelConfig.tabs[tabPanelConfig.activeTabIdx]?.layout;
    }
  } else {
    // メインレイアウトへの追加
    layout = panelsState.layout;
  }

  // 新しいレイアウトを構築
  const fixedLayout: MosaicNode<string> = _.isEmpty(layout)
    ? id // 空のレイアウトの場合、新パネルが唯一のパネル
    : { direction: "row", first: id, second: layout! }; // 既存レイアウトの左側に追加

  const changeLayoutPayload = {
    layout: fixedLayout,
    trimConfigById: true,
  };

  // レイアウトを更新
  if (tabId != undefined && typeof changeLayoutPayload.layout === "string") {
    // タブパネル内のレイアウト更新
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [
        {
          id: tabId,
          config: updateTabPanelLayout(changeLayoutPayload.layout, {
            ...DEFAULT_TAB_PANEL_CONFIG,
            ...panelsState.configById[tabId],
          }),
        },
      ],
    });
  } else {
    // メインレイアウトの更新
    newPanelsState = changePanelLayout(newPanelsState, changeLayoutPayload);
  }

  // 新パネルの設定を保存
  newPanelsState = savePanelConfigs(newPanelsState, saveConfigsPayload);
  return newPanelsState;
};

/**
 * パネルドロップ処理
 *
 * ドラッグ&ドロップ操作でパネルを指定位置に配置します。
 * 精密な位置指定と、タブパネルへのドロップに対応します。
 *
 * ## ドロップパターン
 * 1. **メインレイアウト**: 指定位置にパネルを挿入
 * 2. **タブパネル内**: タブ内の指定位置にパネルを挿入
 *
 * ## 位置指定
 * - `destinationPath`: ドロップ先のパス
 * - `position`: ドロップ位置（left/right/top/bottom）
 * - 自動レイアウト調整
 *
 * ## 設定処理
 * - 新パネルの設定適用
 * - ネストパネルの設定複製
 * - タブパネル設定の更新
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - ドロップ処理のペイロード
 * @param payload.newPanelType - 新パネルのタイプ
 * @param payload.destinationPath - ドロップ先のパス
 * @param payload.position - ドロップ位置
 * @param payload.tabId - タブパネルID（タブ内ドロップの場合）
 * @param payload.config - 新パネルの設定
 * @returns 更新されたレイアウト状態
 */
const dropPanel = (
  panelsState: LayoutData,
  { newPanelType, destinationPath = [], position, tabId, config }: DropPanelPayload,
) => {
  const id = getPanelIdForType(newPanelType);
  const configs = [];

  // タブパネル内へのドロップ処理
  if (tabId != undefined) {
    const { configs: newConfigs } = addPanelToTab(
      id,
      destinationPath,
      position,
      panelsState.configById[tabId],
      tabId,
    );
    configs.push(...newConfigs);
  }

  // レイアウトを更新
  const newLayout =
    tabId != undefined
      ? panelsState.layout // タブ内ドロップの場合、メインレイアウトは変更なし
      : updateTree<string>(
          panelsState.layout!,
          createAddUpdates(panelsState.layout, id, destinationPath, position ?? "left"),
        );

  // 新パネルの設定を準備
  if (config) {
    const { configs: newConfigs } = getSaveConfigsPayloadForAddedPanel({
      id,
      config,
      savedProps: panelsState.configById,
    });
    configs.push(...newConfigs);
  }

  // レイアウトと設定を保存
  let newPanelsState = changePanelLayout(panelsState, {
    layout: newLayout,
    trimConfigById: true,
  });
  newPanelsState = savePanelConfigs(newPanelsState, { configs });

  return newPanelsState;
};

const dragWithinSameTab = (
  panelsState: LayoutData,
  {
    originalLayout,
    sourceTabId,
    position,
    destinationPath,
    ownPath,
    sourceTabConfig,
    sourceTabChildConfigs,
  }: {
    originalLayout: MosaicNode<string>;
    sourceTabId: string;
    position: MosaicDropTargetPosition;
    destinationPath: MosaicPath;
    ownPath: MosaicPath;
    sourceTabConfig: TabPanelConfig;
    sourceTabChildConfigs: ConfigsPayload[];
  },
): LayoutData => {
  const currentTabLayout = sourceTabConfig.tabs[sourceTabConfig.activeTabIdx]?.layout;
  let newPanelsState = { ...panelsState };
  if (typeof currentTabLayout === "string") {
    newPanelsState = changePanelLayout(panelsState, {
      layout: originalLayout,
      trimConfigById: false,
    });
    // We assume `begin` handler already removed tab from config. Here it is replacing it, or keeping it as is
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [
        { id: sourceTabId, config: updateTabPanelLayout(currentTabLayout, sourceTabConfig) },
        ...sourceTabChildConfigs,
      ],
    });
  } else if (currentTabLayout != undefined) {
    const updates = createDragToUpdates(currentTabLayout, ownPath, destinationPath, position);
    const newTree = updateTree(currentTabLayout, updates);

    newPanelsState = changePanelLayout(panelsState, {
      layout: originalLayout,
      trimConfigById: false,
    });
    newPanelsState = savePanelConfigs(newPanelsState, {
      configs: [
        {
          id: sourceTabId,
          config: updateTabPanelLayout(
            newTree,
            panelsState.configById[sourceTabId] as TabPanelConfig,
          ),
        },
        ...sourceTabChildConfigs,
      ],
    });
  }
  return newPanelsState;
};

const dragToMainFromTab = (
  panelsState: LayoutData,
  {
    originalLayout,
    sourceTabId,
    position,
    destinationPath,
    ownPath,
    sourceTabConfig,
    sourceTabChildConfigs,
  }: {
    originalLayout: MosaicNode<string>;
    sourceTabId: string;
    position: MosaicDropTargetPosition;
    destinationPath: MosaicPath;
    ownPath: MosaicPath;
    sourceTabConfig: TabPanelConfig;
    sourceTabChildConfigs: ConfigsPayload[];
  },
): LayoutData => {
  const currentTabLayout = sourceTabConfig.tabs[sourceTabConfig.activeTabIdx]?.layout;
  if (currentTabLayout == undefined) {
    return panelsState;
  }
  // Remove panel from tab layout
  const saveConfigsPayload = removePanelFromTabPanel(
    ownPath,
    panelsState.configById[sourceTabId] as TabPanelConfig,
    sourceTabId,
  );
  const panelConfigs = {
    ...saveConfigsPayload,
    configs: [...saveConfigsPayload.configs, ...sourceTabChildConfigs],
  };

  // Insert it into main layout
  const currentNode = getNodeAtPath(currentTabLayout, ownPath);
  if (typeof currentNode !== "string") {
    return panelsState;
  }
  const newLayout = updateTree(
    originalLayout,
    createAddUpdates(originalLayout, currentNode, destinationPath, position),
  );

  let newPanelsState = changePanelLayout(panelsState, { layout: newLayout, trimConfigById: false });
  newPanelsState = savePanelConfigs(newPanelsState, panelConfigs);
  return newPanelsState;
};

const dragToTabFromMain = (
  panelsState: LayoutData,
  {
    originalLayout,
    panelId,
    targetTabId,
    position,
    destinationPath,
    ownPath,
    targetTabConfig,
    sourceTabChildConfigs,
  }: {
    originalLayout: MosaicNode<string>;
    panelId: string;
    targetTabId: string;
    position?: MosaicDropTargetPosition;
    destinationPath?: MosaicPath;
    ownPath: MosaicPath;
    targetTabConfig?: TabPanelConfig;
    sourceTabChildConfigs: ConfigsPayload[];
  },
): LayoutData => {
  const saveConfigsPayload = addPanelToTab(
    panelId,
    destinationPath,
    position,
    targetTabConfig,
    targetTabId,
  );
  const panelConfigs = {
    ...saveConfigsPayload,
    configs: [...saveConfigsPayload.configs, ...sourceTabChildConfigs],
  };
  const update = createRemoveUpdate(originalLayout, ownPath);
  const newLayout = updateTree(originalLayout, [update]);
  let newPanelsState = changePanelLayout(panelsState, { layout: newLayout, trimConfigById: false });
  newPanelsState = savePanelConfigs(newPanelsState, { configs: panelConfigs.configs });
  return newPanelsState;
};

const dragToTabFromTab = (
  panelsState: LayoutData,
  {
    originalLayout,
    panelId,
    sourceTabId,
    targetTabId,
    position,
    destinationPath,
    ownPath,
    targetTabConfig,
    sourceTabConfig,
    sourceTabChildConfigs,
  }: {
    originalLayout: MosaicNode<string>;
    panelId: string;
    sourceTabId: string;
    targetTabId: string;
    position?: MosaicDropTargetPosition;
    destinationPath?: MosaicPath;
    ownPath: MosaicPath;
    targetTabConfig?: TabPanelConfig;
    sourceTabConfig: TabPanelConfig;
    sourceTabChildConfigs: ConfigsPayload[];
  },
): LayoutData => {
  // Remove panel from tab layout
  const { configs: fromTabConfigs } = removePanelFromTabPanel(
    ownPath,
    sourceTabConfig,
    sourceTabId,
  );

  // Insert it into another tab
  const { configs: toTabConfigs } = addPanelToTab(
    panelId,
    destinationPath,
    position,
    targetTabConfig,
    targetTabId,
  );
  let newPanelsState = changePanelLayout(panelsState, {
    layout: originalLayout,
    trimConfigById: false,
  });
  newPanelsState = savePanelConfigs(newPanelsState, {
    configs: [
      ...fromTabConfigs,
      ...toTabConfigs,
      // if the target tab is inside the source tab, make sure not to overwrite it with its old config
      ...sourceTabChildConfigs.filter(({ id }) => id !== targetTabId),
    ],
  });
  return newPanelsState;
};

/**
 * ドラッグ開始処理
 *
 * パネルのドラッグ操作を開始し、ドラッグ中のパネルを一時的に非表示にします。
 * ドラッグ中の視覚的フィードバックとレイアウト調整を提供します。
 *
 * ## 処理パターン
 * 1. **通常パネル**: Mosaicツリーでパネルを非表示
 * 2. **タブ内パネル**: タブレイアウトでパネルを非表示
 * 3. **単一パネルタブ**: タブレイアウトを空にする
 * 4. **トップレベル**: エラー（ドラッグ不可）
 *
 * ## 一時的変更
 * - ドラッグ中のパネルを非表示
 * - レイアウト構造の一時調整
 * - 他のパネルの自動リサイズ
 *
 * ## 復元機能
 * - ドラッグキャンセル時の状態復元
 * - 元のレイアウト構造の保持
 * - 設定の保持
 *
 * @param panelsState - 現在のレイアウト状態
 * @param payload - ドラッグ開始のペイロード
 * @param payload.path - ドラッグするパネルのパス
 * @param payload.sourceTabId - ソースタブパネルID
 * @returns 更新されたレイアウト状態
 */
const startDrag = (
  panelsState: LayoutData,
  { path, sourceTabId }: StartDragPayload,
): LayoutData => {
  // パネルを一時的に非表示にしてドラッグ中の視覚的フィードバックを提供
  if (path.length > 0) {
    if (sourceTabId != undefined) {
      // タブパネル内のパネルドラッグ
      const tabConfig = panelsState.configById[sourceTabId] as TabPanelConfig;
      const activeLayout = tabConfig.tabs[tabConfig.activeTabIdx]?.layout;

      if (activeLayout == undefined) {
        return panelsState;
      }

      // タブ内レイアウトでパネルを非表示
      const newTabLayout = updateTree(activeLayout, [createHideUpdate(path)]);
      const newTabConfig = updateTabPanelLayout(newTabLayout, tabConfig);

      return savePanelConfigs(panelsState, {
        configs: [{ id: sourceTabId, config: newTabConfig }],
      });
    }

    // メインレイアウトでパネルを非表示
    return changePanelLayout(panelsState, {
      layout: updateTree<string>(panelsState.layout ?? "", [createHideUpdate(path)]),
      trimConfigById: false,
    });
  } else if (sourceTabId != undefined) {
    // 単一パネルタブからのドラッグ（タブレイアウトを空にする）
    const sourceTabConfig = panelsState.configById[sourceTabId] as TabPanelConfig;
    return savePanelConfigs(panelsState, {
      configs: [{ id: sourceTabId, config: updateTabPanelLayout(undefined, sourceTabConfig) }],
    });
  }

  // トップレベルパネルのドラッグは不可
  throw new Error("Can't drag the top-level panel of a layout");
};

/**
 * ドラッグ終了処理
 *
 * ドラッグ操作を完了し、パネルを最終位置に配置します。
 * 複雑なドラッグパターンに対応し、適切なレイアウト更新を行います。
 *
 * ## ドラッグパターン
 * 1. **同一タブ内**: タブ内でのパネル移動
 * 2. **タブ→メイン**: タブからメインレイアウトへ移動
 * 3. **メイン→タブ**: メインからタブパネルへ移動
 * 4. **タブ→タブ**: 異なるタブパネル間での移動
 * 5. **メイン内**: メインレイアウト内での移動
 * 6. **キャンセル**: ドラッグキャンセル時の復元
 *
 * ## 状態管理
 * - 元のレイアウト・設定の保持
 * - ドラッグ中の一時状態の解除
 * - 最終位置での状態確定
 * - ネストパネル設定の移行
 *
 * ## 最適化
 * - 変更がない場合の処理スキップ
 * - 参照等価性の維持
 * - 不要な再レンダリング防止
 *
 * @param panelsState - 現在のレイアウト状態
 * @param dragPayload - ドラッグ終了のペイロード
 * @returns 更新されたレイアウト状態
 */
const endDrag = (panelsState: LayoutData, dragPayload: EndDragPayload): LayoutData => {
  const {
    originalLayout,
    originalSavedProps,
    panelId,
    sourceTabId,
    targetTabId,
    position,
    destinationPath,
    ownPath,
  } = dragPayload;

  // ドラッグパターンの判定
  const toMainFromTab = sourceTabId != undefined && targetTabId == undefined;
  const toTabfromMain = sourceTabId == undefined && targetTabId != undefined;
  const toTabfromTab = sourceTabId != undefined && targetTabId != undefined;
  const withinSameTab = sourceTabId === targetTabId && toTabfromTab;

  // 元の設定を取得
  const sourceTabConfig =
    sourceTabId != undefined ? (originalSavedProps[sourceTabId] as TabPanelConfig) : undefined;
  const targetTabConfig =
    targetTabId != undefined ? (originalSavedProps[targetTabId] as TabPanelConfig) : undefined;

  // ソースタブ内のネストパネル設定を取得
  const panelIdsInsideTabPanels =
    sourceTabId != undefined ? getPanelIdsInsideTabPanels([sourceTabId], originalSavedProps) : [];
  const sourceTabChildConfigs = filterMap(panelIdsInsideTabPanels, (id) => {
    const config = originalSavedProps[id];
    return config ? { id, config } : undefined;
  });

  // 同一タブ内での移動（位置・目的地が未指定の場合はキャンセル）
  if (withinSameTab && position == undefined && destinationPath == undefined) {
    return { ...panelsState, layout: originalLayout, configById: originalSavedProps };
  }

  // 同一タブ内での移動
  if (withinSameTab && sourceTabConfig && position != undefined && destinationPath != undefined) {
    return dragWithinSameTab(panelsState, {
      originalLayout,
      sourceTabId,
      position,
      destinationPath,
      ownPath,
      sourceTabConfig,
      sourceTabChildConfigs,
    });
  }

  // タブからメインレイアウトへの移動
  if (toMainFromTab && sourceTabConfig && position != undefined && destinationPath != undefined) {
    return dragToMainFromTab(panelsState, {
      originalLayout,
      sourceTabId,
      position,
      destinationPath,
      ownPath,
      sourceTabConfig,
      sourceTabChildConfigs,
    });
  }

  // メインレイアウトからタブへの移動
  if (toTabfromMain) {
    return dragToTabFromMain(panelsState, {
      originalLayout,
      panelId,
      targetTabId,
      position,
      destinationPath,
      ownPath,
      targetTabConfig,
      sourceTabChildConfigs,
    });
  }

  // タブ間での移動
  if (toTabfromTab && sourceTabConfig) {
    return dragToTabFromTab(panelsState, {
      originalLayout,
      panelId,
      sourceTabId,
      targetTabId,
      position,
      destinationPath,
      ownPath,
      targetTabConfig,
      sourceTabConfig,
      sourceTabChildConfigs,
    });
  }

  // メインレイアウト内での移動
  if (
    position != undefined &&
    destinationPath != undefined &&
    !_.isEqual(destinationPath, ownPath)
  ) {
    const updates = createDragToUpdates(originalLayout, ownPath, destinationPath, position);
    const newLayout = updateTree(originalLayout, updates);
    return changePanelLayout(panelsState, { layout: newLayout, trimConfigById: false });
  }

  // ドラッグキャンセル: 元のレイアウトを復元
  // これはstartDrag()の効果を取り消します
  return { ...panelsState, layout: originalLayout, configById: originalSavedProps };
};

/**
 * レイアウト管理システムのメインreducer
 *
 * すべてのレイアウト操作を統一的に処理する中央集権的なreducerです。
 * Redux パターンに従い、アクションタイプに基づいて適切な処理関数を呼び出します。
 *
 * ## アクション処理
 * - **CHANGE_PANEL_LAYOUT**: レイアウト構造の変更
 * - **SAVE_PANEL_CONFIGS**: パネル設定の保存
 * - **SAVE_FULL_PANEL_CONFIG**: 特定タイプの全パネル設定更新
 * - **CREATE_TAB_PANEL**: タブパネルの作成
 * - **OVERWRITE_GLOBAL_DATA**: グローバル変数の完全上書き
 * - **SET_GLOBAL_DATA**: グローバル変数の部分更新
 * - **SET_USER_NODES**: ユーザースクリプトの設定
 * - **SET_PLAYBACK_CONFIG**: 再生設定の更新
 * - **CLOSE_PANEL**: パネルの削除
 * - **SPLIT_PANEL**: パネルの分割
 * - **SWAP_PANEL**: パネルの交換
 * - **MOVE_TAB**: タブの移動
 * - **ADD_PANEL**: パネルの追加
 * - **DROP_PANEL**: パネルのドロップ
 * - **START_DRAG**: ドラッグ開始
 * - **END_DRAG**: ドラッグ終了
 *
 * ## 設計原則
 * - **純粋関数**: 副作用なしの状態変換
 * - **不変性**: 元の状態を変更せず新しい状態を返却
 * - **型安全**: 未知のアクションタイプでエラー
 * - **パフォーマンス**: 変更がない場合は同じオブジェクトを返却
 *
 * ## エラーハンドリング
 * - 未知のアクションタイプでエラーを投げる
 * - 各処理関数内での適切なエラーハンドリング
 * - 状態の整合性保証
 *
 * @param panelsState - 現在のレイアウト状態（読み取り専用）
 * @param action - 実行するアクション
 * @returns 新しいレイアウト状態
 * @throws {Error} 未知のアクションタイプの場合
 *
 * @example
 * ```typescript
 * // パネルを追加
 * const newState = reducer(currentState, {
 *   type: "ADD_PANEL",
 *   payload: { id: "panel1", config: {} }
 * });
 *
 * // パネルを削除
 * const newState = reducer(currentState, {
 *   type: "CLOSE_PANEL",
 *   payload: { root: layout, path: [0] }
 * });
 * ```
 */
export default function (panelsState: Readonly<LayoutData>, action: PanelsActions): LayoutData {
  // 新しいパネル状態を現在のパネル状態から開始することで、
  // 変更がない場合にパネル状態オブジェクトのアイデンティティを保持
  switch (action.type) {
    case "CHANGE_PANEL_LAYOUT":
      return changePanelLayout(panelsState, action.payload);

    case "SAVE_PANEL_CONFIGS":
      return savePanelConfigs(panelsState, action.payload);

    case "SAVE_FULL_PANEL_CONFIG":
      return saveFullPanelConfig(panelsState, action.payload);

    case "CREATE_TAB_PANEL":
      return action.payload.singleTab
        ? createTabPanelWithSingleTab(panelsState, action.payload)
        : createTabPanelWithMultipleTabs(panelsState, action.payload);

    case "OVERWRITE_GLOBAL_DATA":
      return {
        ...panelsState,
        globalVariables: action.payload,
      };

    case "SET_GLOBAL_DATA": {
      const globalVariables = {
        ...panelsState.globalVariables,
        ...action.payload,
      };
      // undefined値のキーを削除
      Object.keys(globalVariables).forEach((key) => {
        if (globalVariables[key] == undefined) {
          delete globalVariables[key];
        }
      });
      return {
        ...panelsState,
        globalVariables,
      };
    }

    case "SET_USER_NODES": {
      const userNodes = { ...panelsState.userNodes };
      // undefined値のキーを削除、それ以外は更新
      for (const [key, value] of Object.entries(action.payload)) {
        if (value == undefined) {
          delete userNodes[key];
        } else {
          userNodes[key] = value;
        }
      }
      return {
        ...panelsState,
        userNodes,
      };
    }

    case "SET_PLAYBACK_CONFIG":
      return {
        ...panelsState,
        playbackConfig: {
          ...panelsState.playbackConfig,
          ...action.payload,
        },
      };

    case "CLOSE_PANEL":
      return closePanel(panelsState, action.payload);

    case "SPLIT_PANEL":
      return splitPanel(panelsState, action.payload);

    case "SWAP_PANEL":
      return swapPanel(panelsState, action.payload);

    case "MOVE_TAB":
      return moveTab(panelsState, action.payload);

    case "ADD_PANEL":
      return addPanel(panelsState, action.payload);

    case "DROP_PANEL":
      return dropPanel(panelsState, action.payload);

    case "START_DRAG":
      return startDrag(panelsState, action.payload);

    case "END_DRAG":
      return endDrag(panelsState, action.payload);

    default:
      throw new Error("This reducer should only be used for panel actions");
  }

  // このreturnは到達不可能（TypeScriptの型チェック用）
  return panelsState;
}
