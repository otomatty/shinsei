// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview アイコン関連の型定義
 *
 * このファイルは、Lichtblickアプリケーションで使用される
 * 登録済みアイコンの型定義を提供します。
 *
 * これらのアイコンは、UIコンポーネント、パネル、ツールバー、
 * メニューなどで一貫したビジュアルデザインを提供するために使用されます。
 */

/**
 * 登録済みアイコン名の統合型
 *
 * @description Lichtblickアプリケーションで使用可能な全てのアイコン名を定義します。
 * この型により、存在しないアイコン名の使用を防ぎ、型安全性を確保します。
 *
 * アイコンカテゴリ:
 * - 操作系: Add, AddIn, Cancel, Delete, Edit
 * - ファイル系: OpenFile, FileASPX
 * - 設定系: Settings, PanelSettings, DatabaseSettings
 * - 表示系: FiveTileGrid, Flow, RectangularClipping
 * - 状態系: ErrorBadge, BookStar, Sparkle
 * - 技術系: ROS, GenericScan, Variable2
 * - その他: BacklogList, Blockhead, BlockheadFilled
 *
 * @example
 * ```typescript
 * // アイコンコンポーネントでの使用
 * interface IconProps {
 *   name: RegisteredIconNames;
 *   size?: number;
 * }
 *
 * // 使用例
 * const saveIcon: RegisteredIconNames = "Add";
 * const deleteIcon: RegisteredIconNames = "Delete";
 * const settingsIcon: RegisteredIconNames = "Settings";
 * ```
 *
 * @note 新しいアイコンを追加する場合は、この型定義を更新し、
 * 対応するアイコンファイルも追加する必要があります。
 */
export type RegisteredIconNames =
  | "Add" // 追加操作のアイコン
  | "AddIn" // 内部追加操作のアイコン
  | "BacklogList" // バックログリスト表示のアイコン
  | "Blockhead" // ブロックヘッド（輪郭）のアイコン
  | "BlockheadFilled" // ブロックヘッド（塗りつぶし）のアイコン
  | "BookStar" // ブックマーク・お気に入りのアイコン
  | "Cancel" // キャンセル操作のアイコン
  | "DatabaseSettings" // データベース設定のアイコン
  | "Delete" // 削除操作のアイコン
  | "Edit" // 編集操作のアイコン
  | "ErrorBadge" // エラー状態表示のアイコン
  | "FileASPX" // ASPXファイル形式のアイコン
  | "FiveTileGrid" // 5タイルグリッド表示のアイコン
  | "Flow" // フロー・ワークフローのアイコン
  | "GenericScan" // 汎用スキャン操作のアイコン
  | "OpenFile" // ファイル開く操作のアイコン
  | "PanelSettings" // パネル設定のアイコン
  | "RectangularClipping" // 矩形クリッピングのアイコン
  | "Settings" // 一般設定のアイコン
  | "Sparkle" // スパークル・特別な状態のアイコン
  | "Variable2" // 変数・パラメータのアイコン
  | "ROS"; // ROS（Robot Operating System）のアイコン
