// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * SyncInstanceToggle スタイル定義
 *
 * @overview
 * SyncInstanceToggle コンポーネントの同期状態に応じたスタイル定義。
 * tss-react/mui を使用してテーマとプロパティベースのスタイルを提供。
 *
 * @features
 * - 同期状態による色の変化
 * - ホバー状態のビジュアルフィードバック
 * - 階層テキスト表示のレイアウト
 * - Material UI テーマとの統合
 *
 * @architecture
 * - Props ベースの動的スタイル
 * - Material UI テーマシステムの活用
 * - TypeScript による型安全性
 * - CSS-in-JS によるスコープ化
 *
 * @styleStates
 * - syncInstances: true - primary カラーで表示
 * - syncInstances: false - inherit カラーで表示
 */

import { makeStyles } from "tss-react/mui";

/**
 * スタイル生成用のプロパティ型
 *
 * @interface UseStyleProps
 */
type UseStyleProps = {
  /** 同期機能の有効/無効状態 */
  syncInstances: boolean;
};

/**
 * SyncInstanceToggle のスタイル定義
 *
 * @param props - スタイル生成用のプロパティ
 * @param props.syncInstances - 同期状態による色の切り替え
 * @returns useStyles hook とスタイルクラス
 */
export const useStyles = makeStyles<UseStyleProps>()((theme, { syncInstances }) => ({
  /**
   * ボタンのベーススタイル
   *
   * @style
   * - padding: コンパクトな縦横パディング
   * - backgroundColor: 透明背景
   * - color: 同期状態による色の切り替え（primary または inherit）
   * - hover: テーマの hover 背景色
   *
   * @behavior
   * 同期が有効な場合は primary カラー、無効な場合は inherit カラーを使用。
   */
  button: {
    padding: theme.spacing(0.3, 0),
    backgroundColor: "transparent",
    color: syncInstances ? "primary" : "inherit",
    ":hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  /**
   * テキストラッパーのレイアウトスタイル
   *
   * @style
   * - display: flex で垂直配置
   * - alignItems: end で下端揃え
   *
   * @purpose
   * "Sync" と "on/off" のテキストを垂直に配置し、
   * 下端で揃えることで視覚的な統一感を提供。
   */
  textWrapper: {
    display: "flex",
    alignItems: "end",
  },
  /**
   * "Sync" テキストのスタイル
   *
   * @style
   * - fontSize: 12px（中サイズ）
   * - fontWeight: 500（ミディアムウェイト）
   *
   * @purpose
   * メインラベルとして目立つサイズとウェイトを設定。
   */
  syncText: {
    fontSize: 12,
    fontWeight: 500,
  },
  /**
   * "on/off" テキストのスタイル
   *
   * @style
   * - fontSize: 10px（小サイズ）
   * - fontWeight: 400（通常ウェイト）
   * - marginTop: -8px（上方向のオフセット）
   *
   * @purpose
   * サブラベルとして小さく表示し、マイナスマージンで
   * "Sync" テキストに近づけて一体感を演出。
   */
  onOffText: {
    fontSize: 10,
    fontWeight: 400,
    marginTop: "-8px",
  },
}));
