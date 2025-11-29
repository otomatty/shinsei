// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext } from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { AppSettingsTab } from "@lichtblick/suite-base/components/AppSettingsDialog/types";
import { DataSourceDialogItem } from "@lichtblick/suite-base/components/DataSourceDialog";
import { IDataSourceFactory } from "@lichtblick/suite-base/context/PlayerSelectionContext";

/**
 * サイドバーアイテムキーの定義
 *
 * アプリケーション全体で使用されるサイドバーアイテムの識別子
 */
export const SidebarItemKeys = [
  "account", // アカウント管理
  "add-panel", // パネル追加
  "app-bar-tour", // アプリバーツアー
  "app-settings", // アプリケーション設定
  "connection", // 接続管理
  "extensions", // 拡張機能
  "help", // ヘルプ
  "layouts", // レイアウト管理
  "panel-settings", // パネル設定
  "logs-settings", // ログ設定
  "variables", // 変数管理
] as const;
export type SidebarItemKey = (typeof SidebarItemKeys)[number];

/**
 * 左サイドバーアイテムキーの定義
 *
 * 左サイドバーで利用可能なアイテムの識別子
 */
export const LeftSidebarItemKeys = ["panel-settings", "topics", "alerts", "layouts"] as const;
export type LeftSidebarItemKey = (typeof LeftSidebarItemKeys)[number];

/**
 * 右サイドバーアイテムキーの定義
 *
 * 右サイドバーで利用可能なアイテムの識別子
 */
export const RightSidebarItemKeys = [
  "events", // イベント管理
  "variables", // 変数管理
  "logs-settings", // ログ設定
  "performance", // パフォーマンス監視
] as const;
export type RightSidebarItemKey = (typeof RightSidebarItemKeys)[number];

/**
 * WorkspaceContextStore - ワークスペース状態管理
 *
 * このストアは、Zustandを使用してワークスペース全体の状態を管理します。
 * UI要素の表示状態、ダイアログの開閉、機能ツアーの進行状況などを追跡します。
 *
 * 主な責任:
 * - サイドバーの開閉状態とサイズ管理
 * - ダイアログの表示状態管理
 * - 機能ツアーの進行状況追跡
 * - 再生コントロールの設定管理
 */
export type WorkspaceContextStore = {
  /** ダイアログの状態管理 */
  dialogs: {
    /** データソースダイアログの状態 */
    dataSource: {
      /** アクティブなデータソースファクトリー */
      activeDataSource: undefined | IDataSourceFactory;
      /** ダイアログアイテム */
      item: undefined | DataSourceDialogItem;
      /** ダイアログの開閉状態 */
      open: boolean;
    };
    /** 設定ダイアログの状態 */
    preferences: {
      /** 初期表示タブ */
      initialTab: undefined | AppSettingsTab;
      /** ダイアログの開閉状態 */
      open: boolean;
    };
  };

  /** 機能ツアーの状態管理 */
  featureTours: {
    /** 現在アクティブなツアー */
    active: undefined | string;
    /** 表示済みツアーのリスト */
    shown: string[];
  };

  /** 再生コントロールの設定 */
  playbackControls: {
    /** リピート再生の有効/無効 */
    repeat: boolean;
    /** インスタンス同期の有効/無効 */
    syncInstances: boolean;
  };

  /** サイドバーの状態管理 */
  sidebars: {
    /** 左サイドバーの状態 */
    left: {
      /** 現在選択されているアイテム */
      item: undefined | LeftSidebarItemKey;
      /** サイドバーの開閉状態 */
      open: boolean;
      /** サイドバーのサイズ（ピクセル） */
      size: undefined | number;
    };
    /** 右サイドバーの状態 */
    right: {
      /** 現在選択されているアイテム */
      item: undefined | RightSidebarItemKey;
      /** サイドバーの開閉状態 */
      open: boolean;
      /** サイドバーのサイズ（ピクセル） */
      size: undefined | number;
    };
  };
};

/**
 * WorkspaceContext - Zustandストアのコンテキスト
 *
 * ワークスペース状態管理用のZustandストアを提供するコンテキスト
 */
export const WorkspaceContext = createContext<undefined | StoreApi<WorkspaceContextStore>>(
  undefined,
);

WorkspaceContext.displayName = "WorkspaceContext";

/**
 * WorkspaceStoreSelectors - 共通セレクター関数
 *
 * 頻繁に使用されるセレクター関数を事前定義して再利用性を向上
 */
export const WorkspaceStoreSelectors = {
  /**
   * パネル設定が開いているかを判定
   *
   * @param store ワークスペースストア
   * @returns パネル設定の開閉状態
   */
  selectPanelSettingsOpen: (store: WorkspaceContextStore): boolean => {
    return store.sidebars.left.open && store.sidebars.left.item === "panel-settings";
  },
};

/**
 * useWorkspaceStore - ワークスペースストアから値を取得するカスタムフック
 *
 * @param selector ストアから値を選択するセレクター関数
 * @returns セレクターが選択した値
 *
 * 使用例:
 * ```typescript
 * // 左サイドバーの開閉状態を取得
 * const leftSidebarOpen = useWorkspaceStore((store) => store.sidebars.left.open);
 *
 * // パネル設定の開閉状態を取得（事前定義セレクター使用）
 * const panelSettingsOpen = useWorkspaceStore(WorkspaceStoreSelectors.selectPanelSettingsOpen);
 * ```
 */
export function useWorkspaceStore<T>(selector: (store: WorkspaceContextStore) => T): T {
  const context = useGuaranteedContext(WorkspaceContext);
  return useStore(context, selector);
}
