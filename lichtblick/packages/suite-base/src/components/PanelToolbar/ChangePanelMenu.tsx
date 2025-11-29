// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ClickAwayListener, Grow, Paper, Popper } from "@mui/material";
import { useCallback, useContext } from "react";
import { MosaicContext, MosaicNode, MosaicWindowContext } from "react-mosaic-component";
import { makeStyles } from "tss-react/mui";

import { PanelCatalog, PanelSelection } from "@lichtblick/suite-base/components/PanelCatalog";
import PanelContext from "@lichtblick/suite-base/components/PanelContext";
import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";

const useStyles = makeStyles()((theme) => ({
  paper: {
    backgroundColor: theme.palette.background.menu,
    maxHeight: `calc(100vh - ${theme.spacing(12)})`,
    overflow: "auto",

    // Add iOS momentum scrolling for iOS < 13.0
    WebkitOverflowScrolling: "touch",
  },
}));

/**
 * ChangePanelMenuコンポーネントのプロパティ
 */
type ChangePanelMenuProps = {
  /** タブID（省略可能） */
  tabId?: string;
  /** メニューのアンカー要素 */
  anchorEl?: HTMLElement;
  /** メニューを閉じる際のコールバック */
  onClose: () => void;
};

/**
 * **ChangePanelMenu** - パネルタイプ変更メニュー
 *
 * パネルのタイプを変更するためのサブメニューコンポーネント。
 * PanelCatalogを使用して利用可能なパネルタイプを表示し、選択されたパネルタイプに現在のパネルを置き換えます。
 *
 * @features
 * - **パネルカタログ統合**: 利用可能な全パネルタイプを表示
 * - **リアクティブ表示**: anchorElの存在に基づく表示制御
 * - **スムーズトランジション**: Growコンポーネントによるアニメーション
 * - **アクセシビリティ**: ClickAwayListenerによる外部クリック検出
 * - **レスポンシブ**: 画面サイズに応じたメニュー配置
 *
 * @architecture
 * - **Popper位置制御**: 右開始配置、フォールバック位置対応
 * - **React Mosaic統合**: レイアウトシステムとの連携
 * - **Context API**: パネル状態とレイアウトアクションへのアクセス
 *
 * @interactions
 * - **パネル選択**: 現在のパネルタイプと異なる場合のみ処理
 * - **メニュー閉じる**: パネル選択時または外部クリック時
 * - **キーボードナビゲーション**: Material-UIのPopperによる対応
 *
 * @positioning
 * - **Primary**: right-start（右開始）
 * - **Fallback**: left-start（左開始）
 * - **Z-index**: 10000（他要素の上に確実に表示）
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <ChangePanelMenu
 *   anchorEl={anchorElement}
 *   onClose={() => setAnchorElement(undefined)}
 * />
 *
 * // タブID付きの使用方法
 * <ChangePanelMenu
 *   tabId="main-tab"
 *   anchorEl={anchorElement}
 *   onClose={handleClose}
 * />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされたパネル変更メニュー
 */
export default function ChangePanelMenu({
  tabId,
  anchorEl,
  onClose,
}: ChangePanelMenuProps): React.JSX.Element {
  const { classes } = useStyles();
  const panelContext = useContext(PanelContext);
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const { swapPanel } = useCurrentLayoutActions();
  const open = Boolean(anchorEl);

  /**
   * パネル交換処理
   * 選択されたパネルタイプで現在のパネルを置き換える
   *
   * @param id - パネルID（省略可能）
   * @returns パネル選択時のコールバック関数
   */
  const handleSwap = useCallback(
    (id?: string) =>
      ({ type, config }: PanelSelection) => {
        // Reselecting current panel type is a no-op.
        if (type === panelContext?.type) {
          onClose();
          return;
        }

        swapPanel({
          tabId,
          originalId: id ?? "",
          type,
          root: mosaicActions.getRoot() as MosaicNode<string>,
          path: mosaicWindowActions.getPath(),
          config: config ?? {},
        });
      },
    [onClose, mosaicActions, mosaicWindowActions, panelContext?.type, swapPanel, tabId],
  );

  // https://github.com/mui/material-ui/issues/35287#issuecomment-1332327752
  const fixMui35287 = {} as { onResize: undefined; onResizeCapture: undefined };

  return (
    <Popper
      {...fixMui35287}
      id="change-panel-menu"
      open={open}
      role={undefined}
      anchorEl={anchorEl}
      transition
      placement="right-start"
      style={{ zIndex: 10000 }}
      popperOptions={{
        modifiers: [
          {
            name: "flip",
            options: { fallbackPlacements: ["right-start", "left-start"] },
          },
        ],
      }}
    >
      {({ TransitionProps, placement }) => (
        <Grow
          {...TransitionProps}
          style={{
            transformOrigin: placement === "right-start" ? "top left" : "top right",
          }}
        >
          <Paper elevation={8} className={classes.paper}>
            <ClickAwayListener onClickAway={onClose}>
              <PanelCatalog
                mode="list"
                isMenu
                selectedPanelType={panelContext?.type}
                onPanelSelect={handleSwap(panelContext?.id)}
              />
            </ClickAwayListener>
          </Paper>
        </Grow>
      )}
    </Popper>
  );
}
