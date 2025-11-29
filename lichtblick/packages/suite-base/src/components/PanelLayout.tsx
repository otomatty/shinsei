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
 * @fileoverview PanelLayout - Lichtblickのレイアウトシステムの中核コンポーネント
 *
 * このファイルは、React Mosaicライブラリを基盤とした分割可能なパネルレイアウト
 * システムを実装している。Lichtblickアプリケーションの全てのパネル配置と
 * レイアウト管理を担当する重要なコンポーネント。
 *
 * ## 主要機能
 *
 * ### 1. Mosaicレイアウトシステム
 * - react-mosaic-componentによる分割可能なレイアウト
 * - ドラッグ&ドロップによるパネルの移動・配置
 * - 動的なパネルサイズ調整（最小2%の制約付き）
 * - ネストしたタブレイアウトのサポート
 *
 * ### 2. パネル管理
 * - パネルカタログからの動的パネル読み込み
 * - React.lazyによる遅延ローディング
 * - Suspenseによる読み込み中表示
 * - 未知のパネルタイプに対するフォールバック
 *
 * ### 3. 状態管理統合
 * - CurrentLayoutContextとの完全連携
 * - パネル設定の自動保存・復元
 * - レイアウト変更の永続化
 * - 拡張機能の動的読み込み状態管理
 *
 * ### 4. エラーハンドリング
 * - ErrorBoundaryによる障害分離
 * - パネル単位での例外処理
 * - 復旧可能なエラー状態の管理
 *
 * ## アーキテクチャ設計
 *
 * ```
 * PanelLayout (デフォルトエクスポート)
 * ├── ExtensionsLoadingState (拡張機能読み込み中)
 * ├── UnconnectedPanelLayout (メインレイアウト)
 * │   ├── ErrorBoundary (エラー境界)
 * │   ├── MosaicWithoutDragDropContext
 * │   │   └── MosaicWindow (各パネル)
 * │   │       ├── Suspense (遅延ローディング)
 * │   │       ├── MosaicPathContext.Provider
 * │   │       └── PanelRemounter
 * │   │           └── Panel HOC (実際のパネル)
 * │   └── EmptyPanelLayout (パネル未選択時)
 * └── TabMosaicWrapper (タブ用ラッパー)
 * ```
 *
 * ## 技術的特徴
 *
 * - **型安全性**: TypeScriptによる厳密な型定義
 * - **パフォーマンス**: useMemo、useCallbackによる最適化
 * - **コード分割**: React.lazyによる動的インポート
 * - **状態分離**: Context APIによる状態管理
 * - **テスト可能性**: UnconnectedPanelLayoutによる分離
 *
 * ## 使用例
 *
 * ```typescript
 * // 基本的な使用方法
 * <PanelLayout />
 *
 * // タブ内での使用
 * <UnconnectedPanelLayout
 *   layout={tabLayout}
 *   onChange={handleLayoutChange}
 *   tabId="tab-1"
 * />
 * ```
 *
 * @author Lichtblick Team
 * @since 2023
 */

import { CircularProgress } from "@mui/material";
import React, { PropsWithChildren, Suspense, useCallback, useMemo } from "react";
import { useDrop } from "react-dnd";
import {
  MosaicDragType,
  MosaicNode,
  MosaicPath,
  MosaicWindow,
  MosaicWithoutDragDropContext,
} from "react-mosaic-component";

import { EmptyPanelLayout } from "@lichtblick/suite-base/components/EmptyPanelLayout";
import EmptyState from "@lichtblick/suite-base/components/EmptyState";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAppContext } from "@lichtblick/suite-base/context/AppContext";
import {
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
  usePanelMosaicId,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import { usePanelCatalog } from "@lichtblick/suite-base/context/PanelCatalogContext";
import { MosaicDropResult, PanelConfig } from "@lichtblick/suite-base/types/panels";
import { getPanelIdForType, getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";

import ErrorBoundary from "./ErrorBoundary";
import { MosaicPathContext } from "./MosaicPathContext";
import { useStyles } from "./PanelLayout.style";
import { PanelRemounter } from "./PanelRemounter";
import { UnknownPanel } from "./UnknownPanel";
import "react-mosaic-component/react-mosaic-component.css";
import { useInstallingExtensionsStore } from "../hooks/useInstallingExtensionsStore";

/**
 * UnconnectedPanelLayoutコンポーネントのプロパティ型定義
 */
type Props = {
  /** Mosaicレイアウトの構造定義（undefinedの場合は空レイアウト） */
  layout?: MosaicNode<string>;
  /** レイアウト変更時のコールバック関数 */
  onChange: (panels: MosaicNode<string> | undefined) => void;
  /** 読み込み中に表示するコンポーネント（拡張機能インストール時等） */
  loadingComponent?: React.JSX.Element;
  /** 所属するタブのID（タブ内レイアウトの場合） */
  tabId?: string;
};

/**
 * タブ用Mosaicラッパーコンポーネント
 *
 * ネストしたドロップターゲットにドロップされた際に、tabIdを
 * ドロップ結果に含めることで、パネルがどのMosaicにドロップ
 * されたかをネストレベルに関係なく識別可能にする。
 *
 * ## 機能詳細
 *
 * - **ドロップ処理**: MosaicDragType.WINDOWを受け付け
 * - **ネスト対応**: 深くネストしたタブMosaicでも正しく動作
 * - **tabID伝播**: より深い階層に既存のtabIdがある場合はそれを優先
 * - **無効ドロップ防止**: pathが未定義の場合は何もしない
 *
 * @param props - コンポーネントプロパティ
 * @param props.tabId - タブの一意識別子
 * @param props.children - ラップする子コンポーネント
 */
function TabMosaicWrapper({ tabId, children }: PropsWithChildren<{ tabId?: string }>) {
  const { classes, cx } = useStyles();

  /**
   * react-dndのドロップフック
   * Mosaicウィンドウのドラッグ&ドロップを処理
   */
  const [, drop] = useDrop<unknown, MosaicDropResult, never>({
    accept: MosaicDragType.WINDOW,
    drop: (_item, monitor) => {
      const nestedDropResult = monitor.getDropResult<MosaicDropResult>();

      // MosaicWindowには、タブバーや他のMosaicドロップターゲットに
      // 対応しないタブ内の場所にドロップされた場合に発火する
      // トップレベルドロップターゲットがある。この場合、タブの
      // 既存レイアウトを置き換えたくないので何もしない。
      if (nestedDropResult?.path == undefined) {
        return undefined;
      }

      // ドロップ結果には、より深くネストしたタブMosaicにドロップ
      // された場合、既にtabIdが含まれている可能性がある。
      // 既存のtabIdがない場合のみ、自分のtabIdを提供する。
      return { tabId, ...nestedDropResult };
    },
  });

  return (
    <div className={cx(classes.hideTopLevelDropTargets, "mosaic-tile")} ref={drop}>
      {children}
    </div>
  );
}

/**
 * 未接続パネルレイアウトコンポーネント
 *
 * レイアウト状態に直接接続されていない、純粋なレイアウトコンポーネント。
 * テストやタブ内レイアウトなど、外部から状態を注入したい場合に使用。
 *
 * ## 主要機能
 *
 * ### パネル管理
 * - パネルカタログからの動的コンポーネント読み込み
 * - React.lazyによる遅延ローディング
 * - 未知のパネルタイプに対するフォールバック
 *
 * ### レイアウト制御
 * - Mosaicによる分割可能なレイアウト
 * - 最小パネルサイズ2%の制約
 * - ドラッグ&ドロップによる動的配置変更
 *
 * ### エラーハンドリング
 * - Suspenseによる読み込み中の適切な表示
 * - ErrorBoundaryによる障害分離
 * - PanelRemounterによる安全な再マウント
 *
 * @param props - コンポーネントプロパティ
 * @returns レンダリングされたパネルレイアウト
 */
export function UnconnectedPanelLayout(props: Readonly<Props>): React.ReactElement {
  const { savePanelConfigs } = useCurrentLayoutActions();
  const mosaicId = usePanelMosaicId();
  const { layout, onChange, tabId, loadingComponent } = props;

  /**
   * 新しいタイル（パネル）を作成する関数
   *
   * Mosaicライブラリから呼び出され、新しいパネルが必要な時に
   * パネルIDを生成し、必要に応じて初期設定を保存する。
   *
   * @param config - パネル作成設定
   * @param config.type - パネルタイプ（省略時は"RosOut"）
   * @param config.panelConfig - パネルの初期設定
   * @returns 生成されたパネルID
   */
  const createTile = useCallback(
    (config?: { type?: string; panelConfig?: PanelConfig }) => {
      const defaultPanelType = "RosOut";
      const type = config?.type ?? defaultPanelType;
      const id = getPanelIdForType(type);

      // 初期設定が提供された場合は保存
      if (config?.panelConfig) {
        savePanelConfigs({ configs: [{ id, config: config.panelConfig }] });
      }
      return id;
    },
    [savePanelConfigs],
  );

  /** パネルカタログからパネル情報を取得 */
  const panelCatalog = usePanelCatalog();

  /**
   * パネルコンポーネントのマップ
   *
   * パネルカタログから全パネルタイプを取得し、React.lazyで
   * ラップしたコンポーネントのマップを作成。これにより、
   * 使用されるパネルのみが動的に読み込まれる。
   */
  const panelComponents = useMemo(
    () =>
      new Map(
        panelCatalog.panels.map((panelInfo) => [panelInfo.type, React.lazy(panelInfo.module)]),
      ),
    [panelCatalog],
  );

  /**
   * タイル（パネル）をレンダリングする関数
   *
   * Mosaicライブラリから各パネル位置に対して呼び出される。
   * パネルタイプに応じて適切なコンポーネントを選択し、
   * 必要なラッパー（Suspense、MosaicWindow等）で包む。
   *
   * @param id - パネルID（文字列または空オブジェクト）
   * @param path - Mosaic内でのパネル位置パス
   * @returns レンダリングされたパネル要素
   */
  const renderTile = useCallback(
    (id: string | Record<string, never> | undefined, path: MosaicPath) => {
      // `id`は通常文字列。`layout`が空の場合、`id`は空オブジェクトになり、
      // この場合はタイルをレンダリングする必要がない
      if (id == undefined || typeof id !== "string") {
        return <></>;
      }

      const type = getPanelTypeFromId(id);

      let panel: React.JSX.Element;
      const PanelComponent = panelComponents.get(type);

      if (PanelComponent) {
        // 既知のパネルタイプの場合：Panel HOCでラップされたコンポーネント
        panel = <PanelComponent childId={id} tabId={tabId} />;
      } else {
        // 未知のパネルタイプの場合：パネルセレクターを表示
        panel = <UnknownPanel childId={id} tabId={tabId} overrideConfig={{ type, id }} />;
      }

      /**
       * MosaicWindowでラップされたパネル
       *
       * - title: 空文字（タイトルバーは別途管理）
       * - key: パネルIDをReactキーとして使用
       * - path: Mosaic内での位置
       * - createNode: 新規パネル作成時のコールバック
       * - renderPreview: ドラッグ時のプレビュー（無効化）
       */
      const mosaicWindow = (
        <MosaicWindow
          title=""
          key={id}
          path={path}
          createNode={createTile}
          renderPreview={() => undefined as unknown as React.JSX.Element}
        >
          <Suspense
            fallback={
              <EmptyState>
                <CircularProgress size={28} />
              </EmptyState>
            }
          >
            <MosaicPathContext.Provider value={path}>
              <PanelRemounter id={id} tabId={tabId}>
                {panel}
              </PanelRemounter>
            </MosaicPathContext.Provider>
          </Suspense>
        </MosaicWindow>
      );

      // タブパネルの場合は特別なラッパーで包む
      if (type === "Tab") {
        return <TabMosaicWrapper tabId={id}>{mosaicWindow}</TabMosaicWrapper>;
      }
      return mosaicWindow;
    },
    [panelComponents, createTile, tabId],
  );

  /**
   * レンダリングする本体コンテンツ
   *
   * レイアウトが存在する場合はMosaicWithoutDragDropContextを、
   * 存在しない場合はEmptyPanelLayoutを表示する。
   */
  const bodyToRender = useMemo(
    () =>
      layout != undefined ? (
        <MosaicWithoutDragDropContext
          renderTile={renderTile}
          className="mosaic-foxglove-theme" // デフォルトのMosaicテーマの適用を防ぐ
          resize={{ minimumPaneSizePercentage: 2 }} // 最小パネルサイズを2%に設定
          value={layout}
          onChange={(newLayout) => {
            onChange(newLayout ?? undefined);
          }}
          mosaicId={mosaicId}
        />
      ) : (
        <EmptyPanelLayout tabId={tabId} />
      ),
    [layout, mosaicId, onChange, renderTile, tabId],
  );

  return (
    <ErrorBoundary>
      {loadingComponent}
      {bodyToRender}
    </ErrorBoundary>
  );
}

/**
 * 拡張機能読み込み中状態コンポーネント
 *
 * 拡張機能のインストールや初期化中に表示される
 * ローディング状態を表現するコンポーネント。
 *
 * @returns 拡張機能読み込み中の表示要素
 */
function ExtensionsLoadingState(): React.JSX.Element {
  return (
    <EmptyState>
      <Stack gap={1} alignItems="center">
        <CircularProgress size={28} />
        <span>Loading extensions…</span>
      </Stack>
    </EmptyState>
  );
}

/**
 * レイアウト存在チェック用セレクター
 * 選択されたレイアウトにデータが存在するかを判定
 */
const selectedLayoutExistsSelector = (state: LayoutState) =>
  state.selectedLayout?.data != undefined;

/**
 * レイアウトMosaic取得用セレクター
 * 選択されたレイアウトのMosaic構造を取得
 */
const selectedLayoutMosaicSelector = (state: LayoutState) => state.selectedLayout?.data?.layout;

/**
 * パネルレイアウトメインコンポーネント
 *
 * Lichtblickアプリケーションのメインレイアウトシステム。
 * CurrentLayoutContextと連携し、アプリケーション全体の
 * パネル配置とレイアウト管理を担当する。
 *
 * ## 機能概要
 *
 * ### 状態管理統合
 * - CurrentLayoutContextからレイアウト状態を取得
 * - レイアウト変更の自動永続化
 * - 拡張機能の読み込み状態監視
 *
 * ### 条件分岐レンダリング
 * - 拡張機能未読み込み時：ExtensionsLoadingState
 * - 拡張機能インストール中：オーバーレイ表示
 * - レイアウト存在時：UnconnectedPanelLayout
 * - レイアウト未設定時：カスタム空状態またはデフォルト
 *
 * ### パフォーマンス最適化
 * - useCallbackによるコールバック最適化
 * - セレクターによる必要な状態のみの購読
 * - 条件分岐による不要なレンダリング回避
 *
 * ## 使用方法
 *
 * ```typescript
 * // アプリケーションのメインレイアウトとして
 * function App() {
 *   return (
 *     <CurrentLayoutProvider>
 *       <PanelLayout />
 *     </CurrentLayoutProvider>
 *   );
 * }
 * ```
 *
 * @returns メインパネルレイアウトコンポーネント
 *
 * @author Lichtblick Team
 * @since 2023
 */
export default function PanelLayout(): React.JSX.Element {
  const { classes } = useStyles();
  const { layoutEmptyState } = useAppContext();

  // === レイアウト操作 ===
  const { changePanelLayout } = useCurrentLayoutActions();

  // === 状態セレクター ===
  /** レイアウトが存在するかどうか */
  const layoutExists = useCurrentLayoutSelector(selectedLayoutExistsSelector);
  /** 現在のMosaicレイアウト構造 */
  const mosaicLayout = useCurrentLayoutSelector(selectedLayoutMosaicSelector);

  // === 拡張機能管理 ===
  /** 登録済み拡張機能の一覧 */
  const registeredExtensions = useExtensionCatalog((state) => state.installedExtensions);
  /** 拡張機能インストール進行状況 */
  const { installingProgress } = useInstallingExtensionsStore();

  /** 拡張機能インストール中かどうか */
  const isInstallingExtensions = installingProgress.inProgress;

  /**
   * レイアウト変更ハンドラー
   *
   * Mosaicレイアウトの変更をCurrentLayoutContextに反映する。
   * undefinedの場合は何もしない（空レイアウトは別途処理）。
   *
   * @param newLayout - 新しいMosaicレイアウト構造
   */
  const onChange = useCallback(
    (newLayout: MosaicNode<string> | undefined) => {
      if (newLayout != undefined) {
        changePanelLayout({ layout: newLayout });
      }
    },
    [changePanelLayout],
  );

  // === 条件分岐レンダリング ===

  // 拡張機能が未読み込みの場合
  if (registeredExtensions == undefined) {
    return <ExtensionsLoadingState />;
  }

  // 拡張機能インストール中のオーバーレイ
  const loadingComponent = isInstallingExtensions ? (
    <Stack className={classes.overlayStyle}>
      <ExtensionsLoadingState />
    </Stack>
  ) : (
    <></>
  );

  // レイアウトが存在する場合：通常のパネルレイアウト
  if (layoutExists) {
    return (
      <UnconnectedPanelLayout
        layout={mosaicLayout}
        onChange={onChange}
        loadingComponent={loadingComponent}
      />
    );
  }

  // カスタム空状態が定義されている場合
  if (layoutEmptyState) {
    return layoutEmptyState;
  }

  // デフォルト：何も表示しない
  return <></>;
}
