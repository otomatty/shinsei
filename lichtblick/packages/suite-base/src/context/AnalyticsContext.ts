// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import IAnalytics from "@lichtblick/suite-base/services/IAnalytics";
import NullAnalytics from "@lichtblick/suite-base/services/NullAnalytics";

/**
 * ## AnalyticsContext
 *
 * **アナリティクス・トラッキング管理のContext**
 *
 * ### 概要
 * - ユーザー行動の分析とトラッキングを提供
 * - プラットフォーム固有のアナリティクス実装を抽象化
 * - プライバシー設定に応じた動的な有効/無効切り替え
 *
 * ### 主な機能
 * - **イベントトラッキング**: ユーザー操作の記録
 * - **パフォーマンス監視**: アプリケーションの性能測定
 * - **エラー追跡**: エラーとクラッシュの記録
 * - **プライバシー準拠**: ユーザー同意に基づく制御
 *
 * ### デフォルト実装
 * デフォルトでは `NullAnalytics` を使用し、実際のトラッキングは行いません。
 * プラットフォーム固有の実装（Google Analytics、Mixpanel等）は
 * プロバイダーレベルで注入されます。
 *
 * ### 使用例
 * ```typescript
 * import { useAnalytics } from "./AnalyticsContext";
 *
 * function MyComponent() {
 *   const analytics = useAnalytics();
 *
 *   const handleButtonClick = () => {
 *     // ユーザー操作をトラッキング
 *     analytics.logEvent("button_click", {
 *       button_name: "save_layout",
 *       timestamp: Date.now(),
 *       user_id: getCurrentUserId(),
 *     });
 *   };
 *
 *   const handleError = (error: Error) => {
 *     // エラーをトラッキング
 *     analytics.logError("layout_save_error", {
 *       error_message: error.message,
 *       stack_trace: error.stack,
 *       user_agent: navigator.userAgent,
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleButtonClick}>
 *       レイアウトを保存
 *     </button>
 *   );
 * }
 * ```
 *
 * ### 設計パターン
 * - **Strategy パターン**: アナリティクス実装の切り替え
 * - **Null Object パターン**: デフォルトの無効化実装
 * - **Context API**: グローバルなアナリティクス管理
 * - **Singleton パターン**: アナリティクスインスタンスの統一
 *
 * ### プラットフォーム対応
 * - **Desktop**: ローカルアナリティクス + 外部サービス
 * - **Web**: Google Analytics、Mixpanel等
 * - **Development**: NullAnalytics（トラッキング無効）
 * - **Production**: 実際のアナリティクスサービス
 *
 * ### プライバシー考慮事項
 * - ユーザー同意の確認後にのみトラッキング開始
 * - 個人識別情報の除去・匿名化
 * - GDPR、CCPA等のプライバシー規制への準拠
 * - オプトアウト機能の提供
 *
 * ### パフォーマンス考慮事項
 * - 非同期でのイベント送信
 * - バッチ処理による効率化
 * - ネットワーク障害時の適切なハンドリング
 * - メモリ使用量の最適化
 *
 * @see IAnalytics - アナリティクスインターフェース
 * @see NullAnalytics - デフォルトの無効化実装
 */
const AnalyticsContext = createContext<IAnalytics>(new NullAnalytics());
AnalyticsContext.displayName = "AnalyticsContext";

/**
 * アナリティクスContextのカスタムフック
 *
 * アナリティクスサービスへの簡単なアクセスを提供します。
 *
 * @returns IAnalytics - アナリティクスサービスインスタンス
 *
 * @example
 * ```typescript
 * import { useAnalytics } from "./AnalyticsContext";
 *
 * function DataVisualizationPanel() {
 *   const analytics = useAnalytics();
 *
 *   const handlePanelOpen = () => {
 *     analytics.logEvent("panel_opened", {
 *       panel_type: "data_visualization",
 *       timestamp: Date.now(),
 *     });
 *   };
 *
 *   const handleDataLoad = (dataSource: string, recordCount: number) => {
 *     analytics.logEvent("data_loaded", {
 *       data_source: dataSource,
 *       record_count: recordCount,
 *       load_time: performance.now(),
 *     });
 *   };
 *
 *   const handlePerformanceMetric = (metric: string, value: number) => {
 *     analytics.logMetric(metric, value, {
 *       component: "data_visualization_panel",
 *       timestamp: Date.now(),
 *     });
 *   };
 *
 *   return (
 *     <div onLoad={handlePanelOpen}>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnalytics(): IAnalytics {
  return useContext(AnalyticsContext);
}

export default AnalyticsContext;
