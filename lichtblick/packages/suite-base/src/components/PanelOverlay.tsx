// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview PanelOverlay - パネル操作用オーバーレイコンポーネント
 *
 * このファイルは、パネル上に表示されるインタラクティブなオーバーレイを
 * 実装している。ドラッグ&ドロップ操作、パネルアクション、視覚的フィードバック
 * を提供する重要なUIコンポーネント。
 *
 * ## 主要機能
 *
 * ### 1. ドラッグ&ドロップ対応
 * - 有効/無効なドロップターゲットの視覚化
 * - ドロップ時のメッセージ表示
 * - 半透明オーバーレイによる状態表示
 * - 色分けによる直感的なフィードバック
 *
 * ### 2. パネルアクション
 * - カスタマイズ可能なアクションボタン群
 * - アイコンとテキストによる操作説明
 * - レスポンシブなボタン配置
 * - コンテナクエリによる適応的レイアウト
 *
 * ### 3. 選択状態表示
 * - 選択されたパネルの視覚的強調
 * - グラデーション背景による状態表示
 * - ホバー時の表示制御
 *
 * ### 4. レスポンシブデザイン
 * - コンテナクエリによる動的レイアウト調整
 * - 画面サイズに応じたボタン配置変更
 * - テキスト表示の適応的制御
 *
 * ## オーバーレイバリエーション
 *
 * ### validDropTarget（有効ドロップターゲット）
 * - プライマリカラーの半透明背景
 * - ドロップメッセージの表示
 * - 下端揃えのレイアウト
 * - ユーザーにドロップ可能であることを示す
 *
 * ### invalidDropTarget（無効ドロップターゲット）
 * - グレー系の半透明背景
 * - ドロップ不可を示す視覚的フィードバック
 * - アクションボタンは表示されない
 *
 * ### selected（選択状態）
 * - グラデーション背景による強調表示
 * - アクションボタンの表示
 * - パネル操作メニューの提供
 *
 * ## ハイライトモード
 *
 * ### active（アクティブモード）
 * - ホバー時のみオーバーレイ表示
 * - 通常時は非表示
 * - 軽量なインタラクション
 *
 * ### all（全表示モード）
 * - 常時オーバーレイ表示
 * - ホバー時のみボタン群表示
 * - より積極的な操作誘導
 *
 * ## コンテナクエリによる適応的レイアウト
 *
 * ```css
 * // 高さ80px以下：横並びレイアウト
 * @container backdrop (max-height: 80px) {
 *   flexDirection: row;
 * }
 *
 * // 高さ120px以上：ツールバー分のマージン
 * @container backdrop (min-height: 120px) {
 *   marginTop: PANEL_TOOLBAR_MIN_HEIGHT;
 * }
 *
 * // 幅240px以上：横並びレイアウト
 * @container backdrop (min-width: 240px) {
 *   flexDirection: row;
 * }
 *
 * // 幅120px以下：テキスト非表示
 * @container backdrop (max-width: 120px) {
 *   .buttonText { display: none; }
 * }
 * ```
 *
 * ## 使用例
 *
 * ```typescript
 * // ドラッグ&ドロップ用オーバーレイ
 * <PanelOverlay
 *   open={isDragOver}
 *   variant="validDropTarget"
 *   dropMessage="Drop here to add panel"
 * />
 *
 * // パネル選択時のアクション表示
 * <PanelOverlay
 *   open={isSelected}
 *   variant="selected"
 *   highlightMode="active"
 *   actions={[
 *     {
 *       key: "fullscreen",
 *       text: "Fullscreen",
 *       icon: <FullscreenIcon />,
 *       onClick: handleFullscreen,
 *       color: "primary"
 *     },
 *     {
 *       key: "settings",
 *       text: "Settings",
 *       icon: <SettingsIcon />,
 *       onClick: handleSettings
 *     }
 *   ]}
 *   onClickAway={handleClickAway}
 * />
 * ```
 *
 * ## 技術的特徴
 *
 * - **Material-UI統合**: BackdropとButtonコンポーネントの活用
 * - **CSS-in-JS**: tss-react/muiによる動的スタイル生成
 * - **色彩計算**: tinycolor2による透明度とホバー色の計算
 * - **コンテナクエリ**: 最新のCSS機能による適応的レイアウト
 * - **アクセシビリティ**: ClickAwayListenerによる適切なフォーカス管理
 *
 * @author Lichtblick Team
 * @since 2023
 */

import {
  Backdrop,
  Button,
  ButtonProps,
  Chip,
  ClickAwayListener,
  Paper,
  buttonClasses,
} from "@mui/material";
import * as _ from "lodash-es";
import { forwardRef, ReactElement } from "react";
import tc from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import { PANEL_ROOT_CLASS_NAME } from "@lichtblick/suite-base/components/PanelRoot";
import { PANEL_TOOLBAR_MIN_HEIGHT } from "@lichtblick/suite-base/components/PanelToolbar/constants";

/**
 * PanelOverlay用のスタイルフック
 *
 * オーバーレイの各状態に応じたスタイルを動的に生成する。
 * Material-UIテーマと連携し、色彩計算とレスポンシブデザインを実現。
 *
 * ## スタイル設計の特徴
 *
 * ### 色彩計算
 * - tinycolor2による透明度とホバー色の精密な計算
 * - テーマカラーに基づく一貫した配色
 * - アクセシビリティを考慮したコントラスト比
 *
 * ### レスポンシブデザイン
 * - コンテナクエリによる動的レイアウト調整
 * - 画面サイズに応じたボタン配置変更
 * - テキスト表示の適応的制御
 *
 * ### パフォーマンス最適化
 * - CSS transitionによる滑らかなアニメーション
 * - GPU加速による効率的な描画
 * - 必要最小限のDOM操作
 *
 * @param theme - Material-UIテーマオブジェクト
 * @param _params - 未使用パラメータ
 * @param classes - 生成されるクラス名のマップ
 * @returns 生成されたスタイルオブジェクト
 */
const useStyles = makeStyles<void, "buttonGroup">()((theme, _params, classes) => {
  /** 完全透明な背景色（ベース） */
  const transparentBackground = tc(theme.palette.background.default).setAlpha(0).toRgbString();

  /** ホバー時の背景色（無効ドロップターゲット用） */
  const hoverBackground = tc(theme.palette.background.default)
    .setAlpha(1 - theme.palette.action.disabledOpacity)
    .toRgbString();

  /** プライマリカラーのホバー色（有効ドロップターゲット用） */
  const hoverPrimary = tc(theme.palette.primary.main)
    .setAlpha(theme.palette.action.hoverOpacity)
    .toRgbString();

  return {
    /**
     * Backdropの基本スタイル
     *
     * オーバーレイの基盤となる背景要素。
     * 絶対位置配置でパネル全体を覆う。
     */
    backdrop: {
      position: "absolute",
      zIndex: theme.zIndex.modal - 1,
      padding: theme.spacing(2),
      container: "backdrop / size", // コンテナクエリ用の名前設定
      backgroundColor: transparentBackground,
    },

    /**
     * 無効ドロップターゲットのスタイル
     *
     * ドロップできない領域を示すグレー系背景。
     * ユーザーにドロップ不可を視覚的に伝える。
     */
    invalidTarget: {
      backgroundColor: hoverBackground,
    },

    /**
     * 有効ドロップターゲットのスタイル
     *
     * ドロップ可能な領域を示すプライマリカラー背景。
     * 下端揃えでドロップメッセージを表示。
     */
    validTarget: {
      alignItems: "flex-end",
      backgroundColor: hoverPrimary,
    },

    /**
     * 選択状態のスタイル
     *
     * 選択されたパネルを示すグラデーション背景。
     * アクションボタンの表示領域として機能。
     */
    selected: {
      backgroundImage: `linear-gradient(to bottom, ${hoverPrimary}, ${hoverPrimary})`,
      backgroundColor: hoverBackground,
    },

    /**
     * アクティブハイライトモード
     *
     * ホバー時のみオーバーレイを表示する軽量モード。
     * パネルにホバーしていない時は完全に非表示。
     */
    highlightActive: {
      [`.${PANEL_ROOT_CLASS_NAME}:not(:hover) &`]: {
        visibility: "hidden",
      },
    },

    /**
     * 全表示ハイライトモード
     *
     * 常時オーバーレイを表示し、ホバー時にボタン群を表示。
     * より積極的な操作誘導を行う。
     */
    highlightAll: {
      [`.${PANEL_ROOT_CLASS_NAME}:not(:hover) &`]: {
        [`.${classes.buttonGroup}`]: { visibility: "hidden" },
      },
    },

    /**
     * ボタングループのレスポンシブレイアウト
     *
     * コンテナクエリを活用した適応的なボタン配置。
     * 画面サイズに応じて縦並び/横並びを自動切り替え。
     */
    buttonGroup: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: theme.spacing(1),

      // 高さ80px以下：横並びレイアウト（省スペース）
      "@container backdrop (max-height: 80px)": {
        flexDirection: "row",
      },

      // 高さ120px以上：ツールバー分のマージン追加
      "@container backdrop (min-height: 120px)": {
        marginTop: PANEL_TOOLBAR_MIN_HEIGHT,
      },

      // 幅240px以上：横並びレイアウト（十分なスペース）
      "@container backdrop (min-width: 240px)": {
        flexDirection: "row",
      },
    },

    /**
     * ボタンペーパーのスタイル
     *
     * 各ボタンを包むPaper要素。
     * flexboxによる均等配置を実現。
     */
    buttonPaper: {
      flex: "0 0 50%",
      minWidth: "50%",
    },

    /**
     * ボタンの基本スタイル
     *
     * アイコンとテキストを縦並びで表示する
     * カスタムボタンレイアウト。
     */
    button: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      whiteSpace: "nowrap",
      textAlign: "left",

      /**
       * アイコンのスタイル調整
       *
       * Material-UIのstartIconを大きく表示し、
       * 視認性を向上させる。
       */
      [`.${buttonClasses.startIcon}`]: {
        position: "relative",
        margin: 0,

        svg: {
          height: "1em",
          width: "1em",
          fontSize: 32,
        },
      },
    },

    /**
     * ボタンテキストのレスポンシブ表示
     *
     * 小さなコンテナではテキストを非表示にし、
     * アイコンのみで操作を表現する。
     */
    buttonText: {
      // 幅120px以下：テキスト非表示
      "@container backdrop (max-width: 120px)": {
        display: "none",
      },
      // 高さ80px以下：テキスト非表示
      "@container backdrop (max-height: 80px)": {
        display: "none",
      },
    },

    /**
     * ドロップメッセージチップのスタイル
     *
     * 有効ドロップターゲット時に表示される
     * メッセージチップの装飾。
     */
    chip: {
      boxShadow: theme.shadows[2],
      paddingInline: theme.spacing(2),
    },
  };
});

/**
 * PanelOverlayコンポーネントのプロパティ型定義
 */
export type PanelOverlayProps = {
  /** 表示するアクションボタンの配列 */
  actions?: {
    /** アクションの一意識別子 */
    key: string;
    /** ボタンに表示するテキスト */
    text: string;
    /** ボタンに表示するアイコン要素 */
    icon: ReactElement;
    /** クリック時のコールバック関数 */
    onClick?: () => void;
    /** ボタンの色テーマ（Material-UIのcolor prop） */
    color?: ButtonProps["color"];
  }[];
  /** ドロップ時に表示するメッセージ */
  dropMessage?: string;
  /** ハイライト表示モード */
  highlightMode?: "active" | "all";
  /** オーバーレイの表示状態 */
  open: boolean;
  /** オーバーレイの表示バリエーション */
  variant?: "validDropTarget" | "invalidDropTarget" | "selected";
  /** オーバーレイ外クリック時のコールバック */
  onClickAway?: () => void;
};

/**
 * PanelOverlayコンポーネント
 *
 * パネル上に表示されるインタラクティブなオーバーレイ。
 * ドラッグ&ドロップ操作、パネルアクション、視覚的フィードバックを提供する。
 *
 * ## 主要な責任
 *
 * ### 1. ドラッグ&ドロップフィードバック
 * - 有効/無効なドロップターゲットの視覚化
 * - ドロップメッセージの表示
 * - 色分けによる直感的な状態表示
 *
 * ### 2. パネルアクション提供
 * - カスタマイズ可能なアクションボタン群
 * - レスポンシブなボタン配置
 * - アイコンとテキストによる操作説明
 *
 * ### 3. 選択状態の視覚化
 * - 選択されたパネルの強調表示
 * - グラデーション背景による状態表示
 * - ホバー時の適切な表示制御
 *
 * ### 4. ユーザビリティ向上
 * - ClickAwayListenerによる適切なフォーカス管理
 * - コンテナクエリによる適応的レイアウト
 * - アクセシビリティを考慮したインタラクション
 *
 * ## 使用例
 *
 * ```typescript
 * // ドラッグ&ドロップ用オーバーレイ
 * <PanelOverlay
 *   open={isDragOver}
 *   variant="validDropTarget"
 *   dropMessage="パネルをここにドロップ"
 * />
 *
 * // パネル選択時のアクション表示
 * <PanelOverlay
 *   open={isSelected}
 *   variant="selected"
 *   highlightMode="active"
 *   actions={panelActions}
 *   onClickAway={handleDeselect}
 * />
 *
 * // 無効ドロップターゲット
 * <PanelOverlay
 *   open={isDragOver}
 *   variant="invalidDropTarget"
 * />
 * ```
 *
 * ## 技術的詳細
 *
 * - **forwardRef**: 親コンポーネントからのref転送対応
 * - **Backdrop**: Material-UIのBackdropによるオーバーレイ実装
 * - **ClickAwayListener**: 外部クリック検知による適切な状態管理
 * - **コンテナクエリ**: 最新のCSS機能による適応的レイアウト
 * - **色彩計算**: tinycolor2による精密な色調整
 *
 * @param props - コンポーネントプロパティ
 * @param ref - 転送されるDOM要素への参照
 * @returns レンダリングされたオーバーレイ要素、または非表示時はnull
 *
 * @author Lichtblick Team
 * @since 2023
 */
export const PanelOverlay = forwardRef<HTMLDivElement, PanelOverlayProps>(
  function PanelOverlay(props, ref): React.JSX.Element | ReactNull {
    const { actions, variant, highlightMode, dropMessage, open, onClickAway } = props;
    const { classes, cx } = useStyles();

    return (
      <ClickAwayListener onClickAway={onClickAway ?? _.noop}>
        <Backdrop
          transitionDuration={0} // 即座に表示/非表示
          unmountOnExit // 非表示時はDOMから削除
          ref={ref}
          open={open}
          className={cx(classes.backdrop, {
            [classes.invalidTarget]: variant === "invalidDropTarget",
            [classes.validTarget]: variant === "validDropTarget",
            [classes.selected]: variant === "selected",
            [classes.highlightActive]: highlightMode === "active",
            [classes.highlightAll]: highlightMode === "all",
          })}
        >
          {/* ドロップメッセージ表示（有効ドロップターゲット時） */}
          {dropMessage && variant === "validDropTarget" ? (
            <Chip size="small" color="primary" label={dropMessage} className={classes.chip} />
          ) : (
            /* アクションボタン群表示 */
            actions && (
              <div className={classes.buttonGroup}>
                {actions.map((action) => (
                  <Paper
                    square={false}
                    key={action.key}
                    elevation={0}
                    className={classes.buttonPaper}
                  >
                    <Button
                      fullWidth
                      variant="outlined"
                      className={classes.button}
                      onClick={action.onClick}
                      startIcon={action.icon}
                      color={action.color}
                    >
                      <div className={classes.buttonText}>{action.text}</div>
                    </Button>
                  </Paper>
                ))}
              </div>
            )
          )}
        </Backdrop>
      </ClickAwayListener>
    );
  },
);
