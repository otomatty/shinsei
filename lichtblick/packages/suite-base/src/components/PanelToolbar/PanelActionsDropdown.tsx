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

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Divider, Menu, MenuItem } from "@mui/material";
import { MouseEvent, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MosaicContext, MosaicNode, MosaicWindowContext } from "react-mosaic-component";
import { makeStyles } from "tss-react/mui";

import PanelContext from "@lichtblick/suite-base/components/PanelContext";
import ChangePanelMenu from "@lichtblick/suite-base/components/PanelToolbar/ChangePanelMenu";
import ToolbarIconButton from "@lichtblick/suite-base/components/PanelToolbar/ToolbarIconButton";
import { getPanelTypeFromMosaic } from "@lichtblick/suite-base/components/PanelToolbar/utils";
import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";

/**
 * PanelActionsDropdownコンポーネントのプロパティ
 */
type Props = {
  /** 未知のパネルタイプかどうか（分割機能などを制限する） */
  isUnknownPanel: boolean;
};

const useStyles = makeStyles()((theme) => ({
  error: { color: theme.palette.error.main },
  icon: {
    marginRight: theme.spacing(-1),
  },
  menuItem: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",

    ".root-span": {
      display: "flex",
      marginLeft: theme.spacing(-0.25),
    },
    "&.Mui-selected": {
      backgroundColor: theme.palette.action.hover,

      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
    },
  },
}));

/**
 * **PanelActionsDropdown** - パネルアクションドロップダウンメニュー
 *
 * パネルツールバーの「...」ボタンをクリックすると表示されるアクションメニューコンポーネント。
 * パネルの分割、フルスクリーン、削除、タイプ変更などの操作を提供します。
 *
 * @features
 * - **パネル分割**: 右方向・下方向への分割
 * - **フルスクリーン**: パネルの全画面表示
 * - **パネル削除**: 現在のパネルを削除
 * - **パネル変更**: サブメニューでパネルタイプを変更
 * - **多言語対応**: react-i18nextによる国際化
 * - **アクセシビリティ**: 適切なaria属性とキーボードナビゲーション
 *
 * @architecture
 * - **React Mosaic**: レイアウトシステムとの統合
 * - **Context API**: パネル、レイアウト、Mosaicの状態管理
 * - **Material-UI**: 統一されたメニューコンポーネント
 * - **Custom Hooks**: レイアウトアクションの抽象化
 *
 * @interactions
 * - **メインメニュー**: クリックで開閉
 * - **サブメニュー**: マウスホバーで開閉
 * - **アクション実行**: クリックで各機能を実行
 *
 * @example
 * ```tsx
 * // 通常のパネル用
 * <PanelActionsDropdown isUnknownPanel={false} />
 *
 * // 未知のパネル用（分割機能制限）
 * <PanelActionsDropdown isUnknownPanel={true} />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされたドロップダウンメニュー
 */
function PanelActionsDropdownComponent({ isUnknownPanel }: Props): React.JSX.Element {
  const { classes, cx } = useStyles();
  const [menuAnchorEl, setMenuAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const [subMenuAnchorEl, setSubmenuAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const isTouchInteraction = useRef(false);
  const { t } = useTranslation("panelToolbar");

  const menuOpen = Boolean(menuAnchorEl);
  const submenuOpen = Boolean(subMenuAnchorEl);

  const panelContext = useContext(PanelContext);
  const tabId = panelContext?.tabId;
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const {
    getCurrentLayoutState: getCurrentLayout,
    closePanel,
    splitPanel,
  } = useCurrentLayoutActions();
  const getPanelType = useCallback(
    () => getPanelTypeFromMosaic(mosaicWindowActions, mosaicActions),
    [mosaicActions, mosaicWindowActions],
  );
  const handleTouchStart = useCallback(() => {
    isTouchInteraction.current = true;
  }, []);

  /**
   * メニューボタンクリック処理
   * サブメニューを閉じてメインメニューを開く
   */
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSubmenuAnchorEl(undefined);
    setMenuAnchorEl(event.currentTarget);
  };

  /**
   * メニュー閉じる処理
   * メインメニューとサブメニューを両方閉じる
   */
  const handleMenuClose = () => {
    setSubmenuAnchorEl(undefined);
    setMenuAnchorEl(undefined);
  };

  /**
   * サブメニュークリック処理
   * メインメニューを閉じてサブメニューを開く
   */
  const handleSubmenuClick = (event: MouseEvent<HTMLElement>) => {
    if (subMenuAnchorEl !== event.currentTarget) {
      setSubmenuAnchorEl(event.currentTarget);
    }
    if (!isTouchInteraction.current) {
      setMenuAnchorEl(undefined);
    }
  };

  /**
   * サブメニュー閉じる処理
   */
  const handleSubmenuClose = useCallback(() => {
    setSubmenuAnchorEl(undefined);
  }, []);

  /**
   * サブメニューマウスエンター処理
   * ホバーでサブメニューを開く
   */
  const handleSubmenuMouseEnter = (event: MouseEvent<HTMLElement>) => {
    setSubmenuAnchorEl(event.currentTarget);
  };

  /**
   * パネル削除処理
   * 現在のパネルをレイアウトから削除
   */
  const close = useCallback(() => {
    closePanel({
      tabId,
      root: mosaicActions.getRoot() as MosaicNode<string>,
      path: mosaicWindowActions.getPath(),
    });
    handleMenuClose();
  }, [closePanel, mosaicActions, mosaicWindowActions, tabId]);

  /**
   * パネル分割処理
   * 指定された方向にパネルを分割
   * @param id - パネルID
   * @param direction - 分割方向（'row' | 'column'）
   */
  const split = useCallback(
    (id: string | undefined, direction: "row" | "column") => {
      const type = getPanelType();
      if (id == undefined || type == undefined) {
        throw new Error("Trying to split unknown panel!");
      }

      const config = getCurrentLayout().selectedLayout?.data?.configById[id] ?? {};
      splitPanel({
        id,
        tabId,
        direction,
        root: mosaicActions.getRoot() as MosaicNode<string>,
        path: mosaicWindowActions.getPath(),
        config,
      });
      handleMenuClose();
    },
    [getCurrentLayout, getPanelType, mosaicActions, mosaicWindowActions, splitPanel, tabId],
  );

  /**
   * フルスクリーン入る処理
   * パネルを全画面表示にする
   */
  const enterFullscreen = useCallback(() => {
    panelContext?.enterFullscreen();
    handleMenuClose();
  }, [panelContext]);

  /**
   * メニューアイテムの動的生成
   * パネルの状態に応じてアクションを生成
   */
  const menuItems = useMemo(() => {
    const items = [];

    if (!isUnknownPanel) {
      items.push(
        {
          key: "vsplit",
          text: t("splitRight"),
          onClick: () => {
            split(panelContext?.id, "row");
          },
        },
        {
          key: "hsplit",
          text: t("splitDown"),
          onClick: () => {
            split(panelContext?.id, "column");
          },
        },
      );
    }

    if (panelContext?.isFullscreen !== true) {
      items.push({
        key: "enter-fullscreen",
        text: t("fullscreen"),
        onClick: enterFullscreen,
        "data-testid": "panel-menu-fullscreen",
      });
    }

    items.push({ key: "divider", type: "divider" });

    items.push({
      key: "remove",
      text: t("removePanel"),
      onClick: close,
      "data-testid": "panel-menu-remove",
      className: classes.error,
    });

    return items;
  }, [
    classes.error,
    close,
    enterFullscreen,
    isUnknownPanel,
    panelContext?.id,
    panelContext?.isFullscreen,
    split,
    t,
  ]);

  const buttonRef = useRef<HTMLDivElement>(ReactNull);
  const type = getPanelType();

  if (type == undefined) {
    return <></>;
  }

  return (
    <div ref={buttonRef}>
      <ToolbarIconButton
        id="panel-menu-button"
        aria-controls={menuOpen ? "panel-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? "true" : undefined}
        onClick={handleMenuClick}
        data-testid="panel-menu"
        title={t("more")}
      >
        <MoreVertIcon />
      </ToolbarIconButton>
      <Menu
        id="panel-menu"
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onTouchStart={handleTouchStart}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          list: {
            "aria-labelledby": "panel-menu-button",
            dense: true,
          },
        }}
      >
        <MenuItem
          className={classes.menuItem}
          selected={submenuOpen}
          id="change-panel-button"
          aria-controls={submenuOpen ? "change-panel-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={submenuOpen ? "true" : undefined}
          onClick={handleSubmenuClick}
          onMouseEnter={handleSubmenuMouseEnter}
        >
          {t("changePanel")}
          <ChevronRightIcon className={classes.icon} fontSize="small" />
        </MenuItem>
        <ChangePanelMenu anchorEl={subMenuAnchorEl} onClose={handleSubmenuClose} tabId={tabId} />
        <Divider variant="middle" />
        {menuItems.map((item, idx) =>
          item.type === "divider" ? (
            <Divider key={`divider-${idx}`} variant="middle" />
          ) : (
            <MenuItem
              key={item.key}
              onClick={(event) => {
                event.stopPropagation();
                item.onClick?.();
              }}
              onMouseEnter={() => {
                setSubmenuAnchorEl(undefined);
              }}
              className={cx(classes.menuItem, item.className)}
              data-testid={item["data-testid"]}
            >
              {item.text}
            </MenuItem>
          ),
        )}
      </Menu>
    </div>
  );
}

/**
 * React.memoでラップされたPanelActionsDropdownコンポーネント
 * パフォーマンス最適化のためmemoized
 */
export const PanelActionsDropdown = React.memo(PanelActionsDropdownComponent);
