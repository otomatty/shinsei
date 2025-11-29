// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useMemo, useRef, useState } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import CurrentLayoutContext, {
  ICurrentLayout,
  LayoutID,
  LayoutState,
  SelectedLayout,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import {
  LayoutData,
  PanelsActions,
} from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { defaultPlaybackConfig } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/reducers";

import panelsReducer from "./reducers";

/**
 * テスト・開発用モックレイアウトプロバイダー
 *
 * CurrentLayoutProviderの軽量版モック実装です。実際のレイアウト管理機能を
 * 簡略化し、テスト環境や開発時のプロトタイピングで使用されます。
 *
 * ## 主な機能
 * - 基本的なレイアウト状態管理
 * - パネル操作アクション（追加、削除、設定保存等）
 * - インメモリでの状態保持
 * - レイアウト永続化機能の無効化
 *
 * ## 本家との違い
 * - **永続化なし**: レイアウトの保存・読み込み機能なし
 * - **簡略化**: 複雑な非同期処理や外部依存関係を除去
 * - **テスト特化**: 予測可能な動作でテストを容易に
 * - **軽量**: 最小限の機能のみ実装
 * - **同期処理**: 全アクションを同期的に実行
 *
 * ## 使用場面
 * - **ユニットテスト**: パネル機能の単体テスト
 * - **統合テスト**: レイアウト関連機能のテスト
 * - **Storybook**: UIコンポーネントの表示確認
 * - **開発プロトタイプ**: 新機能の検証
 *
 * ## 状態管理
 * - `useState`による基本的な状態管理
 * - `useRef`による状態参照の最適化
 * - reducerパターンによるアクション処理
 * - リスナーパターンによる状態変更通知
 *
 * ## パフォーマンス最適化
 * - `useCallback`による関数メモ化
 * - `useMemo`による計算結果キャッシュ
 * - `useShallowMemo`による浅い比較最適化
 * - 不要な再レンダリングの防止
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @param props.initialState - 初期レイアウト状態の部分データ
 * @param props.onAction - アクション実行時のコールバック関数
 * @returns React.JSX.Element - モックプロバイダーコンポーネント
 *
 * @example
 * ```typescript
 * // テストでの基本的な使用
 * <MockCurrentLayoutProvider>
 *   <PanelComponent />
 * </MockCurrentLayoutProvider>
 *
 * // カスタム初期状態での使用
 * const initialState = {
 *   configById: { "3D!test": { cameraState: {...} } },
 *   layout: { first: "3D!test", second: undefined, direction: "row" }
 * };
 *
 * <MockCurrentLayoutProvider
 *   initialState={initialState}
 *   onAction={(action) => console.log('Action:', action)}
 * >
 *   <TestComponent />
 * </MockCurrentLayoutProvider>
 * ```
 *
 * @see CurrentLayoutProvider - 本家プロバイダー実装
 * @see panelsReducer - パネル操作処理
 * @see ICurrentLayout - レイアウトコンテキストインターフェース
 */
export default function MockCurrentLayoutProvider({
  children,
  initialState,
  onAction,
}: React.PropsWithChildren<{
  initialState?: Partial<LayoutData>;
  onAction?: (action: PanelsActions) => void;
}>): React.JSX.Element {
  const layoutStateListeners = useRef(new Set<(_: LayoutState) => void>());
  const addLayoutStateListener = useCallback((listener: (_: LayoutState) => void) => {
    layoutStateListeners.current.add(listener);
  }, []);
  const removeLayoutStateListener = useCallback((listener: (_: LayoutState) => void) => {
    layoutStateListeners.current.delete(listener);
  }, []);

  const [layoutState, setLayoutStateInternal] = useState<LayoutState>({
    selectedLayout: {
      id: "mock-layout" as LayoutID,
      data: {
        configById: {},
        globalVariables: {},
        userNodes: {},
        playbackConfig: defaultPlaybackConfig,
        ...initialState,
      },
    },
  });
  const layoutStateRef = useRef(layoutState);
  const setLayoutState = useCallback((newState: LayoutState) => {
    setLayoutStateInternal(newState);

    // listeners rely on being able to getCurrentLayoutState() inside effects that may run before we re-render
    layoutStateRef.current = newState;

    for (const listener of [...layoutStateListeners.current]) {
      listener(newState);
    }
  }, []);

  const setCurrentLayout = useCallback(
    (newLayout: SelectedLayout | undefined) => {
      setLayoutState({
        selectedLayout: {
          data: newLayout?.data,
          id: "mock-id" as LayoutID,
          edited: newLayout?.edited,
          name: newLayout?.name,
        },
      });
    },
    [setLayoutState],
  );

  const updateSharedPanelState = useCallback<ICurrentLayout["actions"]["updateSharedPanelState"]>(
    (type, newSharedState) => {
      setLayoutState({
        ...layoutStateRef.current,
        sharedPanelState: { ...layoutStateRef.current.sharedPanelState, [type]: newSharedState },
      });
    },
    [setLayoutState],
  );

  const performAction = useCallback(
    (action: PanelsActions) => {
      onAction?.(action);
      setLayoutState({
        ...layoutStateRef.current,
        selectedLayout: {
          ...layoutStateRef.current.selectedLayout,
          id: layoutStateRef.current.selectedLayout?.id ?? ("mock-id" as LayoutID),
          data: layoutStateRef.current.selectedLayout?.data
            ? panelsReducer(layoutStateRef.current.selectedLayout.data, action)
            : undefined,
        },
      });
    },
    [onAction, setLayoutState],
  );

  const actions: ICurrentLayout["actions"] = useMemo(
    () => ({
      setSelectedLayoutId: () => {
        throw new Error("Not implemented in MockCurrentLayoutProvider");
      },
      getCurrentLayoutState: () => layoutStateRef.current,

      setCurrentLayout,
      updateSharedPanelState,

      savePanelConfigs: (payload) => {
        performAction({ type: "SAVE_PANEL_CONFIGS", payload });
      },
      updatePanelConfigs: (panelType, perPanelFunc) => {
        performAction({ type: "SAVE_FULL_PANEL_CONFIG", payload: { panelType, perPanelFunc } });
      },
      createTabPanel: (payload) => {
        performAction({ type: "CREATE_TAB_PANEL", payload });
      },
      changePanelLayout: (payload) => {
        performAction({ type: "CHANGE_PANEL_LAYOUT", payload });
      },
      overwriteGlobalVariables: (payload) => {
        performAction({ type: "OVERWRITE_GLOBAL_DATA", payload });
      },
      setGlobalVariables: (payload) => {
        performAction({ type: "SET_GLOBAL_DATA", payload });
      },
      setUserScripts: (payload) => {
        performAction({ type: "SET_USER_NODES", payload });
      },
      setPlaybackConfig: (payload) => {
        performAction({ type: "SET_PLAYBACK_CONFIG", payload });
      },
      closePanel: (payload) => {
        performAction({ type: "CLOSE_PANEL", payload });
      },
      splitPanel: (payload) => {
        performAction({ type: "SPLIT_PANEL", payload });
      },
      swapPanel: (payload) => {
        performAction({ type: "SWAP_PANEL", payload });
      },
      moveTab: (payload) => {
        performAction({ type: "MOVE_TAB", payload });
      },
      addPanel: (payload) => {
        performAction({ type: "ADD_PANEL", payload });
      },
      dropPanel: (payload) => {
        performAction({ type: "DROP_PANEL", payload });
      },
      startDrag: (payload) => {
        performAction({ type: "START_DRAG", payload });
      },
      endDrag: (payload) => {
        performAction({ type: "END_DRAG", payload });
      },
    }),
    [performAction, setCurrentLayout, updateSharedPanelState],
  );

  const value: ICurrentLayout = useShallowMemo({
    addLayoutStateListener,
    removeLayoutStateListener,
    addSelectedPanelIdsListener: useCallback(() => {}, []),
    removeSelectedPanelIdsListener: useCallback(() => {}, []),
    mosaicId: "mockMosaicId",
    getSelectedPanelIds: useCallback(() => [], []),
    setSelectedPanelIds: useCallback(() => {
      // no-op
    }, []),
    actions,
  });
  return <CurrentLayoutContext.Provider value={value}>{children}</CurrentLayoutContext.Provider>;
}
