// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * AppParameters.ts
 *
 * 【概要】
 * アプリケーション起動時のパラメータを定義するEnumファイル。
 * アプリケーションの初期状態を制御するために使用される。
 *
 * 【主な使用箇所】
 * - AppParametersContext.ts: 型定義として使用
 * - AppParametersProvider.tsx: プロバイダーでの型安全性確保
 * - App.tsx: アプリケーションの起動時パラメータとして使用
 * - 各種テストファイル: テスト用のパラメータ設定
 *
 * 【処理フロー】
 * 1. アプリケーション起動時にURLパラメータや設定から値を取得
 * 2. AppParametersProviderを通じてContext APIで全体に提供
 * 3. 各コンポーネントでuseAppParameters()フックを使用してアクセス
 *
 * 【特徴】
 * - 型安全性: Enumによりパラメータキーのタイプセーフティを保証
 * - 拡張性: 新しいパラメータを追加しやすい構造
 * - 一元管理: アプリケーションパラメータの定義を一箇所に集約
 *
 * 【使用例】
 * ```typescript
 * // Context経由でのアクセス
 * const appParameters = useAppParameters();
 * const defaultLayout = appParameters[AppParametersEnum.DEFAULT_LAYOUT];
 * const startTime = appParameters[AppParametersEnum.TIME];
 * ```
 */

/**
 * AppParametersEnum
 *
 * アプリケーション起動時のパラメータキーを定義するEnum。
 * 型安全性を保証し、パラメータの一元管理を実現する。
 */
export enum AppParametersEnum {
  /**
   * DEFAULT_LAYOUT
   *
   * 【用途】アプリケーション起動時に特定のレイアウトを適用
   * 【値の形式】レイアウト名またはレイアウトID（文字列）
   * 【使用場面】
   * - URLパラメータ: ?defaultLayout=MyLayout
   * - 設定ファイル: { defaultLayout: "MyLayout" }
   * - 起動スクリプト: --defaultLayout=MyLayout
   *
   * 【処理の流れ】
   * 1. アプリケーション起動時にパラメータを取得
   * 2. LayoutManagerでレイアウトを検索
   * 3. 見つかった場合は該当レイアウトを適用
   * 4. 見つからない場合はデフォルトレイアウトを使用
   *
   * 【関連ファイル】
   * - LayoutManager.tsx: レイアウトの適用処理
   * - App.tsx: パラメータの受け渡し
   */
  DEFAULT_LAYOUT = "defaultLayout",

  /**
   * TIME
   *
   * 【用途】アプリケーション起動時に特定の時刻から再生を開始
   * 【値の形式】ISO 8601形式の時刻文字列またはタイムスタンプ
   * 【使用場面】
   * - URLパラメータ: ?time=2023-01-01T12:00:00Z
   * - 設定ファイル: { time: "2023-01-01T12:00:00Z" }
   * - 起動スクリプト: --time=2023-01-01T12:00:00Z
   *
   * 【処理の流れ】
   * 1. アプリケーション起動時にパラメータを取得
   * 2. 時刻文字列をパースしてタイムスタンプに変換
   * 3. PlayerManagerで再生開始時刻を設定
   * 4. データソースから該当時刻のデータを取得・表示
   *
   * 【関連ファイル】
   * - PlayerManager.tsx: 再生時刻の制御
   * - TimelineInteractionStateProvider.tsx: タイムライン表示の制御
   * - 各種Player: データソースからの時刻指定データ取得
   */
  TIME = "time",
}
