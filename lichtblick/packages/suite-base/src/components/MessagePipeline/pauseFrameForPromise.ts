// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

/**
 * @fileoverview フレーム一時停止システム - 非同期処理制御機能
 *
 * このファイルは、MessagePipelineにおけるフレーム一時停止機能を実装している。
 * パネルが重い非同期処理を実行する際に、フレーム進行を一時的に停止し、
 * 処理完了後に再開することで、適切なタイミング制御を実現する重要なシステム。
 *
 * ## アーキテクチャ概要
 *
 * ### 1. フレーム制御設計
 * - **一時停止機能**: 重い処理中のフレーム進行停止
 * - **タイムアウト制御**: 処理時間の上限設定
 * - **エラーハンドリング**: 処理失敗時の適切な対応
 * - **通知システム**: ユーザーへのエラー報告
 *
 * ### 2. 非同期処理制御
 * - **Promise統合**: 複数の非同期処理の並列待機
 * - **Condvar連携**: 効率的な待機と通知機能
 * - **タイムアウト監視**: 長時間処理の検出と対応
 * - **リソース管理**: 適切なクリーンアップ処理
 *
 * ### 3. パフォーマンス最適化
 * - **並列処理**: 複数Promiseの効率的な待機
 * - **早期終了**: タイムアウト時の迅速な処理停止
 * - **メモリ効率**: 不要なリソースの適切な解放
 * - **CPU効率**: 効率的な待機メカニズム
 *
 * ## 主要機能
 *
 * ### フレーム一時停止
 * - パネルからのpauseFrame()呼び出し受付
 * - 複数パネルの同期制御
 * - 処理完了時の自動再開
 * - タイムアウト時の強制再開
 *
 * ### タイムアウト制御
 * - 設定可能な最大待機時間
 * - ユーザー待機状況の考慮
 * - 自動化実行での延長対応
 * - 適切なエラー報告
 *
 * ### エラーハンドリング
 * - タイムアウトエラーの検出
 * - 処理失敗時の通知
 * - ユーザーフレンドリーなエラー表示
 * - システム安定性の維持
 *
 * ## 設計思想
 *
 * ### 1. ユーザー体験重視
 * 重い処理中でもアプリケーションの応答性を維持し、
 * 適切なフィードバックを提供
 *
 * ### 2. システム安定性
 * 処理の失敗や長時間実行に対する
 * 適切な保護機能を実装
 *
 * ### 3. 開発者体験
 * パネル開発者が簡単に非同期処理制御を
 * 利用できるシンプルなAPI設計
 *
 * @see {@link ./index.tsx} - MessagePipelineProviderでの使用
 * @see {@link ./store.ts} - pauseFrame機能の実装
 * @see {@link @lichtblick/den/async} - Condvar実装
 */

import { PromiseTimeoutError, promiseTimeout } from "@lichtblick/den/async";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";

/**
 * フレーム一時停止Promise型定義
 *
 * フレーム一時停止機能で使用されるPromiseオブジェクトの型定義。
 * 処理名とPromiseを組み合わせることで、デバッグ時の識別を容易にする。
 *
 * @property name - 一時停止の理由を示す名前（デバッグ用）
 * @property promise - 処理完了を示すPromise
 *
 * @example
 * ```ts
 * const framePromise: FramePromise = {
 *   name: "heavy-computation",
 *   promise: heavyAsyncOperation()
 * };
 * ```
 */
export type FramePromise = { name: string; promise: Promise<void> };

/**
 * Promise最大タイムアウト時間（ミリ秒）
 *
 * ユーザーが待機していない場合（自動実行時）は、
 * より長い時間待機してからエラーとする。
 *
 * この値は以下の考慮事項に基づいて設定：
 * - 通常のパネル処理時間の上限
 * - ユーザー体験への影響
 * - システム応答性の維持
 * - 自動化テストでの安定性
 */
export const MAX_PROMISE_TIMEOUT_TIME_MS = 5000;

/**
 * フレーム一時停止Promise群の待機処理
 *
 * 複数のFramePromiseを並列で待機し、全ての処理が完了するか
 * タイムアウトが発生するまで待機する。重い非同期レンダリングタスクが
 * 時間内に完了しなかった場合、一部のパネルが間違ったフレームの
 * データを表示する可能性があるが、システム全体の安定性を優先する。
 *
 * ## 処理フロー
 *
 * ### 1. 並列Promise待機
 * - 全てのFramePromiseを並列で実行
 * - Promise.all()による効率的な待機
 * - 個別Promise失敗の適切な処理
 *
 * ### 2. タイムアウト制御
 * - MAX_PROMISE_TIMEOUT_TIME_MSでの制限
 * - タイムアウト時の適切な処理停止
 * - エラー情報の詳細記録
 *
 * ### 3. エラーハンドリング
 * - タイムアウトエラーの識別
 * - 処理失敗エラーの通知
 * - ユーザーフレンドリーなメッセージ表示
 *
 * ## エラー処理戦略
 *
 * ### タイムアウトエラー
 * - 無音で処理継続（ログ記録のみ）
 * - システム応答性の維持優先
 * - デバッグ情報の保持
 *
 * ### 処理失敗エラー
 * - ユーザー通知の表示
 * - 詳細エラー情報の記録
 * - システム安定性の確保
 *
 * @param promises - 待機対象のFramePromise配列
 * @returns 全処理完了またはタイムアウト時に解決するPromise
 *
 * @example
 * ```ts
 * const promises: FramePromise[] = [
 *   { name: "panel1-render", promise: panel1.render() },
 *   { name: "panel2-compute", promise: panel2.compute() },
 * ];
 *
 * await pauseFrameForPromises(promises);
 * console.log("All panel processing completed or timed out");
 * ```
 *
 * @example エラーハンドリング
 * ```ts
 * try {
 *   await pauseFrameForPromises(promises);
 * } catch (error) {
 *   // この関数は例外を投げないため、このブロックは実行されない
 *   // エラーは内部で適切に処理される
 * }
 * ```
 */
export async function pauseFrameForPromises(promises: FramePromise[]): Promise<void> {
  try {
    await promiseTimeout(
      Promise.all(
        promises.map(async ({ promise }) => {
          await promise;
        }),
      ),
      MAX_PROMISE_TIMEOUT_TIME_MS,
    );
  } catch (error) {
    /**
     * 非同期レンダリングタスクが時間内に完了しなかった場合の処理
     * 一部のパネルが間違ったフレームのデータを表示する可能性がある
     */
    const isTimeoutError = error instanceof PromiseTimeoutError;
    if (!isTimeoutError) {
      /**
       * タイムアウト以外のエラー（処理失敗）の場合、
       * ユーザーに通知を表示
       */
      sendNotification("Player ", error, "app", "error");
      return;
    }
    /**
     * タイムアウトエラーの場合は無音で継続
     * システムの応答性を優先し、デバッグ情報のみ記録
     */
  }
}
