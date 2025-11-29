// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * StudioLogsSettingsProviderディレクトリのエントリーポイント
 *
 * Studioログ設定管理機能のメインコンポーネントをエクスポートします。
 * このディレクトリは、アプリケーション全体のログ設定を管理する
 * 専用Providerの実装を含んでいます。
 *
 * ## エクスポート内容
 * - StudioLogsSettingsProvider: メインプロバイダーコンポーネント
 * - 関連する型定義とストア作成関数
 *
 * ## 主な機能
 * - グローバルログレベル管理
 * - ログチャンネル個別制御
 * - LocalStorage永続化
 * - 動的チャンネル検出
 */
export * from "./StudioLogsSettingsProvider";
