// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AppBar Types - アプリケーションバー型定義
 *
 * AppBarコンポーネント群で使用される型定義を提供します。
 * メニューアイテム、プロパティ、イベントハンドラーなどの型安全性を保証します。
 */

import { PopoverPosition, PopoverReference } from "@mui/material";
import { MouseEventHandler, ReactNode } from "react";

/**
 * AppBarMenuItem - アプリケーションバーメニューアイテム型
 *
 * AppMenuやNestedMenuItemで使用されるメニューアイテムの型定義。
 * 3つの異なるタイプのメニューアイテムをサポート：
 * - item: クリック可能なメニューアイテム
 * - subheader: セクションヘッダー（クリック不可）
 * - divider: 区切り線
 *
 * @example
 * ```typescript
 * const menuItems: AppBarMenuItem[] = [
 *   { type: "item", label: "Open", key: "open", onClick: handleOpen },
 *   { type: "divider" },
 *   { type: "subheader", label: "Recent Files", key: "recent" }
 * ];
 * ```
 */
export type AppBarMenuItem =
  | {
      /** アイテムタイプ: クリック可能なメニューアイテム */
      type: "item";
      /** メニューアイテムの表示ラベル（文字列またはReactNode） */
      label: ReactNode;
      /** 一意識別子（React keyとしても使用） */
      key: string;
      /** 無効化フラグ（true時はクリック不可、グレーアウト） */
      disabled?: boolean;
      /** キーボードショートカット表示文字列（例: "Ctrl+O"） */
      shortcut?: string;
      /** クリック時のイベントハンドラー */
      onClick?: MouseEventHandler<HTMLElement>;
      /** 外部リンクフラグ（true時は新しいタブで開く） */
      external?: boolean;
      /** メニューアイテムのアイコン（ReactNode） */
      icon?: ReactNode;
      /** テスト用のdata-testid属性値 */
      dataTestId?: string;
    }
  | {
      /** アイテムタイプ: セクションヘッダー（クリック不可） */
      type: "subheader";
      /** ヘッダーの表示ラベル */
      label: ReactNode;
      /** 一意識別子 */
      key: string;
    }
  | {
      /** アイテムタイプ: 区切り線（視覚的な分離） */
      type: "divider";
    };

/**
 * AppMenuProps - アプリケーションメニューコンポーネントのプロパティ
 *
 * AppMenuコンポーネントで使用されるプロパティの型定義。
 * Material-UIのPopoverコンポーネントの位置決めとイベント処理を管理します。
 *
 * @example
 * ```typescript
 * <AppMenu
 *   open={isOpen}
 *   handleClose={handleClose}
 *   anchorEl={anchorElement}
 *   anchorReference="anchorEl"
 * />
 * ```
 */
export type AppMenuProps = {
  /** メニューを閉じるためのイベントハンドラー */
  handleClose: () => void;
  /** メニューの位置決めに使用するHTML要素（anchorReference="anchorEl"時に使用） */
  anchorEl?: HTMLElement;
  /** アンカーの参照方法（"anchorEl" | "anchorPosition" | "none"） */
  anchorReference?: PopoverReference;
  /** メニューの絶対位置（anchorReference="anchorPosition"時に使用） */
  anchorPosition?: PopoverPosition;
  /** Portal使用無効化フラグ（true時はDOMの親要素内にレンダリング） */
  disablePortal?: boolean;
  /** メニューの開閉状態（true時は表示、false時は非表示） */
  open: boolean;
};
