// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview PanelRemounter - パネル再マウント制御コンポーネント
 *
 * このファイルは、パネルの強制再マウント機能を実装している。
 * 特定の条件下でパネルコンポーネントを完全に再初期化する必要がある場合に使用される。
 *
 * ## 主要機能
 *
 * ### 1. 強制再マウント制御
 * - Reactキーによる強制コンポーネント再作成
 * - パネルID、タブID、シーケンス番号の変更検出
 * - 状態のクリーンアップと再初期化
 *
 * ### 2. 条件付き再マウント
 * - パネル設定の重要な変更時
 * - タブ間のパネル移動時
 * - パネル状態の不整合修復時
 *
 * ### 3. パフォーマンス最適化
 * - 必要な場合のみの再マウント実行
 * - 不要な再レンダリングの防止
 * - 状態管理の効率化
 *
 * ## 技術的背景
 *
 * ### React キーによる再マウント
 * Reactでは、コンポーネントの`key`プロパティが変更されると、
 * 既存のコンポーネントインスタンスが破棄され、新しいインスタンスが作成される。
 * これにより、完全な状態リセットが可能になる。
 *
 * ### 使用場面
 * - パネル設定の根本的な変更
 * - タブ間でのパネル移動
 * - エラー状態からの復旧
 * - パネル状態の不整合修復
 *
 * ## アーキテクチャ設計
 *
 * ```
 * PanelRemounter
 * ├── 状態監視
 * │   ├── パネルID (id)
 * │   ├── タブID (tabId)
 * │   └── シーケンス番号 (sequenceNumber)
 * ├── キー生成
 * │   └── 複合キー: ${id}${tabId}${sequenceNumber}
 * └── 再マウント制御
 *     ├── キー変更検出
 *     └── Fragment再作成
 * ```
 *
 * ## 技術的特徴
 *
 * - **軽量実装**: 最小限のオーバーヘッド
 * - **確実な再マウント**: Reactキーによる確実な制御
 * - **状態連携**: PanelStateStoreとの統合
 * - **型安全性**: TypeScriptによる型保証
 *
 * ## 使用例
 *
 * ```typescript
 * // パネル内での使用
 * <PanelRemounter id={panelId} tabId={tabId}>
 *   <MyPanelComponent />
 * </PanelRemounter>
 * ```
 *
 * @author Lichtblick Team
 * @since 2023
 */

import { Fragment, ReactNode, useCallback } from "react";

import {
  PanelStateStore,
  usePanelStateStore,
} from "@lichtblick/suite-base/context/PanelStateContext";

/**
 * PanelRemounterコンポーネントのプロパティ型定義
 */
interface PanelRemounterProps {
  /** 再マウント対象の子コンポーネント */
  children: ReactNode;
  /** パネルの一意識別子 */
  id: string;
  /** 所属するタブのID（タブ外パネルの場合はundefined） */
  tabId: undefined | string;
}

/**
 * パネル再マウント制御コンポーネント
 *
 * パネルの重要なプロパティ（ID、タブID、シーケンス番号）が変更された時に
 * 子コンポーネントを強制的に再マウントする。これにより、パネルの状態を
 * 完全にリセットし、新しい条件で再初期化することが可能になる。
 *
 * ## 動作原理
 *
 * ### Reactキーによる再マウント
 * Reactでは、コンポーネントの`key`プロパティが変更されると、
 * 既存のコンポーネントインスタンスが破棄され、新しいインスタンスが
 * 作成される。この仕組みを利用して強制再マウントを実現している。
 *
 * ### 監視対象
 * - **パネルID**: パネルの基本識別子
 * - **タブID**: タブ間移動の検出
 * - **シーケンス番号**: 設定変更の検出
 *
 * ### キー生成ロジック
 * ```typescript
 * const key = `${id}${tabId ?? ""}${sequenceNumber}`;
 * ```
 *
 * ## 使用場面
 *
 * ### 1. パネル設定の重要な変更
 * パネルの根本的な設定が変更され、既存の状態では
 * 正常に動作しない場合の状態リセット
 *
 * ### 2. タブ間でのパネル移動
 * パネルが異なるタブ間で移動した場合の
 * コンテキスト情報の更新
 *
 * ### 3. エラー状態からの復旧
 * パネルが不正な状態に陥った場合の
 * 強制的な状態クリア
 *
 * ## パフォーマンス考慮事項
 *
 * - **必要最小限の再マウント**: 本当に必要な場合のみ実行
 * - **状態の完全リセット**: 既存状態の確実なクリーンアップ
 * - **初期化コストの考慮**: 再マウントに伴う初期化処理
 *
 * @param props - コンポーネントプロパティ
 * @returns 再マウント制御された子コンポーネント
 */
export function PanelRemounter({ children, id, tabId }: PanelRemounterProps): React.JSX.Element {
  /**
   * パネル状態ストアからシーケンス番号を取得するセレクター
   *
   * 指定されたパネルIDに対応するシーケンス番号を取得する。
   * シーケンス番号が存在しない場合は0を返す。
   *
   * @param store - パネル状態ストア
   * @returns パネルのシーケンス番号
   */
  const selector = useCallback((store: PanelStateStore) => store.sequenceNumbers[id] ?? 0, [id]);

  /**
   * 現在のパネルのシーケンス番号
   *
   * パネルの設定が変更されるたびにインクリメントされる番号。
   * この値が変更されることで、パネルの再マウントが発生する。
   */
  const sequenceNumber = usePanelStateStore(selector);

  /**
   * 複合キーによる再マウント制御
   *
   * パネルID、タブID、シーケンス番号を組み合わせた文字列を
   * Reactキーとして使用する。これらの値のいずれかが変更されると、
   * 子コンポーネントが完全に再マウントされる。
   *
   * ### キー構成要素
   * - `id`: パネルの基本識別子
   * - `tabId ?? ""`: タブID（undefinedの場合は空文字）
   * - `sequenceNumber`: 設定変更カウンター
   *
   * ### 再マウント発生条件
   * - パネルIDが変更された時
   * - タブIDが変更された時（タブ間移動）
   * - シーケンス番号が変更された時（設定変更）
   */
  return <Fragment key={`${id}${tabId ?? ""}${sequenceNumber}`}>{children}</Fragment>;
}
