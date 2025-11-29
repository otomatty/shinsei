// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview 起動設定関連の型定義
 *
 * このファイルは、Lichtblickアプリケーションの起動方法に関する
 * ユーザー設定を管理するための型定義を提供します。
 *
 * ユーザーがリンクをクリックした際に、どのバージョンの
 * アプリケーションを起動するかを制御します。
 */

/**
 * リンクの起動設定値
 *
 * @description リンクがクリックされた際のアプリケーション起動方法を定義します。
 * ユーザーの使用環境や好みに応じて、適切なバージョンのアプリケーションを
 * 起動できるようにします。
 *
 * @example
 * ```typescript
 * // 設定の保存例
 * const userPreference: LaunchPreferenceValue = LaunchPreferenceValue.DESKTOP;
 * localStorage.setItem('launchPreference', userPreference);
 *
 * // 設定の読み込み例
 * const savedPreference = localStorage.getItem('launchPreference') as LaunchPreferenceValue;
 * if (savedPreference === LaunchPreferenceValue.WEB) {
 *   // Webアプリケーションを起動
 *   window.open('/web-app', '_blank');
 * } else if (savedPreference === LaunchPreferenceValue.DESKTOP) {
 *   // デスクトップアプリケーションを起動
 *   window.open('lichtblick://open', '_self');
 * }
 * ```
 *
 * @note この設定は、ユーザーの利便性を向上させるために、
 * 一度設定された後は記憶され、次回以降のリンククリック時に適用されます。
 */
export enum LaunchPreferenceValue {
  /**
   * 毎回確認する
   *
   * @description リンクがクリックされるたびに、ユーザーに対して
   * Webアプリまたはデスクトップアプリのどちらを起動するかを
   * 確認ダイアログで尋ねます。
   *
   * 用途:
   * - 初回利用時のデフォルト設定
   * - ユーザーが都度選択したい場合
   * - 複数の環境を使い分けたい場合
   */
  ASK = "ask",

  /**
   * Webアプリケーションで開く
   *
   * @description リンクを常にWebブラウザ上のアプリケーションで開きます。
   * インストール不要で、どのデバイスからでもアクセス可能です。
   *
   * 用途:
   * - ブラウザベースの環境を好む場合
   * - 複数デバイスでの利用
   * - インストール権限がない環境
   * - 一時的な利用
   */
  WEB = "web",

  /**
   * デスクトップアプリケーションで開く
   *
   * @description リンクを常にローカルにインストールされた
   * デスクトップアプリケーションで開きます。
   * より高いパフォーマンスとネイティブな機能を提供します。
   *
   * 用途:
   * - 高性能が必要な作業
   * - オフライン環境での利用
   * - ファイルシステムへの直接アクセス
   * - 長時間の作業セッション
   */
  DESKTOP = "desktop",
}
