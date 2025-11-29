// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { Player, PlayerMetricsCollectorInterface } from "@lichtblick/suite-base/players/types";
import { RegisteredIconNames } from "@lichtblick/suite-base/types/Icons";

/**
 * データソースファクトリーの初期化引数
 *
 * データソースを初期化する際に必要なパラメータを定義
 */
export type DataSourceFactoryInitializeArgs = {
  /** メトリクス収集インターフェース - パフォーマンス監視用 */
  metricsCollector: PlayerMetricsCollectorInterface;

  /** 単一ファイル - ファイルベースのデータソース用 */
  file?: File;

  /** 複数ファイル - マルチファイル対応データソース用 */
  files?: File[];

  /** 接続パラメータ - 接続ベースのデータソース用 */
  params?: Record<string, string | undefined>;
};

/**
 * データソースファクトリーのタイプ
 *
 * - file: ファイルベースのデータソース
 * - connection: 接続ベースのデータソース
 * - sample: サンプルデータソース
 */
export type DataSourceFactoryType = "file" | "connection" | "sample";

/**
 * フォーム設定のフィールド定義
 *
 * データソース設定UIで使用されるフィールドの仕様
 */
export type Field = {
  /** フィールドの一意識別子 */
  id: string;

  /** 表示ラベル */
  label: string;

  /** デフォルト値 */
  defaultValue?: string;

  /** プレースホルダーテキスト */
  placeholder?: string;

  /** フィールドの説明 */
  description?: string;

  /**
   * バリデーション関数（オプション）
   *
   * 値を検証し、エラーがある場合はErrorオブジェクトを返す。
   * undefinedを返した場合は値が受け入れられる。
   */
  validate?: (value: string) => Error | undefined;
};

/**
 * データソースファクトリーインターフェース
 *
 * 各データソースタイプの実装が従うべきインターフェース。
 * ファクトリーパターンを使用してPlayerインスタンスを生成する。
 */
export interface IDataSourceFactory {
  /** ファクトリーの一意識別子 */
  id: string;

  /**
   * 代替IDのリスト
   *
   * 後方互換性のために使用される古いIDのリスト
   * https://github.com/foxglove/studio/issues/4937
   */
  legacyIds?: string[];

  /** データソースのタイプ */
  type: DataSourceFactoryType;

  /** 表示名 */
  displayName: string;

  /** アイコン名 */
  iconName?: RegisteredIconNames;

  /** 説明文 */
  description?: string;

  /** ドキュメントリンク */
  docsLinks?: { label?: string; url: string }[];

  /** 無効化理由（無効な場合） */
  disabledReason?: string | React.JSX.Element;

  /** バッジテキスト */
  badgeText?: string;

  /** 非表示フラグ */
  hidden?: boolean;

  /** 警告メッセージ */
  warning?: string | React.JSX.Element;

  /** サンプルレイアウト - このデータソース用の推奨レイアウト */
  sampleLayout?: LayoutData;

  /** フォーム設定 - データソース設定UI用 */
  formConfig?: {
    // 初期化引数は _id_ フィールドのキーで設定される
    fields: Field[];
  };

  /**
   * サポートされるファイルタイプ
   *
   * データソースが「ファイルを開く」ワークフローをサポートする場合、
   * この配列でサポートされるファイルタイプを指定
   */
  supportedFileTypes?: string[];

  /** マルチファイルサポートフラグ */
  supportsMultiFile?: boolean;

  /**
   * プレイヤーを初期化する
   *
   * @param args 初期化引数
   * @returns 初期化されたPlayerインスタンス、または失敗時はundefined
   */
  initialize: (args: DataSourceFactoryInitializeArgs) => Player | undefined;
}

/**
 * 最近選択されたソース情報
 *
 * _id_ は不透明で、PlayerSelectionContext実装に依存する
 */
export type RecentSource = {
  /** 不透明な識別子 */
  id: string;

  /** 表示タイトル */
  title: string;

  /** 表示ラベル（オプション） */
  label?: string;
};

/**
 * ファイルデータソースの引数
 *
 * ファイルインスタンスまたはハンドルを受け入れる
 */
type FileDataSourceArgs = {
  type: "file";
  files?: File[];
  handles?: FileSystemFileHandle[]; // foxglove-depcheck-used: @types/wicg-file-system-access
};

/**
 * 接続データソースの引数
 */
type ConnectionDataSourceArgs = {
  type: "connection";
  params?: Record<string, string | undefined>;
};

/**
 * データソース引数の統合型
 */
export type DataSourceArgs = FileDataSourceArgs | ConnectionDataSourceArgs;

/**
 * PlayerSelectionContext - データソース選択とプレイヤー管理
 *
 * このコンテキストは、利用可能なデータソースの管理と
 * 現在のデータソースの選択状態を提供します。
 *
 * 主な責任:
 * - データソースファクトリーの管理
 * - データソース選択の状態管理
 * - 最近使用したソースの追跡
 * - ファイル・接続選択の抽象化
 */
export interface PlayerSelection {
  /**
   * データソースを選択する
   *
   * @param sourceId データソースファクトリーのID
   * @param args データソース固有の引数（オプション）
   */
  selectSource: (sourceId: string, args?: DataSourceArgs) => void;

  /**
   * 最近使用したソースを選択する
   *
   * @param recentId 最近使用したソースのID
   */
  selectRecent: (recentId: string) => void;

  /** 現在選択されているデータソース */
  selectedSource?: IDataSourceFactory;

  /** 利用可能なデータソースのリスト */
  availableSources: readonly IDataSourceFactory[];

  /** 最近選択されたソースのリスト */
  recentSources: readonly RecentSource[];
}

/**
 * PlayerSelectionContext - デフォルト値付きでコンテキストを作成
 *
 * デフォルト実装:
 * - selectSource/selectRecent: 何もしない
 * - availableSources/recentSources: 空配列
 */
const PlayerSelectionContext = createContext<PlayerSelection>({
  selectSource: () => {},
  selectRecent: () => {},
  availableSources: [],
  recentSources: [],
});
PlayerSelectionContext.displayName = "PlayerSelectionContext";

/**
 * usePlayerSelection - PlayerSelectionContextの値を取得するカスタムフック
 *
 * @returns PlayerSelection - プレイヤー選択コンテキストの値
 *
 * 使用例:
 * ```typescript
 * const { availableSources, selectSource } = usePlayerSelection();
 * const handleSourceSelect = (sourceId: string) => {
 *   selectSource(sourceId, { type: "connection", params: { url: "..." } });
 * };
 * ```
 */
export function usePlayerSelection(): PlayerSelection {
  return useContext(PlayerSelectionContext);
}

export default PlayerSelectionContext;
