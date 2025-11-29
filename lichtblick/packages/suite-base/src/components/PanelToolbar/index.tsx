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

import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { Typography } from "@mui/material";
import { useContext, useMemo, CSSProperties } from "react";
import { makeStyles } from "tss-react/mui";

import PanelContext from "@lichtblick/suite-base/components/PanelContext";
import ToolbarIconButton from "@lichtblick/suite-base/components/PanelToolbar/ToolbarIconButton";
import { PANEL_TOOLBAR_MIN_HEIGHT } from "@lichtblick/suite-base/components/PanelToolbar/constants";
import { useDefaultPanelTitle } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import { PANEL_TITLE_CONFIG_KEY } from "@lichtblick/suite-base/util/layout";

import { PanelToolbarControls } from "./PanelToolbarControls";

/**
 * PanelToolbarコンポーネントのプロパティ
 */
type Props = {
  /** 追加のアイコンボタン要素 */
  additionalIcons?: React.ReactNode;
  /** ツールバーの背景色 */
  backgroundColor?: CSSProperties["backgroundColor"];
  /** ツールバーの子要素（通常はカスタムコンテンツ） */
  children?: React.ReactNode;
  /** 追加のCSSクラス名 */
  className?: string;
  /** 未知のパネルタイプかどうか */
  isUnknownPanel?: boolean;
};

const useStyles = makeStyles()((theme) => ({
  root: {
    transition: "transform 80ms ease-in-out, opacity 80ms ease-in-out",
    cursor: "auto",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing(0.25, 0.75),
    display: "flex",
    minHeight: PANEL_TOOLBAR_MIN_HEIGHT,
    backgroundColor: theme.palette.background.paper,
    width: "100%",
    left: 0,
    zIndex: theme.zIndex.appBar,
  },
}));

/**
 * **PanelToolbar** - パネルツールバーコンポーネント
 *
 * react-mosaic-componentのレイアウトシステムに統合される全パネルに必要なツールバーコンポーネント。
 * パネルのドラッグハンドル、設定ボタン、削除/置換コントロール、フルスクリーン機能を提供します。
 *
 * @features
 * - **ドラッグ&ドロップ対応**: react-mosaic-componentと統合したパネル移動
 * - **フルスクリーン機能**: パネルの全画面表示/終了
 * - **カスタムコンテンツ**: 子要素によるカスタムツールバー内容
 * - **パネルタイトル表示**: デフォルトまたはカスタムタイトルの表示
 * - **アクセシビリティ**: 適切なaria属性とテストID
 *
 * @architecture
 * - **PanelContext**: パネル固有の状態とアクションにアクセス
 * - **Material-UI**: 統一されたテーマとスタイリング
 * - **React Mosaic**: レイアウトシステムとの統合
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <PanelToolbar>
 *   <Typography>カスタムタイトル</Typography>
 * </PanelToolbar>
 *
 * // 追加アイコンを含む使用方法
 * <PanelToolbar
 *   additionalIcons={<MyCustomIcon />}
 *   backgroundColor="blue"
 * />
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @returns JSX.Element - レンダリングされたツールバー
 */
export default React.memo<Props>(function PanelToolbar({
  additionalIcons,
  backgroundColor,
  children,
  className,
  isUnknownPanel = false,
}: Props) {
  const { classes, cx } = useStyles();
  const {
    isFullscreen,
    exitFullscreen,
    enterFullscreen,
    config: { [PANEL_TITLE_CONFIG_KEY]: customTitle = undefined } = {},
  } = useContext(PanelContext) ?? {};

  const panelContext = useContext(PanelContext);

  // Help-shown state must be hoisted outside the controls container so the modal can remain visible
  // when the panel is no longer hovered.
  const additionalIconsWithHelp = useMemo(() => {
    return (
      <>
        {additionalIcons}
        {isFullscreen === true ? (
          <ToolbarIconButton
            value="exit-fullscreen"
            title="Exit fullscreen"
            onClick={exitFullscreen}
          >
            <FullscreenExitIcon />
          </ToolbarIconButton>
        ) : (
          <ToolbarIconButton value="fullscreen" title="fullscreen" onClick={enterFullscreen}>
            <FullscreenIcon />
          </ToolbarIconButton>
        )}
      </>
    );
  }, [additionalIcons, isFullscreen, exitFullscreen, enterFullscreen]);

  // If we have children then we limit the drag area to the controls. Otherwise the entire
  // toolbar is draggable.
  const rootDragRef =
    isUnknownPanel || children != undefined ? undefined : panelContext?.connectToolbarDragHandle;

  const controlsDragRef =
    isUnknownPanel || children == undefined ? undefined : panelContext?.connectToolbarDragHandle;

  const [defaultPanelTitle] = useDefaultPanelTitle();
  const customPanelTitle =
    customTitle != undefined && typeof customTitle === "string" && customTitle.length > 0
      ? customTitle
      : defaultPanelTitle;

  const title = customPanelTitle ?? panelContext?.title;
  return (
    <header
      className={cx(classes.root, className)}
      data-testid="mosaic-drag-handle"
      ref={rootDragRef}
      style={{ backgroundColor, cursor: rootDragRef != undefined ? "grab" : "auto" }}
    >
      {children ??
        (title && (
          <Typography noWrap variant="body2" color="text.secondary" flex="auto">
            {title}
          </Typography>
        ))}
      <PanelToolbarControls
        additionalIcons={additionalIconsWithHelp}
        isUnknownPanel={!!isUnknownPanel}
        ref={controlsDragRef}
      />
    </header>
  );
});
