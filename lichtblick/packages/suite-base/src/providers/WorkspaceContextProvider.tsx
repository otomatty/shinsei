// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { ReactNode, useState } from "react";
import { StoreApi, createStore } from "zustand";
import { persist } from "zustand/middleware";

import { SESSION_STORAGE_LICHTBLICK_WORKSPACE } from "@lichtblick/suite-base/constants/browserStorageKeys";
import {
  WorkspaceContext,
  WorkspaceContextStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { migrateV0WorkspaceState } from "@lichtblick/suite-base/context/Workspace/migrations";

/**
 * ワークスペースストアの初期状態を作成
 *
 * @returns WorkspaceContextStore - ワークスペースの初期状態オブジェクト
 *
 * @description
 * アプリケーション起動時のデフォルト設定を定義：
 * - ダイアログ（データソース、設定）の初期状態
 * - フィーチャーツアーの管理状態
 * - サイドバー（左右）の表示・非表示とサイズ設定
 * - 再生コントロールの設定（リピート、同期）
 *
 * @structure
 * - dialogs: モーダルダイアログの開閉状態管理
 * - featureTours: 機能紹介ツアーの進行状況管理
 * - sidebars: 左右サイドバーの表示状態とサイズ管理
 * - playbackControls: メディア再生の制御設定
 */
export function makeWorkspaceContextInitialState(): WorkspaceContextStore {
  return {
    dialogs: {
      dataSource: {
        activeDataSource: undefined,
        item: undefined,
        open: false,
      },
      preferences: {
        initialTab: undefined,
        open: false,
      },
    },
    featureTours: {
      active: undefined,
      shown: [],
    },
    sidebars: {
      left: {
        item: "panel-settings",
        open: true,
        size: undefined,
      },
      right: {
        item: undefined,
        open: false,
        size: undefined,
      },
    },
    playbackControls: {
      repeat: false,
      syncInstances: false,
    },
  };
}

/**
 * ワークスペースコンテキスト用のZustandストアを作成
 *
 * @param initialState - 初期状態の部分的なオーバーライド
 * @param options - ストア作成オプション
 * @param options.disablePersistenceForStorybook - Storybook用の永続化無効フラグ
 * @returns StoreApi<WorkspaceContextStore> - 作成されたZustandストア
 *
 * @description
 * - Zustandストアを作成し、必要に応じて永続化ミドルウェアを適用
 * - localStorage への永続化（Storybook環境では無効化可能）
 * - バージョン管理とマイグレーション機能
 * - 部分的な状態の永続化（不要な情報は保存しない）
 *
 * @persistence
 * - キー: "fox.workspace"
 * - バージョン: 1
 * - 保存対象: featureTours, playbackControls, sidebars
 * - 除外対象: dialogs（一時的な状態のため）
 */
function createWorkspaceContextStore(
  initialState?: Partial<WorkspaceContextStore>,
  options?: { disablePersistenceForStorybook?: boolean },
): StoreApi<WorkspaceContextStore> {
  /**
   * ストアの状態作成関数
   *
   * @description
   * - デフォルト状態と初期状態をマージして最終的な状態を作成
   * - スプレッド演算子を使用してイミュータブルな状態を維持
   */
  const stateCreator = () => {
    const store: WorkspaceContextStore = {
      ...makeWorkspaceContextInitialState(),
      ...initialState,
    };
    return store;
  };

  // Storybook環境では永続化を無効化
  if (options?.disablePersistenceForStorybook === true) {
    return createStore<WorkspaceContextStore>()(stateCreator);
  }

  // 通常環境では永続化ミドルウェアを適用
  return createStore<WorkspaceContextStore>()(
    persist(stateCreator, {
      name: SESSION_STORAGE_LICHTBLICK_WORKSPACE,
      version: 1,
      migrate: migrateV0WorkspaceState,
      partialize: (state) => {
        // Note that this is an opt-in list of keys from the store that we
        // include and restore when persisting to and from localStorage.
        return _.pick(state, ["featureTours", "playbackControls", "sidebars"]);
      },
      merge(persistedState, currentState) {
        // Use a deep merge to ensure that defaults are filled in for nested values if the values
        // were not present in localStorage.
        return _.merge(currentState, persistedState);
      },
    }),
  );
}

/**
 * ワークスペースの状態管理を提供するReact Context Provider
 *
 * @description
 * このProviderは以下の機能を提供します：
 * - ワークスペース全体の状態管理（ダイアログ、サイドバー、ツアー等）
 * - Zustandストアを使用した効率的な状態管理
 * - localStorage への永続化（選択的）
 * - テスト・Storybook環境での柔軟な設定
 * - バージョン管理とマイグレーション対応
 *
 * @features
 * - **状態管理**: Zustandベースの高性能状態管理
 * - **永続化**: 重要な設定のみをlocalStorageに保存
 * - **マイグレーション**: バージョン間の互換性を保つ
 * - **テスト対応**: Storybook等での永続化無効化
 * - **カスタマイズ**: 初期状態とストア作成のカスタマイズ可能
 *
 * @usage
 * ```tsx
 * // 基本的な使用
 * <WorkspaceContextProvider>
 *   <App />
 * </WorkspaceContextProvider>
 *
 * // カスタム初期状態
 * <WorkspaceContextProvider initialState={{ sidebars: { left: { open: false } } }}>
 *   <App />
 * </WorkspaceContextProvider>
 *
 * // Storybook環境
 * <WorkspaceContextProvider disablePersistenceForStorybook>
 *   <Story />
 * </WorkspaceContextProvider>
 * ```
 *
 * @context WorkspaceContext - ワークスペース状態のZustandストアを提供
 */
export default function WorkspaceContextProvider(props: {
  children?: ReactNode;
  /** Storybook環境での永続化無効化フラグ */
  disablePersistenceForStorybook?: boolean;
  /** ワークスペース状態の初期値（部分的なオーバーライド） */
  initialState?: Partial<WorkspaceContextStore>;
  /** カスタムストア作成関数（テスト用） */
  workspaceStoreCreator?: (
    initialState?: Partial<WorkspaceContextStore>,
    options?: { disablePersistenceForStorybook?: boolean },
  ) => StoreApi<WorkspaceContextStore>;
}): React.JSX.Element {
  const { children, initialState, workspaceStoreCreator, disablePersistenceForStorybook } = props;

  /**
   * Zustandストアのインスタンス
   *
   * @description
   * - useState を使用してストアインスタンスを1回だけ作成
   * - カスタムストア作成関数が提供されている場合はそれを使用
   * - そうでなければデフォルトのストア作成関数を使用
   * - 永続化の有効/無効を適切に設定
   */
  const [store] = useState(() =>
    workspaceStoreCreator
      ? workspaceStoreCreator(initialState, { disablePersistenceForStorybook })
      : createWorkspaceContextStore(initialState, { disablePersistenceForStorybook }),
  );

  return <WorkspaceContext.Provider value={store}>{children}</WorkspaceContext.Provider>;
}
