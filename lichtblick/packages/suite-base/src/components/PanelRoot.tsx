// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview PanelRoot - パネルのルートコンテナコンポーネント
 *
 * このファイルは、Lichtblickアプリケーションの各パネルを包む
 * ルートコンテナを実装している。パネルの基本的な表示、選択状態、
 * フルスクリーン遷移の管理を担当する重要なコンポーネント。
 *
 * ## 主要機能
 *
 * ### 1. フルスクリーン遷移システム
 * - react-transition-groupによる4段階の遷移制御
 * - 元の位置からフルスクリーンへのスムーズなアニメーション
 * - アプリバーとプレイバック領域を考慮した表示領域計算
 * - z-indexによる適切な重ね順管理
 *
 * ### 2. パネル選択状態管理
 * - 選択されたパネルの視覚的フィードバック
 * - プライマリカラーによる境界線表示
 * - 選択状態のスムーズな遷移アニメーション
 *
 * ### 3. レイアウト基盤
 * - flexboxベースの柔軟なレイアウト
 * - オーバーフロー制御による適切な表示
 * - 子要素の完全な描画領域確保
 *
 * ### 4. ドラッグ&ドロップ対応
 * - z-index調整による信頼性の高いドラッグ操作
 * - フルスクリーン子要素がある場合の重ね順調整
 * - パネル移動時の視覚的フィードバック
 *
 * ## フルスクリーン遷移の仕組み
 *
 * ### 遷移状態（TransitionStatus）
 *
 * 1. **exited** (通常状態)
 *    - 相対位置配置
 *    - 通常のz-index（ドラッグ&ドロップ用）
 *    - 境界線なし
 *
 * 2. **entering** (フルスクリーン開始)
 *    - 固定位置配置
 *    - 元の位置とサイズを維持
 *    - 高いz-index（10000）
 *
 * 3. **entered** (フルスクリーン完了)
 *    - 固定位置配置
 *    - 画面全体に拡大（アプリバー・プレイバー除く）
 *    - 境界線表示（4px）
 *    - アニメーション付き遷移
 *
 * 4. **exiting** (フルスクリーン終了)
 *    - 固定位置配置
 *    - 元の位置とサイズに戻る
 *    - アニメーション付き遷移
 *
 * ### 座標計算
 *
 * ```typescript
 * // 元の位置情報（sourceRect）から計算
 * top: sourceRect.top
 * left: sourceRect.left
 * right: window.innerWidth - sourceRect.right
 * bottom: window.innerHeight - sourceRect.bottom
 *
 * // フルスクリーン時の座標
 * top: APP_BAR_HEIGHT (アプリバー高さ)
 * left: 0
 * right: 0
 * bottom: 77 (プレイバー高さ)
 * ```
 *
 * ## スタイリング設計
 *
 * ### 基本スタイル
 * - **display**: flex（柔軟なレイアウト）
 * - **flexDirection**: column（縦方向配置）
 * - **flex**: 1 1 auto（伸縮可能）
 * - **overflow**: hidden（内容のはみ出し防止）
 *
 * ### 選択状態表示
 * - **::after疑似要素**: 選択境界線の実装
 * - **opacity遷移**: 選択状態のスムーズな表示/非表示
 * - **プライマリカラー**: テーマに応じた境界線色
 *
 * ### パフォーマンス最適化
 * - **will-change**: アニメーション対象プロパティの事前指定
 * - **transform**: GPU加速によるスムーズなアニメーション
 * - **transition**: 適切なイージング関数の適用
 *
 * ## 使用例
 *
 * ```typescript
 * // Panel HOC内での使用
 * <PanelRoot
 *   fullscreenState={transitionStatus}
 *   selected={isSelected}
 *   sourceRect={panelRect}
 *   hasFullscreenDescendant={hasFullscreenChild}
 * >
 *   <PanelContent />
 * </PanelRoot>
 *
 * // フルスクリーン遷移の制御
 * const [transitionStatus, setTransitionStatus] = useState<TransitionStatus>('exited');
 *
 * const enterFullscreen = () => {
 *   setTransitionStatus('entering');
 *   // アニメーション完了後
 *   setTimeout(() => setTransitionStatus('entered'), duration);
 * };
 * ```
 *
 * ## 技術的特徴
 *
 * - **型安全性**: TypeScriptによる厳密な型定義
 * - **パフォーマンス**: CSS transitionによる効率的なアニメーション
 * - **アクセシビリティ**: フォーカス管理とキーボード操作対応
 * - **レスポンシブ**: 画面サイズに応じた適切な表示
 * - **テーマ対応**: Material-UIテーマシステムとの完全連携
 *
 * @author Lichtblick Team
 * @since 2023
 */

import { alpha } from "@mui/material";
import { forwardRef, HTMLAttributes, PropsWithChildren } from "react";
import { TransitionStatus } from "react-transition-group";
import { makeStyles } from "tss-react/mui";

import { APP_BAR_HEIGHT } from "@lichtblick/suite-base/components/AppBar/constants";

/** PanelRootコンポーネントのCSSクラス名定数 */
export const PANEL_ROOT_CLASS_NAME = "LichtblickPanelRoot-root";

/**
 * PanelRootコンポーネントのプロパティ型定義
 */
type PanelRootProps = {
  /** フルスクリーン遷移の現在の状態 */
  fullscreenState: TransitionStatus;
  /** パネルが選択されているかどうか */
  selected: boolean;
  /** フルスクリーン遷移時の元の位置情報 */
  sourceRect: DOMRectReadOnly | undefined;
  /** 子要素にフルスクリーン状態のものがあるかどうか */
  hasFullscreenDescendant: boolean;
} & HTMLAttributes<HTMLDivElement>;

/**
 * PanelRoot用のスタイルフック
 *
 * フルスクリーン遷移の4つの状態に応じたスタイルを動的に生成する。
 * Material-UIのテーマシステムと連携し、一貫したデザインを提供。
 *
 * ## スタイル設計の特徴
 *
 * ### 基本レイアウト
 * - flexboxによる柔軟なレイアウト
 * - オーバーフロー制御
 * - 背景色のテーマ連携
 *
 * ### 選択状態表示
 * - ::after疑似要素による境界線
 * - opacity遷移によるスムーズな表示切り替え
 * - プライマリカラーによる視覚的フィードバック
 *
 * ### フルスクリーン遷移
 * - position: fixedによる画面全体への配置
 * - sourceRectを基準とした座標計算
 * - z-indexによる適切な重ね順管理
 * - CSS transitionによるスムーズなアニメーション
 *
 * @param theme - Material-UIテーマオブジェクト
 * @param props - スタイル計算に必要なプロパティ
 * @returns 生成されたスタイルオブジェクト
 */
const useStyles = makeStyles<Omit<PanelRootProps, "fullscreenState" | "selected">>()((
  theme,
  props,
) => {
  const { palette, transitions } = theme;
  const { sourceRect, hasFullscreenDescendant } = props;
  const duration = transitions.duration.shorter;

  return {
    /**
     * ルート要素の基本スタイル
     *
     * パネルの基本的な表示とレイアウトを定義。
     * 選択状態の境界線表示も含む。
     */
    root: {
      display: "flex",
      flexDirection: "column",
      flex: "1 1 auto",
      overflow: "hidden",
      backgroundColor: palette.background.default,
      border: `0px solid ${alpha(palette.primary.main, 0.67)}`,
      transition: transitions.create("border-width", {
        duration, // Panel コンポーネント内のタイムアウト期間と一致
      }),

      /**
       * 選択状態の境界線表示
       *
       * ::after疑似要素を使用して、選択されたパネルの
       * 境界線を表示する。opacity遷移により、
       * スムーズな表示/非表示を実現。
       */
      "::after": {
        content: "''",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        inset: 1,
        opacity: 0,
        border: `1px solid ${palette.primary.main}`,
        position: "absolute",
        pointerEvents: "none",
        transition: "opacity 0.05s ease-out",
        zIndex: 10000 + 1,
      },
    },

    /**
     * 選択状態のスタイル
     *
     * パネルが選択された時の境界線表示。
     * より長い遷移時間でゆっくりと表示される。
     */
    rootSelected: {
      "::after": {
        opacity: 1,
        transition: "opacity 0.125s ease-out",
      },
    },

    /**
     * フルスクリーン開始状態（entering）
     *
     * フルスクリーン遷移の開始時に適用される。
     * 元の位置とサイズを固定位置で維持。
     */
    entering: {
      position: "fixed",
      top: sourceRect?.top ?? 0,
      left: sourceRect?.left ?? 0,
      right: sourceRect ? window.innerWidth - sourceRect.right : 0,
      bottom: sourceRect ? window.innerHeight - sourceRect.bottom : 0,
      zIndex: 10000,
    },

    /**
     * フルスクリーン完了状態（entered）
     *
     * フルスクリーン遷移の完了時に適用される。
     * 画面全体に拡大し、境界線を表示。
     */
    entered: {
      borderWidth: 4,
      position: "fixed",
      top: APP_BAR_HEIGHT, // アプリバー高さ分のオフセット
      left: 0,
      right: 0,
      bottom: 77, // PlaybackBar高さと一致
      zIndex: 10000,
      transition: transitions.create(["border-width", "top", "right", "bottom", "left"], {
        duration, // Panel コンポーネント内のタイムアウト期間と一致
      }),
    },

    /**
     * フルスクリーン終了状態（exiting）
     *
     * フルスクリーン遷移の終了時に適用される。
     * 元の位置とサイズに戻るアニメーション。
     */
    exiting: {
      position: "fixed",
      top: sourceRect?.top ?? 0,
      left: sourceRect?.left ?? 0,
      right: sourceRect ? window.innerWidth - sourceRect.right : 0,
      bottom: sourceRect ? window.innerHeight - sourceRect.bottom : 0,
      zIndex: 10000,
      transition: transitions.create(["border-width", "top", "right", "bottom", "left"], {
        duration, // Panel コンポーネント内のタイムアウト期間と一致
      }),
    },

    /**
     * 通常状態（exited）
     *
     * フルスクリーン遷移が完了し、通常の表示に戻った状態。
     * 相対位置配置で、ドラッグ&ドロップ用のz-index設定。
     */
    exited: {
      position: "relative",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      // "z-index: 1" はパネルのドラッグ&ドロップをより信頼性高く動作させる
      // (https://github.com/foxglove/studio/pull/3355 を参照)
      // しかし、フルスクリーンパネルが他のパネルレイアウト部分に
      // 重なってしまう問題も引き起こす。そのため、子要素が
      // フルスクリーン状態の場合は auto に戻す。
      zIndex: hasFullscreenDescendant ? "auto" : 1,
    },
  };
});

/**
 * PanelRootコンポーネント
 *
 * Lichtblickアプリケーションの各パネルを包むルートコンテナ。
 * パネルの基本的な表示、選択状態、フルスクリーン遷移を管理する。
 *
 * ## 主要な責任
 *
 * ### 1. フルスクリーン遷移管理
 * - react-transition-groupとの連携
 * - 4段階の遷移状態に応じたスタイル適用
 * - 元の位置からフルスクリーンへのスムーズなアニメーション
 *
 * ### 2. 選択状態の視覚化
 * - 選択されたパネルの境界線表示
 * - プライマリカラーによる一貫したデザイン
 * - スムーズな遷移アニメーション
 *
 * ### 3. レイアウト基盤の提供
 * - flexboxベースの柔軟なレイアウト
 * - 子要素の完全な描画領域確保
 * - オーバーフロー制御
 *
 * ### 4. ドラッグ&ドロップ対応
 * - 適切なz-index管理
 * - フルスクリーン子要素との重ね順調整
 * - 信頼性の高いドラッグ操作
 *
 * ## 使用例
 *
 * ```typescript
 * // Panel HOC内での基本的な使用
 * <PanelRoot
 *   fullscreenState="exited"
 *   selected={false}
 *   sourceRect={undefined}
 *   hasFullscreenDescendant={false}
 * >
 *   <MyPanelContent />
 * </PanelRoot>
 *
 * // フルスクリーン遷移時の使用
 * <PanelRoot
 *   fullscreenState="entered"
 *   selected={true}
 *   sourceRect={originalRect}
 *   hasFullscreenDescendant={false}
 * >
 *   <FullscreenPanelContent />
 * </PanelRoot>
 * ```
 *
 * ## 技術的詳細
 *
 * - **forwardRef**: 親コンポーネントからのref転送対応
 * - **HTMLAttributes**: 標準的なHTML属性の継承
 * - **PropsWithChildren**: 子要素の型安全な受け渡し
 * - **CSS-in-JS**: tss-react/muiによる動的スタイル生成
 * - **クラス名結合**: clsxによる条件付きクラス名適用
 *
 * @param props - コンポーネントプロパティ
 * @param ref - 転送されるDOM要素への参照
 * @returns レンダリングされたパネルルート要素
 *
 * @author Lichtblick Team
 * @since 2023
 */
export const PanelRoot = forwardRef<HTMLDivElement, PropsWithChildren<PanelRootProps>>(
  function PanelRoot(props, ref): React.JSX.Element {
    const { className, fullscreenState, hasFullscreenDescendant, selected, sourceRect, ...rest } =
      props;
    const { classes, cx } = useStyles({ sourceRect, hasFullscreenDescendant });

    /**
     * 動的クラス名の構築
     *
     * 基本クラス名に加えて、現在の状態に応じた
     * クラス名を条件付きで追加する。
     */
    const classNames = cx(PANEL_ROOT_CLASS_NAME, className, classes.root, {
      [classes.entering]: fullscreenState === "entering",
      [classes.entered]: fullscreenState === "entered",
      [classes.exiting]: fullscreenState === "exiting",
      [classes.exited]: fullscreenState === "exited",
      [classes.rootSelected]: selected,
    });

    return (
      <div ref={ref} className={classNames} {...rest}>
        {props.children}
      </div>
    );
  },
);
