// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * LocalStorage保存用のログ設定状態
 *
 * ユーザーのログ設定をブラウザのLocalStorageに永続化するための型定義です。
 * この型は、アプリケーションの再起動時にログ設定を復元するために使用されます。
 *
 * ## 永続化される設定
 * - **グローバルログレベル**: アプリケーション全体のデフォルトログレベル
 * - **無効化されたチャンネル**: ユーザーが個別に無効化したログチャンネル
 *
 * ## 使用場面
 * - アプリケーション起動時の設定復元
 * - ユーザー設定の変更時の自動保存
 * - 開発環境と本番環境での設定の使い分け
 *
 * ## 設計思想
 * - **最小限の情報**: 必要最小限の情報のみを保存してストレージを節約
 * - **後方互換性**: 設定項目の追加時でも既存データが破損しない
 * - **デフォルト値**: 未設定項目にはシステムデフォルト値を適用
 *
 * @example
 * ```typescript
 * // 開発環境での典型的な設定
 * const devSettings: LocalStorageSaveState = {
 *   globalLevel: "debug",
 *   disabledChannels: ["network", "verbose-component"]
 * };
 *
 * // 本番環境での典型的な設定
 * const prodSettings: LocalStorageSaveState = {
 *   globalLevel: "warn",
 *   disabledChannels: []
 * };
 * ```
 */
type LocalStorageSaveState = {
  /**
   * アプリケーション全体のグローバルログレベル
   *
   * 指定されたレベル以上のログメッセージが出力されます。
   * 未指定の場合は環境に応じたデフォルト値が使用されます：
   * - 開発環境: "debug"
   * - 本番環境: "warn"
   *
   * @example "debug" | "info" | "warn" | "error"
   */
  globalLevel?: string;

  /**
   * 個別に無効化されたログチャンネルの名前リスト
   *
   * グローバルログレベルに関係なく、これらのチャンネルからの
   * ログメッセージは出力されません（警告レベル以上は除く）。
   *
   * ## チャンネル名の例
   * - "network": ネットワーク関連のログ
   * - "player": データプレイヤーのログ
   * - "panel": パネル関連のログ
   * - "extension": 拡張機能のログ
   *
   * @example ["network", "verbose-component", "debug-helper"]
   */
  disabledChannels?: string[];
};

export type { LocalStorageSaveState };
