// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { MosaicNode, MosaicPath } from "react-mosaic-component";

import { VariableValue } from "@lichtblick/suite";
import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { TabLocation } from "@lichtblick/suite-base/types/layouts";
import {
  MosaicDropTargetPosition,
  PanelConfig,
  PlaybackConfig,
  SavedProps,
  UserScripts,
} from "@lichtblick/suite-base/types/panels";

/**
 * レイアウトデータの型定義
 *
 * レイアウト全体の状態を表現する中核的なデータ構造。
 * パネルの配置、設定、グローバル変数、再生設定などを含む。
 *
 * 構造:
 * - configById: パネル設定のマップ
 * - layout: モザイクレイアウト構造
 * - globalVariables: グローバル変数
 * - playbackConfig: 再生設定
 * - userNodes: ユーザースクリプト
 * - version: レイアウトバージョン
 */
export type LayoutData = {
  /**
   * パネル設定をパネルIDでマップしたオブジェクト
   *
   * 各パネルの設定（トピック、表示オプションなど）を
   * パネルIDをキーとして保存する。
   */
  configById: SavedProps;

  /**
   * モザイクレイアウト構造
   *
   * react-mosaic-componentで使用される階層構造。
   * パネルの配置、分割、タブ化を表現する。
   */
  layout?: MosaicNode<string>;

  /**
   * グローバル変数
   *
   * レイアウト全体で共有される変数。
   * パネル間でのデータ共有に使用される。
   */
  globalVariables: GlobalVariables;

  /**
   * 再生設定
   *
   * データの再生速度、ループ設定、時間範囲などの
   * 再生に関する設定。
   */
  playbackConfig: PlaybackConfig;

  /**
   * ユーザースクリプト
   *
   * ユーザーが定義したカスタムノードやスクリプト。
   * データ処理やカスタム機能の実装に使用される。
   */
  userNodes: UserScripts;

  /**
   * @deprecated configByIdに名前変更されました
   *
   * 後方互換性のために残されている旧フィールド。
   */
  savedProps?: SavedProps;

  /**
   * オプションのバージョン番号
   *
   * 古い互換性のないバージョンのstudioが
   * レイアウトを読み込んで破損させることを防ぐために設定。
   */
  version?: number;
};

/**
 * パネル設定ペイロードの型定義
 *
 * パネル設定を更新する際に使用されるデータ構造。
 * 個別のパネルまたは複数のパネルの設定を一括更新できる。
 */
export type ConfigsPayload = {
  /** パネルID */
  id: string;
  /**
   * 上書きフラグ
   *
   * trueの場合、既存の設定を完全に上書きする。
   * falseの場合、既存の設定とマージする。
   */
  override?: boolean;
  /** 新しいパネル設定 */
  config: PanelConfig;
  /** デフォルト設定（フォールバック用） */
  defaultConfig?: PanelConfig;
};

/**
 * パネルレイアウト変更ペイロードの型定義
 *
 * モザイクレイアウト構造を変更する際のデータ。
 * パネルの追加、削除、移動時に使用される。
 */
export type ChangePanelLayoutPayload = {
  /** 新しいレイアウト構造 */
  layout?: MosaicNode<string>;
  /** 不要な設定を削除するかどうか */
  trimConfigById?: boolean;
};

/**
 * 設定保存ペイロードの型定義
 *
 * 複数のパネル設定を一括で保存する際のデータ構造。
 * バッチ更新によるパフォーマンス最適化に使用される。
 */
export type SaveConfigsPayload = {
  /** 設定配列 */
  configs: ConfigsPayload[];
};

/**
 * パネル毎の関数型定義
 *
 * パネル設定を変換するための関数型。
 * 設定の更新や変換処理に使用される。
 */
type PerPanelFunc<Config> = (arg0: Config) => Config;

/**
 * 完全設定保存ペイロードの型定義
 *
 * 特定のパネルタイプの全設定を一括更新する際のデータ。
 * パネルタイプ全体の設定変更に使用される。
 */
export type SaveFullConfigPayload = {
  /** 対象パネルタイプ */
  panelType: string;
  /** パネル毎の変換関数 */
  perPanelFunc: PerPanelFunc<PanelConfig>;
};

/**
 * タブパネル作成ペイロードの型定義
 *
 * 新しいタブパネルを作成する際のデータ構造。
 * 既存パネルのタブ化や新規タブ作成に使用される。
 */
export type CreateTabPanelPayload = {
  /** 置き換え対象のパネルID（オプション） */
  idToReplace?: string;
  /** 新しいレイアウト構造 */
  layout: MosaicNode<string>;
  /** 削除するパネルIDの配列 */
  idsToRemove: readonly string[];
  /** 単一タブフラグ */
  singleTab: boolean;
};

/**
 * パネル設定保存アクション
 *
 * 複数のパネル設定を一括で保存するアクション。
 * Redux風のアクション定義パターンを使用。
 */
export type SAVE_PANEL_CONFIGS = { type: "SAVE_PANEL_CONFIGS"; payload: SaveConfigsPayload };

/**
 * 完全パネル設定保存アクション
 *
 * 特定のパネルタイプの全設定を保存するアクション。
 */
export type SAVE_FULL_PANEL_CONFIG = {
  type: "SAVE_FULL_PANEL_CONFIG";
  payload: SaveFullConfigPayload;
};

/**
 * タブパネル作成アクション
 *
 * 新しいタブパネルを作成するアクション。
 */
export type CREATE_TAB_PANEL = { type: "CREATE_TAB_PANEL"; payload: CreateTabPanelPayload };

/**
 * パネルレイアウト変更アクション
 *
 * モザイクレイアウト構造を変更するアクション。
 */
export type CHANGE_PANEL_LAYOUT = {
  type: "CHANGE_PANEL_LAYOUT";
  payload: ChangePanelLayoutPayload;
};

/**
 * グローバルデータ上書きアクション
 *
 * グローバル変数を完全に上書きするアクション。
 * 既存の変数はすべて削除される。
 */
export type OVERWRITE_GLOBAL_DATA = {
  type: "OVERWRITE_GLOBAL_DATA";
  payload: Record<string, VariableValue>;
};

/**
 * グローバルデータ設定アクション
 *
 * グローバル変数を設定するアクション。
 * 既存の変数とマージされる。
 */
export type SET_GLOBAL_DATA = {
  type: "SET_GLOBAL_DATA";
  payload: Record<string, VariableValue>;
};

/**
 * ユーザーノード設定アクション
 *
 * ユーザースクリプトを設定するアクション。
 * カスタムノードの追加や更新に使用される。
 */
export type SET_STUDIO_NODES = { type: "SET_USER_NODES"; payload: Partial<UserScripts> };

/**
 * 再生設定アクション
 *
 * データ再生に関する設定を変更するアクション。
 */
export type SET_PLAYBACK_CONFIG = { type: "SET_PLAYBACK_CONFIG"; payload: Partial<PlaybackConfig> };

/**
 * パネル閉じるペイロードの型定義
 *
 * パネルを閉じる際に必要な情報。
 * モザイク構造からパネルを削除するために使用される。
 */
export type ClosePanelPayload = {
  /** タブID（タブ内のパネルの場合） */
  tabId?: string;
  /** 現在のモザイクルート */
  root: MosaicNode<string>;
  /** パネルのモザイクパス */
  path: MosaicPath;
};

/**
 * パネル閉じるアクション
 *
 * 指定されたパネルを閉じるアクション。
 */
export type CLOSE_PANEL = { type: "CLOSE_PANEL"; payload: ClosePanelPayload };

/**
 * パネル分割ペイロードの型定義
 *
 * パネルを分割する際に必要な情報。
 * 水平または垂直分割をサポートする。
 */
export type SplitPanelPayload = {
  /** タブID（タブ内のパネルの場合） */
  tabId?: string;
  /** 分割対象のパネルID */
  id: string;
  /** 分割方向（行または列） */
  direction: "row" | "column";
  /** 現在のモザイクルート */
  root: MosaicNode<string>;
  /** パネルのモザイクパス */
  path: MosaicPath;
  /** 新しいパネルの設定 */
  config: PanelConfig;
};

/**
 * パネル分割アクション
 *
 * パネルを指定された方向に分割するアクション。
 */
export type SPLIT_PANEL = { type: "SPLIT_PANEL"; payload: SplitPanelPayload };

/**
 * パネル交換ペイロードの型定義
 *
 * パネルのタイプを変更する際に必要な情報。
 * 既存パネルを異なるタイプのパネルに置き換える。
 */
export type SwapPanelPayload = {
  /** タブID（タブ内のパネルの場合） */
  tabId?: string;
  /** 元のパネルID */
  originalId: string;
  /** 新しいパネルタイプ */
  type: string;
  /** 現在のモザイクルート */
  root: MosaicNode<string>;
  /** パネルのモザイクパス */
  path: MosaicPath;
  /** 新しいパネルの設定 */
  config: PanelConfig;
};

/**
 * パネル交換アクション
 *
 * パネルを別のタイプのパネルに交換するアクション。
 */
export type SWAP_PANEL = { type: "SWAP_PANEL"; payload: SwapPanelPayload };

/**
 * タブ移動ペイロードの型定義
 *
 * タブを移動する際の移動元と移動先の情報。
 * タブの並び替えやタブ間の移動に使用される。
 */
export type MoveTabPayload = {
  /** 移動元のタブ位置 */
  source: TabLocation;
  /** 移動先のタブ位置 */
  target: TabLocation;
};

/**
 * タブ移動アクション
 *
 * タブを移動するアクション。
 */
export type MOVE_TAB = { type: "MOVE_TAB"; payload: MoveTabPayload };

/**
 * パネル追加ペイロードの型定義
 *
 * 新しいパネルを追加する際に必要な情報。
 * パネルIDは事前に生成されている必要がある。
 */
export type AddPanelPayload = {
  /**
   * パネルID
   *
   * `getPanelIdForType`が返す形式でフォーマットされている必要がある。
   * 自動生成ではなく引数として必要なのは、呼び出し元が
   * 新しいIDを使用する可能性があるため（例：新しく追加されたパネルを選択）。
   */
  id: string;
  /** タブID（タブ内に追加する場合） */
  tabId?: string;
  /** パネル設定（オプション） */
  config?: PanelConfig;
};

/**
 * パネル追加アクション
 *
 * 新しいパネルを追加するアクション。
 */
export type ADD_PANEL = { type: "ADD_PANEL"; payload: AddPanelPayload };

/**
 * パネルドロップペイロードの型定義
 *
 * ドラッグ&ドロップでパネルを配置する際の情報。
 * パネルパレットからのドロップ操作に使用される。
 */
export type DropPanelPayload = {
  /** 新しいパネルタイプ */
  newPanelType: string;
  /** ドロップ先のモザイクパス */
  destinationPath?: MosaicPath;
  /** ドロップ位置（上下左右） */
  position?: "top" | "bottom" | "left" | "right";
  /** タブID（タブ内にドロップする場合） */
  tabId?: string;
  /** パネル設定（オプション） */
  config?: PanelConfig;
};

/**
 * パネルドロップアクション
 *
 * ドラッグ&ドロップでパネルを配置するアクション。
 */
export type DROP_PANEL = { type: "DROP_PANEL"; payload: DropPanelPayload };

/**
 * ドラッグ開始ペイロードの型定義
 *
 * パネルのドラッグ操作を開始する際の情報。
 * ドラッグ状態の管理に使用される。
 */
export type StartDragPayload = {
  /** ドラッグ対象のモザイクパス */
  path: MosaicPath;
  /** 移動元のタブID（タブ内のパネルの場合） */
  sourceTabId?: string;
};

/**
 * ドラッグ開始アクション
 *
 * パネルのドラッグ操作を開始するアクション。
 */
export type START_DRAG = { type: "START_DRAG"; payload: StartDragPayload };

/**
 * ドラッグ終了ペイロードの型定義
 *
 * パネルのドラッグ操作を終了する際の情報。
 * ドロップ処理やロールバック処理に使用される。
 */
export type EndDragPayload = {
  /** 元のレイアウト構造（ロールバック用） */
  originalLayout: MosaicNode<string>;
  /** 元の保存済み設定（ロールバック用） */
  originalSavedProps: SavedProps;
  /** ドラッグされたパネルID */
  panelId: string;
  /** 移動元のタブID */
  sourceTabId?: string;
  /** 移動先のタブID */
  targetTabId?: string;
  /** ドロップ位置 */
  position?: MosaicDropTargetPosition;
  /** ドロップ先のモザイクパス */
  destinationPath?: MosaicPath;
  /** 自身のモザイクパス */
  ownPath: MosaicPath;
};

/**
 * ドラッグ終了アクション
 *
 * パネルのドラッグ操作を終了するアクション。
 */
export type END_DRAG = { type: "END_DRAG"; payload: EndDragPayload };

/**
 * パネルアクションの統合型
 *
 * すべてのパネル関連アクションを統合したユニオン型。
 * レイアウト管理システムで使用される全アクションを包含する。
 *
 * 含まれるアクション:
 * - レイアウト変更系: CHANGE_PANEL_LAYOUT, CREATE_TAB_PANEL
 * - 設定保存系: SAVE_PANEL_CONFIGS, SAVE_FULL_PANEL_CONFIG
 * - グローバル状態系: OVERWRITE_GLOBAL_DATA, SET_GLOBAL_DATA
 * - システム設定系: SET_STUDIO_NODES, SET_PLAYBACK_CONFIG
 * - パネル操作系: CLOSE_PANEL, SPLIT_PANEL, SWAP_PANEL, ADD_PANEL
 * - ドラッグ&ドロップ系: DROP_PANEL, START_DRAG, END_DRAG
 * - タブ操作系: MOVE_TAB
 */
export type PanelsActions =
  | CHANGE_PANEL_LAYOUT
  | SAVE_PANEL_CONFIGS
  | SAVE_FULL_PANEL_CONFIG
  | CREATE_TAB_PANEL
  | OVERWRITE_GLOBAL_DATA
  | SET_GLOBAL_DATA
  | SET_STUDIO_NODES
  | SET_PLAYBACK_CONFIG
  | CLOSE_PANEL
  | SPLIT_PANEL
  | SWAP_PANEL
  | MOVE_TAB
  | ADD_PANEL
  | DROP_PANEL
  | START_DRAG
  | END_DRAG;
