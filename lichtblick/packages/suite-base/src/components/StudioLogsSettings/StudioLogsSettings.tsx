// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview StudioLogsSettings - スタジオログ設定UI管理
 *
 * このファイルは、Lichtblickアプリケーションのログ設定画面を提供します。
 * 開発・デバッグ時の詳細なログ制御を可能にする統合的なUIシステムです。
 *
 * ## 主要機能
 * - **グローバルログレベル制御**: アプリケーション全体のベースログレベル設定
 * - **階層的チャンネル管理**: パッケージ構造に基づく階層ツリー表示
 * - **個別チャンネル制御**: 特定機能のログ有効/無効切り替え
 * - **プレフィックス一括制御**: 名前空間単位での制御
 * - **リアルタイム反映**: 設定変更の即座反映
 * - **永続化対応**: LocalStorageによる設定保存
 *
 * ## システム構成
 * - StudioLogsSettings: メインエディターコンポーネント
 * - StudioLogsSettingsSidebar: サイドバー統合コンポーネント
 * - useStudioLogsSettingsTree: 設定ツリー構築フック
 * - SettingsTreeEditor: 階層設定エディターUI
 *
 * ## 使用場面
 * - 開発時のデバッグログ制御
 * - 本番環境でのログレベル調整
 * - 特定機能のトラブルシューティング
 * - パフォーマンス分析用ログ制御
 */

import SettingsTreeEditor from "@lichtblick/suite-base/components/SettingsTreeEditor";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";

import { useStudioLogsSettingsTree } from "./useStudioLogsSettingsTree";

/**
 * **StudioLogsSettings** - スタジオログ設定メインコンポーネント
 *
 * アプリケーション全体のログ設定を管理するメインUIコンポーネントです。
 * SettingsTreeEditorを使用して階層的なログチャンネル設定画面を提供します。
 *
 * ## 機能概要
 * - **階層ツリー表示**: パッケージ構造に基づく論理的な階層表示
 * - **グローバル制御**: 全チャンネル共通のログレベル設定
 * - **個別制御**: チャンネルごとの詳細な有効/無効切り替え
 * - **検索フィルター**: 大量のチャンネルから特定項目を検索
 * - **展開制御**: 階層の展開/折りたたみ制御
 *
 * ## ログチャンネル階層
 * ```
 * Settings (グローバル設定)
 * ├── [パッケージ名]
 * │   ├── [コンポーネント名]
 * │   │   └── [サブファイル名]
 * │   └── ...
 * └── Misc (その他)
 *     ├── [非パッケージチャンネル]
 *     └── ...
 * ```
 *
 * ## ログレベル制御
 * - **DEBUG**: 詳細なデバッグ情報（開発時用）
 * - **INFO**: 一般的な情報メッセージ
 * - **WARN**: 警告メッセージ
 * - **ERROR**: エラーメッセージのみ（本番推奨）
 *
 * ## チャンネル制御パターン
 * ```typescript
 * // 個別チャンネル制御の例
 * "packages/suite-base/src/players/UserScriptPlayer.ts"  // 個別ファイル
 * "packages/suite-base/src/components"                   // ディレクトリ一括
 * "network"                                              // 機能別グルーピング
 * ```
 *
 * ## パフォーマンス影響
 * - **有効化**: そのチャンネルからの全ログが出力される
 * - **無効化**: WARNING以上のログのみ出力（DEBUG/INFOはスキップ）
 * - **リアルタイム**: 設定変更は即座にログ出力に反映
 *
 * ## 使用例
 * ```tsx
 * // 直接使用（設定画面内）
 * <StudioLogsSettings />
 *
 * // サイドバーでの使用
 * <StudioLogsSettingsSidebar />
 * ```
 *
 * ## 開発時の活用
 * - 特定機能のデバッグ時にそのチャンネルのみを有効化
 * - パフォーマンス問題調査時に関連チャンネルを一括有効化
 * - 本番デプロイ前にERRORレベルのみに設定して動作確認
 *
 * @returns {React.JSX.Element} ログ設定エディターUI
 */
export function StudioLogsSettings(): React.JSX.Element {
  const logSettings = useStudioLogsSettingsTree();

  return <SettingsTreeEditor variant="log" settings={logSettings} />;
}

/**
 * **StudioLogsSettingsSidebar** - サイドバー統合ログ設定コンポーネント
 *
 * StudioLogsSettingsをサイドバー表示用にラップしたコンポーネントです。
 * SidebarContentによる統一されたサイドバーUIを提供し、
 * 右サイドバーの「logs-settings」項目で使用されます。
 *
 * ## サイドバー統合機能
 * - **統一ヘッダー**: "Studio Logs Settings"タイトル表示
 * - **スクロール対応**: 大量ログチャンネルの縦スクロール
 * - **パディング無効化**: エディター専用の最適化レイアウト
 * - **ワークスペース連携**: 右サイドバーアイテムとしての統合
 *
 * ## ワークスペース統合
 * ```typescript
 * // WorkspaceContextでの定義例
 * const rightSidebarItems = {
 *   "logs-settings": <StudioLogsSettingsSidebar />
 * };
 * ```
 *
 * ## UI配置
 * - **表示位置**: 右サイドバー
 * - **開閉制御**: ワークスペース状態による管理
 * - **サイズ調整**: ユーザーによるサイドバー幅調整対応
 *
 * ## ユーザビリティ
 * - **常時アクセス**: 任意の画面からサイドバーで即座にアクセス可能
 * - **非破壊的**: メイン画面を変更せずに設定変更可能
 * - **リアルタイム反映**: 設定変更が即座にアプリケーション全体に反映
 *
 * @returns {React.JSX.Element} サイドバー統合ログ設定UI
 */
export function StudioLogsSettingsSidebar(): React.JSX.Element {
  return (
    <SidebarContent overflow="auto" title="Studio Logs Settings" disablePadding>
      <StudioLogsSettings />
    </SidebarContent>
  );
}
