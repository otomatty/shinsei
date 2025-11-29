// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * レイアウトバージョン管理システムの定数定義
 *
 * Lichtblick Suiteのレイアウトデータには後方互換性の維持のためバージョン管理が実装されています。
 * 新しいバージョンのアプリケーションで古いレイアウトを開く際の互換性チェックに使用されます。
 */

/**
 * サポート対象の最大レイアウトバージョン
 *
 * 現在のアプリケーションがサポートできるレイアウトデータの最大バージョンです。
 * このバージョンを超えるレイアウトファイルが読み込まれた場合、
 * 互換性エラーとして処理され、ユーザーに警告が表示されます。
 *
 * ## 使用場面
 * - レイアウト読み込み時の互換性チェック
 * - 新しいバージョンで作成されたレイアウトの検出
 * - ユーザーへの互換性警告表示の判定
 *
 * ## バージョン管理ポリシー
 * - バージョン1: 現在の安定版レイアウト形式
 * - 将来のバージョン: 破壊的変更が導入された際にインクリメント
 *
 * @see IncompatibleLayoutVersionAlert - バージョン互換性エラー時の警告UI
 * @see CurrentLayoutProvider - バージョンチェック実装箇所
 */
export const MAX_SUPPORTED_LAYOUT_VERSION = 1;
