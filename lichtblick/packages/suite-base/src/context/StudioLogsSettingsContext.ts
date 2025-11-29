// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext } from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { LogLevel } from "@lichtblick/log";

/**
 * ## StudioLogConfigChannel
 *
 * **スタジオログ設定チャンネルの定義**
 *
 * ### 概要
 * - 個別のログチャンネルの設定情報
 * - チャンネル名と有効/無効状態を管理
 * - 細かいログ制御を可能にする
 *
 * ### 使用例
 * ```typescript
 * const channels: StudioLogConfigChannel[] = [
 *   { name: "player", enabled: true },
 *   { name: "websocket", enabled: false },
 *   { name: "extension", enabled: true }
 * ];
 * ```
 */
type StudioLogConfigChannel = { name: string; enabled: boolean };

/**
 * ## IStudioLogsSettings
 *
 * **スタジオログ設定の統合インターフェース**
 *
 * ### 概要
 * - アプリケーション全体のログ設定を管理
 * - グローバルログレベルと個別チャンネル制御を提供
 * - 開発・デバッグ時の詳細なログ制御を実現
 *
 * ### 主な機能
 * - **グローバルレベル**: 全チャンネル共通のログレベル設定
 * - **チャンネル制御**: 個別チャンネルの有効/無効切り替え
 * - **プレフィックス制御**: 名前空間単位での一括制御
 * - **動的設定**: 実行時のログ設定変更
 *
 * ### ログレベル階層
 * - **DEBUG**: 詳細なデバッグ情報
 * - **INFO**: 一般的な情報メッセージ
 * - **WARN**: 警告メッセージ
 * - **ERROR**: エラーメッセージ
 *
 * ### チャンネル例
 * ```typescript
 * // 一般的なログチャンネル
 * "player"              // データプレイヤー関連
 * "websocket"           // WebSocket通信
 * "extension"           // 拡張機能
 * "panel"               // パネル関連
 * "layout"              // レイアウト管理
 * "storage"             // ストレージ操作
 * "auth"                // 認証処理
 * "network"             // ネットワーク通信
 * "performance"         // パフォーマンス監視
 * ```
 *
 * ### 使用例
 * ```typescript
 * // ログ設定の基本操作
 * const logSettings = useStudioLogsSettings();
 *
 * // グローバルログレベルの設定
 * logSettings.setGlobalLevel(LogLevel.DEBUG);
 *
 * // 個別チャンネルの制御
 * logSettings.enableChannel("player");
 * logSettings.disableChannel("websocket");
 *
 * // プレフィックス単位の制御
 * logSettings.enablePrefix("panel");     // panel.* を有効化
 * logSettings.disablePrefix("network");  // network.* を無効化
 *
 * // 現在の設定確認
 * console.log("Global Level:", logSettings.globalLevel);
 * console.log("Channels:", logSettings.channels);
 *
 * // 特定チャンネルの状態確認
 * const playerChannel = logSettings.channels.find(ch => ch.name === "player");
 * console.log("Player logging:", playerChannel?.enabled ? "enabled" : "disabled");
 * ```
 *
 * ### 開発時の活用
 * ```typescript
 * // デバッグモードの設定
 * function enableDebugMode() {
 *   const logSettings = useStudioLogsSettings();
 *
 *   // 全体をDEBUGレベルに設定
 *   logSettings.setGlobalLevel(LogLevel.DEBUG);
 *
 *   // 重要なチャンネルを有効化
 *   logSettings.enableChannel("player");
 *   logSettings.enableChannel("extension");
 *   logSettings.enableChannel("layout");
 * }
 *
 * // 本番モードの設定
 * function enableProductionMode() {
 *   const logSettings = useStudioLogsSettings();
 *
 *   // ERRORレベルのみ出力
 *   logSettings.setGlobalLevel(LogLevel.ERROR);
 *
 *   // デバッグ用チャンネルを無効化
 *   logSettings.disablePrefix("debug");
 *   logSettings.disableChannel("performance");
 * }
 * ```
 *
 * ### パフォーマンス考慮
 * - 無効化されたチャンネルはログ処理をスキップ
 * - ログレベルによる早期リターン
 * - 文字列フォーマットの遅延評価
 *
 * @see LogLevel - ログレベルの定義
 * @see StudioLogConfigChannel - チャンネル設定
 */
interface IStudioLogsSettings {
  /** 全チャンネル共通のグローバルログレベル */
  readonly globalLevel: LogLevel;

  /** 個別チャンネルの設定一覧 */
  readonly channels: ReadonlyArray<{ name: string; enabled: boolean }>;

  /**
   * **指定チャンネルを有効化**
   *
   * @param name - チャンネルの完全名
   */
  enableChannel(name: string): void;

  /**
   * **指定チャンネルを無効化**
   *
   * @param name - チャンネルの完全名
   */
  disableChannel(name: string): void;

  /**
   * **指定プレフィックスのチャンネルを一括有効化**
   *
   * @param prefix - チャンネル名のプレフィックス
   */
  enablePrefix(prefix: string): void;

  /**
   * **指定プレフィックスのチャンネルを一括無効化**
   *
   * @param prefix - チャンネル名のプレフィックス
   */
  disablePrefix(prefix: string): void;

  /**
   * **グローバルログレベルを設定**
   *
   * @param level - 新しいログレベル
   */
  setGlobalLevel(level: LogLevel): void;
}

/**
 * ## StudioLogsSettingsContext
 *
 * **スタジオログ設定管理のContext**
 *
 * ### 概要
 * - アプリケーション全体のログ設定を統合管理
 * - Zustandストアによる状態管理
 * - 開発・デバッグ・本番環境での柔軟なログ制御
 *
 * ### 管理対象
 * - **グローバル設定**: 全体のログレベル
 * - **チャンネル設定**: 個別機能のログ制御
 * - **プレフィックス設定**: 名前空間単位の制御
 * - **動的変更**: 実行時の設定変更
 *
 * ### 設定パターン
 * - **開発環境**: 詳細なデバッグ情報
 * - **テスト環境**: 必要最小限の情報
 * - **本番環境**: エラーのみの出力
 * - **トラブルシューティング**: 特定機能の詳細ログ
 *
 * @see IStudioLogsSettings - ログ設定インターフェース
 * @see LogLevel - ログレベル定義
 * @see StudioLogConfigChannel - チャンネル設定
 */
const StudioLogsSettingsContext = createContext<undefined | StoreApi<IStudioLogsSettings>>(
  undefined,
);

/**
 * ## useStudioLogsSettings
 *
 * **スタジオログ設定にアクセスするためのカスタムフック**
 *
 * ### 概要
 * - StudioLogsSettingsContextからZustandストアを取得
 * - ログ設定の読み取り・変更機能を提供
 * - 開発・デバッグ時の動的なログ制御を実現
 *
 * ### 使用例
 * ```typescript
 * // ログ設定管理コンポーネント
 * function LogSettingsComponent() {
 *   const logSettings = useStudioLogsSettings();
 *
 *   const handleGlobalLevelChange = (level: LogLevel) => {
 *     logSettings.setGlobalLevel(level);
 *   };
 *
 *   const handleChannelToggle = (channelName: string, enabled: boolean) => {
 *     if (enabled) {
 *       logSettings.enableChannel(channelName);
 *     } else {
 *       logSettings.disableChannel(channelName);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <h2>Log Settings</h2>
 *
 *       <div>
 *         <label>Global Level:</label>
 *         <select
 *           value={logSettings.globalLevel}
 *           onChange={(e) => handleGlobalLevelChange(e.target.value as LogLevel)}
 *         >
 *           <option value={LogLevel.DEBUG}>Debug</option>
 *           <option value={LogLevel.INFO}>Info</option>
 *           <option value={LogLevel.WARN}>Warn</option>
 *           <option value={LogLevel.ERROR}>Error</option>
 *         </select>
 *       </div>
 *
 *       <div>
 *         <h3>Channels</h3>
 *         {logSettings.channels.map(channel => (
 *           <div key={channel.name}>
 *             <label>
 *               <input
 *                 type="checkbox"
 *                 checked={channel.enabled}
 *                 onChange={(e) => handleChannelToggle(channel.name, e.target.checked)}
 *               />
 *               {channel.name}
 *             </label>
 *           </div>
 *         ))}
 *       </div>
 *
 *       <div>
 *         <h3>Quick Actions</h3>
 *         <button onClick={() => logSettings.enablePrefix("panel")}>
 *           Enable All Panel Logs
 *         </button>
 *         <button onClick={() => logSettings.disablePrefix("network")}>
 *           Disable All Network Logs
 *         </button>
 *       </div>
 *     </div>
 *   );
 * }
 *
 * // 開発者ツールコンポーネント
 * function DeveloperToolsComponent() {
 *   const logSettings = useStudioLogsSettings();
 *
 *   const enableDebugMode = () => {
 *     logSettings.setGlobalLevel(LogLevel.DEBUG);
 *     logSettings.enableChannel("player");
 *     logSettings.enableChannel("extension");
 *     logSettings.enableChannel("layout");
 *     logSettings.enableChannel("performance");
 *   };
 *
 *   const enableProductionMode = () => {
 *     logSettings.setGlobalLevel(LogLevel.ERROR);
 *     logSettings.disablePrefix("debug");
 *     logSettings.disableChannel("performance");
 *   };
 *
 *   const enableSpecificDebugging = (feature: string) => {
 *     logSettings.setGlobalLevel(LogLevel.DEBUG);
 *     logSettings.enableChannel(feature);
 *     logSettings.enablePrefix(feature);
 *   };
 *
 *   return (
 *     <div>
 *       <h2>Developer Tools</h2>
 *
 *       <div>
 *         <button onClick={enableDebugMode}>
 *           Enable Debug Mode
 *         </button>
 *         <button onClick={enableProductionMode}>
 *           Enable Production Mode
 *         </button>
 *       </div>
 *
 *       <div>
 *         <h3>Feature-specific Debugging</h3>
 *         <button onClick={() => enableSpecificDebugging("player")}>
 *           Debug Player
 *         </button>
 *         <button onClick={() => enableSpecificDebugging("extension")}>
 *           Debug Extensions
 *         </button>
 *         <button onClick={() => enableSpecificDebugging("layout")}>
 *           Debug Layout
 *         </button>
 *       </div>
 *
 *       <div>
 *         <h3>Current Settings</h3>
 *         <p>Global Level: {logSettings.globalLevel}</p>
 *         <p>Active Channels: {logSettings.channels.filter(ch => ch.enabled).length}</p>
 *       </div>
 *     </div>
 *   );
 * }
 *
 * // ログ出力コンポーネント（デバッグ用）
 * function LogOutputComponent() {
 *   const logSettings = useStudioLogsSettings();
 *   const [logs, setLogs] = React.useState<string[]>([]);
 *
 *   const addLog = (level: LogLevel, channel: string, message: string) => {
 *     const channelConfig = logSettings.channels.find(ch => ch.name === channel);
 *
 *     // チャンネルが無効化されている場合はスキップ
 *     if (!channelConfig?.enabled) return;
 *
 *     // グローバルレベルより低い場合はスキップ
 *     if (level < logSettings.globalLevel) return;
 *
 *     const timestamp = new Date().toISOString();
 *     const logEntry = `[${timestamp}] [${level}] [${channel}] ${message}`;
 *     setLogs(prev => [...prev.slice(-99), logEntry]); // 最新100件を保持
 *   };
 *
 *   return (
 *     <div>
 *       <h2>Log Output</h2>
 *       <div style={{ height: "300px", overflow: "auto", border: "1px solid #ccc" }}>
 *         {logs.map((log, index) => (
 *           <div key={index} style={{ fontFamily: "monospace", fontSize: "12px" }}>
 *             {log}
 *           </div>
 *         ))}
 *       </div>
 *
 *       <div>
 *         <h3>Test Logs</h3>
 *         <button onClick={() => addLog(LogLevel.DEBUG, "player", "Player state changed")}>
 *           Add Player Debug
 *         </button>
 *         <button onClick={() => addLog(LogLevel.INFO, "extension", "Extension loaded")}>
 *           Add Extension Info
 *         </button>
 *         <button onClick={() => addLog(LogLevel.WARN, "network", "Connection timeout")}>
 *           Add Network Warning
 *         </button>
 *         <button onClick={() => addLog(LogLevel.ERROR, "system", "System error occurred")}>
 *           Add System Error
 *         </button>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### パフォーマンス最適化
 * - 無効化されたチャンネルの早期リターン
 * - ログレベルによる処理スキップ
 * - 文字列フォーマットの遅延評価
 * - メモリ効率的なログバッファ管理
 *
 * ### 本番環境での使用
 * - エラーレベルのみの出力
 * - 機密情報の除外
 * - ログローテーション
 * - リモートログ送信
 *
 * @returns {IStudioLogsSettings} スタジオログ設定インターフェース
 */
function useStudioLogsSettings(): IStudioLogsSettings {
  const context = useGuaranteedContext(StudioLogsSettingsContext);
  return useStore(context);
}

export { StudioLogsSettingsContext, useStudioLogsSettings };
export type { IStudioLogsSettings, StudioLogConfigChannel };
