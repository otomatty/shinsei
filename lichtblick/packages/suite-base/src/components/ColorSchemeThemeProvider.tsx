// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMedia } from "react-use";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";

/**
 * ColorSchemeThemeProvider - カラースキーム自動検出テーマプロバイダー
 *
 * このコンポーネントは、ユーザーのカラースキーム設定（ダーク/ライト/システム）を
 * 自動的に検出し、適切なテーマを適用するラッパーコンポーネントです。
 *
 * ## 主な機能
 *
 * ### 1. 三段階のカラースキーム対応
 * - **"dark"**: 強制的にダークモードを適用
 * - **"light"**: 強制的にライトモードを適用
 * - **"system"**: システム設定に従って自動切り替え
 *
 * ### 2. システム設定の自動検出
 * - CSS Media Query `(prefers-color-scheme: dark)` を監視
 * - システム設定変更時の自動更新
 * - ブラウザ・OS設定との連携
 *
 * ### 3. アプリケーション設定との統合
 * - `AppSetting.COLOR_SCHEME` からユーザー設定を取得
 * - 設定変更時の即座な反映
 * - 設定の永続化サポート
 *
 * ## 動作ロジック
 *
 * ```typescript
 * const isDark = colorScheme === "dark" ||
 *                (colorScheme === "system" && systemPrefersDark);
 * ```
 *
 * - `colorScheme === "dark"` → 強制ダークモード
 * - `colorScheme === "light"` → 強制ライトモード
 * - `colorScheme === "system"` → システム設定に従う
 *
 * ## 使用場面
 *
 * ### アプリケーションルートでの使用
 * ```tsx
 * function App() {
 *   return (
 *     <ColorSchemeThemeProvider>
 *       <GlobalCss />
 *       <CssBaseline>
 *         <AppContent />
 *       </CssBaseline>
 *     </ColorSchemeThemeProvider>
 *   );
 * }
 * ```
 *
 * ### 設定画面での切り替え
 * ```tsx
 * function ThemeSettings() {
 *   const [colorScheme, setColorScheme] = useAppConfigurationValue(AppSetting.COLOR_SCHEME);
 *
 *   return (
 *     <Select value={colorScheme} onChange={setColorScheme}>
 *       <option value="light">ライト</option>
 *       <option value="dark">ダーク</option>
 *       <option value="system">システム設定に従う</option>
 *     </Select>
 *   );
 * }
 * ```
 *
 * ## 技術的詳細
 *
 * ### 依存関係
 * - `react-use` の `useMedia` フック: Media Query監視
 * - `AppSetting.COLOR_SCHEME`: アプリケーション設定
 * - `ThemeProvider`: 実際のテーマ適用
 *
 * ### パフォーマンス最適化
 * - Media Query の変更時のみ再レンダリング
 * - 設定変更時の即座な反映
 * - 不要な再計算の回避
 *
 * ### アクセシビリティ対応
 * - システム設定の尊重
 * - ユーザー選択の優先
 * - 視覚的負担の軽減
 *
 * @param props - 子コンポーネントを含むプロパティ
 * @returns 適切なテーマが適用されたThemeProvider
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <ColorSchemeThemeProvider>
 *   <MyApplication />
 * </ColorSchemeThemeProvider>
 * ```
 *
 * @example
 * ```tsx
 * // 設定変更の監視
 * function ThemeAwareComponent() {
 *   const theme = useTheme();
 *   return <div style={{ color: theme.palette.text.primary }}>
 *     現在のテーマ: {theme.palette.mode}
 *   </div>;
 * }
 * ```
 *
 * @see {@link ThemeProvider} - 実際のテーマ適用コンポーネント
 * @see {@link AppSetting.COLOR_SCHEME} - カラースキーム設定定数
 * @see {@link useAppConfigurationValue} - アプリケーション設定フック
 *
 * @author Lichtblick Team
 * @since 2023
 */
export function ColorSchemeThemeProvider({ children }: React.PropsWithChildren): React.JSX.Element {
  // アプリケーション設定からカラースキーム設定を取得
  // デフォルトは "system"（システム設定に従う）
  const [colorScheme = "system"] = useAppConfigurationValue<string>(AppSetting.COLOR_SCHEME);

  // システムのダークモード設定を監視
  // CSS Media Query "(prefers-color-scheme: dark)" の状態を取得
  const systemSetting = useMedia("(prefers-color-scheme: dark)");

  // 最終的なダークモード判定
  // 1. 明示的に "dark" が設定されている場合
  // 2. "system" が設定されており、かつシステムがダークモードの場合
  const isDark = colorScheme === "dark" || (colorScheme === "system" && systemSetting);

  // 計算されたダークモード設定でThemeProviderをレンダリング
  return <ThemeProvider isDark={isDark}>{children}</ThemeProvider>;
}
