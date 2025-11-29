// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { GlobalStyles, useTheme } from "@mui/material";

/**
 * GlobalCss - DOM要素レベルのグローバルスタイル適用コンポーネント
 *
 * このコンポーネントは、Material-UIの`GlobalStyles`を使用して
 * アプリケーションの最上位レベルのDOM要素（html、body、#root）に
 * 直接的なスタイルを適用する。
 *
 * ## 役割と責任
 *
 * ### 1. DOM基盤要素のスタイル設定
 * - `html`、`body`要素のリセット・正規化
 * - アプリケーションルート要素（#root）の基本レイアウト
 * - ブラウザデフォルトスタイルの統一
 *
 * ### 2. Material-UIテーマとの統合
 * - `useTheme`による動的テーマ値の取得
 * - ダーク/ライトモードに対応した色彩設定
 * - テーマのタイポグラフィ設定の適用
 *
 * ### 3. アプリケーション全体のレイアウト基盤
 * - flexboxによる全画面レイアウト
 * - オーバーフロー制御
 * - z-index管理
 *
 * ## CssBaselineとの違い
 *
 * - **GlobalCss**: DOM要素への直接的なスタイル適用（Material-UI GlobalStyles使用）
 * - **CssBaseline**: ラッパーコンポーネントによるスタイル適用（tss-react使用）
 *
 * GlobalCssは最上位レベルのDOM構造を設定し、CssBaselineは
 * その上でアプリケーション固有のスタイルを提供する。
 *
 * ## 使用方法
 *
 * ```tsx
 * function App() {
 *   return (
 *     <ThemeProvider theme={theme}>
 *       <GlobalCss />
 *       <CssBaseline>
 *         <AppContent />
 *       </CssBaseline>
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * ## 適用されるスタイル
 *
 * ### html, body要素
 * - ボックスモデルの統一（box-sizing: border-box）
 * - マージン・パディングのリセット
 * - 全画面サイズの設定
 * - normalize.css準拠の行間設定
 *
 * ### 全要素（*, *:before, *:after）
 * - ボックスモデルの継承設定
 *
 * ### body要素
 * - テーマカラーの適用（背景色・文字色）
 * - フォント設定の適用
 * - スクロールバウンス防止
 * - オーバーフロー制御
 *
 * ### #root要素
 * - flexboxレイアウトの設定
 * - 全画面サイズの確保
 * - z-index管理
 * - フォーカス制御
 *
 * @returns Material-UI GlobalStylesコンポーネント
 *
 * @example
 * ```tsx
 * // アプリケーションのエントリーポイントで使用
 * function App() {
 *   return (
 *     <ThemeProvider theme={createTheme()}>
 *       <GlobalCss />
 *       <MyApplication />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * @see {@link CssBaseline} - アプリケーション固有のスタイル管理
 * @see {@link https://mui.com/material-ui/api/global-styles/} - Material-UI GlobalStyles
 *
 * @author Lichtblick Team
 * @since 2023
 */
export default function GlobalCss(): React.JSX.Element {
  // Material-UIテーマの取得
  const theme = useTheme();

  return (
    <GlobalStyles
      styles={{
        // === HTML・BODY要素の基本設定 ===
        "html, body": {
          // ボックスモデルの統一
          boxSizing: "border-box",
          // デフォルトマージン・パディングのリセット
          margin: 0,
          padding: 0,
          // 全画面サイズの設定
          height: "100%",
          width: "100%",

          // normalize.css準拠の行間設定
          // https://github.com/necolas/normalize.css/blob/master/normalize.css#L12
          lineHeight: 1.15,
        },

        // === 全要素のボックスモデル継承 ===
        "*, *:before, *:after": {
          boxSizing: "inherit",
        },

        // === BODY要素の詳細設定 ===
        body: {
          // テーマカラーの適用
          background: theme.palette.background.default,
          color: theme.palette.text.primary,

          // フォント設定の継承と適用
          font: "inherit",
          fontFamily: theme.typography.body2.fontFamily,
          fontFeatureSettings: theme.typography.body2.fontFeatureSettings,
          fontSize: theme.typography.body2.fontSize,
          fontWeight: theme.typography.body2.fontWeight,

          // スクロール「バウンス」防止
          // アプリワークスペースはスクロール不可のため、個別のスクロール可能要素が
          // スクロールイベントでpreventDefaultしなくても、ページ全体が動かないようにする
          overscrollBehavior: "none",
          // 全体のオーバーフロー制御
          overflow: "hidden",
        },

        // === ルート要素（#root）の設定 ===
        "#root": {
          // 全画面サイズの確保
          height: "100%",
          width: "100%",
          // flexboxレイアウトの設定
          display: "flex",
          flexDirection: "column",
          // 位置とサイズの制御
          position: "relative",
          flex: "1 1 100%",
          // フォーカス制御
          outline: "none",
          // オーバーフロー制御
          overflow: "hidden",
          // z-index管理
          zIndex: 0,
        },
      }}
    />
  );
}
