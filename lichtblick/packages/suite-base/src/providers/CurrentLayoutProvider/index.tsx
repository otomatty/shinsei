// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNodeAtPath } from "react-mosaic-component";
import { useAsync, useAsyncFn, useMountedState } from "react-use";
import shallowequal from "shallowequal";
import { v4 as uuidv4 } from "uuid";

import { useShallowMemo } from "@lichtblick/hooks";
import Logger from "@lichtblick/log";
import { VariableValue } from "@lichtblick/suite";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { useAppParameters } from "@lichtblick/suite-base/context/AppParametersContext";
import CurrentLayoutContext, {
  ICurrentLayout,
  LayoutID,
  LayoutState,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import {
  AddPanelPayload,
  ChangePanelLayoutPayload,
  ClosePanelPayload,
  CreateTabPanelPayload,
  DropPanelPayload,
  EndDragPayload,
  MoveTabPayload,
  PanelsActions,
  SaveConfigsPayload,
  SplitPanelPayload,
  StartDragPayload,
  SwapPanelPayload,
} from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import { useUserProfileStorage } from "@lichtblick/suite-base/context/UserProfileStorageContext";
import { MAX_SUPPORTED_LAYOUT_VERSION } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/constants";
import { defaultLayout } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/defaultLayout";
import useUpdateSharedPanelState from "@lichtblick/suite-base/providers/CurrentLayoutProvider/hooks/useUpdateSharedPanelState";
import { loadDefaultLayouts } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/loadDefaultLayouts";
import panelsReducer from "@lichtblick/suite-base/providers/CurrentLayoutProvider/reducers";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
import { LayoutLoader } from "@lichtblick/suite-base/services/ILayoutLoader";
import { LayoutManagerEventTypes } from "@lichtblick/suite-base/services/ILayoutManager";
import { PanelConfig, PlaybackConfig, UserScripts } from "@lichtblick/suite-base/types/panels";
import { windowAppURLState } from "@lichtblick/suite-base/util/appURLState";
import { getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";

import { IncompatibleLayoutVersionAlert } from "./IncompatibleLayoutVersionAlert";

const log = Logger.getLogger(__filename);

/**
 * CurrentLayoutProvider
 *
 * Lichtblick Suiteの中核となるレイアウト管理システムのメインProviderです。
 * レイアウトの永続化、状態管理、パネル操作、ドラッグ&ドロップなど、
 * アプリケーションのUI構成に関するすべての機能を統合管理します。
 *
 * ## 主要機能
 *
 * ### 1. レイアウト管理
 * - **自動復元**: ユーザープロファイルからの前回レイアウト復元
 * - **永続化**: レイアウト変更の自動保存
 * - **バージョン管理**: レイアウトの後方互換性保証
 * - **デフォルトレイアウト**: 初回起動時の標準レイアウト提供
 *
 * ### 2. パネル操作
 * - **CRUD操作**: パネルの追加・削除・更新・交換
 * - **分割・統合**: パネルの分割とタブ化
 * - **ドラッグ&ドロップ**: 直感的なパネル配置
 * - **設定管理**: パネル個別設定の保存・復元
 *
 * ### 3. 状態管理
 * - **選択状態**: パネル選択状態の追跡
 * - **共有状態**: パネル間での状態共有
 * - **グローバル変数**: アプリケーション全体の変数管理
 * - **ユーザースクリプト**: カスタムスクリプトの管理
 *
 * ### 4. 高度な機能
 * - **タブパネル**: 複数パネルのタブ切り替え
 * - **ネストレイアウト**: 複雑な階層構造のサポート
 * - **アナリティクス**: ユーザー操作の追跡・分析
 * - **エラーハンドリング**: 堅牢なエラー処理と復旧
 *
 * ## アーキテクチャ
 *
 * ### React Mosaic基盤
 * - 分割可能なレイアウトシステム
 * - ドラッグ&ドロップサポート
 * - 動的リサイズ機能
 *
 * ### 関数型状態管理
 * - Reducerパターンによる予測可能な状態更新
 * - Immutable更新による最適化
 * - 型安全な操作保証
 *
 * ### 非同期処理
 * - レイアウトの非同期読み込み
 * - エラー時の適切なフォールバック
 * - ユーザー体験の向上
 *
 * ## パフォーマンス最適化
 * - **メモ化**: 重い計算の結果キャッシュ
 * - **参照等価性**: 不要な再レンダリング防止
 * - **遅延評価**: 必要時のみ処理実行
 * - **バッチ更新**: 複数操作の一括処理
 *
 * ## 使用例
 * ```typescript
 * // アプリケーションルートでの使用
 * <CurrentLayoutProvider loaders={[customLoader]}>
 *   <MainApplication />
 * </CurrentLayoutProvider>
 *
 * // 子コンポーネントでの使用
 * const layout = useCurrentLayoutActions();
 * layout.addPanel({ id: "panel1", config: {} });
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @param props.loaders - カスタムレイアウトローダー
 * @returns React.JSX.Element
 *
 * @see CurrentLayoutContext - 提供されるコンテキスト
 * @see panelsReducer - 状態更新ロジック
 * @see LayoutManager - レイアウト永続化
 */
export default function CurrentLayoutProvider({
  children,
  loaders = [],
}: React.PropsWithChildren<{
  loaders?: readonly LayoutLoader[];
}>): React.JSX.Element {
  // 外部サービスとの連携
  const { enqueueSnackbar } = useSnackbar();
  const { getUserProfile, setUserProfile } = useUserProfileStorage();
  const layoutManager = useLayoutManager();
  const analytics = useAnalytics();
  const isMounted = useMountedState();
  const { t } = useTranslation("general");
  const appParameters = useAppParameters();

  // 一意なMosaicIDを生成（レイアウトシステムの識別用）
  const [mosaicId] = useState(() => uuidv4());

  /**
   * レイアウト状態変更リスナー管理
   *
   * 複数のコンポーネントがレイアウト状態の変更を監視できるように
   * リスナーパターンを実装しています。
   */
  const layoutStateListeners = useRef(new Set<(_: LayoutState) => void>());
  const addLayoutStateListener = useCallback((listener: (_: LayoutState) => void) => {
    layoutStateListeners.current.add(listener);
  }, []);
  const removeLayoutStateListener = useCallback((listener: (_: LayoutState) => void) => {
    layoutStateListeners.current.delete(listener);
  }, []);

  /**
   * レイアウト状態管理
   *
   * 現在選択されているレイアウトの状態を管理します。
   * バージョン互換性チェックと自動フォールバック機能を含みます。
   */
  const [layoutState, setLayoutStateInternal] = useState<LayoutState>({
    selectedLayout: undefined,
  });
  const layoutStateRef = useRef(layoutState);
  const [incompatibleLayoutVersionError, setIncompatibleLayoutVersionError] = useState(false);

  /**
   * レイアウト状態更新関数
   *
   * バージョン互換性をチェックし、非互換の場合は警告を表示します。
   * リスナーへの通知も自動的に行います。
   */
  const setLayoutState = useCallback((newState: LayoutState) => {
    const layoutVersion = newState.selectedLayout?.data?.version;

    // バージョン互換性チェック
    if (layoutVersion != undefined && layoutVersion > MAX_SUPPORTED_LAYOUT_VERSION) {
      setIncompatibleLayoutVersionError(true);
      setLayoutStateInternal({ selectedLayout: undefined });
      return;
    }

    setLayoutStateInternal(newState);

    // リスナーが効果内でgetCurrentLayoutState()を呼び出せるように
    // 再レンダリング前にrefを更新
    layoutStateRef.current = newState;

    // 登録されたリスナーに状態変更を通知
    for (const listener of [...layoutStateListeners.current]) {
      listener(newState);
    }
  }, []);

  /**
   * 選択パネルID管理
   *
   * 現在選択されているパネルのIDリストを管理します。
   * 複数選択とリスナーパターンをサポートします。
   */
  const selectedPanelIds = useRef<readonly string[]>([]);
  const selectedPanelIdsListeners = useRef(new Set<(_: readonly string[]) => void>());

  const addSelectedPanelIdsListener = useCallback((listener: (_: readonly string[]) => void) => {
    selectedPanelIdsListeners.current.add(listener);
  }, []);
  const removeSelectedPanelIdsListener = useCallback((listener: (_: readonly string[]) => void) => {
    selectedPanelIdsListeners.current.delete(listener);
  }, []);

  const getSelectedPanelIds = useCallback(() => selectedPanelIds.current, []);

  /**
   * 選択パネルID更新関数
   *
   * 浅い等価性チェックによる最適化を行い、
   * 変更がある場合のみリスナーに通知します。
   */
  const setSelectedPanelIds = useCallback(
    (value: readonly string[] | ((prevState: readonly string[]) => readonly string[])): void => {
      const newValue = typeof value === "function" ? value(selectedPanelIds.current) : value;

      // 浅い等価性チェックによる最適化
      if (!shallowequal(newValue, selectedPanelIds.current)) {
        selectedPanelIds.current = newValue;

        // リスナーに変更を通知
        for (const listener of [...selectedPanelIdsListeners.current]) {
          listener(selectedPanelIds.current);
        }
      }
    },
    [],
  );

  /**
   * レイアウト選択・読み込み処理
   *
   * 指定されたIDのレイアウトを非同期で読み込み、状態を更新します。
   * バージョン互換性チェック、エラーハンドリング、ユーザープロファイル更新を含む
   * 包括的なレイアウト切り替え処理を実行します。
   *
   * ## 処理フロー
   * 1. **初期化**: ローディング状態の設定
   * 2. **レイアウト取得**: LayoutManagerからのデータ読み込み
   * 3. **バージョンチェック**: 互換性検証
   * 4. **状態更新**: 成功時のレイアウト状態設定
   * 5. **プロファイル保存**: ユーザー設定への永続化
   *
   * ## バージョン互換性
   * レイアウトのバージョンがMAX_SUPPORTED_LAYOUT_VERSIONを超える場合、
   * IncompatibleLayoutVersionAlertを表示してレイアウト読み込みを中止します。
   *
   * ## エラーハンドリング
   * - ネットワークエラー: スナックバーでエラー通知
   * - バージョン非互換: 専用ダイアログで警告
   * - コンポーネントアンマウント: 処理の安全な中断
   *
   * ## データ優先順位
   * working.data（編集中データ）が存在する場合はそれを使用し、
   * なければbaseline.data（ベースラインデータ）を使用します。
   *
   * @param id - 読み込むレイアウトのID（undefinedで選択解除）
   * @param options - オプション設定
   * @param options.saveToProfile - ユーザープロファイルに保存するか（デフォルト: true）
   */
  const [, setSelectedLayoutId] = useAsyncFn(
    async (
      id: LayoutID | undefined,
      { saveToProfile = true }: { saveToProfile?: boolean } = {},
    ) => {
      // レイアウト選択解除の場合
      if (id == undefined) {
        setLayoutState({ selectedLayout: undefined });
        return;
      }

      try {
        // ローディング状態を設定（UIにスピナー表示）
        setLayoutState({ selectedLayout: { id, loading: true, data: undefined } });

        // LayoutManagerからレイアウトデータを非同期取得
        const layout = await layoutManager.getLayout(id);

        // バージョン互換性チェック
        const layoutVersion = layout?.baseline.data.version;
        if (layoutVersion != undefined && layoutVersion > MAX_SUPPORTED_LAYOUT_VERSION) {
          setIncompatibleLayoutVersionError(true);
          setLayoutState({ selectedLayout: undefined });
          return;
        }

        // コンポーネントがアンマウントされている場合は処理を中断
        if (!isMounted()) {
          return;
        }

        // バージョン互換性エラー状態をクリア
        setIncompatibleLayoutVersionError(false);

        if (layout == undefined) {
          // レイアウトが見つからない場合
          setLayoutState({ selectedLayout: undefined });
        } else {
          // レイアウト読み込み成功時の状態更新
          setLayoutState({
            selectedLayout: {
              loading: false,
              id: layout.id,
              // working（編集中）データがあればそれを、なければbaseline（ベース）データを使用
              data: layout.working?.data ?? layout.baseline.data,
              name: layout.name,
            },
          });

          // ユーザープロファイルへの永続化（オプション）
          if (saveToProfile) {
            setUserProfile({ currentLayoutId: id }).catch((error: unknown) => {
              console.error(error);
              enqueueSnackbar(
                `The current layout could not be saved. ${(error as Error).toString()}`,
                {
                  variant: "error",
                },
              );
            });
          }
        }
      } catch (error) {
        // レイアウト読み込みエラー時の処理
        console.error(error);
        enqueueSnackbar(`The layout could not be loaded. ${error.toString()}`, {
          variant: "error",
        });
        setIncompatibleLayoutVersionError(false);
        setLayoutState({ selectedLayout: undefined });
      }
    },
    [enqueueSnackbar, isMounted, layoutManager, setLayoutState, setUserProfile],
  );

  /**
   * パネルアクション実行処理
   *
   * ユーザーのパネル操作（追加・削除・移動・設定変更など）を
   * panelsReducerを通じて処理し、レイアウト状態を更新します。
   *
   * ## 処理フロー
   * 1. **前提条件チェック**: レイアウトデータの存在とローディング状態の確認
   * 2. **アクション実行**: panelsReducerによる状態変換
   * 3. **変更検出**: 深い等価性チェックによる最適化
   * 4. **共有状態クリーンアップ**: 削除されたパネルタイプの共有状態除去
   * 5. **状態更新**: 新しいレイアウト状態の設定と編集フラグの設定
   *
   * ## パフォーマンス最適化
   * - **早期リターン**: 無効な状態での処理スキップ
   * - **等価性チェック**: 変更がない場合の処理回避
   * - **共有状態管理**: 不要な共有状態の自動削除
   *
   * ## 共有状態管理
   * パネルが削除された際、そのパネルタイプの共有状態も自動的に
   * クリーンアップされ、メモリリークを防止します。
   *
   * ## 編集状態管理
   * アクション実行後は`edited: true`を設定し、
   * レイアウトが変更されたことを明示します。
   *
   * ## エラーハンドリング
   * panelsReducer内でエラーが発生した場合、
   * 元の状態が保持され、アプリケーションの安定性が保たれます。
   *
   * @param action - 実行するパネルアクション（追加・削除・移動・設定変更など）
   */
  const performAction = useCallback(
    (action: PanelsActions) => {
      // レイアウトデータが存在しない、またはローディング中の場合は処理をスキップ
      if (
        layoutStateRef.current.selectedLayout?.data == undefined ||
        layoutStateRef.current.selectedLayout.loading === true
      ) {
        return;
      }

      const oldData = layoutStateRef.current.selectedLayout.data;

      // panelsReducerを使用してアクションを適用し、新しい状態を計算
      const newData = panelsReducer(oldData, action);

      // パネル状態に変更がない場合は、レイアウト状態の更新や
      // レイアウトマネージャーの更新を行う必要がないため早期リターン
      if (_.isEqual(oldData, newData)) {
        log.warn("Panel action resulted in identical config:", action);
        return;
      }

      // 新しい設定に存在するすべてのパネルタイプを取得
      // これは共有パネル状態のクリーンアップに使用される
      const panelTypesInUse = _.uniq(Object.keys(newData.configById).map(getPanelTypeFromId));

      setLayoutState({
        // レイアウトに存在しなくなったパネルタイプの共有パネル状態を破棄
        // メモリリークを防ぎ、不要なデータの蓄積を避ける
        sharedPanelState: _.pick(layoutStateRef.current.sharedPanelState, panelTypesInUse),
        selectedLayout: {
          id: layoutStateRef.current.selectedLayout.id,
          data: newData,
          name: layoutStateRef.current.selectedLayout.name,
          // レイアウトが変更されたことを示すフラグを設定
          edited: true,
        },
      });
    },
    [setLayoutState],
  );

  /**
   * レイアウトマネージャー変更イベントの監視
   *
   * 外部からのレイアウト操作（リバート操作など）を監視し、
   * 必要に応じてレイアウト状態を同期更新します。
   *
   * ## 監視対象イベント
   * - **revert**: レイアウトの復元操作
   *
   * ## 最適化の背景
   * 以前はすべての変更イベントで状態更新が発生していましたが、
   * パネルリサイズ時の不具合（トグル問題）を解決するため、
   * リバート操作時のみに限定しています。
   *
   * ## 処理条件
   * 1. イベントタイプが"revert"
   * 2. 更新されたレイアウトが存在
   * 3. 現在選択中のレイアウトが存在
   * 4. 更新されたレイアウトIDが現在選択中と一致
   *
   * ## データ優先順位
   * working.data（編集中）があればそれを、なければbaseline.data（ベース）を使用
   *
   * @see LayoutManagerEventTypes - イベント型定義
   * @see LayoutManager - レイアウト永続化サービス
   */
  useEffect(() => {
    const listener: LayoutManagerEventTypes["change"] = (event) => {
      const { updatedLayout } = event;

      // リバート操作で、かつ現在選択中のレイアウトが対象の場合のみ状態を更新
      if (
        event.type === "revert" &&
        updatedLayout &&
        layoutStateRef.current.selectedLayout &&
        updatedLayout.id === layoutStateRef.current.selectedLayout.id
      ) {
        setLayoutState({
          selectedLayout: {
            loading: false,
            id: updatedLayout.id,
            // working（編集中）データがあればそれを、なければbaseline（ベース）データを使用
            data: updatedLayout.working?.data ?? updatedLayout.baseline.data,
            name: updatedLayout.name,
          },
        });
      }
    };

    // イベントリスナーの登録
    layoutManager.on("change", listener);

    // クリーンアップ時にリスナーを除去
    return () => {
      layoutManager.off("change", listener);
    };
  }, [layoutManager, setLayoutState]);

  /**
   * レイアウト削除時の自動選択処理
   *
   * 現在選択中のレイアウトが削除された場合、
   * 自動的に別の利用可能なレイアウトを選択します。
   *
   * ## 処理トリガー
   * LayoutManagerの"delete"イベントが発生し、
   * 削除されたレイアウトが現在選択中のものと一致する場合
   *
   * ## フォールバック戦略
   * 1. 利用可能なレイアウト一覧を取得
   * 2. 最初のレイアウト（通常はアルファベット順）を自動選択
   * 3. レイアウトが存在しない場合はundefinedを設定
   *
   * ## ユーザー体験
   * レイアウト削除操作後もアプリケーションが使用可能な状態を維持し、
   * ユーザーが手動でレイアウトを選択し直す手間を省きます。
   *
   * ## 非同期処理
   * レイアウト一覧の取得とレイアウト選択はすべて非同期で実行され、
   * UIの応答性を保ちます。
   *
   * @see LayoutManagerEventTypes - イベント型定義
   * @see setSelectedLayoutId - レイアウト選択関数
   */
  useEffect(() => {
    const listener: LayoutManagerEventTypes["change"] = async (event) => {
      // 削除イベント以外、または現在選択中のレイアウトがない場合は処理をスキップ
      if (event.type !== "delete" || !layoutStateRef.current.selectedLayout?.id) {
        return;
      }

      // 削除されたレイアウトが現在選択中のものと一致する場合
      if (event.layoutId === layoutStateRef.current.selectedLayout.id) {
        // 利用可能なレイアウト一覧を取得
        const layouts = await layoutManager.getLayouts();
        // 最初のレイアウトを自動選択（レイアウトがない場合はundefined）
        await setSelectedLayoutId(layouts[0]?.id);
      }
    };

    // イベントリスナーの登録
    layoutManager.on("change", listener);

    // クリーンアップ時にリスナーを除去
    return () => {
      layoutManager.off("change", listener);
    };
  }, [enqueueSnackbar, layoutManager, setSelectedLayoutId]);

  /**
   * 初期レイアウト復元処理
   *
   * アプリケーション起動時に実行される包括的な初期化処理です。
   * 複数のソースからレイアウトを決定し、適切なフォールバック戦略を実装します。
   *
   * ## 処理の優先順位
   * 1. **URLパラメータ**: アプリケーションURLに指定されたレイアウト
   * 2. **アプリパラメータ**: 設定で指定されたデフォルトレイアウト
   * 3. **ユーザープロファイル**: 前回選択されたレイアウト
   * 4. **利用可能レイアウト**: アルファベット順で最初のレイアウト
   * 5. **デフォルトレイアウト**: 新規作成される標準レイアウト
   *
   * ## 初期化フロー
   * 1. **URL状態チェック**: URLにレイアウトIDが指定されている場合はスキップ
   * 2. **プロファイル取得**: ユーザーの前回選択レイアウトを取得
   * 3. **デフォルトレイアウト読み込み**: カスタムローダーによる初期レイアウト設定
   * 4. **レイアウト一覧取得**: 利用可能なレイアウトの取得
   * 5. **優先度判定**: 複数のソースから最適なレイアウトを選択
   * 6. **フォールバック実行**: 適切なレイアウトが見つからない場合の処理
   *
   * ## エラーハンドリング
   * - アプリパラメータで指定されたレイアウトが見つからない場合の警告表示
   * - ネットワークエラーやデータ破損時の適切なフォールバック
   * - ユーザー体験を損なわない段階的な処理
   *
   * ## パフォーマンス最適化
   * - 非同期処理による UI ブロッキングの回避
   * - 早期リターンによる不要な処理のスキップ
   * - 必要最小限のデータ取得
   *
   * ## 設計思想
   * - **段階的フォールバック**: 複数の選択肢による堅牢性
   * - **ユーザー中心**: 前回の選択を優先的に復元
   * - **開発者体験**: カスタムローダーによる拡張性
   * - **エラー耐性**: 問題発生時でも使用可能な状態を維持
   *
   * @see windowAppURLState - URL状態の取得
   * @see getUserProfile - ユーザープロファイルの取得
   * @see loadDefaultLayouts - デフォルトレイアウトの読み込み
   * @see setSelectedLayoutId - レイアウト選択関数
   */
  useAsync(async () => {
    if (layoutManager.supportsSharing) {
      return;
    }

    // Don't restore the layout if there's one specified in the app state url.
    if (windowAppURLState()?.layoutId) {
      return;
    }

    // ユーザープロファイルから前回選択されたレイアウトIDを取得
    // この処理は setSelectedLayoutId より前に実行する必要がある
    // （内部的な初期化処理のため）
    const { currentLayoutId } = await getUserProfile();

    // カスタムローダーによるデフォルトレイアウトの読み込み
    // 組み込みレイアウトとカスタムレイアウトの両方をサポート
    // フォールバック用の "Default" レイアウト追加前に実行
    await loadDefaultLayouts(layoutManager, loaders);

    // 現在利用可能なレイアウト一覧を取得
    const layouts = await layoutManager.getLayouts();

    // アプリパラメータで指定されたデフォルトレイアウトの確認
    // 設定ファイルやコマンドライン引数で指定されたレイアウトを優先
    const defaultLayoutFromParameters = layouts.find((l) => l.name === appParameters.defaultLayout);
    if (defaultLayoutFromParameters) {
      // アプリパラメータで指定されたレイアウトを選択し、プロファイルに保存
      await setSelectedLayoutId(defaultLayoutFromParameters.id, { saveToProfile: true });
      return;
    }

    // アプリパラメータでレイアウトが指定されているが見つからない場合
    // ユーザーに警告を表示して設定の問題を通知
    if (appParameters.defaultLayout) {
      enqueueSnackbar(t("noDefaultLayoutParameter", { layoutName: appParameters.defaultLayout }), {
        variant: "warning",
      });
    }

    // ユーザープロファイルに保存されたレイアウトIDからレイアウトを取得
    // レイアウトが削除されている場合やIDが無効な場合は undefined になる
    const layout = currentLayoutId ? await layoutManager.getLayout(currentLayoutId) : undefined;

    // 前回選択されたレイアウトが利用可能な場合
    if (layout) {
      // プロファイルへの保存は不要（既に保存済み）
      await setSelectedLayoutId(currentLayoutId, { saveToProfile: false });
      return;
    }

    // 利用可能なレイアウトが存在する場合
    if (layouts.length > 0) {
      // アルファベット順でソートし、最初のレイアウトを選択
      // 一貫性のあるデフォルト選択を提供
      const sortedLayouts = [...layouts].sort((a, b) => a.name.localeCompare(b.name));
      await setSelectedLayoutId(sortedLayouts[0]!.id);
      return;
    }

    // 最後のフォールバック: 新しいデフォルトレイアウトを作成
    // 初回起動時や全レイアウトが削除された場合に実行
    const newLayout = await layoutManager.saveNewLayout({
      name: "Default",
      data: defaultLayout,
      permission: "CREATOR_WRITE",
    });
    await setSelectedLayoutId(newLayout.id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getUserProfile, layoutManager, setSelectedLayoutId, enqueueSnackbar]);

  // 共有パネル状態の更新機能を取得
  const { updateSharedPanelState } = useUpdateSharedPanelState(layoutStateRef, setLayoutState);

  /**
   * レイアウトアクション関数群
   *
   * CurrentLayoutContextを通じて提供される全てのレイアウト操作機能を定義します。
   * 各アクションは適切なエラーハンドリング、アナリティクス追跡、状態管理を含みます。
   *
   * ## アクションの分類
   * - **レイアウト管理**: レイアウトの選択・取得・状態管理
   * - **パネル操作**: パネルの追加・削除・移動・分割
   * - **設定管理**: パネル設定とグローバル設定の管理
   * - **ドラッグ&ドロップ**: パネルの直感的な操作
   * - **タブ機能**: タブパネルの管理
   *
   * ## 設計原則
   * - **不変性**: 状態の不変更新による予測可能性
   * - **型安全性**: TypeScriptによる厳密な型チェック
   * - **パフォーマンス**: useMemoによる関数の安定化
   * - **観測可能性**: アナリティクスによる操作追跡
   * - **ユーザビリティ**: 直感的で一貫したAPI
   *
   * @see ICurrentLayout - 提供されるインターフェース
   * @see performAction - 基底アクション実行関数
   * @see panelsReducer - 状態変更ロジック
   */
  const actions: ICurrentLayout["actions"] = useMemo(
    () => ({
      /**
       * 共有パネル状態更新
       *
       * パネルタイプ間で共有される状態を更新します。
       * 同じタイプの複数パネルが同じ設定を共有する場合に使用されます。
       */
      updateSharedPanelState,

      /**
       * 現在のレイアウト設定（非推奨）
       *
       * 後方互換性のために残されている空実装です。
       * 新しいコードではsetSelectedLayoutIdを使用してください。
       */
      setCurrentLayout: () => {},

      /**
       * レイアウト選択
       *
       * 指定されたIDのレイアウトを選択し、アクティブにします。
       * バージョン互換性チェックとユーザープロファイル更新を含みます。
       */
      setSelectedLayoutId,

      /**
       * 現在のレイアウト状態取得
       *
       * 現在のレイアウト状態を同期的に取得します。
       * リアルタイムでの状態参照に使用されます。
       *
       * @returns 現在のレイアウト状態
       */
      getCurrentLayoutState: () => layoutStateRef.current,

      /**
       * パネル設定の一括保存
       *
       * 複数のパネルの設定を一度に保存します。
       * パフォーマンスを向上させるため、個別保存よりも推奨されます。
       *
       * @param payload - 保存する設定のペイロード
       */
      savePanelConfigs: (payload: SaveConfigsPayload) => {
        performAction({ type: "SAVE_PANEL_CONFIGS", payload });
      },

      /**
       * パネル設定の一括更新
       *
       * 指定されたパネルタイプの全インスタンスに対して
       * 設定変更関数を適用します。
       *
       * @param panelType - 更新対象のパネルタイプ
       * @param perPanelFunc - 各パネルに適用する変更関数
       */
      updatePanelConfigs: (
        panelType: string,
        perPanelFunc: (config: PanelConfig) => PanelConfig,
      ) => {
        performAction({ type: "SAVE_FULL_PANEL_CONFIG", payload: { panelType, perPanelFunc } });
      },

      /**
       * タブパネルの作成
       *
       * 複数のパネルを統合するタブパネルを作成します。
       * 作成後は選択状態をクリアし、アナリティクスイベントを送信します。
       *
       * @param payload - タブパネル作成のペイロード
       */
      createTabPanel: (payload: CreateTabPanelPayload) => {
        performAction({ type: "CREATE_TAB_PANEL", payload });
        setSelectedPanelIds([]);
        void analytics.logEvent(AppEvent.PANEL_ADD, { type: "Tab" });
      },

      /**
       * パネルレイアウトの変更
       *
       * レイアウトの構造を変更します。
       * React Mosaicの内部構造を直接操作する低レベルAPI。
       *
       * @param payload - レイアウト変更のペイロード
       */
      changePanelLayout: (payload: ChangePanelLayoutPayload) => {
        performAction({ type: "CHANGE_PANEL_LAYOUT", payload });
      },

      /**
       * グローバル変数の上書き
       *
       * 全てのグローバル変数を新しい値で置き換えます。
       * 既存の変数は削除され、指定された変数のみが残ります。
       *
       * @param payload - 新しいグローバル変数のセット
       */
      overwriteGlobalVariables: (payload: Record<string, VariableValue>) => {
        performAction({ type: "OVERWRITE_GLOBAL_DATA", payload });
      },

      /**
       * グローバル変数の設定
       *
       * 指定されたグローバル変数を設定または更新します。
       * 既存の変数は保持され、指定された変数のみが更新されます。
       *
       * @param payload - 設定するグローバル変数
       */
      setGlobalVariables: (payload: Record<string, VariableValue>) => {
        performAction({ type: "SET_GLOBAL_DATA", payload });
      },

      /**
       * ユーザースクリプトの設定
       *
       * カスタムユーザースクリプト（ユーザーノード）を設定します。
       * 部分的な更新をサポートし、既存のスクリプトは保持されます。
       *
       * @param payload - 設定するユーザースクリプト
       */
      setUserScripts: (payload: Partial<UserScripts>) => {
        performAction({ type: "SET_USER_NODES", payload });
      },

      /**
       * 再生設定の更新
       *
       * データ再生に関する設定を更新します。
       * 速度、ループ、自動再生などの設定を含みます。
       *
       * @param payload - 更新する再生設定
       */
      setPlaybackConfig: (payload: Partial<PlaybackConfig>) => {
        performAction({ type: "SET_PLAYBACK_CONFIG", payload });
      },

      /**
       * パネルの閉じる
       *
       * 指定されたパネルをレイアウトから削除します。
       * 削除されたパネルは選択状態からも除外され、
       * アナリティクスイベントが送信されます。
       *
       * @param payload - 削除するパネルの情報
       */
      closePanel: (payload: ClosePanelPayload) => {
        performAction({ type: "CLOSE_PANEL", payload });

        const closedId = getNodeAtPath(payload.root, payload.path);
        // 削除されたパネルを選択状態から除外
        setSelectedPanelIds((ids) => ids.filter((id) => id !== closedId));

        void analytics.logEvent(
          AppEvent.PANEL_DELETE,
          typeof closedId === "string" ? { type: getPanelTypeFromId(closedId) } : undefined,
        );
      },

      /**
       * パネルの分割
       *
       * 既存のパネルを分割して新しいパネルを追加します。
       * 水平または垂直分割をサポートします。
       *
       * @param payload - 分割操作の詳細
       */
      splitPanel: (payload: SplitPanelPayload) => {
        performAction({ type: "SPLIT_PANEL", payload });
      },

      /**
       * パネルの交換
       *
       * 既存のパネルを新しいタイプのパネルに交換します。
       * 元のパネルが選択されていた場合、新しいパネルを自動選択します。
       *
       * パネルIDの変更を検出するため、交換前後のパネルIDリストを比較し、
       * 差分から新しいパネルIDを特定します。
       *
       * @param payload - 交換操作の詳細
       */
      swapPanel: (payload: SwapPanelPayload) => {
        // 元のパネルが選択されていた場合、新しいパネルを選択するための準備
        // 新しいパネルのIDは事前に分からないため、パネルIDリストの差分を利用
        const originalIsSelected = selectedPanelIds.current.includes(payload.originalId);
        const beforePanelIds = Object.keys(
          layoutStateRef.current.selectedLayout?.data?.configById ?? {},
        );

        performAction({ type: "SWAP_PANEL", payload });

        // 元のパネルが選択されていた場合、新しいパネルを選択
        if (originalIsSelected) {
          const afterPanelIds = Object.keys(
            layoutStateRef.current.selectedLayout?.data?.configById ?? {},
          );
          setSelectedPanelIds(_.difference(afterPanelIds, beforePanelIds));
        }

        // 交換操作のアナリティクス追跡
        void analytics.logEvent(AppEvent.PANEL_ADD, { type: payload.type, action: "swap" });
        void analytics.logEvent(AppEvent.PANEL_DELETE, {
          type: getPanelTypeFromId(payload.originalId),
          action: "swap",
        });
      },

      /**
       * タブの移動
       *
       * タブパネル内でのタブの順序を変更します。
       * ドラッグ&ドロップによるタブ並び替えで使用されます。
       *
       * @param payload - タブ移動の詳細
       */
      moveTab: (payload: MoveTabPayload) => {
        performAction({ type: "MOVE_TAB", payload });
      },

      /**
       * パネルの追加
       *
       * 新しいパネルをレイアウトに追加します。
       * パネルピッカーからのパネル追加で使用されます。
       *
       * @param payload - 追加するパネルの情報
       */
      addPanel: (payload: AddPanelPayload) => {
        performAction({ type: "ADD_PANEL", payload });
        void analytics.logEvent(AppEvent.PANEL_ADD, { type: getPanelTypeFromId(payload.id) });
      },

      /**
       * パネルのドロップ
       *
       * ドラッグ&ドロップ操作によるパネル配置を処理します。
       * 外部からのパネルドロップや、パネルの位置変更で使用されます。
       *
       * @param payload - ドロップ操作の詳細
       */
      dropPanel: (payload: DropPanelPayload) => {
        performAction({ type: "DROP_PANEL", payload });
        void analytics.logEvent(AppEvent.PANEL_ADD, {
          type: payload.newPanelType,
          action: "drop",
        });
      },

      /**
       * ドラッグ開始
       *
       * パネルのドラッグ操作の開始を処理します。
       * ドラッグ状態の管理とUIフィードバックの開始に使用されます。
       *
       * @param payload - ドラッグ開始の詳細
       */
      startDrag: (payload: StartDragPayload) => {
        performAction({ type: "START_DRAG", payload });
      },

      /**
       * ドラッグ終了
       *
       * パネルのドラッグ操作の終了を処理します。
       * ドラッグ状態のクリーンアップとUIの正常化に使用されます。
       *
       * @param payload - ドラッグ終了の詳細
       */
      endDrag: (payload: EndDragPayload) => {
        performAction({ type: "END_DRAG", payload });
      },
    }),
    [analytics, performAction, setSelectedLayoutId, setSelectedPanelIds, updateSharedPanelState],
  );

  /**
   * CurrentLayoutContext提供値
   *
   * CurrentLayoutContextを通じて子コンポーネントに提供される
   * 完全なレイアウト管理APIを構築します。
   *
   * ## 提供される機能
   * - **状態監視**: レイアウト状態とパネル選択状態のリアルタイム監視
   * - **状態取得**: 現在の状態への同期的アクセス
   * - **状態更新**: パネル選択状態の更新
   * - **操作実行**: 全てのレイアウト操作の実行
   * - **一意識別**: Mosaicレイアウトの一意識別子
   *
   * ## パフォーマンス最適化
   * useShallowMemoにより、オブジェクトの浅い比較で
   * 不要な再レンダリングを防止します。
   *
   * ## 設計思想
   * - **統合API**: 全てのレイアウト機能を単一のコンテキストで提供
   * - **型安全性**: TypeScriptによる厳密な型定義
   * - **拡張性**: 新しい機能の追加が容易な構造
   * - **テスタビリティ**: MockCurrentLayoutProviderによるテスト支援
   *
   * @see ICurrentLayout - 提供されるインターフェース定義
   * @see useShallowMemo - 浅い比較によるメモ化
   */
  const value: ICurrentLayout = useShallowMemo({
    // レイアウト状態監視機能
    addLayoutStateListener,
    removeLayoutStateListener,

    // パネル選択状態監視機能
    addSelectedPanelIdsListener,
    removeSelectedPanelIdsListener,

    // 一意識別子（React Mosaicで使用）
    mosaicId,

    // パネル選択状態の取得・更新
    getSelectedPanelIds,
    setSelectedPanelIds,

    // 全てのレイアウト操作アクション
    actions,
  });

  return (
    <CurrentLayoutContext.Provider value={value}>
      {children}
      {/* バージョン非互換レイアウトの警告ダイアログ */}
      {incompatibleLayoutVersionError && (
        <IncompatibleLayoutVersionAlert
          onClose={() => {
            setIncompatibleLayoutVersionError(false);
          }}
        />
      )}
    </CurrentLayoutContext.Provider>
  );
}
