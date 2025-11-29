// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Draft, produce } from "immer";
import * as _ from "lodash-es";
import { Dispatch, SetStateAction, useCallback, useMemo } from "react";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { AppSettingsTab } from "@lichtblick/suite-base/components/AppSettingsDialog/types";
import { DataSourceDialogItem } from "@lichtblick/suite-base/components/DataSourceDialog";
import {
  IDataSourceFactory,
  usePlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";

import {
  LeftSidebarItemKey,
  LeftSidebarItemKeys,
  RightSidebarItemKey,
  RightSidebarItemKeys,
  WorkspaceContext,
  WorkspaceContextStore,
} from "./WorkspaceContext";
import { useOpenFile } from "./useOpenFile";

/**
 * ワークスペースアクションの型定義
 *
 * ワークスペース状態を操作するためのアクション関数群を定義。
 * 各アクションは特定のUI要素や機能の状態を変更する責任を持つ。
 *
 * 構造:
 * - dialogActions: ダイアログの開閉と設定
 * - featureTourActions: 機能ツアーの制御
 * - 個別のオープンアクション: 特定のUI要素を開く
 * - playbackControlActions: 再生コントロールの設定
 * - sidebarActions: サイドバーの状態管理
 */
export type WorkspaceActions = {
  /** ダイアログ関連のアクション */
  dialogActions: {
    /** データソースダイアログのアクション */
    dataSource: {
      /** データソースダイアログを閉じる */
      close: () => void;
      /** データソースダイアログを開く */
      open: (item: DataSourceDialogItem, dataSource?: IDataSourceFactory) => void;
    };
    /** ファイルオープンダイアログのアクション */
    openFile: {
      /** ファイルオープンダイアログを開く */
      open: () => Promise<void>;
    };
    /** 設定ダイアログのアクション */
    preferences: {
      /** 設定ダイアログを閉じる */
      close: () => void;
      /** 設定ダイアログを開く */
      open: (initialTab?: AppSettingsTab) => void;
    };
  };

  /** 機能ツアー関連のアクション */
  featureTourActions: {
    /** 機能ツアーを開始 */
    startTour: (tour: string) => void;
    /** 機能ツアーを完了 */
    finishTour: (tour: string) => void;
  };

  /** アカウント設定を開く */
  openAccountSettings: () => void;
  /** パネル設定を開く */
  openPanelSettings: () => void;
  /** レイアウトブラウザーを開く */
  openLayoutBrowser: () => void;

  /** 再生コントロール関連のアクション */
  playbackControlActions: {
    /** リピート再生の設定 */
    setRepeat: Dispatch<SetStateAction<boolean>>;
    /** インスタンス同期の設定 */
    setSyncInstances: Dispatch<SetStateAction<boolean>>;
  };

  /** サイドバー関連のアクション */
  sidebarActions: {
    /** 左サイドバーのアクション */
    left: {
      /** 左サイドバーのアイテムを選択 */
      selectItem: (item: undefined | LeftSidebarItemKey) => void;
      /** 左サイドバーの開閉状態を設定 */
      setOpen: Dispatch<SetStateAction<boolean>>;
      /** 左サイドバーのサイズを設定 */
      setSize: (size: undefined | number) => void;
    };
    /** 右サイドバーのアクション */
    right: {
      /** 右サイドバーのアイテムを選択 */
      selectItem: (item: undefined | RightSidebarItemKey) => void;
      /** 右サイドバーの開閉状態を設定 */
      setOpen: Dispatch<SetStateAction<boolean>>;
      /** 右サイドバーのサイズを設定 */
      setSize: (size: undefined | number) => void;
    };
  };
};

/**
 * SetStateAction型の値を実際の値に変換するヘルパー関数
 *
 * @param action SetStateAction（値または関数）
 * @param value 現在の値
 * @returns 新しい値
 */
function setterValue<T>(action: SetStateAction<T>, value: T): T {
  if (action instanceof Function) {
    return action(value);
  }

  return action;
}

/**
 * ワークスペース状態操作のためのアクション関数群を提供するカスタムフック
 *
 * このフックは、ワークスペース全体の状態を操作するための
 * 統合されたアクション関数群を提供します。
 *
 * 主な機能:
 * - ダイアログの開閉制御
 * - サイドバーの状態管理
 * - 機能ツアーの制御
 * - 再生コントロールの設定
 * - 各種UI要素の表示制御
 *
 * 特徴:
 * - Immerを使用した不変性の保証
 * - 型安全なアクション定義
 * - 関数の最適化（useCallback/useMemo）
 * - 一貫したエラーハンドリング
 *
 * @returns ワークスペース操作のためのアクション関数群
 *
 * 使用例:
 * ```typescript
 * function WorkspaceToolbar() {
 *   const {
 *     dialogActions,
 *     sidebarActions,
 *     openPanelSettings,
 *     featureTourActions
 *   } = useWorkspaceActions();
 *
 *   return (
 *     <div>
 *       <button onClick={() => dialogActions.preferences.open()}>
 *         設定を開く
 *       </button>
 *       <button onClick={() => sidebarActions.left.selectItem('panel-settings')}>
 *         パネル設定
 *       </button>
 *       <button onClick={() => featureTourActions.startTour('getting-started')}>
 *         ツアー開始
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * アーキテクチャ:
 * - Zustandストアとの統合
 * - Immerによる不変性の保証
 * - 型安全なアクション定義
 * - パフォーマンスの最適化
 */
export function useWorkspaceActions(): WorkspaceActions {
  const { setState } = useGuaranteedContext(WorkspaceContext);

  const { availableSources } = usePlayerSelection();

  const openFile = useOpenFile(availableSources);

  /**
   * Immerを使用してワークスペース状態を安全に更新するヘルパー関数
   *
   * @param setter 状態を更新するドラフト関数
   */
  const set = useCallback(
    (setter: (draft: Draft<WorkspaceContextStore>) => void) => {
      setState(produce<WorkspaceContextStore>(setter));
    },
    [setState],
  );

  return useMemo(() => {
    return {
      dialogActions: {
        dataSource: {
          /**
           * データソースダイアログを閉じる
           *
           * アクティブなデータソースとアイテムをクリアし、
           * ダイアログを非表示にします。
           */
          close: () => {
            set((draft) => {
              draft.dialogs.dataSource = {
                activeDataSource: undefined,
                item: undefined,
                open: false,
              };
            });
          },

          /**
           * データソースダイアログを開く
           *
           * 指定されたダイアログアイテムとデータソースで
           * ダイアログを表示します。
           *
           * @param selectedDataSourceDialogItem 表示するダイアログアイテム
           * @param dataSource 関連するデータソースファクトリー（オプション）
           */
          open: (
            selectedDataSourceDialogItem: DataSourceDialogItem,
            dataSource?: IDataSourceFactory,
          ) => {
            set((draft) => {
              // TypeScriptの型深度制限を回避するためのキャスト
              (draft as WorkspaceContextStore).dialogs.dataSource.activeDataSource = dataSource;
              draft.dialogs.dataSource.item = selectedDataSourceDialogItem;
              draft.dialogs.dataSource.open = true;
            });
          },
        },

        openFile: {
          /**
           * ファイルオープンダイアログを開く
           *
           * ファイルピッカーを表示し、選択されたファイルを
           * 適切なデータソースとして開きます。
           */
          open: openFile,
        },

        preferences: {
          /**
           * 設定ダイアログを閉じる
           *
           * 設定ダイアログを非表示にし、
           * 初期タブの設定をクリアします。
           */
          close: () => {
            set((draft) => {
              draft.dialogs.preferences = { open: false, initialTab: undefined };
            });
          },

          /**
           * 設定ダイアログを開く
           *
           * 指定されたタブで設定ダイアログを表示します。
           *
           * @param initialTab 初期表示するタブ（オプション）
           */
          open: (initialTab?: AppSettingsTab) => {
            set((draft) => {
              draft.dialogs.preferences = { open: true, initialTab };
            });
          },
        },
      },

      featureTourActions: {
        /**
         * 機能ツアーを開始
         *
         * 指定されたツアーをアクティブにします。
         *
         * @param tour 開始するツアーの識別子
         */
        startTour: (tour: string) => {
          set((draft) => {
            draft.featureTours.active = tour;
          });
        },

        /**
         * 機能ツアーを完了
         *
         * アクティブなツアーを終了し、
         * 完了済みツアーリストに追加します。
         *
         * @param tour 完了するツアーの識別子
         */
        finishTour: (tour: string) => {
          set((draft) => {
            draft.featureTours.active = undefined;
            draft.featureTours.shown = _.union(draft.featureTours.shown, [tour]);
          });
        },
      },

      /**
       * アカウント設定を開く
       *
       * 現在は実装されていません。
       * 将来的にアカウント設定ダイアログを開く機能を追加予定。
       */
      openAccountSettings: () => {},

      /**
       * パネル設定を開く
       *
       * 左サイドバーでパネル設定を選択し、
       * サイドバーを開きます。
       */
      openPanelSettings: () => {
        set((draft) => {
          draft.sidebars.left.item = "panel-settings";
          draft.sidebars.left.open = true;
        });
      },

      /**
       * レイアウトブラウザーを開く
       *
       * 左サイドバーでレイアウトを選択します。
       */
      openLayoutBrowser: () => {
        set((draft) => {
          draft.sidebars.left.item = "layouts";
        });
      },

      playbackControlActions: {
        /**
         * リピート再生の設定
         *
         * 再生の繰り返し設定を更新します。
         *
         * @param setter 新しい値または値を計算する関数
         */
        setRepeat: (setter: SetStateAction<boolean>) => {
          set((draft) => {
            const repeat = setterValue(setter, draft.playbackControls.repeat);
            draft.playbackControls.repeat = repeat;
          });
        },

        /**
         * インスタンス同期の設定
         *
         * 複数インスタンス間の同期設定を更新します。
         *
         * @param setter 新しい値または値を計算する関数
         */
        setSyncInstances: (setter: SetStateAction<boolean>) => {
          set((draft) => {
            const sync = setterValue(setter, draft.playbackControls.syncInstances);
            draft.playbackControls.syncInstances = sync;
          });
        },
      },

      sidebarActions: {
        left: {
          /**
           * 左サイドバーのアイテムを選択
           *
           * 指定されたアイテムを選択し、アイテムが指定されている場合は
           * サイドバーを開きます。
           *
           * @param selectedLeftSidebarItem 選択するアイテム
           */
          selectItem: (selectedLeftSidebarItem: undefined | LeftSidebarItemKey) => {
            set((draft) => {
              draft.sidebars.left.item = selectedLeftSidebarItem;
              draft.sidebars.left.open = selectedLeftSidebarItem != undefined;
            });
          },

          /**
           * 左サイドバーの開閉状態を設定
           *
           * サイドバーを開く場合、前回選択されていたアイテムを復元するか、
           * デフォルトでパネル設定を選択します。
           *
           * @param setter 新しい開閉状態または状態を計算する関数
           */
          setOpen: (setter: SetStateAction<boolean>) => {
            set((draft) => {
              const leftSidebarOpen = setterValue(setter, draft.sidebars.left.open);
              if (leftSidebarOpen) {
                const oldItem = LeftSidebarItemKeys.find(
                  (item) => item === draft.sidebars.left.item,
                );
                draft.sidebars.left.open = leftSidebarOpen;
                draft.sidebars.left.item = oldItem ?? "panel-settings";
              } else {
                draft.sidebars.left.open = false;
              }
            });
          },

          /**
           * 左サイドバーのサイズを設定
           *
           * @param leftSidebarSize 新しいサイドバーサイズ（ピクセル）
           */
          setSize: (leftSidebarSize: undefined | number) => {
            set((draft) => {
              draft.sidebars.left.size = leftSidebarSize;
            });
          },
        },
        right: {
          /**
           * 右サイドバーのアイテムを選択
           *
           * 指定されたアイテムを選択し、アイテムが指定されている場合は
           * サイドバーを開きます。
           *
           * @param selectedRightSidebarItem 選択するアイテム
           */
          selectItem: (selectedRightSidebarItem: undefined | RightSidebarItemKey) => {
            set((draft) => {
              draft.sidebars.right.item = selectedRightSidebarItem;
              draft.sidebars.right.open = selectedRightSidebarItem != undefined;
            });
          },

          /**
           * 右サイドバーの開閉状態を設定
           *
           * サイドバーを開く場合、前回選択されていたアイテムを復元するか、
           * デフォルトで変数を選択します。
           *
           * @param setter 新しい開閉状態または状態を計算する関数
           */
          setOpen: (setter: SetStateAction<boolean>) => {
            set((draft) => {
              const rightSidebarOpen = setterValue(setter, draft.sidebars.right.open);
              const oldItem = RightSidebarItemKeys.find(
                (item) => item === draft.sidebars.right.item,
              );
              if (rightSidebarOpen) {
                draft.sidebars.right.open = rightSidebarOpen;
                draft.sidebars.right.item = oldItem ?? "variables";
              } else {
                draft.sidebars.right.open = false;
              }
            });
          },

          /**
           * 右サイドバーのサイズを設定
           *
           * @param rightSidebarSize 新しいサイドバーサイズ（ピクセル）
           */
          setSize: (rightSidebarSize: undefined | number) => {
            set((draft) => {
              draft.sidebars.right.size = rightSidebarSize;
            });
          },
        },
      },
    };
  }, [openFile, set]);
}
