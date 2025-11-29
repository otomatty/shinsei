// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview UnknownPanel - 未知パネルタイプのフォールバックコンポーネント
 *
 * このファイルは、レイアウトで参照されているが実際には利用できない
 * パネルタイプの代替表示を行うフォールバックコンポーネントを実装している。
 * 拡張機能のアンインストールやパネルタイプの変更により発生する
 * 欠損パネルの問題を優雅に処理する。
 *
 * ## 主要機能
 *
 * ### 1. フォールバック表示
 * - 存在しないパネルタイプの代替表示
 * - ユーザーフレンドリーなエラーメッセージ
 * - レイアウトの構造を保持したまま問題を表示
 * - アプリケーション全体のクラッシュを防止
 *
 * ### 2. デバッグ支援
 * - 欠損パネルタイプの明確な表示
 * - テスト可能なdata-testid属性の提供
 * - 開発時の問題特定を支援
 * - ログ・モニタリングシステムとの連携
 *
 * ### 3. レイアウト保持
 * - 元のパネル位置とサイズを維持
 * - 他のパネルへの影響を最小限に抑制
 * - Mosaicレイアウトシステムとの完全互換性
 * - ユーザーエクスペリエンスの継続性確保
 *
 * ### 4. 拡張機能対応
 * - 拡張機能のアンインストール時の適切な処理
 * - パネルタイプの動的変更への対応
 * - バージョンアップ時の互換性問題への対処
 * - 設定移行時の一時的な状態管理
 *
 * ## 発生シナリオ
 *
 * ### 拡張機能関連
 * - 拡張機能のアンインストール
 * - 拡張機能の無効化
 * - 拡張機能の読み込みエラー
 * - バージョン不整合による非互換性
 *
 * ### 設定・レイアウト関連
 * - 古いレイアウトファイルの読み込み
 * - パネルタイプ名の変更
 * - 設定ファイルの破損
 * - 開発環境と本番環境の差異
 *
 * ### 開発・テスト関連
 * - 開発中のパネルタイプ削除
 * - テスト環境での意図的な欠損
 * - プロトタイプ段階でのパネル削除
 * - A/Bテスト時の機能切り替え
 *
 * ## 使用例
 *
 * ```typescript
 * // パネルレジストリでの自動使用（通常は手動で使用しない）
 * const panelRegistry = {
 *   "3d": ThreeDPanel,
 *   "plot": PlotPanel,
 *   // "custom-panel": undefined (拡張機能がアンインストールされた)
 * };
 *
 * // レイアウトに存在するが利用できないパネル
 * const layout = {
 *   direction: "row",
 *   first: { type: "3d" },      // 正常なパネル
 *   second: { type: "custom-panel" } // 欠損パネル → UnknownPanelで表示
 * };
 *
 * // 結果：UnknownPanelが自動的に表示される
 * // "Unknown panel type: custom-panel."
 * ```
 *
 * ## 技術的特徴
 *
 * - **withPanel HOC**: 標準的なパネルインターフェースとの統合
 * - **設定非保存**: saveConfigは使用せず、設定の永続化を回避
 * - **overrideConfig**: 動的な設定オーバーライドによる柔軟性
 * - **EmptyState**: 統一されたエラー表示デザイン
 * - **テスト対応**: data-testid属性による自動テスト支援
 *
 * @author Lichtblick Team
 * @since 2023
 */

import EmptyState from "@lichtblick/suite-base/components/EmptyState";
import withPanel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

/**
 * UnknownPanelコンポーネントのプロパティ型定義
 *
 * 設定は保存されないため、overrideConfigとして使用される。
 * _type_設定オプションは、欠損パネルの元のタイプを示す。
 */
// Since the unknown panel never saves its config, the config fields here are used with `overrideConfig`
// to the connected Panel component (returned from withPanel).
//
// The _type_ config option should be the type of the missing panel.
type Props = {
  /** パネル設定（元のパネルタイプとIDを含む） */
  config: {
    /** 欠損パネルの元のタイプ名 */
    type: string;
    /** パネルの一意識別子 */
    id: string;
  };
  /** 設定保存関数（UnknownPanelでは使用されない） */
  saveConfig: SaveConfig<unknown>;
};

/**
 * UnknownPanelの内部実装コンポーネント
 *
 * withPanel HOCでラップされる前の生のコンポーネント実装。
 * 欠損パネルの代替表示を行う最小限の機能を提供。
 *
 * ## コンポーネント構造
 *
 * ```
 * Stack (中央配置コンテナ)
 * ├── PanelToolbar (特別なツールバー)
 * └── EmptyState (エラーメッセージ表示)
 * ```
 *
 * ## 表示内容
 *
 * - **ツールバー**: `isUnknownPanel`フラグによる特別な表示
 * - **エラーメッセージ**: "Unknown panel type: [タイプ名]."
 * - **レイアウト**: 中央配置による明確な視覚的フィードバック
 * - **テストID**: パネルIDベースの自動テスト対応
 *
 * ## デザイン思想
 *
 * ### ユーザビリティ重視
 * - 明確で分かりやすいエラーメッセージ
 * - レイアウトの構造を保持
 * - 他のパネルへの影響を排除
 *
 * ### 開発者支援
 * - 欠損パネルタイプの明確な特定
 * - テスト自動化への対応
 * - デバッグ情報の提供
 *
 * ### システム安定性
 * - アプリケーション全体のクラッシュ防止
 * - 優雅な劣化（Graceful Degradation）
 * - 拡張機能エコシステムとの堅牢な統合
 *
 * @param props - コンポーネントプロパティ
 * @returns レンダリングされたUnknownPanel要素
 */
function UnconnectedUnknownPanel(props: Props) {
  const { config, saveConfig: _saveConfig } = props;

  return (
    <Stack flex="auto" alignItems="center" justifyContent="center" data-testid={config.id}>
      {/* 未知パネル専用のツールバー表示 */}
      <PanelToolbar isUnknownPanel />

      {/* 欠損パネルタイプの明確な表示 */}
      <EmptyState>Unknown panel type: {config.type}.</EmptyState>
    </Stack>
  );
}

/**
 * パネルタイプ識別子
 *
 * パネルレジストリでの登録に使用される固定値。
 * 他のパネルタイプと重複しないよう"unknown"を使用。
 */
UnconnectedUnknownPanel.panelType = "unknown";

/**
 * デフォルト設定
 *
 * UnknownPanelは設定を保存しないため、空オブジェクトを使用。
 * 実際の設定はoverrideConfigとして動的に提供される。
 */
UnconnectedUnknownPanel.defaultConfig = {};

/**
 * UnknownPanel - 欠損パネルのフォールバック表示コンポーネント
 *
 * レイアウトで参照されているが実際には利用できないパネルの
 * 代替表示を行うフォールバックコンポーネント。拡張機能の
 * アンインストールやパネルタイプの変更により発生する問題を
 * 優雅に処理し、アプリケーション全体の安定性を保つ。
 *
 * ## 自動使用のメカニズム
 *
 * UnknownPanelは通常、開発者が直接使用するものではなく、
 * パネルレジストリシステムによって自動的に選択される：
 *
 * ```typescript
 * // パネル解決プロセス（疑似コード）
 * function resolvePanel(panelType: string) {
 *   const PanelComponent = panelRegistry.get(panelType);
 *
 *   if (PanelComponent) {
 *     return PanelComponent;
 *   } else {
 *     // 欠損パネルの場合、UnknownPanelを返す
 *     return UnknownPanel;
 *   }
 * }
 * ```
 *
 * ## 拡張機能エコシステムとの統合
 *
 * Lichtblickの拡張機能システムでは、パネルタイプが動的に
 * 追加・削除される。UnknownPanelは、この動的な環境で
 * 発生する問題に対する堅牢な解決策を提供する：
 *
 * - **拡張機能のアンインストール**: 既存レイアウトの保護
 * - **バージョンアップ**: 互換性問題の緩和
 * - **開発環境**: プロトタイプパネルの安全な削除
 * - **設定移行**: 一時的な不整合状態の処理
 *
 * ## エラーハンドリング戦略
 *
 * UnknownPanelは、"fail-fast"ではなく"fail-safe"アプローチを
 * 採用している。これにより：
 *
 * - ユーザーは他のパネルを継続して使用可能
 * - レイアウト全体の構造が保持される
 * - 問題の特定と修正が容易になる
 * - システム全体の安定性が向上する
 *
 * @example
 * ```typescript
 * // 通常は自動的に使用されるが、手動での使用例
 * <UnknownPanel
 *   config={{ type: "missing-panel", id: "panel-123" }}
 *   saveConfig={() => {}}
 * />
 * ```
 *
 * @author Lichtblick Team
 * @since 2023
 */
export const UnknownPanel = withPanel(UnconnectedUnknownPanel);
