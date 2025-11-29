// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { AppSettingsTab } from "@lichtblick/suite-base/components/AppSettingsDialog/types";
import { DataSourceDialogItem } from "@lichtblick/suite-base/components/DataSourceDialog";
import { IDataSourceFactory } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import {
  LeftSidebarItemKey,
  RightSidebarItemKey,
  WorkspaceContextStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";

/**
 * ワークスペース状態のバージョン0型定義
 *
 * 旧バージョンのワークスペース状態構造。
 * 現在のバージョンとは異なる構造を持つため、
 * マイグレーション時に使用される。
 *
 * 主な違い:
 * - サイドバー状態が個別のプロパティとして定義されている
 * - ダイアログ状態の構造が異なる
 * - 一部の機能（syncInstances）が存在しない
 */
type WorkspaceContextStoreV0 = {
  /** データソースダイアログの状態（旧構造） */
  dataSourceDialog: {
    /** アクティブなデータソースファクトリー */
    activeDataSource: undefined | IDataSourceFactory;
    /** ダイアログアイテム */
    item: undefined | DataSourceDialogItem;
    /** ダイアログの開閉状態 */
    open: boolean;
  };

  /** 機能ツアーの状態 */
  featureTours: {
    /** 現在アクティブなツアー */
    active: undefined | string;
    /** 表示済みツアーのリスト */
    shown: string[];
  };

  /** 左サイドバーの開閉状態（旧構造） */
  leftSidebarOpen: boolean;
  /** 右サイドバーの開閉状態（旧構造） */
  rightSidebarOpen: boolean;
  /** 左サイドバーの選択アイテム（旧構造） */
  leftSidebarItem: undefined | LeftSidebarItemKey;
  /** 左サイドバーのサイズ（旧構造） */
  leftSidebarSize: undefined | number;
  /** 右サイドバーの選択アイテム（旧構造） */
  rightSidebarItem: undefined | RightSidebarItemKey;
  /** 右サイドバーのサイズ（旧構造） */
  rightSidebarSize: undefined | number;

  /** 再生コントロールの設定（旧構造） */
  playbackControls: {
    /** リピート再生の有効/無効 */
    repeat: boolean;
    // syncInstancesは旧バージョンには存在しない
  };

  /** 設定ダイアログの状態（旧構造） */
  prefsDialogState: {
    /** 初期表示タブ */
    initialTab: undefined | AppSettingsTab;
    /** ダイアログの開閉状態 */
    open: boolean;
  };
};

/**
 * ワークスペース状態をバージョン0から現在のバージョンにマイグレーション
 *
 * アプリケーションの更新時に、既存のユーザー設定を新しい構造に
 * 自動的に変換するためのマイグレーション関数。
 *
 * マイグレーション内容:
 * - サイドバー状態を個別プロパティから構造化オブジェクトに変換
 * - ダイアログ状態を新しい構造に再編成
 * - 新機能（syncInstances）のデフォルト値を設定
 * - 表示済みツアーリストを保持
 *
 * @param oldState 旧バージョンの状態データ
 * @param _version バージョン番号（現在は未使用）
 * @returns 新しい構造に変換された状態データ
 *
 * 使用例:
 * ```typescript
 * // Zustandの永続化機能で自動的に呼び出される
 * const store = create<WorkspaceContextStore>(
 *   persist(
 *     (set, get) => ({ ... }),
 *     {
 *       name: 'workspace-state',
 *       migrate: migrateV0WorkspaceState,
 *     }
 *   )
 * );
 * ```
 */
export function migrateV0WorkspaceState(
  oldState: unknown,
  _version: number,
): WorkspaceContextStore {
  // 現在はv0のみが廃止されたバージョン
  // 今後のマイグレーションではバージョン番号を考慮する必要がある
  const v0State = oldState as WorkspaceContextStoreV0;

  // 新しい構造に変換
  const migrated: WorkspaceContextStore = {
    // ダイアログ状態を新構造に再編成
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

    // 機能ツアー状態（表示済みリストのみ保持）
    featureTours: {
      active: undefined,
      shown: v0State.featureTours.shown,
    },

    // サイドバー状態を構造化オブジェクトに変換
    sidebars: {
      left: {
        item: v0State.leftSidebarItem,
        open: v0State.leftSidebarOpen,
        size: v0State.leftSidebarSize,
      },
      right: {
        item: v0State.rightSidebarItem,
        open: v0State.rightSidebarOpen,
        size: v0State.rightSidebarSize,
      },
    },

    // 再生コントロール設定（新機能のデフォルト値を追加）
    playbackControls: {
      repeat: v0State.playbackControls.repeat,
      syncInstances: false, // 新機能のデフォルト値
    },
  };

  return migrated;
}
