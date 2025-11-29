// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppBar - アプリケーションバーメインコンポーネント
 *
 * アプリケーション上部に配置されるメインツールバーコンポーネント。
 * アプリケーション全体の主要な操作とナビゲーションを提供します。
 *
 * 主な機能：
 * - レイアウト管理（作成/保存/読み込み）
 * - パネル追加機能（AddPanelMenu）
 * - データソース表示と操作
 * - サイドバー開閉制御（左右）
 * - ウィンドウ制御（最小化/最大化/閉じる）
 * - アプリメニューとユーザー設定
 * - メモリ使用量インジケータ
 *
 * レイアウト構造：
 * - Grid Layout: "start middle end" の3カラム構成
 * - Start: ロゴ、アプリメニュー、パネル追加ボタン
 * - Middle: データソース表示
 * - End: メモリ使用量、レイアウトボタン、サイドバー制御、ユーザーメニュー、ウィンドウ制御
 *
 * デスクトップアプリ対応：
 * - WebkitAppRegion による ドラッグ可能領域の制御
 * - カスタムウィンドウ制御ボタン
 * - ダブルクリックによるウィンドウ操作
 *
 * @example
 * ```typescript
 * <AppBar
 *   leftInset={20}
 *   showCustomWindowControls={true}
 *   onDoubleClick={handleWindowMaximize}
 *   onMinimizeWindow={handleMinimize}
 *   onMaximizeWindow={handleMaximize}
 *   onCloseWindow={handleClose}
 * />
 * ```
 */

import {
  ChevronDown12Regular,
  PanelLeft24Filled,
  PanelLeft24Regular,
  PanelRight24Filled,
  PanelRight24Regular,
  SlideAdd24Regular,
} from "@fluentui/react-icons";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import tc from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { LichtblickLogo } from "@lichtblick/suite-base/components/LichtblickLogo";
import { MemoryUseIndicator } from "@lichtblick/suite-base/components/MemoryUseIndicator";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAppContext } from "@lichtblick/suite-base/context/AppContext";
import {
  LayoutState,
  useCurrentLayoutSelector,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import {
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";
import { customTypography } from "@lichtblick/theme";

import { AddPanelMenu } from "./AddPanelMenu";
import { AppBarContainer } from "./AppBarContainer";
import { AppBarIconButton } from "./AppBarIconButton";
import { AppMenu } from "./AppMenu";
import { CustomWindowControls, CustomWindowControlsProps } from "./CustomWindowControls";
import { DataSource } from "./DataSource";
import { NetworkStatusIndicator } from "./NetworkStatusIndicator";
import { SettingsMenu } from "./SettingsMenu";

/**
 * AppBarスタイル定義
 *
 * AppBarの外観とレイアウトを定義。デスクトップアプリ対応と
 * 視覚的な統一性を重視した設計。
 *
 * 主要な特徴：
 * - Grid Layout による3カラム構成
 * - WebkitAppRegion による ドラッグ領域制御
 * - ホバー・選択状態の視覚的フィードバック
 * - デバッグ用のドラッグ領域表示
 * - テーマ対応の色彩設計
 */
const useStyles = makeStyles<{ debugDragRegion?: boolean }, "avatar">()((
  theme,
  { debugDragRegion = false },
  classes,
) => {
  /**
   * ドラッグ不可スタイル
   *
   * デスクトップアプリでボタンをクリック可能にするため、
   * WebkitAppRegion: "no-drag" を設定。
   * デバッグモード時は背景色を赤に変更。
   */
  const NOT_DRAGGABLE_STYLE: Record<string, string> = { WebkitAppRegion: "no-drag" };
  if (debugDragRegion) {
    NOT_DRAGGABLE_STYLE.backgroundColor = "red";
  }

  return {
    /** メインツールバーのグリッドレイアウト */
    toolbar: {
      display: "grid",
      width: "100%",
      gridTemplateAreas: `"start middle end"`,
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
    },
    /** ロゴボタンのスタイル */
    logo: {
      padding: theme.spacing(0.75, 0.5),
      fontSize: "2rem",
      color: theme.palette.appBar.primary,
      borderRadius: 0,

      "svg:not(.MuiSvgIcon-root)": {
        fontSize: "1em",
      },
      "&:hover": {
        backgroundColor: tc(theme.palette.common.white).setAlpha(0.08).toRgbString(),
      },
      "&.Mui-selected": {
        backgroundColor: theme.palette.appBar.primary,
        color: theme.palette.common.white,
      },
      "&.Mui-disabled": {
        color: "currentColor",
        opacity: theme.palette.action.disabledOpacity,
      },
    },
    /** ドロップダウンアイコンのサイズ */
    dropDownIcon: {
      fontSize: "12px !important",
    },
    /** 開始エリア（左側） */
    start: {
      gridArea: "start",
      display: "flex",
      flex: 1,
      alignItems: "center",
    },
    /** 開始エリア内部（ドラッグ不可） */
    startInner: {
      display: "flex",
      alignItems: "center",
      ...NOT_DRAGGABLE_STYLE,
    },
    /** 中央エリア（データソース表示） */
    middle: {
      gridArea: "middle",
      justifySelf: "center",
      overflow: "hidden",
      maxWidth: "100%",
      ...NOT_DRAGGABLE_STYLE,
    },
    /** 終了エリア（右側） */
    end: {
      gridArea: "end",
      flex: 1,
      display: "flex",
      justifyContent: "flex-end",
    },
    /** 終了エリア内部（ドラッグ不可） */
    endInner: {
      display: "flex",
      alignItems: "center",
      ...NOT_DRAGGABLE_STYLE,
    },
    /** キーボードショートカット表示 */
    keyEquivalent: {
      fontFamily: customTypography.fontMonospace,
      background: tc(theme.palette.common.white).darken(45).toString(),
      padding: theme.spacing(0, 0.5),
      aspectRatio: 1,
      borderRadius: theme.shape.borderRadius,
      marginLeft: theme.spacing(1),
    },
    /** ツールチップのマージン */
    tooltip: {
      marginTop: `${theme.spacing(0.5)} !important`,
    },
    /** ユーザーアバターのスタイル */
    avatar: {
      color: theme.palette.common.white,
      backgroundColor: tc(theme.palette.appBar.main).lighten().toString(),
      height: theme.spacing(3.5),
      width: theme.spacing(3.5),
    },
    /** アイコンボタンのスタイル */
    iconButton: {
      padding: theme.spacing(1),
      borderRadius: 0,

      "&:hover": {
        backgroundColor: tc(theme.palette.common.white).setAlpha(0.08).toString(),

        [`.${classes.avatar}`]: {
          backgroundColor: tc(theme.palette.appBar.main).lighten(20).toString(),
        },
      },
      "&.Mui-selected": {
        backgroundColor: theme.palette.appBar.primary,

        [`.${classes.avatar}`]: {
          backgroundColor: tc(theme.palette.appBar.main).setAlpha(0.3).toString(),
        },
      },
    },
  };
});

/**
 * AppBar Props - AppBarコンポーネントのプロパティ
 *
 * CustomWindowControlsPropsを継承し、AppBar固有のプロパティを追加。
 * デスクトップアプリとWebアプリの両方に対応。
 */
export type AppBarProps = CustomWindowControlsProps & {
  /** 左側のインセット（システムウィンドウ制御用の余白） */
  leftInset?: number;
  /** ダブルクリック時のイベントハンドラー（ウィンドウ最大化/復元） */
  onDoubleClick?: () => void;
  /** ドラッグ領域のデバッグ表示フラグ */
  debugDragRegion?: boolean;
};

/**
 * State Selectors - 状態セレクター関数群
 *
 * パフォーマンス最適化のため、必要な状態のみを抽出するセレクター関数。
 * 各セレクターは特定の状態変更にのみ反応します。
 */

/** 現在のレイアウトが存在するかを判定 */
const selectHasCurrentLayout = (state: LayoutState) => state.selectedLayout != undefined;
/** 左サイドバーの開閉状態を取得 */
const selectLeftSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.left.open;
/** 右サイドバーの開閉状態を取得 */
const selectRightSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.right.open;

/**
 * AppBar - アプリケーションバーメインコンポーネント
 *
 * アプリケーション上部のメインツールバーを提供するコンポーネント。
 * 複数のサブコンポーネントを統合し、統一されたユーザーインターフェースを実現。
 *
 * コンポーネント構成：
 * - AppBarContainer: 最外側コンテナ
 * - AppMenu: アプリケーションメニュー
 * - AddPanelMenu: パネル追加メニュー
 * - DataSource: データソース表示
 * - SettingsMenu: 設定メニュー
 * - CustomWindowControls: ウィンドウ制御（デスクトップ用）
 *
 * 状態管理：
 * - メニューの開閉状態（app, user, panel）
 * - サイドバーの開閉状態（left, right）
 * - レイアウトの存在チェック
 * - メモリ使用量インジケータの表示設定
 *
 * アクセシビリティ：
 * - ARIA属性による適切な状態表示
 * - キーボードショートカットの表示
 * - ツールチップによる機能説明
 * - テスト用IDの付与
 *
 * @param props - コンポーネントのプロパティ
 * @returns AppBarのJSX要素
 */
export function AppBar(props: AppBarProps): React.JSX.Element {
  const {
    debugDragRegion,
    isMaximized,
    leftInset,
    onCloseWindow,
    onDoubleClick,
    onMaximizeWindow,
    onMinimizeWindow,
    onUnmaximizeWindow,
    showCustomWindowControls = false,
  } = props;
  const { classes, cx, theme } = useStyles({ debugDragRegion });
  const { t } = useTranslation("appBar");

  /** アプリケーションコンテキストからレイアウトボタンを取得 */
  const { appBarLayoutButton } = useAppContext();

  /** メモリ使用量インジケータの表示設定 */
  const [enableMemoryUseIndicator = false] = useAppConfigurationValue<boolean>(
    AppSetting.ENABLE_MEMORY_USE_INDICATOR,
  );

  /** 現在のレイアウトの存在チェック */
  const hasCurrentLayout = useCurrentLayoutSelector(selectHasCurrentLayout);

  /** サイドバーの開閉状態 */
  const leftSidebarOpen = useWorkspaceStore(selectLeftSidebarOpen);
  const rightSidebarOpen = useWorkspaceStore(selectRightSidebarOpen);

  /** ワークスペースアクション（サイドバー制御） */
  const { sidebarActions } = useWorkspaceActions();

  /** メニューの開閉状態管理 */
  const [appMenuEl, setAppMenuEl] = useState<undefined | HTMLElement>(undefined);
  const [userAnchorEl, setUserAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const [panelAnchorEl, setPanelAnchorEl] = useState<undefined | HTMLElement>(undefined);

  /** メニューの開閉状態フラグ */
  const appMenuOpen = Boolean(appMenuEl);
  const userMenuOpen = Boolean(userAnchorEl);
  const panelMenuOpen = Boolean(panelAnchorEl);

  return (
    <>
      {/* メインAppBarコンテナ */}
      <AppBarContainer onDoubleClick={onDoubleClick} leftInset={leftInset}>
        <div className={classes.toolbar}>
          {/* 開始エリア（左側）: ロゴ、アプリメニュー、パネル追加 */}
          <div className={classes.start}>
            <div className={classes.startInner}>
              {/* ロゴ + アプリメニューボタン */}
              <IconButton
                className={cx(classes.logo, { "Mui-selected": appMenuOpen })}
                color="inherit"
                id="app-menu-button"
                data-testid="AppMenuButton"
                title="Menu"
                aria-controls={appMenuOpen ? "app-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={appMenuOpen ? "true" : undefined}
                data-tourid="app-menu-button"
                onClick={(event) => {
                  setAppMenuEl(event.currentTarget);
                }}
              >
                <LichtblickLogo fontSize="inherit" color="inherit" />
                <ChevronDown12Regular
                  className={classes.dropDownIcon}
                  primaryFill={theme.palette.common.white}
                />
              </IconButton>

              {/* アプリメニュー */}
              <AppMenu
                open={appMenuOpen}
                anchorEl={appMenuEl}
                handleClose={() => {
                  setAppMenuEl(undefined);
                }}
              />

              {/* パネル追加ボタン */}
              <AppBarIconButton
                className={cx({ "Mui-selected": panelMenuOpen })}
                color="inherit"
                disabled={!hasCurrentLayout}
                id="add-panel-button"
                data-testid="AddPanelButton"
                data-tourid="add-panel-button"
                title={t("addPanel")}
                aria-label="Add panel button"
                aria-controls={panelMenuOpen ? "add-panel-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={panelMenuOpen ? "true" : undefined}
                onClick={(event) => {
                  setPanelAnchorEl(event.currentTarget);
                }}
              >
                <SlideAdd24Regular />
              </AppBarIconButton>
            </div>
          </div>

          {/* 中央エリア: データソース表示 */}
          <div className={classes.middle}>
            <DataSource />
          </div>

          {/* 終了エリア（右側）: 各種制御ボタン */}
          <div className={classes.end}>
            <div className={classes.endInner}>
              <NetworkStatusIndicator />
              {enableMemoryUseIndicator && <MemoryUseIndicator />}

              {/* レイアウトボタン（アプリケーションコンテキストから提供） */}
              {appBarLayoutButton}

              {/* サイドバー制御ボタン群 */}
              <Stack direction="row" alignItems="center" data-tourid="sidebar-button-group">
                {/* 左サイドバー制御ボタン */}
                <AppBarIconButton
                  title={
                    <>
                      {leftSidebarOpen ? t("hideLeftSidebar") : t("showLeftSidebar")}{" "}
                      <kbd className={classes.keyEquivalent}>[</kbd>
                    </>
                  }
                  aria-label={leftSidebarOpen ? t("hideLeftSidebar") : t("showLeftSidebar")}
                  onClick={() => {
                    sidebarActions.left.setOpen(!leftSidebarOpen);
                  }}
                  data-tourid="left-sidebar-button"
                  data-testid="left-sidebar-button"
                >
                  {leftSidebarOpen ? <PanelLeft24Filled /> : <PanelLeft24Regular />}
                </AppBarIconButton>

                {/* 右サイドバー制御ボタン */}
                <AppBarIconButton
                  title={
                    <>
                      {rightSidebarOpen ? t("hideRightSidebar") : t("showRightSidebar")}{" "}
                      <kbd className={classes.keyEquivalent}>]</kbd>
                    </>
                  }
                  aria-label={rightSidebarOpen ? t("hideRightSidebar") : t("showRightSidebar")}
                  onClick={() => {
                    sidebarActions.right.setOpen(!rightSidebarOpen);
                  }}
                  data-tourid="right-sidebar-button"
                  data-testid="right-sidebar-button"
                >
                  {rightSidebarOpen ? <PanelRight24Filled /> : <PanelRight24Regular />}
                </AppBarIconButton>
              </Stack>

              {/* ユーザープロファイルボタン */}
              <Tooltip classes={{ tooltip: classes.tooltip }} title="Profile" arrow={false}>
                <IconButton
                  className={cx(classes.iconButton, { "Mui-selected": userMenuOpen })}
                  aria-label="User profile menu button"
                  color="inherit"
                  id="user-button"
                  data-tourid="user-button"
                  aria-controls={userMenuOpen ? "user-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen ? "true" : undefined}
                  onClick={(event) => {
                    setUserAnchorEl(event.currentTarget);
                  }}
                  data-testid="user-button"
                >
                  <Avatar className={classes.avatar} variant="rounded" />
                </IconButton>
              </Tooltip>

              {/* カスタムウィンドウ制御（デスクトップアプリ用） */}
              {showCustomWindowControls && (
                <CustomWindowControls
                  onMinimizeWindow={onMinimizeWindow}
                  isMaximized={isMaximized}
                  onUnmaximizeWindow={onUnmaximizeWindow}
                  onMaximizeWindow={onMaximizeWindow}
                  onCloseWindow={onCloseWindow}
                />
              )}
            </div>
          </div>
        </div>
      </AppBarContainer>

      {/* パネル追加メニュー */}
      <AddPanelMenu
        anchorEl={panelAnchorEl}
        open={panelMenuOpen}
        handleClose={() => {
          setPanelAnchorEl(undefined);
        }}
      />

      {/* 設定メニュー */}
      <SettingsMenu
        anchorEl={userAnchorEl}
        open={userMenuOpen}
        handleClose={() => {
          setUserAnchorEl(undefined);
        }}
      />
    </>
  );
}
