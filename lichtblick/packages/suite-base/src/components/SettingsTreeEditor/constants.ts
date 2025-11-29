// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview SettingsTreeEditor 定数定義
 *
 * SettingsTreeEditorコンポーネントシステムで使用される定数値を定義します。
 * これらの定数は、UI要素のサイズやレイアウトの統一性を保つために使用されます。
 */

/**
 * ノードヘッダーの最小高さ（ピクセル）
 *
 * 設定ツリーの各ノードのヘッダー部分の最小高さを定義します。
 * この値は、ノードの表示領域を確保し、アイコンやテキストが適切に表示されるために使用されます。
 *
 * @constant {number}
 * @default 35
 *
 * @example
 * ```tsx
 * // スタイル定義での使用例
 * const useStyles = makeStyles()((theme) => ({
 *   nodeHeader: {
 *     minHeight: NODE_HEADER_MIN_HEIGHT,
 *     alignItems: "center",
 *     display: "flex",
 *   },
 * }));
 * ```
 */
export const NODE_HEADER_MIN_HEIGHT = 35;
