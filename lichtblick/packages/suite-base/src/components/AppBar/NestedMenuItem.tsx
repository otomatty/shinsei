// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * NestedMenuItem - ネストメニューアイテムコンポーネント
 *
 * 階層的なメニュー構造を実現するためのコンポーネントです。
 * メインメニューアイテムとサブメニューの組み合わせを提供し、
 * ホバー操作によるメニュー展開を実装しています。
 *
 * 主な機能：
 * - マウスホバーによるサブメニュー展開
 * - 3種類のメニューアイテム（item, divider, subheader）のサポート
 * - キーボードショートカット表示
 * - 選択状態の視覚的フィードバック
 * - アクセシビリティ対応
 *
 * @example
 * ```typescript
 * <NestedMenuItem
 *   id="file-menu"
 *   items={fileMenuItems}
 *   open={isFileMenuOpen}
 *   onPointerEnter={handleMenuHover}
 * >
 *   File
 * </NestedMenuItem>
 * ```
 */

import { ChevronRight12Regular } from "@fluentui/react-icons";
import { Divider, Menu, MenuItem, Typography } from "@mui/material";
import { PropsWithChildren, useState } from "react";
import { makeStyles } from "tss-react/mui";

import { AppBarMenuItem } from "./types";

/**
 * NestedMenuItemスタイル定義
 *
 * ネストメニューの視覚的な階層構造とユーザビリティを最適化：
 * - ポインターイベントの制御によるホバー動作の実現
 * - 選択状態とホバー状態の視覚的フィードバック
 * - アイコンの透明度による状態表示
 * - レスポンシブな幅設定
 */
const useStyles = makeStyles<void, "endIcon">()((theme, _params, classes) => ({
  /** メニューコンテナ（ポインターイベント無効） */
  menu: {
    pointerEvents: "none",
  },
  /** メニューペーパー（ポインターイベント有効） */
  paper: {
    pointerEvents: "auto",
    marginTop: theme.spacing(-1),
  },
  /** メニューアイテムのスタイル */
  menuItem: {
    /** 要素を両端に配置 */
    justifyContent: "space-between",
    /** カーソルをポインターに設定 */
    cursor: "pointer",
    /** 要素間のギャップ */
    gap: theme.spacing(2),

    /** 選択状態とホバー状態のスタイル */
    "&.Mui-selected, &.Mui-selected:hover": {
      backgroundColor: theme.palette.action.hover,
    },

    /** 非ホバー・非フォーカス時のアイコン透明度 */
    [`:not(:hover, :focus) .${classes.endIcon}`]: {
      opacity: 0.6,
    },

    /** キーボードショートカットのスタイル */
    kbd: {
      font: "inherit",
      color: theme.palette.text.disabled,
    },
  },
  /** サブメニューリストのサイズ制限 */
  menuList: {
    minWidth: 180,
    maxWidth: 280,
  },
  /** 右端アイコンの位置調整 */
  endIcon: {
    marginRight: theme.spacing(-0.75),
  },
}));

/**
 * NestedMenuItem - ネストメニューアイテムコンポーネント
 *
 * 階層的なメニュー構造を提供するコンポーネント。
 * メインアイテムとサブメニューを組み合わせ、ホバー操作による展開を実現します。
 *
 * 動作仕様：
 * - マウスホバーでサブメニューを展開
 * - 右矢印アイコンでサブメニューの存在を表示
 * - サブメニューは右側に展開
 * - 3種類のメニューアイテムタイプをサポート
 * - キーボードショートカット表示
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - メインメニューアイテムの表示内容
 * @param props.id - メニューアイテムの一意識別子
 * @param props.items - サブメニューアイテムの配列
 * @param props.open - サブメニューの開閉状態
 * @param props.onPointerEnter - ホバー時のイベントハンドラー
 * @returns NestedMenuItemのJSX要素
 */
export function NestedMenuItem(
  props: PropsWithChildren<{
    id?: string;
    items: AppBarMenuItem[];
    open: boolean;
    onPointerEnter: (itemId: string) => void;
  }>,
): React.JSX.Element {
  const { classes } = useStyles();
  const { children, items, open, onPointerEnter, id } = props;

  /** サブメニューのアンカー要素 */
  const [anchorEl, setAnchorEl] = useState<undefined | HTMLLIElement>(undefined);

  /**
   * ポインターエンター時のイベントハンドラー
   *
   * メインメニューアイテムにホバーした際に、
   * 親コンポーネントにメニューIDを通知してサブメニューを展開します。
   */
  const handlePointerEnter = () => {
    if (id) {
      onPointerEnter(id);
    }
  };

  return (
    <>
      {/* メインメニューアイテム */}
      <MenuItem
        id={id}
        ref={(element) => {
          setAnchorEl(element ?? undefined);
        }}
        selected={open}
        className={classes.menuItem}
        onPointerEnter={handlePointerEnter}
        data-testid={id}
      >
        {children}
        {/* サブメニュー展開を示す右矢印アイコン */}
        <ChevronRight12Regular className={classes.endIcon} />
      </MenuItem>

      {/* サブメニュー */}
      <Menu
        classes={{
          root: classes.menu,
          paper: classes.paper,
        }}
        open={open}
        disablePortal
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(undefined);
        }}
        onMouseLeave={() => {
          setAnchorEl(undefined);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          list: {
            dense: true,
            className: classes.menuList,
          },
        }}
        autoFocus={false}
        disableAutoFocus
        disableEnforceFocus
        hideBackdrop
      >
        {/* サブメニューアイテムの動的レンダリング */}
        {items.map((item, idx) => {
          switch (item.type) {
            case "item":
              return (
                <MenuItem
                  className={classes.menuItem}
                  key={item.key}
                  onClick={item.onClick}
                  data-testid={item.dataTestId}
                  disabled={item.disabled}
                >
                  {item.label}
                  {/* キーボードショートカットの表示 */}
                  {item.shortcut && <kbd>{item.shortcut}</kbd>}
                </MenuItem>
              );
            case "divider":
              return <Divider variant="middle" key={`divider${idx}`} />;
            case "subheader":
              return (
                <MenuItem disabled key={item.key}>
                  <Typography variant="overline">{item.label}</Typography>
                </MenuItem>
              );
          }
        })}
      </Menu>
    </>
  );
}
