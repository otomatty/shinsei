// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext } from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { Immutable, SettingsTree } from "@lichtblick/suite";

/** イミュータブルな設定ツリー型定義 */
export type ImmutableSettingsTree = Immutable<SettingsTree>;

/**
 * PanelStateStore - パネル状態管理ストア
 *
 * 個別パネルの状態を管理するZustandストアです。
 * パネルの再マウント制御、設定UI、デフォルトタイトルなどを管理します。
 *
 * 主な責任:
 * - パネルの強制再マウント制御
 * - パネルごとの設定UIツリー管理
 * - パネルのデフォルトタイトル管理
 * - パネル状態の永続化サポート
 */
export type PanelStateStore = {
  /**
   * パネルの強制再マウント用シーケンス番号
   *
   * パネルが保存された設定の更新を無視して独自の内部状態を維持する場合に使用。
   * パネルを強制的に再マウントさせる仕組みを提供します。
   *
   * キー: パネルID
   * 値: シーケンス番号（インクリメントされるたびに再マウント）
   */
  sequenceNumbers: Record<string, number>;

  /**
   * パネルごとの設定UIツリー
   *
   * 各パネルの設定画面で表示される設定項目の階層構造を管理します。
   * 動的に生成される設定UIの構造を定義します。
   *
   * キー: パネルID
   * 値: 設定ツリー（未定義の場合は設定UIなし）
   */
  settingsTrees: Record<string, ImmutableSettingsTree | undefined>;

  /**
   * パネルごとのデフォルトタイトル
   *
   * 各パネルタイプのデフォルト表示名を管理します。
   * ユーザーがカスタムタイトルを設定していない場合に使用されます。
   *
   * キー: パネルID
   * 値: デフォルトタイトル（未定義の場合はパネルタイプ名を使用）
   */
  defaultTitles: Record<string, string | undefined>;

  /**
   * パネルのシーケンス番号をインクリメントして強制再マウントする
   *
   * パネルが設定変更を反映しない場合や、内部状態をリセットしたい場合に使用。
   * シーケンス番号が変更されると、Reactのkeyが変わりパネルが再マウントされます。
   *
   * @param panelId 再マウントするパネルのID
   *
   * 使用例:
   * ```typescript
   * const incrementSequenceNumber = usePanelStateStore(
   *   (store) => store.incrementSequenceNumber
   * );
   *
   * const handleResetPanel = () => {
   *   incrementSequenceNumber("my-panel-id");
   * };
   * ```
   */
  incrementSequenceNumber: (panelId: string) => void;

  /**
   * パネルの設定UIを更新する
   *
   * パネルの設定画面で表示される設定項目の構造を更新します。
   * 設定項目の追加、削除、変更時に呼び出されます。
   *
   * @param panelId 設定を更新するパネルのID
   * @param settingsTree 新しい設定ツリー（undefinedで設定UIを削除）
   *
   * 使用例:
   * ```typescript
   * const updateSettingsTree = usePanelStateStore(
   *   (store) => store.updateSettingsTree
   * );
   *
   * const handleSettingsChange = (newSettings: SettingsTree) => {
   *   updateSettingsTree("my-panel-id", newSettings);
   * };
   * ```
   */
  updateSettingsTree: (panelId: string, settingsTree: ImmutableSettingsTree | undefined) => void;

  /**
   * パネルのデフォルトタイトルを更新する
   *
   * パネルタイプのデフォルト表示名を設定します。
   * ユーザーがカスタムタイトルを設定していない場合に表示されます。
   *
   * @param panelId タイトルを更新するパネルのID
   * @param title 新しいデフォルトタイトル（undefinedでリセット）
   *
   * 使用例:
   * ```typescript
   * const updateDefaultTitle = usePanelStateStore(
   *   (store) => store.updateDefaultTitle
   * );
   *
   * const handleTitleChange = (newTitle: string) => {
   *   updateDefaultTitle("my-panel-id", newTitle);
   * };
   * ```
   */
  updateDefaultTitle: (panelId: string, title: string | undefined) => void;
};

/**
 * PanelStateContext - パネル状態管理コンテキスト
 *
 * Zustandストアを使用してパネル状態を管理するコンテキスト
 */
export const PanelStateContext = createContext<undefined | StoreApi<PanelStateStore>>(undefined);

/**
 * usePanelStateStore - パネル状態ストアから値を取得するカスタムフック
 *
 * @param selector ストアから値を選択するセレクター関数
 * @returns T セレクターが選択した値
 *
 * 使用例:
 * ```typescript
 * // 特定のパネルのシーケンス番号を取得
 * const sequenceNumber = usePanelStateStore(
 *   (store) => store.sequenceNumbers["my-panel-id"] ?? 0
 * );
 *
 * // 特定のパネルの設定ツリーを取得
 * const settingsTree = usePanelStateStore(
 *   (store) => store.settingsTrees["my-panel-id"]
 * );
 *
 * // 特定のパネルのデフォルトタイトルを取得
 * const defaultTitle = usePanelStateStore(
 *   (store) => store.defaultTitles["my-panel-id"]
 * );
 *
 * // アクションを取得
 * const { incrementSequenceNumber, updateSettingsTree } = usePanelStateStore(
 *   (store) => ({
 *     incrementSequenceNumber: store.incrementSequenceNumber,
 *     updateSettingsTree: store.updateSettingsTree,
 *   })
 * );
 * ```
 */
export function usePanelStateStore<T>(selector: (store: PanelStateStore) => T): T {
  const context = useGuaranteedContext(PanelStateContext);
  return useStore(context, selector);
}
