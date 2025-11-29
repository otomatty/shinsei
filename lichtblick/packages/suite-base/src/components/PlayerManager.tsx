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

/**
 * @fileoverview PlayerManager - データ処理エンジン管理システム
 *
 * このファイルは、Lichtblickアプリケーションにおけるデータ処理エンジン（Player）の
 * 管理を担当する中核コンポーネントを実装している。データソースの選択、Player階層化、
 * 最近使用したファイルの管理、エラーハンドリングなどを統合的に管理する。
 *
 * ## 主要機能
 *
 * ### 1. Player階層化システム
 * - **BasePlayer**: データソースから直接データを読み込むプレイヤー
 * - **TopicAliasingPlayer**: トピック名エイリアス機能を提供
 * - **UserScriptPlayer**: ユーザースクリプト実行機能を提供
 * - **AnalyticsMetricsCollector**: アナリティクス収集機能を提供
 *
 * ### 2. データソース管理
 * - 利用可能なデータソースファクトリーの管理
 * - データソース選択とPlayer初期化の制御
 * - サンプルデータ、ファイル、接続データソースの統一インターフェース
 * - レガシーID対応による後方互換性の確保
 *
 * ### 3. 最近使用したファイル管理
 * - IndexedDBを使用した履歴の永続化
 * - ファイルハンドルとファイルオブジェクトの適切な管理
 * - 接続情報の履歴保存とプライバシー配慮
 * - 複数ファイル対応とファイル名のマージ表示
 *
 * ### 4. 拡張機能連携
 * - ExtensionCatalogからのトピックエイリアス関数の動的取得
 * - 拡張機能の状態変更監視とPlayer更新
 * - 安定した空のエイリアス関数による初期化
 *
 * ### 5. ユーザースクリプト管理
 * - レイアウトからのユーザースクリプト取得
 * - グローバル変数の管理と更新
 * - スクリプト実行のパフォーマンス監視
 *
 * ### 6. エラーハンドリング
 * - ファイルアクセス権限の適切な要求
 * - 非同期処理のキャンセル対応
 * - ユーザーフレンドリーなエラーメッセージ
 * - データソース初期化失敗時の適切な状態管理
 *
 * ## アーキテクチャ詳細
 *
 * ### Player階層化の設計思想
 * ```
 * UserScriptPlayer (最上位: ユーザースクリプト実行)
 *   ↓
 * TopicAliasingPlayer (中間層: トピック名変換)
 *   ↓
 * BasePlayer (基底層: データソース読み込み)
 * ```
 *
 * ### データフロー
 * 1. **データソース選択**: ユーザーがデータソースを選択
 * 2. **Player初期化**: 選択されたデータソースでBasePlayerを作成
 * 3. **階層化**: TopicAliasingPlayer → UserScriptPlayerの順で包装
 * 4. **MessagePipeline連携**: 最終的なPlayerをMessagePipelineに渡す
 * 5. **状態管理**: PlayerSelectionContextで状態を管理
 *
 * ### メモリリーク対策
 * - createSelectRecentCallbackの関数外定義によるクロージャ問題の回避
 * - Start.tsx でのメモ化状態での古いPlayer参照保持問題の解決
 * - 適切なクリーンアップ処理の実装
 *
 * ## 使用例
 *
 * ```tsx
 * // アプリケーションルートでの使用
 * <PlayerManager playerSources={dataSources}>
 *   <MessagePipelineProvider>
 *     <App />
 *   </MessagePipelineProvider>
 * </PlayerManager>
 *
 * // データソース選択
 * const { selectSource } = useContext(PlayerSelectionContext);
 * await selectSource('file', {
 *   type: 'file',
 *   files: [selectedFile]
 * });
 * ```
 *
 * ## パフォーマンス考慮事項
 *
 * ### 最適化手法
 * - useMemoによるPlayer階層化の最適化
 * - useCallbackによるコールバック関数の安定化
 * - デバウンス処理による不要な再計算の防止
 * - 参照等価性の維持によるレンダリング最適化
 *
 * ### 注意点
 * - ファイル選択時のIndexedDB容量制限
 * - 非同期処理でのコンポーネントアンマウント対応
 * - 大量ファイル処理時のメモリ使用量
 * - 拡張機能更新時のPlayer再初期化コスト
 *
 * @see {@link MessagePipelineProvider} - Player状態の管理
 * @see {@link PlayerSelectionContext} - Player選択の状態管理
 * @see {@link TopicAliasingPlayer} - トピックエイリアス機能
 * @see {@link UserScriptPlayer} - ユーザースクリプト実行
 */

import { useSnackbar } from "notistack";
import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useLatest, useMountedState } from "react-use";

import { useWarnImmediateReRender } from "@lichtblick/hooks";
import Logger from "@lichtblick/log";
import { Immutable } from "@lichtblick/suite";
import { MessagePipelineProvider } from "@lichtblick/suite-base/components/MessagePipeline";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import {
  LayoutState,
  useCurrentLayoutSelector,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { ExtensionCatalogContext } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import { usePerformance } from "@lichtblick/suite-base/context/PerformanceContext";
import PlayerSelectionContext, {
  DataSourceArgs,
  IDataSourceFactory,
  PlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import {
  UserScriptStore,
  useUserScriptState,
} from "@lichtblick/suite-base/context/UserScriptStateContext";
import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import useIndexedDbRecents, {
  RecentRecord,
} from "@lichtblick/suite-base/hooks/useIndexedDbRecents";
import AnalyticsMetricsCollector from "@lichtblick/suite-base/players/AnalyticsMetricsCollector";
import {
  TopicAliasFunctions,
  TopicAliasingPlayer,
} from "@lichtblick/suite-base/players/TopicAliasingPlayer/TopicAliasingPlayer";
import UserScriptPlayer from "@lichtblick/suite-base/players/UserScriptPlayer";
import { Player } from "@lichtblick/suite-base/players/types";
import { UserScripts } from "@lichtblick/suite-base/types/panels";
import { mergeMultipleFileNames } from "@lichtblick/suite-base/util/mergeMultipleFileName";

const log = Logger.getLogger(__filename);

/**
 * PlayerManagerコンポーネントのProps型定義
 *
 * @interface PlayerManagerProps
 * @property {readonly IDataSourceFactory[]} playerSources - 利用可能なデータソースファクトリーの配列
 *                                                           readonlyにより不変性を保証
 */
type PlayerManagerProps = {
  playerSources: readonly IDataSourceFactory[];
};

/**
 * 空のユーザースクリプトオブジェクト
 * Object.freeze()により不変性を保証し、デフォルト値として使用
 */
const EMPTY_USER_NODES: UserScripts = Object.freeze({});

/**
 * 空のグローバル変数オブジェクト
 * Object.freeze()により不変性を保証し、デフォルト値として使用
 */
const EMPTY_GLOBAL_VARIABLES: GlobalVariables = Object.freeze({});

/**
 * レイアウト状態からユーザースクリプトを取得するセレクター関数
 * nullish coalescing演算子(??)でデフォルト値を提供
 *
 * @param {LayoutState} state - レイアウト状態
 * @returns {UserScripts} ユーザースクリプト設定
 */
const userScriptsSelector = (state: LayoutState) =>
  state.selectedLayout?.data?.userNodes ?? EMPTY_USER_NODES;

/**
 * レイアウト状態からグローバル変数を取得するセレクター関数
 * nullish coalescing演算子(??)でデフォルト値を提供
 *
 * @param {LayoutState} state - レイアウト状態
 * @returns {GlobalVariables} グローバル変数設定
 */
const globalVariablesSelector = (state: LayoutState) =>
  state.selectedLayout?.data?.globalVariables ?? EMPTY_GLOBAL_VARIABLES;

/**
 * ユーザースクリプトストアからアクション関数を取得するセレクター
 *
 * @param {UserScriptStore} store - ユーザースクリプトストア
 * @returns {UserScriptStore["actions"]} アクション関数群
 */
const selectUserScriptActions = (store: UserScriptStore) => store.actions;

/**
 * PlayerManager - データ処理エンジン管理コンポーネント
 *
 * このコンポーネントは、Lichtblickアプリケーションにおけるデータ処理エンジン（Player）の
 * 管理を担当する。データソースの選択、Player階層化、最近使用したファイルの管理、
 * エラーハンドリングなどを統合的に管理する。
 *
 * ## 主要機能
 *
 * ### 1. Player階層化システム
 * - BasePlayer（データソース読み込み）
 * - TopicAliasingPlayer（トピック名変換）
 * - UserScriptPlayer（ユーザースクリプト実行）
 * の3層構造でデータ処理パイプラインを構築
 *
 * ### 2. データソース管理
 * - 利用可能なデータソースファクトリーの管理
 * - データソース選択とPlayer初期化の制御
 * - サンプルデータ、ファイル、接続データソースの統一インターフェース
 *
 * ### 3. 最近使用したファイル管理
 * - IndexedDBを使用した履歴の永続化
 * - ファイルハンドルとファイルオブジェクトの適切な管理
 * - 接続情報の履歴保存
 *
 * ### 4. 拡張機能連携
 * - ExtensionCatalogからのトピックエイリアス関数の動的取得
 * - 拡張機能の状態変更監視とPlayer更新
 *
 * ### 5. エラーハンドリング
 * - ファイルアクセス権限の適切な要求
 * - 非同期処理のキャンセル対応
 * - ユーザーフレンドリーなエラーメッセージ
 *
 * @param {PropsWithChildren<PlayerManagerProps>} props - コンポーネントのProps
 * @returns {React.JSX.Element} レンダリング結果
 */
export default function PlayerManager(
  props: PropsWithChildren<PlayerManagerProps>,
): React.JSX.Element {
  const { children, playerSources } = props;

  // パフォーマンス監視レジストリの取得
  const perfRegistry = usePerformance();

  // 即座の再レンダリングの警告機能
  useWarnImmediateReRender();

  // ユーザースクリプトのアクション関数群を取得
  const userScriptActions = useUserScriptState(selectUserScriptActions);

  // コンポーネントのマウント状態を追跡
  const isMounted = useMountedState();

  // アナリティクス機能とメトリクス収集器の初期化
  const analytics = useAnalytics();
  const metricsCollector = useMemo(() => new AnalyticsMetricsCollector(analytics), [analytics]);

  // 基底Playerの状態管理
  const [basePlayer, setBasePlayer] = useState<Player | undefined>();

  // 最近使用したファイルの管理
  const { recents, addRecent } = useIndexedDbRecents();

  // レイアウトからユーザースクリプトとグローバル変数を取得
  const userScripts = useCurrentLayoutSelector(userScriptsSelector);
  const globalVariables = useCurrentLayoutSelector(globalVariablesSelector);

  /**
   * TopicAliasingPlayerの生成
   * basePlayerが存在する場合のみ、トピックエイリアス機能を提供するPlayerを生成
   */
  const topicAliasPlayer = useMemo(() => {
    if (!basePlayer) {
      return undefined;
    }

    return new TopicAliasingPlayer(basePlayer);
  }, [basePlayer]);

  /**
   * 拡張機能からのトピックエイリアス関数の動的更新
   * 拡張機能の状態変更を監視し、エイリアス関数が変更された場合にPlayerを更新
   */
  const extensionCatalogContext = useContext(ExtensionCatalogContext);
  useEffect(() => {
    // 拡張機能がない場合の安定した空のエイリアス関数
    const emptyAliasFunctions: Immutable<TopicAliasFunctions> = [];

    // エイリアス関数の変更時のみPlayerを更新（参照等価性チェック）
    let topicAliasFunctions =
      extensionCatalogContext?.getState().installedTopicAliasFunctions ?? emptyAliasFunctions;
    topicAliasPlayer?.setAliasFunctions(topicAliasFunctions);

    // 拡張機能の状態変更を監視
    return extensionCatalogContext?.subscribe((state) => {
      if (topicAliasFunctions !== state.installedTopicAliasFunctions) {
        topicAliasFunctions = state.installedTopicAliasFunctions ?? emptyAliasFunctions;
        topicAliasPlayer?.setAliasFunctions(topicAliasFunctions);
      }
    });
  }, [extensionCatalogContext, topicAliasPlayer]);

  // グローバル変数の最新値を保持するRef
  const globalVariablesRef = useLatest(globalVariables);

  /**
   * 最終的なPlayerの生成（UserScriptPlayer）
   * TopicAliasingPlayerをベースに、ユーザースクリプト実行機能を追加
   */
  const player = useMemo(() => {
    if (!topicAliasPlayer) {
      return undefined;
    }

    const userScriptPlayer = new UserScriptPlayer(
      topicAliasPlayer,
      userScriptActions,
      perfRegistry,
    );
    userScriptPlayer.setGlobalVariables(globalVariablesRef.current);

    return userScriptPlayer;
  }, [globalVariablesRef, topicAliasPlayer, userScriptActions, perfRegistry]);

  /**
   * ユーザースクリプトの更新
   * useLayoutEffectを使用して、レンダリング前にスクリプトを更新
   */
  useLayoutEffect(() => void player?.setUserScripts(userScripts), [player, userScripts]);

  // エラーメッセージ表示のためのSnackbar
  const { enqueueSnackbar } = useSnackbar();

  // 選択中のデータソースファクトリーの状態管理
  const [selectedSource, setSelectedSource] = useState<IDataSourceFactory | undefined>();

  /**
   * データソース選択とPlayer初期化の処理
   *
   * この関数は、指定されたデータソースIDに基づいてPlayerを初期化する。
   * データソースタイプ（サンプル、ファイル、接続）に応じて異なる初期化処理を実行。
   *
   * ### 処理フロー
   * 1. データソースファクトリーの検索（レガシーID対応）
   * 2. アナリティクスメトリクスの設定
   * 3. データソースタイプ別の初期化処理
   * 4. 最近使用したファイルへの追加
   * 5. エラーハンドリングと適切な状態管理
   *
   * ### サポートするデータソースタイプ
   * - **sample**: サンプルデータ（引数不要）
   * - **connection**: 接続データソース（URL等のパラメータ必要）
   * - **file**: ファイルデータソース（ファイルオブジェクトまたはハンドル必要）
   *
   * ### ファイル処理の詳細
   * - File オブジェクト: 即座に読み込み可能、IndexedDBには保存しない
   * - FileSystemFileHandle: 権限要求後にファイル取得、履歴に保存
   * - 複数ファイル対応: supportsMultiFileプロパティによる制御
   *
   * ### エラーハンドリング
   * - 未知のデータソースID: 警告メッセージ
   * - 引数不足: エラーメッセージと状態リセット
   * - ファイルアクセス権限拒否: 権限エラー
   * - 非同期処理中のアンマウント: 処理の中断
   *
   * @param {string} sourceId - データソースID（レガシーID対応）
   * @param {DataSourceArgs} [args] - データソース初期化引数
   * @returns {Promise<void>} 初期化完了のPromise
   */
  const selectSource = useCallback(
    async (sourceId: string, args?: DataSourceArgs) => {
      log.debug(`Select Source: ${sourceId}`);

      // データソースファクトリーの検索（レガシーID対応）
      const foundSource = playerSources.find(
        (source) => (source.id === sourceId || source.legacyIds?.includes(sourceId)) ?? false,
      );
      if (!foundSource) {
        enqueueSnackbar(`Unknown data source: ${sourceId}`, { variant: "warning" });
        return;
      }

      // アナリティクスメトリクスにPlayerタイプを設定
      metricsCollector.setProperty("player", sourceId);

      setSelectedSource(foundSource);

      // サンプルデータソースは引数不要で即座に初期化
      if (foundSource.type === "sample") {
        const newPlayer = foundSource.initialize({
          metricsCollector,
        });

        setBasePlayer(newPlayer);
        return;
      }

      // サンプル以外のデータソースは引数が必要
      if (!args) {
        enqueueSnackbar("Unable to initialize player: no args", { variant: "error" });
        setSelectedSource(undefined);
        return;
      }

      try {
        switch (args.type) {
          case "connection": {
            // 接続データソース（WebSocket、HTTP等）の初期化
            const newPlayer = foundSource.initialize({
              metricsCollector,
              params: args.params,
            });
            setBasePlayer(newPlayer);

            // URLが存在する場合は最近使用したファイルに追加
            if (args.params?.url) {
              addRecent({
                type: "connection",
                sourceId: foundSource.id,
                title: args.params.url,
                label: foundSource.displayName,
                extra: args.params,
              });
            }

            return;
          }
          case "file": {
            const handles = args.handles;
            const files = args.files;

            // Fileオブジェクトがある場合は即座に読み込み
            // IndexedDBにFileオブジェクトを保存するとファイル全体が保存されるため、
            // 最近使用したファイルには追加しない
            if (files) {
              let file = files[0];
              const fileList: File[] = [];

              for (const curFile of files) {
                file ??= curFile;
                fileList.push(curFile);
              }

              // 複数ファイル対応の判定
              const multiFile = foundSource.supportsMultiFile === true && fileList.length > 1;

              const newPlayer = foundSource.initialize({
                file: multiFile ? undefined : file,
                files: multiFile ? fileList : undefined,
                metricsCollector,
              });

              setBasePlayer(newPlayer);
              return;
            } else if (handles) {
              // FileSystemFileHandleの場合は権限要求が必要
              for (const handle of handles) {
                const permission = await handle.queryPermission({ mode: "read" });
                if (!isMounted()) {
                  return; // コンポーネントがアンマウントされた場合は処理を中断
                }

                if (permission !== "granted") {
                  const newPerm = await handle.requestPermission({ mode: "read" });
                  if (newPerm !== "granted") {
                    throw new Error(`Permission denied: ${handle.name}`);
                  }
                }
              }

              // 全ハンドルからファイルを取得
              const filesHandled = await Promise.all(handles.map(async (f) => await f.getFile()));
              if (!isMounted()) {
                return; // コンポーネントがアンマウントされた場合は処理を中断
              }

              const newPlayer = foundSource.initialize({
                files: filesHandled,
                metricsCollector,
              });

              setBasePlayer(newPlayer);

              // FileSystemFileHandleは最近使用したファイルに追加
              addRecent({
                type: "file",
                title: mergeMultipleFileNames(handles.map((h) => h.name)),
                sourceId: foundSource.id,
                handles,
              });

              return;
            }
          }
        }

        // 未対応のデータソースタイプまたは引数不足
        enqueueSnackbar("Unable to initialize player", { variant: "error" });
      } catch (error) {
        // エラーハンドリング: ユーザーフレンドリーなメッセージを表示
        enqueueSnackbar((error as Error).message, { variant: "error" });
      }
    },
    [playerSources, metricsCollector, enqueueSnackbar, isMounted, addRecent],
  );

  /**
   * 最近使用したファイルの選択処理
   *
   * メモリリーク対策として、createSelectRecentCallbackを関数外で定義し、
   * クロージャによる古いPlayer参照の保持を防ぐ。
   *
   * eslint-disable-next-line は、依存配列にrecentsを含めることで
   * 初期プレイヤーがクロージャコンテキストにキャプチャされることを防ぐため。
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectRecent = useCallback(
    createSelectRecentCallback(recents, selectSource, enqueueSnackbar),
    [recents, enqueueSnackbar, selectSource],
  );

  /**
   * PlayerSelectionContext用の最近使用したファイル一覧の生成
   * 表示用の情報のみを抽出してメモ化
   */
  const recentSources = useMemo(() => {
    return recents.map((item) => {
      return { id: item.id, title: item.title, label: item.label };
    });
  }, [recents]);

  /**
   * PlayerSelectionContextの値オブジェクト
   * Player選択に関する状態と操作関数を提供
   */
  const value: PlayerSelection = {
    selectSource,
    selectRecent,
    selectedSource,
    availableSources: playerSources,
    recentSources,
  };

  return (
    <>
      <PlayerSelectionContext.Provider value={value}>
        <MessagePipelineProvider player={player}>{children}</MessagePipelineProvider>
      </PlayerSelectionContext.Provider>
    </>
  );
}

/**
 * 最近使用したファイル選択のコールバック関数を生成
 *
 * この関数は、PlayerManager関数の外部で定義されており、これはStart.txtの
 * メモ化状態で発生するメモリリークを防ぐためである。
 *
 * ### メモリリーク問題の詳細
 * - PlayerManager内でコールバックを定義すると、そのコールバックは
 *   インスタンス化時のプレイヤーをクロージャコンテキストに保存する
 * - そのコールバックは、クロージャコンテキストと共にメモ化状態に保存される
 * - プレイヤーが変更されてもコールバックは更新されるが、Start.tsxの一部が
 *   以前のメモ化状態を保持し続ける（理由不明）
 * - 結果として、古いプレイヤーインスタンスがメモリに残り続ける
 *
 * ### 解決策
 * この関数を使用するコンポーネントでの古いクロージャコンテキストの保存を
 * 安全にするため、この関数をPlayerManager関数の外部に移動した。
 *
 * @param {RecentRecord[]} recents - 最近使用したファイルの記録
 * @param {Function} selectSource - データソース選択関数
 * @param {Function} enqueueSnackbar - スナックバー表示関数
 * @returns {Function} 最近使用したファイル選択のコールバック関数
 */
function createSelectRecentCallback(
  recents: RecentRecord[],
  selectSource: (sourceId: string, dataSourceArgs: DataSourceArgs) => Promise<void>,
  enqueueSnackbar: ReturnType<typeof useSnackbar>["enqueueSnackbar"],
) {
  return (recentId: string) => {
    // 最近使用したファイルリストから該当項目を検索
    const foundRecent = recents.find((value) => value.id === recentId);
    if (!foundRecent) {
      enqueueSnackbar(`Failed to restore recent: ${recentId}`, { variant: "error" });
      return;
    }

    // データソースタイプに応じて適切な引数でselectSourceを呼び出し
    switch (foundRecent.type) {
      case "connection": {
        void selectSource(foundRecent.sourceId, {
          type: "connection",
          params: foundRecent.extra,
        });
        break;
      }
      case "file": {
        void selectSource(foundRecent.sourceId, {
          type: "file",
          handles: foundRecent.handles,
        });
      }
    }
  };
}
