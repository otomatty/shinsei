// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

/**
 * ## AppConfigurationValue
 *
 * **アプリケーション設定値の基本型定義**
 *
 * ### 概要
 * - アプリケーション設定で使用可能な値の型を定義
 * - プリミティブ型のみをサポート
 * - 設定の永続化に適した単純な型構造
 *
 * ### サポート型
 * - **string**: 文字列設定（テーマ名、言語設定など）
 * - **number**: 数値設定（タイムアウト、サイズなど）
 * - **boolean**: 真偽値設定（フラグ、有効/無効など）
 * - **undefined**: 未設定状態
 */
export type AppConfigurationValue = string | number | boolean | undefined;

/**
 * ## ChangeHandler
 *
 * **設定値変更時のコールバック関数型**
 *
 * ### 概要
 * - 設定値の変更を監視するためのハンドラー
 * - リアクティブな設定更新を実現
 * - 複数のリスナーを同時に登録可能
 *
 * @param newValue - 変更後の新しい設定値
 */
export type ChangeHandler = (newValue: AppConfigurationValue) => void;

/**
 * ## IAppConfiguration
 *
 * **アプリケーション設定の統一インターフェース**
 *
 * ### 概要
 * - ユーザー設定可能なオプションと永続化状態を管理
 * - プラットフォーム固有の実装を抽象化
 * - 設定の読み取り・書き込み・監視機能を提供
 *
 * ### 主な機能
 * - **設定の読み取り**: get()メソッドによる設定値の取得
 * - **設定の書き込み**: set()メソッドによる設定値の更新
 * - **変更監視**: addChangeListener()による変更通知
 * - **監視解除**: removeChangeListener()によるリスナー削除
 *
 * ### 設定キーの例
 * ```typescript
 * // 一般的な設定キー
 * "theme"                    // テーマ設定
 * "language"                 // 言語設定
 * "autoSave"                 // 自動保存フラグ
 * "connectionTimeout"        // 接続タイムアウト
 * "enableDebugMode"          // デバッグモード
 * "recentFiles"              // 最近使用したファイル
 * "windowSize"               // ウィンドウサイズ
 * "panelLayout"              // パネル配置
 * ```
 *
 * ### 使用例
 * ```typescript
 * // 設定の基本操作
 * const config = useAppConfiguration();
 *
 * // 設定値の取得
 * const theme = config.get("theme"); // "dark" | "light" | undefined
 * const timeout = config.get("connectionTimeout"); // number | undefined
 * const autoSave = config.get("autoSave"); // boolean | undefined
 *
 * // 設定値の更新
 * await config.set("theme", "dark");
 * await config.set("connectionTimeout", 5000);
 * await config.set("autoSave", true);
 *
 * // 変更監視
 * const handleThemeChange = (newValue: AppConfigurationValue) => {
 *   console.log("Theme changed to:", newValue);
 * };
 *
 * config.addChangeListener("theme", handleThemeChange);
 *
 * // 監視解除
 * config.removeChangeListener("theme", handleThemeChange);
 * ```
 *
 * ### 実装パターン
 * - **Abstract Interface**: プラットフォーム固有の実装を抽象化
 * - **Observer Pattern**: 変更通知による状態同期
 * - **Async Operations**: 設定保存の非同期処理
 * - **Type Safety**: 型安全な設定値の管理
 */
export interface IAppConfiguration {
  /**
   * **現在の設定値を取得**
   *
   * @param key - 設定キー
   * @returns 設定値（未設定の場合はundefined）
   */
  get(key: string): AppConfigurationValue;

  /**
   * **設定値を更新**
   *
   * @param key - 設定キー
   * @param value - 新しい設定値
   * @returns 設定保存の完了Promise
   */
  set(key: string, value: AppConfigurationValue): Promise<void>;

  /**
   * **設定変更の監視を開始**
   *
   * @param key - 監視する設定キー
   * @param cb - 変更時のコールバック
   */
  addChangeListener(key: string, cb: ChangeHandler): void;

  /**
   * **設定変更の監視を解除**
   *
   * @param key - 監視を解除する設定キー
   * @param cb - 削除するコールバック
   */
  removeChangeListener(key: string, cb: ChangeHandler): void;
}

/**
 * ## AppConfigurationContext
 *
 * **アプリケーション設定管理のContext**
 *
 * ### 概要
 * - アプリケーション全体の設定管理を提供
 * - プラットフォーム固有の設定実装を抽象化
 * - 設定の永続化と同期を管理
 *
 * ### 設定の永続化
 * - **Web**: LocalStorage, IndexedDB
 * - **Desktop**: ファイルシステム, レジストリ
 * - **Mobile**: Native Storage API
 *
 * ### 設定カテゴリ
 * - **UI設定**: テーマ、言語、レイアウト
 * - **動作設定**: 自動保存、タイムアウト、デバッグ
 * - **ユーザー設定**: 最近使用したファイル、お気に入り
 * - **システム設定**: 接続情報、キャッシュ設定
 *
 * @see IAppConfiguration - 設定管理インターフェース
 */
const AppConfigurationContext = createContext<IAppConfiguration | undefined>(undefined);
AppConfigurationContext.displayName = "AppConfigurationContext";

/**
 * ## useAppConfiguration
 *
 * **アプリケーション設定機能にアクセスするためのカスタムフック**
 *
 * ### 概要
 * - AppConfigurationContextからIAppConfigurationインスタンスを取得
 * - 設定の読み取り・書き込み・監視機能を提供
 * - 必須のContext依存関係をチェック
 *
 * ### 使用例
 * ```typescript
 * function SettingsComponent() {
 *   const config = useAppConfiguration();
 *   const [theme, setTheme] = React.useState(() => config.get("theme") || "light");
 *
 *   // 設定変更の監視
 *   React.useEffect(() => {
 *     const handleThemeChange = (newValue: AppConfigurationValue) => {
 *       setTheme(newValue as string || "light");
 *     };
 *
 *     config.addChangeListener("theme", handleThemeChange);
 *
 *     return () => {
 *       config.removeChangeListener("theme", handleThemeChange);
 *     };
 *   }, [config]);
 *
 *   // 設定の更新
 *   const handleThemeToggle = async () => {
 *     const newTheme = theme === "light" ? "dark" : "light";
 *     await config.set("theme", newTheme);
 *   };
 *
 *   return (
 *     <div>
 *       <div>Current Theme: {theme}</div>
 *       <button onClick={handleThemeToggle}>
 *         Toggle Theme
 *       </button>
 *     </div>
 *   );
 * }
 *
 * // 設定フォームの例
 * function ConfigurationForm() {
 *   const config = useAppConfiguration();
 *
 *   const handleSubmit = async (formData: Record<string, any>) => {
 *     try {
 *       await Promise.all([
 *         config.set("autoSave", formData.autoSave),
 *         config.set("connectionTimeout", formData.timeout),
 *         config.set("language", formData.language),
 *       ]);
 *       console.log("Settings saved successfully");
 *     } catch (error) {
 *       console.error("Failed to save settings:", error);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *     </form>
 *   );
 * }
 * ```
 *
 * ### 注意点
 * - 設定値の型は呼び出し側で適切にキャストする必要がある
 * - 変更リスナーは必ずクリーンアップすること
 * - 設定の更新は非同期処理のため、エラーハンドリングが重要
 *
 * @returns {IAppConfiguration} アプリケーション設定インターフェース
 * @throws {Error} AppConfigurationProviderが設定されていない場合
 */
export function useAppConfiguration(): IAppConfiguration {
  const storage = useContext(AppConfigurationContext);
  if (!storage) {
    throw new Error("An AppConfigurationContext provider is required to useAppConfiguration");
  }
  return storage;
}

export default AppConfigurationContext;
