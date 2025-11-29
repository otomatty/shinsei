// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * DataSourceDialog: データソース接続ダイアログシステム
 *
 * Lichtblickアプリケーションのメインエントリーポイントとなるデータソース接続ダイアログです。
 * ユーザーが様々な形式のデータソースに接続するための統一されたインターフェースを提供します。
 *
 * ## 主な機能
 *
 * ### データソース種別
 * - **ローカルファイル**: bag/mcap/foxe形式のファイル読み込み
 * - **リモート接続**: WebSocket/ROS接続
 * - **サンプルデータセット**: 事前定義されたデモデータ
 * - **最近使用したファイル**: 履歴からの再選択
 *
 * ### 表示モード
 * - **Start**: スタート画面とファイル選択UI
 * - **Connection**: リモート接続設定UI
 * - **Demo**: サンプルデータ自動選択
 * - **File**: ファイル選択ダイアログ
 *
 * ### 特殊機能
 * - **Snow**: シーズナルエフェクト（年末年始の装飾）
 * - **Analytics**: ユーザー行動分析
 * - **Responsive Design**: デスクトップ/モバイル対応
 *
 * ## アーキテクチャ
 *
 * ```
 * DataSourceDialog (メインコンテナ)
 * ├── Snow (背景エフェクト)
 * ├── Start (スタート画面)
 * ├── Connection (接続設定画面)
 * └── View (共通ビューラッパー)
 * ```
 *
 * ## 状態管理
 *
 * - **WorkspaceContext**: ダイアログの開閉状態とアクティブビュー
 * - **PlayerSelection**: 利用可能なデータソースと選択処理
 * - **Analytics**: ユーザーインタラクション追跡
 *
 * @example
 * ```tsx
 * // 基本的な使用例
 * <DataSourceDialog />
 *
 * // アニメーション無効化
 * <DataSourceDialog backdropAnimation={false} />
 * ```
 */

import CloseIcon from "@mui/icons-material/Close";
import { Dialog, IconButton } from "@mui/material";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useMountedState } from "react-use";
import { makeStyles } from "tss-react/mui";

import Snow from "@lichtblick/suite-base/components/DataSourceDialog/Snow";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import {
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";

import Connection from "./Connection";
import Start from "./Start";

/**
 * データソースダイアログで表示可能なビューの種類
 *
 * - `start`: スタート画面（デフォルト）
 * - `file`: ファイル選択ダイアログ
 * - `demo`: サンプルデータ自動選択
 * - `remote`: リモート接続（将来の拡張用）
 * - `connection`: リモート接続設定画面
 */
export type DataSourceDialogItem = "start" | "file" | "demo" | "remote" | "connection";

/**
 * DataSourceDialogコンポーネントのプロパティ型
 */
type DataSourceDialogProps = {
  /**
   * 背景アニメーション（雪やコンフェッティ）の有効/無効
   *
   * `false`に設定すると、シーズナルエフェクトが無効化されます。
   * テスト環境やパフォーマンス重視の環境で使用します。
   *
   * @default true
   */
  backdropAnimation?: boolean;
};

/**
 * ダイアログ固有のスタイル定義
 */
const useStyles = makeStyles()((theme) => ({
  /** ダイアログペーパーのスタイル - 最大幅とマージンの設定 */
  paper: {
    maxWidth: `calc(min(${theme.breakpoints.values.md}px, 100% - ${theme.spacing(4)}))`,
  },
  /** 閉じるボタンのスタイル - 右上角への絶対配置 */
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    margin: theme.spacing(3),
  },
}));

/**
 * WorkspaceContextからデータソースダイアログの状態を取得するセレクター
 */
const selectDataSourceDialog = (store: WorkspaceContextStore) => store.dialogs.dataSource;

/**
 * DataSourceDialog メインコンポーネント
 *
 * データソース接続のための統合ダイアログインターフェースを提供します。
 * 複数のビューモード（Start、Connection）を切り替えながら、
 * ユーザーのデータソース選択をサポートします。
 *
 * ## 主要な処理フロー
 *
 * 1. **初期化**: WorkspaceContextから現在の状態を取得
 * 2. **ビュー切り替え**: activeViewに基づいて適切なコンポーネントを表示
 * 3. **ファイル選択**: "file"モードでネイティブファイルダイアログを開く
 * 4. **サンプル選択**: "demo"モードで最初のサンプルデータを自動選択
 * 5. **エフェクト**: 季節に応じた背景エフェクトの表示
 *
 * ## 状態管理の詳細
 *
 * - **activeView**: 現在表示中のビュー（start/connection/demo/file）
 * - **activeDataSource**: 現在選択されているデータソース
 * - **availableSources**: 利用可能なデータソース一覧
 *
 * @param props - コンポーネントプロパティ
 * @returns レンダリングされたダイアログコンポーネント
 */
export function DataSourceDialog(props: DataSourceDialogProps): React.JSX.Element {
  const { backdropAnimation } = props;
  const { classes } = useStyles();

  // コンテキストフックの初期化
  const { availableSources, selectSource } = usePlayerSelection();
  const { dialogActions } = useWorkspaceActions();
  const { activeDataSource, item: activeView } = useWorkspaceStore(selectDataSourceDialog);

  // コンポーネントのマウント状態追跡
  const isMounted = useMountedState();

  /**
   * 最初に見つかるサンプルデータソースを取得
   * デモモード時の自動選択に使用
   */
  const firstSampleSource = useMemo(() => {
    return availableSources.find((source) => source.type === "sample");
  }, [availableSources]);

  // アナリティクス追跡
  const analytics = useAnalytics();

  /**
   * ダイアログ閉じる処理
   *
   * ユーザーがダイアログを閉じた際の処理を実行します。
   * アナリティクスイベントの送信とダイアログ状態のクリアを行います。
   */
  const onModalClose = useCallback(() => {
    void analytics.logEvent(AppEvent.DIALOG_CLOSE, { activeDataSource });
    dialogActions.dataSource.close();
  }, [analytics, activeDataSource, dialogActions.dataSource]);

  // 前回のアクティブビューの追跡（無限ループ防止）
  const prevActiveViewRef = useRef<DataSourceDialogItem | undefined>();

  /**
   * アクティブビュー変更時の副作用処理
   *
   * ビューが変更された際の自動処理を実行します：
   * - "file": ネイティブファイル選択ダイアログを開く
   * - "demo": 最初のサンプルデータソースを自動選択
   *
   * 無限ループを防ぐため、前回の値と比較して実際に変更された場合のみ実行します。
   */
  useLayoutEffect(() => {
    if (activeView === prevActiveViewRef.current) {
      // アクティブビューが実際に変更された場合のみ以下の処理を実行
      return;
    }
    prevActiveViewRef.current = activeView;

    if (activeView === "file") {
      // ファイル選択ダイアログを開く
      dialogActions.openFile
        .open()
        .catch((err: unknown) => {
          console.error(err);
        })
        .finally(() => {
          // ユーザーが再度ファイルを開けるように、ビューをstartに戻す
          if (isMounted()) {
            dialogActions.dataSource.open("start");
          }
        });
    } else if (activeView === "demo" && firstSampleSource) {
      // サンプルデータソースを自動選択
      selectSource(firstSampleSource.id);
    }
  }, [activeView, dialogActions, firstSampleSource, isMounted, selectSource]);

  /**
   * シーズナルエフェクト（背景アニメーション）の制御
   *
   * 現在の日付に基づいて適切な背景エフェクトを決定します：
   * - 12月25日以降: 雪エフェクト
   * - 1月2日まで: コンフェッティエフェクト
   * - その他: エフェクトなし
   *
   * backdropAnimationがfalseの場合は常にエフェクトなし
   */
  const backdrop = useMemo(() => {
    const now = new Date();
    if (backdropAnimation === false) {
      return;
    } else if (now >= new Date(now.getFullYear(), 11, 25)) {
      // 12月25日以降は雪エフェクト
      return <Snow effect="snow" />;
    } else if (now < new Date(now.getFullYear(), 0, 2)) {
      // 1月2日まではコンフェッティエフェクト
      return <Snow effect="confetti" />;
    }
    return;
  }, [backdropAnimation]);

  /**
   * 現在のアクティブビューに基づく表示コンポーネントの決定
   *
   * activeViewの値に応じて適切なコンポーネントとタイトルを返します。
   * 各ビューは独自のUIと機能を提供します。
   */
  const view = useMemo(() => {
    switch (activeView) {
      case "demo": {
        // デモモードは自動処理のため空のコンポーネント
        return {
          title: "",
          component: <></>,
        };
      }
      case "connection":
        // リモート接続設定画面
        return {
          title: "Open new connection",
          component: <Connection />,
        };
      default:
        // デフォルトはスタート画面
        return {
          title: "Get started",
          component: <Start />,
        };
    }
  }, [activeView]);

  return (
    <Dialog
      data-testid="DataSourceDialog"
      open
      onClose={onModalClose}
      fullWidth
      maxWidth="lg"
      slotProps={{
        backdrop: {
          children: backdrop, // シーズナルエフェクトの表示
        },
        paper: {
          square: false,
          elevation: 4,
          className: classes.paper,
        },
      }}
    >
      {/* ダイアログ右上の閉じるボタン */}
      <IconButton className={classes.closeButton} onClick={onModalClose} edge="end">
        <CloseIcon data-testid="CloseIcon" />
      </IconButton>

      {/* メインコンテンツ領域 */}
      <Stack
        flexGrow={1}
        fullHeight
        justifyContent="space-between"
        overflow={activeView === "connection" ? "hidden" : undefined} // 接続画面では独自のスクロール制御
      >
        {view.component}
      </Stack>
    </Dialog>
  );
}
