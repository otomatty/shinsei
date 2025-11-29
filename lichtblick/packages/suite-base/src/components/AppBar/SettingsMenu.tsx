// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * SettingsMenu - 設定メニューコンポーネント
 *
 * AppBarに表示される設定関連のメニューを提供します。
 * アプリケーション設定と拡張機能設定へのアクセスを提供し、
 * 設定ダイアログの開閉を管理します。
 *
 * 主な機能：
 * - 一般設定ダイアログの表示
 * - 拡張機能設定ダイアログの表示
 * - 国際化対応（i18n）
 * - ポップオーバー形式でのメニュー表示
 *
 * @example
 * ```typescript
 * <SettingsMenu
 *   open={isSettingsMenuOpen}
 *   handleClose={handleSettingsMenuClose}
 *   anchorEl={settingsButtonElement}
 * />
 * ```
 */

import { Menu, MenuItem, PaperProps, PopoverPosition, PopoverReference } from "@mui/material";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

import { AppSettingsTab } from "@lichtblick/suite-base/components/AppSettingsDialog/types";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

/**
 * SettingsMenuスタイル定義
 *
 * 設定メニューの外観を定義：
 * - 適切な幅の設定でメニューアイテムの可読性を確保
 */
const useStyles = makeStyles()({
  /** メニューリストの最小幅 */
  menuList: {
    minWidth: 200,
  },
});

/**
 * SettingsMenu Props - 設定メニューコンポーネントのプロパティ
 *
 * Material-UIのMenuコンポーネントで使用される標準的なプロパティを継承。
 * ポップオーバーの位置決めとイベントハンドリングを制御します。
 */
type SettingsMenuProps = {
  /** メニューを閉じるためのイベントハンドラー */
  handleClose: () => void;
  /** メニューのアンカー要素 */
  anchorEl?: HTMLElement;
  /** アンカーの参照方法 */
  anchorReference?: PopoverReference;
  /** アンカーの位置座標 */
  anchorPosition?: PopoverPosition;
  /** ポータルの無効化フラグ */
  disablePortal?: boolean;
  /** メニューの開閉状態 */
  open: boolean;
};

/**
 * SettingsMenu - 設定メニューコンポーネント
 *
 * アプリケーション設定へのアクセスを提供するメニューコンポーネント。
 * 設定ダイアログの開閉を管理し、特定の設定タブを直接開く機能を提供します。
 *
 * メニュー項目：
 * - 設定: 一般的なアプリケーション設定
 * - 拡張機能: 拡張機能の管理設定
 *
 * 動作仕様：
 * - メニューアイテムクリック時にダイアログを開く
 * - クリック後に自動的にメニューを閉じる
 * - 国際化対応による多言語表示
 *
 * @param props - コンポーネントのプロパティ
 * @returns SettingsMenuのJSX要素
 */
export function SettingsMenu({
  anchorEl,
  anchorReference,
  anchorPosition,
  disablePortal,
  handleClose,
  open,
}: SettingsMenuProps): React.JSX.Element {
  const { classes } = useStyles();
  const { t } = useTranslation("appBar");

  /** ワークスペースアクション（ダイアログ制御） */
  const { dialogActions } = useWorkspaceActions();

  /**
   * 設定クリック時のイベントハンドラー
   *
   * 設定ダイアログを開きます。オプションで特定のタブを指定可能。
   *
   * @param tab - 開く設定タブ（オプション）
   */
  const onSettingsClick = useCallback(
    (tab?: AppSettingsTab) => {
      dialogActions.preferences.open(tab);
    },
    [dialogActions.preferences],
  );

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        anchorReference={anchorReference}
        anchorPosition={anchorPosition}
        disablePortal={disablePortal}
        id="user-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          list: {
            className: classes.menuList,
            dense: true,
          },
          paper: {
            "data-tourid": "user-menu",
          } as Partial<PaperProps & { "data-tourid"?: string }>,
        }}
      >
        {/* 一般設定メニューアイテム */}
        <MenuItem
          onClick={() => {
            onSettingsClick();
          }}
        >
          {t("settings")}
        </MenuItem>

        {/* 拡張機能設定メニューアイテム */}
        <MenuItem
          onClick={() => {
            onSettingsClick("extensions");
          }}
        >
          {t("extensions")}
        </MenuItem>

        {/* レイアウト設定メニューアイテム */}
        <MenuItem
          onClick={() => {
            onSettingsClick("layouts");
          }}
        >
          {t("layouts")}
        </MenuItem>
      </Menu>
    </>
  );
}
