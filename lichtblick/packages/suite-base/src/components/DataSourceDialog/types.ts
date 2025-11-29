// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { ReactNode } from "react";

/**
 * DataSourceDialog コンポーネント群で使用される型定義
 *
 * このファイルは、データソース接続ダイアログシステム全体で共有される
 * 型定義を提供します。主にUIコンポーネントのプロパティ型と
 * サイドバー項目の構造を定義しています。
 */

/**
 * データソースオプションコンポーネントのプロパティ型
 *
 * DataSourceOptionコンポーネントで使用される型定義で、
 * ユーザーが選択可能なデータソースオプション（ローカルファイル、
 * リモート接続など）の表示に必要な情報を定義します。
 *
 * @example
 * ```tsx
 * const option: DataSourceOptionProps = {
 *   text: "Open Local Files",
 *   secondaryText: "Browse and open local data files",
 *   icon: <FileIcon />,
 *   onClick: () => handleFileOpen(),
 *   target: "_blank"
 * };
 * ```
 */
export type DataSourceOptionProps = {
  /** メインテキスト - オプションの主要な説明 */
  text: string;
  /** セカンダリテキスト - オプションの詳細説明 */
  secondaryText: string;
  /** アイコン要素 - オプションを視覚的に表現するアイコン */
  icon: React.JSX.Element;
  /** クリックハンドラー - オプションが選択された時の処理 */
  onClick: () => void;
  /** リンクURL - 外部リンクが必要な場合のURL（オプション） */
  href?: string;
  /** リンクターゲット - 新しいタブで開くための設定 */
  target: "_blank";
};

/**
 * サイドバー項目の構造定義
 *
 * SidebarItemsコンポーネントで表示される各項目の構造を定義します。
 * サンプルデータセット、最近使用したファイル、ヘルプリンクなどの
 * 表示に使用されます。
 *
 * @example
 * ```tsx
 * const sidebarItem: SidebarItem = {
 *   id: "sample-data",
 *   title: "Sample Data",
 *   text: <span>Try our sample datasets</span>,
 *   actions: <Button>Load</Button>
 * };
 * ```
 */
export type SidebarItem = {
  /** 一意識別子 - 項目を識別するためのユニークID */
  id: string;
  /** タイトル - 項目の見出し */
  title: string;
  /** テキストコンテンツ - 項目の内容（ReactNodeで柔軟な表示が可能） */
  text: ReactNode;
  /** アクション要素 - ボタンやリンクなどのインタラクション要素（オプション） */
  actions?: ReactNode;
};
