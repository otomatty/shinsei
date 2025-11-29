// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Start: DataSourceDialogのスタート画面コンポーネント
 *
 * DataSourceDialogのメインランディングページとして機能し、
 * ユーザーがデータソースを選択するための主要なエントリーポイントを提供します。
 *
 * ## 主な機能
 *
 * ### データソース選択オプション
 * - **ローカルファイル**: bag/mcap/foxe形式のファイルを開く
 * - **リモート接続**: WebSocket/ROS接続の設定
 *
 * ### 最近使用したファイル
 * - 最大5件の履歴表示
 * - ワンクリックでの再選択
 * - ファイル名の適切な省略表示
 *
 * ### レイアウト構造
 * - **ヘッダー**: Lichtblickロゴ表示
 * - **メインコンテンツ**: データソース選択UI
 * - **サイドバー**: 追加オプションとヘルプ
 *
 * ### 国際化対応
 * - i18nextを使用した多言語サポート
 * - ユーザーの言語設定に応じた表示
 *
 * ## UI構造
 *
 * ```
 * ┌─────────────────────────────────────┬───────────────┐
 * │ [Lichtblick Logo]                   │               │
 * ├─────────────────────────────────────┤   サイドバー    │
 * │ データソースを開く                    │               │
 * │ ┌─────────────────────────────────┐ │   - サンプル   │
 * │ │ 📁 ローカルファイルを開く           │ │   - ヘルプ     │
 * │ └─────────────────────────────────┘ │   - 設定       │
 * │ ┌─────────────────────────────────┐ │               │
 * │ │ 🔗 接続を開く                   │ │               │
 * │ └─────────────────────────────────┘ │               │
 * │                                   │               │
 * │ 最近のデータソース                   │               │
 * │ • sample-data.mcap                │               │
 * │ • robot-log-2024.bag              │               │
 * └─────────────────────────────────────┴───────────────┘
 * ```
 *
 * @example
 * ```tsx
 * // DataSourceDialog内での使用
 * <DataSourceDialog>
 *   <Start />
 * </DataSourceDialog>
 * ```
 */

import { List, ListItem, ListItemButton, SvgIcon, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import DataSourceOption from "@lichtblick/suite-base/components/DataSourceDialog/DataSourceOption";
import SidebarItems from "@lichtblick/suite-base/components/DataSourceDialog/SidebarItems";
import { useStyles } from "@lichtblick/suite-base/components/DataSourceDialog/index.style";
import LichtblickLogoText from "@lichtblick/suite-base/components/LichtblickLogoText";
import Stack from "@lichtblick/suite-base/components/Stack";
import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";

/**
 * Start コンポーネント
 *
 * DataSourceDialogのスタート画面として、ユーザーがデータソースを
 * 選択するためのメインインターフェースを提供します。
 *
 * ## 主要な処理フロー
 *
 * 1. **初期化**: 必要なコンテキストとフックの取得
 * 2. **オプション生成**: 利用可能なデータソースオプションの動的生成
 * 3. **履歴表示**: 最近使用したファイルの一覧表示
 * 4. **ナビゲーション**: 選択されたオプションに応じたビュー遷移
 * 5. **分析**: ユーザー行動の追跡とログ記録
 *
 * ## 状態管理
 *
 * - **PlayerSelection**: データソース履歴と選択処理
 * - **WorkspaceActions**: ダイアログの状態制御
 * - **Analytics**: ユーザーインタラクション追跡
 * - **i18n**: 多言語対応のテキスト管理
 *
 * @returns レンダリングされたスタート画面コンポーネント
 */
export default function Start(): React.JSX.Element {
  // コンテキストフックの初期化
  const { recentSources, selectRecent } = usePlayerSelection();
  const { classes } = useStyles();
  const analytics = useAnalytics();
  const { t } = useTranslation("openDialog");
  const { dialogActions } = useWorkspaceActions();

  /**
   * メインデータソース選択オプションの定義
   *
   * ユーザーが選択可能な主要なデータソースオプションを動的に生成します。
   * 各オプションにはアイコン、説明文、クリックハンドラーが含まれます。
   *
   * ## 含まれるオプション
   *
   * ### ローカルファイル
   * - アイコン: ファイルアップロードアイコン
   * - 機能: ネイティブファイル選択ダイアログを開く
   * - 対応形式: bag, mcap, foxe
   *
   * ### リモート接続
   * - アイコン: 接続アイコン
   * - 機能: 接続設定画面への遷移
   * - 対応プロトコル: WebSocket, ROS
   */
  const startItems = useMemo(() => {
    return [
      {
        key: "open-local-file",
        text: t("openLocalFiles"), // 国際化対応テキスト
        secondaryText: t("openLocalFileDescription"),
        icon: (
          // ファイルアップロードを表現するSVGアイコン
          <SvgIcon fontSize="large" color="primary" viewBox="0 0 2048 2048">
            <path d="M1955 1533l-163-162v677h-128v-677l-163 162-90-90 317-317 317 317-90 90zM256 1920h1280v128H128V0h1115l549 549v475h-128V640h-512V128H256v1792zM1280 512h293l-293-293v293z" />
          </SvgIcon>
        ),
        onClick: () => {
          // ファイル選択モードに遷移
          dialogActions.dataSource.open("file");
          // ユーザー行動をアナリティクスに記録
          void analytics.logEvent(AppEvent.DIALOG_SELECT_VIEW, { type: "local" });
        },
      },
      {
        key: "open-connection",
        text: t("openConnection"),
        secondaryText: t("openConnectionDescription"),
        icon: (
          // 接続を表現するSVGアイコン
          <SvgIcon fontSize="large" color="primary" viewBox="0 0 2048 2048">
            <path d="M1408 256h640v640h-640V640h-120l-449 896H640v256H0v-640h640v256h120l449-896h199V256zM512 1664v-384H128v384h384zm1408-896V384h-384v384h384z" />
          </SvgIcon>
        ),
        onClick: () => {
          // 接続設定画面に遷移
          dialogActions.dataSource.open("connection");
          // ユーザー行動をアナリティクスに記録
          void analytics.logEvent(AppEvent.DIALOG_SELECT_VIEW, { type: "live" });
        },
      },
    ];
  }, [analytics, dialogActions.dataSource, t]);

  return (
    <Stack className={classes.grid}>
      {/* ヘッダー領域 - Lichtblickロゴ表示 */}
      <header className={classes.header}>
        <LichtblickLogoText color="primary" className={classes.logo} />
      </header>

      {/* メインコンテンツ領域 */}
      <Stack className={classes.content}>
        <Stack gap={4}>
          {/* データソース選択セクション */}
          <Stack gap={1}>
            <Typography variant="h5" gutterBottom>
              {t("openDataSource")}
            </Typography>
            {/* メインデータソースオプションの表示 */}
            {startItems.map((item) => (
              <DataSourceOption
                key={item.key}
                text={item.text}
                secondaryText={item.secondaryText}
                icon={item.icon}
                onClick={item.onClick}
                target="_blank"
              />
            ))}
          </Stack>

          {/* 最近使用したファイルセクション（条件付き表示） */}
          {recentSources.length > 0 && (
            <Stack gap={1}>
              <Typography variant="h5" gutterBottom>
                {t("recentDataSources")}
              </Typography>
              <List disablePadding>
                {/* 最大5件の履歴を表示 */}
                {recentSources.slice(0, 5).map((recent) => (
                  <ListItem disablePadding key={recent.id} id={recent.id}>
                    <ListItemButton
                      disableGutters
                      onClick={() => {
                        // 履歴からのファイル選択
                        selectRecent(recent.id);
                      }}
                      className={classes.recentListItemButton}
                    >
                      {/* ファイル名の中央省略表示 */}
                      <TextMiddleTruncate
                        className={classes.recentSourceSecondary}
                        text={recent.title}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* 視覚的な区切り領域 */}
      <div className={classes.spacer} />

      {/* サイドバー領域 */}
      <Stack gap={4} className={classes.sidebar}>
        <SidebarItems onSelectView={dialogActions.dataSource.open} />
      </Stack>
    </Stack>
  );
}
