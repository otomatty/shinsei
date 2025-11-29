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
 * @fileoverview MessageOrderTracker - メッセージ順序監視システム
 *
 * このファイルは、MessagePipelineにおけるメッセージの時間順序と
 * 整合性を監視するシステムを実装している。メッセージの受信時刻と
 * Player現在時刻の乖離検出、逆行メッセージの検出、シーク操作の
 * 適切な処理を行う重要な品質保証システム。
 *
 * ## アーキテクチャ概要
 *
 * ### 1. 時間整合性監視
 * - **ドリフト検出**: メッセージ時刻とPlayer現在時刻の乖離監視
 * - **逆行検出**: メッセージが時間的に逆行した場合の検出
 * - **シーク処理**: シーク操作時の適切なリセット処理
 * - **アラート生成**: 問題検出時のユーザー通知
 *
 * ### 2. 監視戦略
 * - **閾値ベース**: 設定可能な閾値による柔軟な監視
 * - **タイムアウト制御**: 連続アラートの防止とパフォーマンス保護
 * - **シーク考慮**: シーク後のバックフィル処理の適切な除外
 * - **デバッグ対応**: 開発時の詳細ログ機能
 *
 * ### 3. パフォーマンス配慮
 * - **メモリ効率**: 必要最小限の状態保持
 * - **GC対策**: 本番環境でのメッセージログ無効化
 * - **CPU効率**: 効率的な時間計算とチェック
 * - **アラート制限**: 過度なアラート生成の防止
 *
 * ## 主要機能
 *
 * ### ドリフト検出システム
 * - メッセージ受信時刻とPlayer現在時刻の差分計算
 * - 閾値（デフォルト1秒）を超過した場合のアラート生成
 * - シーク後の猶予期間設定
 * - 連続アラートの適切な制御
 *
 * ### 逆行メッセージ検出
 * - 前回メッセージより古いメッセージの検出
 * - トピック情報を含む詳細エラー報告
 * - 時刻フォーマット機能による可読性向上
 * - Player状態との整合性チェック
 *
 * ### シーク処理システム
 * - lastSeekTime変更の検出
 * - シーク後の状態リセット
 * - バックフィル処理の適切な除外
 * - タイムアウトとアラートのクリア
 *
 * ## 設計思想
 *
 * ### 1. 品質保証重視
 * データの時間整合性を厳密に監視し、
 * アプリケーションの信頼性を確保
 *
 * ### 2. パフォーマンス配慮
 * 監視処理自体がパフォーマンスに影響しないよう、
 * 効率的なアルゴリズムと適切な制限を実装
 *
 * ### 3. 開発者体験
 * 問題発生時の詳細な情報提供と、
 * デバッグ時の柔軟な設定対応
 *
 * @see {@link ./index.tsx} - MessagePipelineProviderでの使用
 * @see {@link ./store.ts} - 状態管理との連携
 * @see {@link ../players/types.ts} - Player型定義
 */

import Logger from "@lichtblick/log";
import { Time, isLessThan, subtract as subtractTimes, toSec } from "@lichtblick/rostime";
import { PlayerState, MessageEvent, PlayerAlert } from "@lichtblick/suite-base/players/types";
import { formatFrame } from "@lichtblick/suite-base/util/time";

/** ドリフト許容閾値（秒） - この値を超過するとアラートを生成 */
const DRIFT_THRESHOLD_SEC = 1;

/** シーク待機時間（秒） - lastSeekTime変更を待つ時間 */
const WAIT_FOR_SEEK_SEC = 1;

const log = Logger.getLogger(__filename);

/**
 * MessageOrderTracker - メッセージ順序と時間整合性の監視クラス
 *
 * メッセージのreceiveTimeとplayer.currentTimeの大幅な差異（DRIFT_THRESHOLD_SEC以上）、
 * またはメッセージの時間逆行を検出してログ出力する。
 * ただし、player.lastSeekTimeが変更された場合は除外する。
 * この場合、パネルは保存されたデータをクリアする必要がある。
 *
 * これは、古いメッセージを破棄する、またはplayer.lastSeekTimeの強制更新を行う
 * 他のメカニズムが適切に動作していることを確認するためのシステム。
 *
 * ## 監視対象
 *
 * ### 1. 時間ドリフト
 * - メッセージ受信時刻とPlayer現在時刻の乖離
 * - 閾値を超過した場合のアラート生成
 * - シーク後のバックフィル除外
 *
 * ### 2. 逆行メッセージ
 * - 前回より古いメッセージの検出
 * - トピック別の詳細情報提供
 * - 時刻フォーマットによる可読性向上
 *
 * ## 状態管理
 *
 * ### 内部状態
 * - `lastMessages`: 前回処理したメッセージ配列
 * - `lastCurrentTime`: 前回のPlayer現在時刻
 * - `lastMessageTime`: 前回メッセージの受信時刻
 * - `lastMessageTopic`: 前回メッセージのトピック
 * - `lastLastSeekTime`: 前回のシーク時刻
 * - `warningTimeout`: アラート遅延タイマー
 *
 * ### デバッグ機能
 * - `trackIncorrectMessages`: 不正メッセージの詳細追跡
 * - 本番環境では無効化（GC対策）
 * - 開発時の詳細ログ出力
 *
 * @example
 * ```ts
 * const tracker = new MessageOrderTracker();
 *
 * function playerListener(playerState: PlayerState) {
 *   const alerts = tracker.update(playerState);
 *   if (alerts.length > 0) {
 *     console.log("Time consistency issues detected:", alerts);
 *   }
 * }
 * ```
 */
class MessageOrderTracker {
  /** 前回処理したメッセージ配列への参照 */
  #lastMessages: readonly MessageEvent[] = [];

  /** 前回のPlayer現在時刻 */
  #lastCurrentTime?: Time;

  /** 前回メッセージの受信時刻 */
  #lastMessageTime?: Time;

  /** 前回メッセージのトピック名 */
  #lastMessageTopic?: string;

  /** 前回のシーク時刻（lastSeekTime） */
  #lastLastSeekTime?: number;

  /** アラート遅延用タイマー */
  #warningTimeout?: ReturnType<typeof setTimeout>;

  /**
   * 不正メッセージのデバッグ追跡フラグ
   *
   * trueに設定すると不正メッセージをデバッグ出力する。
   * 本番環境ではデフォルトで無効化されている。
   * これは、コンソールにログ出力されたメッセージが
   * コンソールがクリアされない限りガベージコレクションされないため。
   */
  #trackIncorrectMessages = false;

  /** デバッグ用不正メッセージ配列 */
  #incorrectMessages: MessageEvent[] = [];

  /**
   * Player状態更新処理
   *
   * 新しいPlayer状態を受け取り、メッセージの時間整合性を検証する。
   * 問題が検出された場合、適切なPlayerAlertを生成して返す。
   *
   * ## 処理フロー
   *
   * ### 1. シーク検出処理
   * - lastSeekTimeの変更チェック
   * - シーク時の状態リセット
   * - タイムアウトのクリア
   *
   * ### 2. メッセージ処理
   * - 新しいメッセージの時間整合性チェック
   * - ドリフト検出とアラート生成
   * - 逆行メッセージの検出
   *
   * ### 3. 状態更新
   * - 内部状態の更新
   * - 次回処理のための情報保存
   *
   * ## アラート生成条件
   *
   * ### ドリフトアラート
   * - メッセージ時刻とPlayer現在時刻の差がDRIFT_THRESHOLD_SEC以上
   * - シーク直後ではない場合
   * - WAIT_FOR_SEEK_SEC後にタイムアウトで生成
   *
   * ### 逆行アラート
   * - 前回メッセージより古いメッセージを検出
   * - 即座にアラート生成
   * - 詳細な時刻情報を含む
   *
   * @param playerState - 検証対象のPlayer状態
   * @returns 検出された問題のPlayerAlert配列
   *
   * @example
   * ```ts
   * const tracker = new MessageOrderTracker();
   * const alerts = tracker.update(playerState);
   *
   * for (const alert of alerts) {
   *   console.log(`${alert.severity}: ${alert.message}`);
   *   if (alert.error) {
   *     console.error(alert.error);
   *   }
   * }
   * ```
   */
  public update(playerState: PlayerState): PlayerAlert[] {
    if (!playerState.activeData) {
      return [];
    }

    const alerts: PlayerAlert[] = [];

    const { messages, currentTime, lastSeekTime } = playerState.activeData;
    let didSeek = false;

    /**
     * シーク検出と状態リセット処理
     */
    if (this.#lastLastSeekTime !== lastSeekTime) {
      this.#lastLastSeekTime = lastSeekTime;
      if (this.#warningTimeout) {
        clearTimeout(this.#warningTimeout);
        this.#warningTimeout = undefined;
        this.#incorrectMessages = [];
      }
      this.#warningTimeout = this.#lastMessageTime = this.#lastCurrentTime = undefined;
      this.#lastMessages = [];
      didSeek = true;
    }

    /**
     * メッセージまたは現在時刻の変更検出
     */
    if (this.#lastMessages !== messages || this.#lastCurrentTime !== currentTime) {
      this.#lastMessages = messages;
      this.#lastCurrentTime = currentTime;

      /**
       * 各メッセージの時間整合性チェック
       */
      for (const message of messages) {
        const messageTime = message.receiveTime;

        /**
         * シーク直後の最初の出力はバックフィルから発生する。
         * このバックフィルは、シーク時刻よりもはるかに古いメッセージを
         * 生成する可能性がある。
         */
        if (!didSeek) {
          const currentTimeDrift = Math.abs(toSec(subtractTimes(messageTime, currentTime)));
          if (currentTimeDrift > DRIFT_THRESHOLD_SEC) {
            if (this.#trackIncorrectMessages) {
              this.#incorrectMessages.push(message);
            }
            if (!this.#warningTimeout) {
              /**
               * 遅延アラート生成
               * WAIT_FOR_SEEK_SEC後にアラートを生成し、
               * その間にシークが発生した場合はキャンセル
               */
              this.#warningTimeout = setTimeout(() => {
                /**
                 * タイムアウトが発動したため、新しいタイムアウト登録のためクリア
                 */
                this.#warningTimeout = undefined;

                /**
                 * アラート投稿前に不正メッセージキューをリセット。
                 * incorrectMessagesを保持し続けることを防ぐ。
                 * ブラウザコンソールはログ出力時にメッセージをメモリに保持するため、
                 * 明示的に有効化されない限りメッセージのログ出力を無効化。
                 */
                const info = {
                  currentTime,
                  lastSeekTime,
                  messageTime,
                  incorrectMessages: this.#trackIncorrectMessages
                    ? this.#incorrectMessages
                    : "not being tracked",
                };
                this.#incorrectMessages = [];
                log.warn(
                  `Message receiveTime very different from player.currentTime; without updating lastSeekTime`,
                  info,
                );
              }, WAIT_FOR_SEEK_SEC * 1000);
            }
          }
        }

        /**
         * 逆行メッセージの検出
         */
        if (
          this.#lastMessageTime &&
          this.#lastMessageTopic != undefined &&
          isLessThan(messageTime, this.#lastMessageTime)
        ) {
          const formattedTime = formatFrame(messageTime);
          const lastMessageTime = formatFrame(this.#lastMessageTime);
          const errorMessage =
            `Processed a message on ${message.topic} at ${formattedTime} which is earlier than ` +
            `last processed message on ${this.#lastMessageTopic} at ${lastMessageTime}.`;

          alerts.push({
            severity: "warn",
            message: "Data went back in time",
            error: new Error(errorMessage),
          });
        }
        this.#lastMessageTopic = message.topic;
        this.#lastMessageTime = messageTime;
      }
    }

    return alerts;
  }
}

export default MessageOrderTracker;
