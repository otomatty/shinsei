// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { badgeClasses } from "@mui/material";
import tc from "tinycolor2";
import { makeStyles } from "tss-react/mui";

/**
 * TopicList関連コンポーネントで使用されるCSSクラス名の型定義
 */
type TreeClasses = "dragHandle" | "row" | "isDragging" | "selected";

/**
 * useTopicListStyles - TopicList関連コンポーネント用スタイリングフック
 *
 * @description
 * このフックは、TopicList、TopicRow、MessagePathRowで使用される
 * 統一されたスタイリングシステムを提供します。Material-UIテーマと
 * 連動したレスポンシブデザインとインタラクション状態を管理します。
 *
 * **主要スタイル機能:**
 * - 🎨 テーマ連動の配色システム
 * - 🖱️ ホバー・選択・ドラッグ状態の視覚的フィードバック
 * - 📱 コンテナクエリによるレスポンシブデザイン
 * - 🌗 ダークモード対応
 * - 🎯 アクセシビリティ配慮
 *
 * **提供するスタイルクラス:**
 *
 * **1. row - 基本行スタイル:**
 * - フレックスレイアウト
 * - ホバー時のドラッグハンドル表示
 * - 選択状態の背景色変更
 * - ボーダー・シャドウによる境界線
 *
 * **2. selected - 選択状態:**
 * - プライマリカラーでの背景色変更
 * - ダークモードでの境界線強調
 * - 不透明度を考慮した色合成
 *
 * **3. isDragging - ドラッグ状態:**
 * - ドラッグ中の視覚的フィードバック
 * - 選択状態と同様のスタイル適用
 *
 * **4. dragHandle - ドラッグハンドル:**
 * - 通常時は非表示、ホバー時に表示
 * - 選択時はプライマリカラーで強調
 * - 狭い幅では完全に非表示（280px以下）
 *
 * **5. fieldRow - メッセージパス行:**
 * - トピック行と区別するための背景色
 * - より薄い境界線
 *
 * **6. その他のユーティリティクラス:**
 * - countBadge: 複数選択時のバッジ
 * - textContent: テキストの最大幅制御
 * - aliasedTopicName: エイリアストピック名のスタイル
 *
 * **レスポンシブ機能:**
 * - コンテナクエリ（@container）による幅ベースの表示制御
 * - 280px以下でドラッグハンドル非表示
 *
 * **色彩システム:**
 * - tinycolor2による色合成
 * - テーマの不透明度設定を考慮
 * - ダークモードでの適切なコントラスト
 *
 * **使用例:**
 * ```typescript
 * const { classes, cx } = useTopicListStyles();
 *
 * <div className={cx(classes.row, {
 *   [classes.selected]: isSelected,
 *   [classes.isDragging]: isDragging
 * })}>
 *   <div className={classes.dragHandle}>⋮</div>
 * </div>
 * ```
 *
 * **依存関係:**
 * - tss-react/mui: Material-UI統合スタイリング
 * - tinycolor2: 色操作ライブラリ
 * - Material-UI Badge: バッジコンポーネントのクラス
 *
 * @returns スタイルクラスとユーティリティ関数
 */
export const useTopicListStyles = makeStyles<void, TreeClasses>()((theme, _, classes) => ({
  isDragging: {},
  selected: {},

  // 基本行スタイル
  row: {
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    position: "relative",
    height: "100%",
    backgroundColor: theme.palette.background.paper,
    gap: theme.spacing(0.5),
    paddingInline: theme.spacing(1, 0.75),
    borderTop: `1px solid ${theme.palette.action.selected}`,
    boxShadow: `0 1px 0 0 ${theme.palette.action.selected}`,
    userSelect: "none",

    // ホバー時以外はドラッグハンドルを非表示
    [`:not(:hover) .${classes.dragHandle}`]: {
      visibility: "hidden",
    },

    // 選択状態・ドラッグ状態のスタイル
    [`&.${classes.selected}, &.${classes.isDragging}:active`]: {
      // ドラッグプレビューのために不透明な色を使用
      backgroundColor: tc
        .mix(
          theme.palette.background.paper,
          theme.palette.primary.main,
          100 * theme.palette.action.selectedOpacity,
        )
        .toString(),

      // ダークモードでの境界線強調
      ...(theme.palette.mode === "dark" && {
        ":after": {
          content: "''",
          position: "absolute",
          inset: "-1px 0 -1px 0",
          border: `1px solid ${theme.palette.primary.main}`,
        },
        // 次の行の境界線も調整
        [`& + .${classes.row}`]: {
          borderTop: `1px solid ${theme.palette.primary.main}`,
        },
      }),
    },
  },

  // ドラッグハンドルのスタイル
  dragHandle: {
    opacity: 0.6,
    display: "flex",

    // 選択時の強調表示
    [`.${classes.selected} &`]: {
      color: theme.palette.primary.main,
      opacity: 1,
    },

    // 狭い幅では非表示
    [`@container (max-width: 280px)`]: {
      display: "none",
    },
  },

  // 以下のクラスは他ファイルで使用されるため、tss-unused-classesの警告を無効化
  /* eslint-disable tss-unused-classes/unused-classes */

  // メッセージパス行の背景スタイル
  fieldRow: {
    borderTop: `1px solid ${theme.palette.background.paper}`,
    backgroundColor: theme.palette.action.hover,
  },

  // 複数選択時のバッジスタイル
  countBadge: {
    marginLeft: theme.spacing(-0.5),

    [`.${badgeClasses.badge}`]: {
      position: "relative",
      transform: "none",
    },
  },

  // テキストコンテンツの幅制御
  textContent: {
    maxWidth: "100%",
  },

  // エイリアストピック名のスタイル
  aliasedTopicName: {
    color: theme.palette.primary.main,
    display: "block",
    textAlign: "start",
  },
  /* eslint-enable tss-unused-classes/unused-classes */
}));
