// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppMenu - アプリケーションメインメニューコンポーネント
 *
 * AppBarに表示されるメインメニューシステムです。
 * 階層的なメニュー構造を提供し、以下の機能を含みます：
 * - File: データソース操作（開く、接続、最近使用したファイル）
 * - View: UI表示制御（サイドバー、レイアウト管理）
 * - Help: ヘルプ・情報（ドキュメント、About、サンプルデータ）
 *
 * 特徴：
 * - ネストメニューによる階層構造
 * - 国際化対応（i18n）
 * - キーボードショートカット表示
 * - 状態に応じた動的メニュー項目
 * - 最近使用したデータソースの履歴表示
 *
 * @example
 * ```typescript
 * <AppMenu
 *   open={isMenuOpen}
 *   handleClose={handleMenuClose}
 *   anchorEl={anchorElement}
 * />
 * ```
 */

import { Menu, PaperProps } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useStyles } from "@lichtblick/suite-base/components/AppBar/AppMenu.style";
import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import { LICHTBLICK_DOCUMENTATION_LINK } from "@lichtblick/suite-base/constants/documentation";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import {
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { useLayoutTransfer } from "@lichtblick/suite-base/hooks/useLayoutTransfer";
import { formatKeyboardShortcut } from "@lichtblick/suite-base/util/formatKeyboardShortcut";

import { NestedMenuItem } from "./NestedMenuItem";
import { AppBarMenuItem, AppMenuProps } from "./types";

/**
 * Workspace Store Selectors - ワークスペース状態セレクター
 *
 * パフォーマンス最適化のため、必要な状態のみを抽出するセレクター関数。
 * これらは useWorkspaceStore フックと組み合わせて使用されます。
 */

/** 左サイドバーの開閉状態を取得 */
const selectLeftSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.left.open;
/** 右サイドバーの開閉状態を取得 */
const selectRightSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.right.open;

/**
 * AppMenu - アプリケーションメインメニューコンポーネント
 *
 * アプリケーションの主要機能へのアクセスを提供するメニューシステム。
 * 3つの主要なメニューグループ（File、View、Help）で構成されています。
 *
 * メニュー構造：
 * - File: データソース管理（開く、接続、履歴）
 * - View: UI制御（サイドバー、レイアウト）
 * - Help: サポート情報（ドキュメント、About、デモ）
 *
 * 状態管理：
 * - ネストメニューの開閉状態
 * - サイドバーの表示状態
 * - 最近使用したデータソースの履歴
 *
 * @param props - メニューコンポーネントのプロパティ
 * @returns AppMenuのJSX要素
 */
export function AppMenu(props: AppMenuProps): React.JSX.Element {
  const { open, handleClose, anchorEl, anchorReference, anchorPosition, disablePortal } = props;
  const { classes } = useStyles();
  const { t } = useTranslation("appBar");

  /** 現在開いているネストメニューのID */
  const [nestedMenu, setNestedMenu] = useState<string | undefined>();

  /** データソース選択とhistory管理 */
  const { recentSources, selectRecent } = usePlayerSelection();

  /** サイドバーの開閉状態 */
  const leftSidebarOpen = useWorkspaceStore(selectLeftSidebarOpen);
  const rightSidebarOpen = useWorkspaceStore(selectRightSidebarOpen);

  /** ワークスペースとダイアログのアクション */
  const { sidebarActions, dialogActions } = useWorkspaceActions();

  /**
   * ネストメニューを閉じて、メインメニューも閉じる
   * すべてのメニューアイテムのクリック時に呼び出される
   */
  const handleNestedMenuClose = useCallback(() => {
    setNestedMenu(undefined);
    handleClose();
  }, [handleClose]);

  /**
   * マウスホバーでネストメニューを開く
   * ユーザビリティ向上のため、ホバーでメニューを展開
   */
  const handleItemPointerEnter = useCallback((id: string) => {
    setNestedMenu(id);
  }, []);

  /** レイアウトのインポート・エクスポート機能 */
  const { importLayout, exportLayout } = useLayoutTransfer();

  /**
   * FILE MENU ITEMS - ファイルメニュー項目
   *
   * データソース関連の操作を提供：
   * - データソース選択ダイアログの表示
   * - ローカルファイルの開く
   * - リモート接続の開く
   * - 最近使用したデータソースの履歴（最大5件）
   */
  const fileItems = useMemo(() => {
    const items: AppBarMenuItem[] = [
      {
        type: "item",
        label: t("open"),
        key: "open",
        dataTestId: "menu-item-open",
        onClick: () => {
          dialogActions.dataSource.open("start");
          handleNestedMenuClose();
        },
      },
      {
        type: "item",
        label: t("openLocalFiles"),
        key: "open-file",
        shortcut: formatKeyboardShortcut("O", ["Meta"]),
        dataTestId: "menu-item-open-local-file",
        onClick: () => {
          handleNestedMenuClose();
          dialogActions.openFile.open().catch((err: unknown) => {
            console.error(err);
          });
        },
      },
      {
        type: "item",
        label: t("openConnection"),
        key: "open-connection",
        shortcut: formatKeyboardShortcut("O", ["Meta", "Shift"]),
        dataTestId: "menu-item-open-connection",
        onClick: () => {
          dialogActions.dataSource.open("connection");
          handleNestedMenuClose();
        },
      },
      { type: "divider" },
      { type: "item", label: t("recentDataSources"), key: "recent-sources", disabled: true },
    ];

    // 最近使用したデータソースを最大5件まで追加
    recentSources.slice(0, 5).map((recent) => {
      items.push({
        type: "item",
        key: recent.id,
        onClick: () => {
          selectRecent(recent.id);
          handleNestedMenuClose();
        },
        label: <TextMiddleTruncate text={recent.title} className={classes.truncate} />,
      });
    });

    return items;
  }, [
    classes.truncate,
    dialogActions.dataSource,
    dialogActions.openFile,
    handleNestedMenuClose,
    recentSources,
    selectRecent,
    t,
  ]);

  /**
   * VIEW MENU ITEMS - ビューメニュー項目
   *
   * UI表示制御とレイアウト管理を提供：
   * - 左右サイドバーの表示/非表示切り替え
   * - レイアウトファイルのインポート/エクスポート
   * - 状態に応じた動的なラベル表示
   */
  const viewItems = useMemo<AppBarMenuItem[]>(
    () => [
      {
        type: "item",
        label: leftSidebarOpen ? t("hideLeftSidebar") : t("showLeftSidebar"),
        key: "left-sidebar",
        shortcut: "[",
        onClick: () => {
          sidebarActions.left.setOpen(!leftSidebarOpen);
          handleNestedMenuClose();
        },
      },
      {
        type: "item",
        label: rightSidebarOpen ? t("hideRightSidebar") : t("showRightSidebar"),
        key: "right-sidebar",
        shortcut: "]",
        onClick: () => {
          sidebarActions.right.setOpen(!rightSidebarOpen);
          handleNestedMenuClose();
        },
      },
      {
        type: "divider",
      },
      {
        type: "item",
        label: t("importLayoutFromFile"),
        key: "import-layout",
        onClick: async () => {
          await importLayout();
          handleNestedMenuClose();
        },
      },
      {
        type: "item",
        label: t("exportLayoutToFile"),
        key: "export-layout",
        onClick: async () => {
          await exportLayout();
          handleNestedMenuClose();
        },
      },
    ],
    [
      exportLayout,
      handleNestedMenuClose,
      importLayout,
      leftSidebarOpen,
      rightSidebarOpen,
      sidebarActions.left,
      sidebarActions.right,
      t,
    ],
  );

  /**
   * HELP MENU EVENT HANDLERS - ヘルプメニューイベントハンドラー
   *
   * ヘルプ関連の操作を提供するためのコールバック関数群
   */

  /** About ダイアログを開く */
  const onAboutClick = useCallback(() => {
    dialogActions.preferences.open("about");
    handleNestedMenuClose();
  }, [dialogActions.preferences, handleNestedMenuClose]);

  /** デモデータソースを開く */
  const onDemoClick = useCallback(() => {
    dialogActions.dataSource.open("demo");
    handleNestedMenuClose();
  }, [dialogActions.dataSource, handleNestedMenuClose]);

  /** ドキュメントを新しいタブで開く */
  const onDocsClick = useCallback(() => {
    window.open(LICHTBLICK_DOCUMENTATION_LINK, "_blank", "noopener,noreferrer");
    handleNestedMenuClose();
  }, [handleNestedMenuClose]);

  /**
   * HELP MENU ITEMS - ヘルプメニュー項目
   *
   * サポート情報とドキュメントへのアクセスを提供：
   * - About ダイアログ（アプリケーション情報）
   * - オンラインドキュメント（外部リンク）
   * - サンプルデータの探索
   */
  const helpItems = useMemo<AppBarMenuItem[]>(
    () => [
      { type: "item", key: "about", label: t("about"), onClick: onAboutClick },
      { type: "divider" },
      { type: "item", key: "docs", label: t("documentation"), onClick: onDocsClick },
      { type: "divider" },
      { type: "item", key: "demo", label: t("exploreSampleData"), onClick: onDemoClick },
    ],
    [onAboutClick, onDemoClick, onDocsClick, t],
  );

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        anchorReference={anchorReference}
        anchorPosition={anchorPosition}
        disablePortal={disablePortal}
        id="app-menu"
        open={open}
        disableAutoFocusItem
        onClose={handleNestedMenuClose}
        slotProps={{
          list: {
            "aria-labelledby": "app-menu-button",
            dense: true,
            className: classes.menuList,
          },
          paper: {
            "data-tourid": "app-menu",
          } as Partial<PaperProps & { "data-tourid"?: string }>,
        }}
      >
        {/* File メニュー: データソース操作 */}
        <NestedMenuItem
          onPointerEnter={handleItemPointerEnter}
          items={fileItems}
          open={nestedMenu === "app-menu-file"}
          id="app-menu-file"
        >
          {t("file")}
        </NestedMenuItem>

        {/* View メニュー: UI制御とレイアウト管理 */}
        <NestedMenuItem
          onPointerEnter={handleItemPointerEnter}
          items={viewItems}
          open={nestedMenu === "app-menu-view"}
          id="app-menu-view"
        >
          {t("view")}
        </NestedMenuItem>

        {/* Help メニュー: サポート情報 */}
        <NestedMenuItem
          onPointerEnter={handleItemPointerEnter}
          items={helpItems}
          open={nestedMenu === "app-menu-help"}
          id="app-menu-help"
        >
          {t("help")}
        </NestedMenuItem>
      </Menu>
    </>
  );
}
