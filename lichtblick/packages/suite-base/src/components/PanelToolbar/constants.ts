// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * **PanelToolbar Constants** - パネルツールバー定数定義
 *
 * パネルツールバーコンポーネントで使用される定数を定義します。
 * レイアウトの一貫性とメンテナンスの容易さを保つため、ハードコーディングを避けて定数として管理します。
 *
 * @constants
 * - **PANEL_TOOLBAR_MIN_HEIGHT**: ツールバーの最小高さ（px）
 *
 * @usage
 * ```tsx
 * import { PANEL_TOOLBAR_MIN_HEIGHT } from "./constants";
 *
 * const styles = {
 *   toolbar: {
 *     minHeight: PANEL_TOOLBAR_MIN_HEIGHT,
 *   }
 * };
 * ```
 */

/**
 * パネルツールバーの最小高さ（ピクセル）
 *
 * 全パネルで統一されたツールバーの高さを保証します。
 * この値は、パネルの最小表示領域やレイアウト計算に使用されます。
 *
 * @constant {number} 30 - 最小高さ（px）
 */
export const PANEL_TOOLBAR_MIN_HEIGHT = 30;
