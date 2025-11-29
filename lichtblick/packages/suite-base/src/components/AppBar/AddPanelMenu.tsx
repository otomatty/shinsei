// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AddPanelMenu - パネル追加メニューコンポーネント
 *
 * AppBarから利用可能なパネルカタログを表示し、新しいパネルの追加を可能にします。
 * PanelCatalogコンポーネントをメニュー形式でラップし、以下の機能を提供：
 *
 * 主な機能：
 * - 利用可能なパネルタイプの一覧表示
 * - クリックによるパネル追加
 * - ドラッグ&ドロップによるパネル追加
 * - ドラッグ開始時のメニュー自動クローズ
 * - レスポンシブなメニューサイズ
 *
 * 連携コンポーネント：
 * - PanelCatalog: パネル一覧と選択UI
 * - useAddPanel: パネル追加ロジック
 *
 * @example
 * ```typescript
 * <AddPanelMenu
 *   open={isAddPanelMenuOpen}
 *   handleClose={handleAddPanelMenuClose}
 *   anchorEl={addPanelButtonElement}
 * />
 * ```
 */

import { Menu, PaperProps, PopoverPosition, PopoverReference } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { PanelCatalog } from "@lichtblick/suite-base/components/PanelCatalog";
import useAddPanel from "@lichtblick/suite-base/hooks/useAddPanel";

/**
 * AddPanelMenuスタイル定義
 *
 * パネル追加メニューの外観を最適化：
 * - 適切な幅でパネル情報を表示
 * - 下部パディングによる視覚的な余白
 */
const useStyles = makeStyles()((theme) => ({
  /** メニューリストのスタイル */
  menuList: {
    /** パネル情報を表示するのに十分な幅 */
    minWidth: 270,
    /** 下部に視覚的な余白を追加 */
    paddingBottom: theme.spacing(1),
  },
}));

/**
 * AddPanelMenu Props - パネル追加メニューコンポーネントのプロパティ
 *
 * Material-UIのMenuコンポーネントの標準プロパティを継承。
 * ポップオーバーの位置決めとイベントハンドリングを制御します。
 */
type AddPanelProps = {
  /** メニューのアンカー要素 */
  anchorEl?: HTMLElement;
  /** アンカーの位置座標 */
  anchorPosition?: PopoverPosition;
  /** アンカーの参照方法 */
  anchorReference?: PopoverReference;
  /** ポータルの無効化フラグ */
  disablePortal?: boolean;
  /** メニューを閉じるためのイベントハンドラー */
  handleClose: () => void;
  /** メニューの開閉状態 */
  open: boolean;
};

/**
 * AddPanelMenu - パネル追加メニューコンポーネント
 *
 * アプリケーションに新しいパネルを追加するためのメニューインターフェース。
 * PanelCatalogコンポーネントをメニュー形式でラップし、利用可能なパネルタイプの
 * 一覧表示と選択機能を提供します。
 *
 * 動作仕様：
 * - メニューは左下に展開
 * - クリック選択でパネルを追加
 * - ドラッグ&ドロップでパネルを配置
 * - ドラッグ開始時に自動的にメニューを閉じる（ドロップターゲットの妨害を防ぐ）
 *
 * ユーザビリティ：
 * - 密度の高いレイアウト（dense: true）
 * - パディング無効化による最大表示領域の確保
 * - アクセシビリティ対応（aria-labelledby）
 *
 * @param props - コンポーネントのプロパティ
 * @returns AddPanelMenuのJSX要素
 */
export function AddPanelMenu(props: AddPanelProps): React.JSX.Element {
  const { classes } = useStyles();
  const { anchorEl, anchorPosition, anchorReference, disablePortal, handleClose, open } = props;

  /** パネル追加機能のフック */
  const addPanel = useAddPanel();

  return (
    <Menu
      id="add-panel-menu"
      anchorEl={anchorEl}
      anchorPosition={anchorPosition}
      anchorReference={anchorReference}
      disablePortal={disablePortal}
      open={open}
      onClose={handleClose}
      slotProps={{
        list: {
          dense: true,
          disablePadding: true,
          "aria-labelledby": "add-panel-button",
          className: classes.menuList,
        },
        paper: {
          "data-tourid": "add-panel-menu",
        } as Partial<PaperProps & { "data-tourid"?: string }>,
      }}
      anchorOrigin={{
        horizontal: "left",
        vertical: "bottom",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
    >
      {/* パネルカタログ（メニューモード） */}
      <PanelCatalog
        isMenu
        // ドラッグ開始時にメニューを閉じる
        // モーダルメニューがドロップターゲットをブロックするのを防ぐ
        onDragStart={handleClose}
        onPanelSelect={(selection) => {
          // パネル選択時の処理
          addPanel(selection);
          handleClose();
        }}
      />
    </Menu>
  );
}
