// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { dialog } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";
import { EventEmitter } from "eventemitter3";

import Logger from "@lichtblick/log";
import { AppSetting } from "@lichtblick/suite-base/src/AppSetting";

import { CustomMacUpdater } from "./CustomMacUpdater";
import { getAppSetting } from "./settings";

/**
 * StudioAppUpdaterクラス - Lichtblickの自動更新機能を管理するクラス
 *
 * 【デバッグ目的】
 * このクラスには本番環境でも動作する包括的なデバッグログが実装されています。
 * すべてのログには [AUTO_UPDATE_DEBUG] プレフィックスが付いており、
 * 自動更新機能の問題を特定するために以下の情報を出力します：
 *
 * 1. AutoUpdaterの状態（isUpdaterActive, feedURL, currentVersion等）
 * 2. アプリケーション設定（ユーザーによる自動更新の有効/無効設定）
 * 3. 更新チェックのタイミングと結果
 * 4. エラーの詳細（ネットワークエラーと他のエラーを区別）
 *
 * 【使用方法】
 * - 自動更新: アプリ起動後10秒で初回チェック、その後1分間隔で定期チェック
 * - 手動更新: メニュー「ヘルプ」→「アップデートをチェック」でcheckNow()を実行
 * - ログ確認: 本番アプリで [AUTO_UPDATE_DEBUG] を検索してデバッグ情報を確認
 */

const log = Logger.getLogger(__filename);

/**
 * ネットワークエラーかどうかを判定するヘルパー関数
 *
 * 【デバッグ目的】
 * 更新チェック失敗時に、ネットワーク関連のエラーかそれ以外のエラーかを区別するため。
 * ネットワークエラーの場合は警告レベル、それ以外はエラーレベルでログ出力される。
 *
 * @param err エラーオブジェクト
 * @returns ネットワークエラーの場合true
 */
function isNetworkError(err: unknown) {
  if (!(err instanceof Error)) {
    return false;
  }

  // Chromiumのネットワークエラーコードをチェック
  // これらのエラーはプロキシ設定、DNS、接続タイムアウト等の問題を示す
  return (
    err.message === "net::ERR_INTERNET_DISCONNECTED" ||
    err.message === "net::ERR_PROXY_CONNECTION_FAILED" ||
    err.message === "net::ERR_CONNECTION_RESET" ||
    err.message === "net::ERR_CONNECTION_CLOSE" ||
    err.message === "net::ERR_NAME_NOT_RESOLVED" ||
    err.message === "net::ERR_CONNECTION_TIMED_OUT"
  );
}

type EventTypes = {
  error: (err: Error) => void;
};

class StudioAppUpdater extends EventEmitter<EventTypes> {
  #started: boolean = false;
  #customMacUpdater: CustomMacUpdater;

  // アプリ起動後、初回の更新チェックまでの待機時間（秒）
  // 新規インストール時にユーザーが自動更新を無効にする時間を与えるため
  #initialUpdateDelaySec = 1 * 10; // 10秒

  // 更新チェック完了後、次の更新チェックまでの待機時間（秒）
  // 定期的な自動更新チェックの間隔
  #updateCheckIntervalSec = 1 * 30; // 30秒

  constructor() {
    super();
    this.#customMacUpdater = new CustomMacUpdater();
  }

  /**
   * デバッグ情報を包括的にログ出力するプライベートメソッド
   *
   * 【デバッグ目的】
   * 自動更新の問題を特定するため、以下の情報を一括で出力：
   * - AutoUpdaterの状態: 更新機能が有効か、更新サーバーのURL等
   * - アプリケーション設定: ユーザーが自動更新を無効にしていないか
   * - クラスの内部状態: 更新プロセスの開始状況、タイマー設定等
   *
   * @param context ログのコンテキスト（どのメソッドから呼ばれたか）
   */
  #logDebugInfo(context: string): void {
    log.debug(`[AUTO_UPDATE_DEBUG] ${context}`);

    // electron-updaterの状態をチェック
    log.debug(`[AUTO_UPDATE_DEBUG] AutoUpdater State:`, {
      isUpdaterActive: autoUpdater.isUpdaterActive(), // 本番環境でのみtrue
      channel: autoUpdater.channel, // 更新チャンネル（stable等）
      currentVersion: autoUpdater.currentVersion, // 現在のアプリバージョン
      feedURL: autoUpdater.getFeedURL(), // 更新情報取得URL
    });

    // アプリケーション設定をチェック
    log.debug(`[AUTO_UPDATE_DEBUG] App Settings:`, {
      updatesEnabled: getAppSetting<boolean>(AppSetting.UPDATES_ENABLED), // ユーザー設定
    });

    // クラスの内部状態をチェック
    log.debug(`[AUTO_UPDATE_DEBUG] Class State:`, {
      started: this.#started, // 更新プロセスが開始済みか
      initialUpdateDelaySec: this.#initialUpdateDelaySec, // 初回チェック遅延時間
      updateCheckIntervalSec: this.#updateCheckIntervalSec, // 定期チェック間隔
    });
  }

  /**
   * 更新チェックが可能かどうかを判定するメソッド
   *
   * 【デバッグ目的】
   * autoUpdater.isUpdaterActive()の結果をログ出力。
   * 開発環境や署名されていないビルドではfalseになる。
   * macOSでは署名なしでもCustomMacUpdaterを使用可能。
   *
   * @returns 更新チェックが可能な場合true
   */
  public canCheckForUpdates(): boolean {
    const canCheck = autoUpdater.isUpdaterActive();
    log.debug(`[AUTO_UPDATE_DEBUG] canCheckForUpdates() called, result: ${canCheck}`);

    // macOSでは署名なしでもCustomMacUpdaterを使用
    if (process.platform === "darwin" && !canCheck) {
      log.debug(
        `[AUTO_UPDATE_DEBUG] macOS detected with inactive autoUpdater - CustomMacUpdater available`,
      );
      return true;
    }

    return canCheck;
  }

  /**
   * 自動更新プロセスを開始するメソッド
   *
   * 【動作概要】
   * 1. 重複実行をチェック（既に開始済みの場合は何もしない）
   * 2. 10秒後に初回の更新チェックをスケジュール
   * 3. その後は1分間隔で定期的に更新チェックを実行
   *
   * 【デバッグ目的】
   * - 開始時の状態をすべてログ出力
   * - タイマーのスケジューリング状況を追跡
   * - 重複実行の防止動作を確認
   */
  public start(): void {
    log.info(`[AUTO_UPDATE_DEBUG] StudioAppUpdater.start() called`);
    this.#logDebugInfo("start() method entry");

    // 重複実行の防止
    if (this.#started) {
      log.info(`StudioAppUpdater already running`);
      log.debug(`[AUTO_UPDATE_DEBUG] Exiting start() - already started`);
      return;
    }
    this.#started = true;

    log.info(`Starting update loop`);
    log.debug(
      `[AUTO_UPDATE_DEBUG] Scheduling initial update check in ${this.#initialUpdateDelaySec} seconds`,
    );

    // 初回更新チェックを10秒後にスケジュール
    // ユーザーが新規インストール後に設定を変更する時間を与える
    setTimeout(() => {
      log.debug(`[AUTO_UPDATE_DEBUG] Initial update check timeout triggered`);
      void this.#maybeCheckForUpdates();
    }, this.#initialUpdateDelaySec * 1000);
  }

  /**
   * 手動で更新チェックを実行するメソッド
   *
   * 【動作概要】
   * メニューの「ヘルプ」→「アップデートをチェック」から呼び出される。
   * 自動更新とは異なり、結果をダイアログでユーザーに通知する。
   * macOSでAutoUpdaterが無効な場合はCustomMacUpdaterを使用。
   *
   * 【処理フロー】
   * 1. AutoUpdaterが有効かチェック
   * 2. macOSで無効な場合はCustomMacUpdaterを使用
   * 3. 更新確認を実行
   * 4. 結果に応じてダイアログを表示
   *
   * 【デバッグ目的】
   * - 手動チェックの全プロセスをログ追跡
   * - CustomMacUpdaterとelectron-updaterの使い分けを記録
   * - エラー時の詳細情報を取得
   */
  public async checkNow(): Promise<void> {
    log.info(`[AUTO_UPDATE_DEBUG] checkNow() called`);
    this.#logDebugInfo("checkNow() method entry");

    // macOSでAutoUpdaterが無効な場合はCustomMacUpdaterを使用
    if (process.platform === "darwin" && !autoUpdater.isUpdaterActive()) {
      log.info(`[AUTO_UPDATE_DEBUG] Using CustomMacUpdater for manual update check`);
      try {
        await this.#customMacUpdater.checkForUpdates(true);
        log.debug(`[AUTO_UPDATE_DEBUG] CustomMacUpdater checkNow() completed`);
      } catch (error) {
        log.error(`[AUTO_UPDATE_DEBUG] CustomMacUpdater checkNow() failed:`, error);
        this.emit("error", error as Error);
      }
      return;
    }

    // 以下は既存のelectron-updaterロジック
    const onDisabled = () => {
      log.debug(`[AUTO_UPDATE_DEBUG] Updates are not enabled - showing dialog`);
      void dialog.showMessageBox({ message: `Updates are not enabled.` });
    };

    const onNotAvailable = (info: UpdateInfo) => {
      log.debug(`[AUTO_UPDATE_DEBUG] Update not available:`, info);
      void dialog.showMessageBox({
        message: `Lichtblick is up to date (version ${info.version}).`,
      });
    };

    const onError = (error: Error) => {
      log.error(`[AUTO_UPDATE_DEBUG] Error in checkNow():`, error);
      log.error(error);
      dialog.showErrorBox("An error occurred while checking for updates.", error.message);
    };

    if (!autoUpdater.isUpdaterActive()) {
      log.debug(`[AUTO_UPDATE_DEBUG] AutoUpdater is not active - calling onDisabled`);
      onDisabled();
      return;
    }

    try {
      log.debug(`[AUTO_UPDATE_DEBUG] Starting manual update check with electron-updater`);

      autoUpdater.on("update-not-available", onNotAvailable);
      const result = await autoUpdater.checkForUpdatesAndNotify();
      log.debug(`[AUTO_UPDATE_DEBUG] checkForUpdatesAndNotify result:`, result);

      if (!result) {
        log.debug(
          `[AUTO_UPDATE_DEBUG] No result from checkForUpdatesAndNotify - calling onDisabled`,
        );
        onDisabled();
      }
    } catch (error) {
      log.error(`[AUTO_UPDATE_DEBUG] Exception in checkNow():`, error);
      onError(error as Error);
    } finally {
      autoUpdater.off("update-not-available", onNotAvailable);
      log.debug(`[AUTO_UPDATE_DEBUG] checkNow() completed`);
    }
  }

  /**
   * 定期的な自動更新チェックを実行するプライベートメソッド
   *
   * 【動作概要】
   * - start()から10秒後に初回実行
   * - その後1分間隔で再帰的に実行
   * - ユーザー設定をチェックして無効な場合はスキップ
   * - サイレントに実行（ユーザーに通知しない）
   * - macOSでAutoUpdaterが無効な場合はCustomMacUpdaterを使用
   *
   * 【処理フロー】
   * 1. ユーザーの自動更新設定を確認
   * 2. macOSで署名なしの場合はCustomMacUpdaterを使用
   * 3. 有効な場合のみ更新チェックを実行
   * 4. エラーをネットワークエラーとその他に分類
   * 5. finally句で次回の更新チェックをスケジュール
   *
   * 【デバッグ目的】
   * - 定期チェックの実行タイミングを追跡
   * - CustomMacUpdaterとelectron-updaterの使い分けを記録
   * - ユーザー設定による動作変更を記録
   * - ネットワークエラーと設定エラーを区別
   * - 再帰的な実行サイクルを監視
   */
  async #maybeCheckForUpdates(): Promise<void> {
    log.debug(`[AUTO_UPDATE_DEBUG] #maybeCheckForUpdates() called`);
    this.#logDebugInfo("maybeCheckForUpdates() method entry");

    try {
      const appUpdatesEnabled = getAppSetting<boolean>(AppSetting.UPDATES_ENABLED) ?? false;

      if (appUpdatesEnabled) {
        log.info("Checking for updates");

        // macOSでAutoUpdaterが無効な場合はCustomMacUpdaterを使用
        if (process.platform === "darwin" && !autoUpdater.isUpdaterActive()) {
          log.debug(`[AUTO_UPDATE_DEBUG] Using CustomMacUpdater for periodic update check`);
          try {
            await this.#customMacUpdater.checkForUpdates(false); // サイレントチェック
            log.debug(`[AUTO_UPDATE_DEBUG] CustomMacUpdater periodic check completed`);
          } catch (error) {
            log.error(`[AUTO_UPDATE_DEBUG] CustomMacUpdater periodic check failed:`, error);
            // CustomMacUpdaterのエラーはネットワークエラーとして扱う
            if (isNetworkError(error)) {
              log.warn(`Network error in CustomMacUpdater: ${error}`);
            } else {
              this.emit("error", error as Error);
            }
          }
        } else {
          // 既存のelectron-updaterロジック
          log.debug(`[AUTO_UPDATE_DEBUG] Calling autoUpdater.checkForUpdatesAndNotify()`);
          const result = await autoUpdater.checkForUpdatesAndNotify();
          log.debug(`[AUTO_UPDATE_DEBUG] checkForUpdatesAndNotify completed, result:`, result);
        }
      } else {
        log.debug(`[AUTO_UPDATE_DEBUG] Updates disabled by user setting - skipping check`);
      }
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        log.warn(`Network error checking for updates: ${err}`);
        log.debug(`[AUTO_UPDATE_DEBUG] Network error details:`, err);
      } else {
        log.error(`[AUTO_UPDATE_DEBUG] Non-network error in update check:`, err);
        this.emit("error", err as Error);
      }
    } finally {
      log.debug(
        `[AUTO_UPDATE_DEBUG] Scheduling next update check in ${this.#updateCheckIntervalSec} seconds`,
      );
      setTimeout(() => {
        log.debug(`[AUTO_UPDATE_DEBUG] Update check interval timeout triggered`);
        void this.#maybeCheckForUpdates();
      }, this.#updateCheckIntervalSec * 1000);
    }
  }

  // Singletonパターンでインスタンスを管理
  static #instance?: StudioAppUpdater;

  /**
   * StudioAppUpdaterのシングルトンインスタンスを取得
   *
   * 【設計理由】
   * アプリケーション全体で一つの更新プロセスのみを実行するため、
   * Singletonパターンを採用。複数のインスタンスが存在すると
   * 重複した更新チェックが実行される可能性がある。
   * CustomMacUpdaterも含めて一元管理される。
   *
   * 【デバッグ目的】
   * インスタンスの生成/再利用をログで追跡し、
   * 予期しない複数インスタンスの作成を検出。
   *
   * @returns StudioAppUpdaterのインスタンス
   */
  public static Instance(): StudioAppUpdater {
    if (!StudioAppUpdater.#instance) {
      log.debug(`[AUTO_UPDATE_DEBUG] Creating new StudioAppUpdater instance with CustomMacUpdater`);
      StudioAppUpdater.#instance = new StudioAppUpdater();
    } else {
      log.debug(`[AUTO_UPDATE_DEBUG] Returning existing StudioAppUpdater instance`);
    }
    return StudioAppUpdater.#instance;
  }
}

export default StudioAppUpdater;
