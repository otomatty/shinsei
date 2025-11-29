// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview AppSettingsDialog - 型定義
 *
 * 【概要】
 * AppSettingsDialogコンポーネントで使用される型定義を提供します。
 * 設定ダイアログのタブ管理と、Aboutセクションの構造を定義しています。
 *
 * 【主な型】
 * - `AppSettingsSectionKey` - Aboutセクションの項目キー
 * - `AppSettingsTab` - 設定ダイアログのタブ識別子
 *
 * 【使用箇所】
 * - AppSettingsDialog.tsx - メインコンポーネント
 * - constants.ts - 定数定義
 * - SettingsMenu.tsx - 設定メニュー
 * - WorkspaceContext.ts - ワークスペース状態管理
 */

/**
 * AppSettingsセクションキー
 *
 * Aboutタブ内で表示される情報セクションの識別子。
 * 各セクションは独立したカテゴリとして扱われ、
 * 対応するリンクや情報を持ちます。
 *
 * @example
 * ```typescript
 * const section: AppSettingsSectionKey = "documentation";
 * ```
 */
export type AppSettingsSectionKey = "documentation" | "legal";

/**
 * AppSettingsタブ
 *
 * 設定ダイアログで表示可能なタブの識別子。
 * 各タブは独立した設定カテゴリを表し、
 * 対応する設定項目のセクションを持ちます。
 *
 * タブの構成：
 * - `general` - 一般設定（テーマ、言語、タイムゾーンなど）
 * - `privacy` - プライバシー設定（テレメトリ、クラッシュレポートなど）
 * - `extensions` - 拡張機能の管理
 * - `layouts` - レイアウトマーケットプレイス
 * - `experimental-features` - 実験的機能の有効/無効
 * - `about` - アプリケーション情報とリンク
 *
 * @example
 * ```typescript
 * const activeTab: AppSettingsTab = "general";
 *
 * // 特定のタブで設定ダイアログを開く
 * <AppSettingsDialog activeTab="extensions" />
 * ```
 */
export type AppSettingsTab =
  | "general"
  | "privacy"
  | "extensions"
  | "layouts"
  | "experimental-features"
  | "about";
