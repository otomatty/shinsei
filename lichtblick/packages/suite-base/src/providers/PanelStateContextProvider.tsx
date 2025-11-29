// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { StoreApi, createStore } from "zustand";

import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import {
  ImmutableSettingsTree,
  PanelStateContext,
  PanelStateStore,
  usePanelStateStore,
} from "@lichtblick/suite-base/context/PanelStateContext";

/**
 * パネル状態ストアを作成する関数
 *
 * Zustandを使用してパネルの状態管理を行うストアを作成します。
 * 各パネルのシーケンス番号、設定ツリー、デフォルトタイトルを管理します。
 *
 * @param initialState - ストアの初期状態（オプション）
 * @returns パネル状態管理用のZustandストア
 *
 * @example
 * ```typescript
 * const store = createPanelStateStore({
 *   defaultTitles: { 'panel-1': 'Custom Panel' }
 * });
 *
 * // シーケンス番号を増加
 * store.getState().incrementSequenceNumber('panel-1');
 *
 * // 設定ツリーを更新
 * store.getState().updateSettingsTree('panel-1', newSettingsTree);
 * ```
 */
function createPanelStateStore(initialState?: Partial<PanelStateStore>): StoreApi<PanelStateStore> {
  return createStore((set) => {
    return {
      /** パネルごとのシーケンス番号（更新検知用） */
      sequenceNumbers: {},
      /** パネルごとの設定ツリー */
      settingsTrees: {},
      /** パネルごとのデフォルトタイトル */
      defaultTitles: {},

      /**
       * 指定されたパネルのシーケンス番号を増加
       * @param panelId - パネルID
       */
      incrementSequenceNumber: (panelId: string) => {
        set((state) => {
          return {
            sequenceNumbers: {
              ...state.sequenceNumbers,
              [panelId]: (state.sequenceNumbers[panelId] ?? 0) + 1,
            },
          };
        });
      },

      /**
       * パネルの設定ツリーを更新
       * @param panelId - パネルID
       * @param settingsTree - 新しい設定ツリー
       */
      updateSettingsTree: (panelId, settingsTree) => {
        set((state) => ({
          settingsTrees: {
            ...state.settingsTrees,
            [panelId]: settingsTree,
          },
        }));
      },

      /**
       * パネルのデフォルトタイトルを更新
       * @param panelId - パネルID
       * @param defaultTitle - 新しいデフォルトタイトル
       */
      updateDefaultTitle: (panelId, defaultTitle) => {
        set((state) => ({ defaultTitles: { ...state.defaultTitles, [panelId]: defaultTitle } }));
      },

      // 初期状態をマージ
      ...initialState,
    };
  });
}

/** 設定ツリー更新関数のセレクター */
const updateSettingsTreeSelector = (store: PanelStateStore) => store.updateSettingsTree;

/**
 * 現在のパネルの設定ツリーを更新するためのフック
 *
 * パネルコンテキストから現在のパネルIDを取得し、そのパネル専用の
 * 設定ツリー更新関数を返します。アンマウント時の自動クリーンアップも提供します。
 *
 * ## メモリリーク対策
 * `actionHandler`がクロージャコンテキストでパネル変数をキャプチャし、
 * アンマウント後もメモリに保持される問題を防ぐため、アンマウント時に
 * panelSettingsTreeエントリをundefinedに設定してガベージコレクションを促進します。
 *
 * @returns 設定ツリー更新関数
 *
 * @example
 * ```typescript
 * function MyPanel() {
 *   const updateSettingsTree = usePanelSettingsTreeUpdate();
 *
 *   const handleSettingChange = (newTree) => {
 *     updateSettingsTree(newTree);
 *   };
 *
 *   return <PanelSettings onChange={handleSettingChange} />;
 * }
 * ```
 */
export function usePanelSettingsTreeUpdate(): (newTree: ImmutableSettingsTree) => void {
  const { id } = usePanelContext();
  const updateStoreTree = usePanelStateStore(updateSettingsTreeSelector);

  const updateSettingsTree = useCallback(
    (newTree: ImmutableSettingsTree) => {
      updateStoreTree(id, newTree);
    },
    [id, updateStoreTree],
  );

  /**
   * アンマウントされたパネルのクリーンアップ
   * `actionHandler`がクロージャコンテキストでパネル変数をキャプチャし、
   * アンマウント後もメモリに保持される問題を防ぐため、panelSettingsTreeエントリを
   * undefinedに設定し、アンマウントされたパネルのactionHandlerとキャプチャされた
   * クロージャコンテキストがガベージコレクションされるようにします。
   */
  useEffect(() => {
    return () => {
      updateStoreTree(id, undefined);
    };
  }, [id, updateStoreTree]);

  return updateSettingsTree;
}

/** デフォルトタイトル更新関数のセレクター */
const updateDefaultTitleSelector = (store: PanelStateStore) => store.updateDefaultTitle;

/**
 * パネルのデフォルトタイトルを読み取り・更新するためのフック
 *
 * 現在のパネルのデフォルトタイトルの状態と更新関数を提供します。
 * React.useStateのような[state, setState]形式のAPIを提供します。
 *
 * @returns [現在のデフォルトタイトル, タイトル更新関数]のタプル
 *
 * @example
 * ```typescript
 * function PanelHeader() {
 *   const [defaultTitle, setDefaultTitle] = useDefaultPanelTitle();
 *
 *   const handleTitleChange = (newTitle: string) => {
 *     setDefaultTitle(newTitle);
 *   };
 *
 *   return (
 *     <input
 *       value={defaultTitle || ''}
 *       onChange={(e) => handleTitleChange(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useDefaultPanelTitle(): [
  string | undefined,
  (defaultTitle: string | undefined) => void,
] {
  const panelId = usePanelContext().id;

  // 現在のパネルのデフォルトタイトルを取得するセレクター
  const selector = useCallback((store: PanelStateStore) => store.defaultTitles[panelId], [panelId]);

  const updateDefaultTitle = usePanelStateStore(updateDefaultTitleSelector);
  const defaultTitle = usePanelStateStore(selector);

  const update = useCallback(
    (newValue: string | undefined) => {
      updateDefaultTitle(panelId, newValue);
    },
    [panelId, updateDefaultTitle],
  );

  return [defaultTitle, update];
}

/**
 * PanelStateContextProviderのプロパティ型定義
 */
type Props = PropsWithChildren<{
  /** ストアの初期状態（オプション） */
  initialState?: Partial<PanelStateStore>;
}>;

/**
 * PanelStateContextProvider
 *
 * パネルの状態管理を行うProviderコンポーネントです。
 * 各パネルのシーケンス番号、設定ツリー、デフォルトタイトルを
 * アプリケーション全体で管理し、パネル間での状態共有を可能にします。
 *
 * ## 主な機能
 * - パネルごとの独立した状態管理
 * - 設定ツリーの管理と更新
 * - デフォルトタイトルの管理
 * - シーケンス番号による更新検知
 * - メモリリーク防止のための自動クリーンアップ
 *
 * ## 管理される状態
 * - **sequenceNumbers**: パネルの更新検知用カウンター
 * - **settingsTrees**: パネルの設定UI構造
 * - **defaultTitles**: パネルのデフォルトタイトル
 *
 * ## 使用場面
 * - パネルの設定UI管理
 * - パネルタイトルのカスタマイズ
 * - パネルの状態同期
 * - 動的パネル設定の管理
 *
 * ## パフォーマンス最適化
 * - Zustandによる効率的な状態管理
 * - セレクターによる必要な部分のみの再レンダリング
 * - アンマウント時の自動メモリクリーンアップ
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @param props.initialState - ストアの初期状態
 * @returns React.JSX.Element
 *
 * @example
 * ```typescript
 * // アプリケーションでの使用
 * <PanelStateContextProvider initialState={{ defaultTitles: { 'panel-1': 'My Panel' } }}>
 *   <PanelLayout />
 *   <PanelSettings />
 * </PanelStateContextProvider>
 *
 * // 子コンポーネントでの使用
 * function MyPanel() {
 *   const updateSettingsTree = usePanelSettingsTreeUpdate();
 *   const [defaultTitle, setDefaultTitle] = useDefaultPanelTitle();
 *
 *   // 設定を更新
 *   updateSettingsTree(newSettingsTree);
 *
 *   // タイトルを更新
 *   setDefaultTitle('New Title');
 * }
 * ```
 */
export function PanelStateContextProvider(props: Props): React.JSX.Element {
  const { children, initialState } = props;

  const [store] = useState(() => createPanelStateStore(initialState));

  return <PanelStateContext.Provider value={store}>{children}</PanelStateContext.Provider>;
}
