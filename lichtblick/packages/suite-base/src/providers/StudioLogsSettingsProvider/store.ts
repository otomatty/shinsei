// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createStore, StoreApi } from "zustand";

import Log, { Logger, LogLevel, toLogLevel } from "@lichtblick/log";
import {
  IStudioLogsSettings,
  StudioLogConfigChannel,
} from "@lichtblick/suite-base/context/StudioLogsSettingsContext";

import { LocalStorageSaveState } from "./types";

const log = Log.getLogger(__filename);

/**
 * 環境別のデフォルトグローバルログレベル
 *
 * 開発環境では詳細なデバッグ情報を、本番環境では警告以上のみを出力
 */
const defaultGlobalLevel: LogLevel = process.env.NODE_ENV === "development" ? "debug" : "warn";

/**
 * Studioログ設定ストアを作成する関数
 *
 * この関数は、Zustandベースのログ設定管理ストアを作成します。
 * ログチャンネルの動的管理、レベル制御、永続化対応などの
 * 高度なログ管理機能を提供します。
 *
 * ## 主な機能
 * - **グローバルログレベル制御**: アプリケーション全体のログレベル設定
 * - **チャンネル別制御**: 個別のログチャンネルの有効/無効切り替え
 * - **プレフィックス制御**: 名前プレフィックスによる一括制御
 * - **動的チャンネル管理**: 実行時に追加されるログチャンネルの自動検出
 * - **永続化対応**: LocalStorageからの設定復元
 *
 * ## ログチャンネルの管理
 * - 同一名のチャンネルは統合して管理
 * - チャンネルの有効/無効状態を自動同期
 * - 新しいチャンネルの動的追加に対応
 *
 * ## レベル制御の仕組み
 * - グローバルレベル: 全チャンネルのベースレベル
 * - チャンネル個別制御: 特定チャンネルのレベル上書き
 * - 無効化チャンネル: 警告レベル以上のみ出力
 *
 * @param initialState - LocalStorageから復元された初期状態
 * @returns Zustandストア（IStudioLogsSettings）
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * const store = createStudioLogsSettingsStore();
 *
 * // 初期状態付きで作成
 * const storeWithState = createStudioLogsSettingsStore({
 *   globalLevel: "info",
 *   disabledChannels: ["network", "debug-helper"]
 * });
 *
 * // ストアの使用
 * const state = store.getState();
 * state.setGlobalLevel("debug");
 * state.enableChannel("network");
 * ```
 */
function createStudioLogsSettingsStore(
  initialState?: LocalStorageSaveState,
): StoreApi<IStudioLogsSettings> {
  // 初期状態からグローバルログレベルを決定
  const globalLevel = toLogLevel(initialState?.globalLevel ?? defaultGlobalLevel);

  // 無効化されたチャンネルリストを取得
  const disabledChannels = initialState?.disabledChannels ?? [];

  log.debug(`Initializing log Config. ${disabledChannels.length} disabled channels.`);

  // UI表示用のチャンネル情報リスト
  const channels: StudioLogConfigChannel[] = [];

  // チャンネル名による高速検索用マップ
  // 同一名のチャンネルが複数存在する場合は配列で管理
  const channelByName = new Map<string, Logger[]>();

  // 全ログチャンネルを名前順にソートして処理
  const sortedChannels = Log.channels().sort((a, b) => a.name().localeCompare(b.name()));

  for (const channel of sortedChannels) {
    // チャンネル名（空の場合は"<root>"として扱う）
    const name = channel.name() ? channel.name() : "<root>";

    // 無効化リストに含まれる場合は警告レベルに設定
    if (disabledChannels.includes(name)) {
      channel.setLevel("warn");
    } else {
      // 有効な場合はグローバルレベルに設定
      channel.setLevel(globalLevel);
    }

    // UI表示用のチャンネルリストに追加（同一名は1回のみ）
    // 同一名のチャンネルが複数ある場合、UIでは区別できないため統合表示
    if (!channelByName.has(name)) {
      channels.push({
        name,
        enabled: channel.isLevelOn(globalLevel),
      });
    }

    // 名前別チャンネルマップに追加
    const existing = channelByName.get(name) ?? [];
    existing.push(channel);
    channelByName.set(name, existing);
  }

  /**
   * チャンネル状態の再生成関数
   *
   * グローバルログレベルの変更時に、各チャンネルの有効/無効状態を
   * 再計算してUIに反映します。
   *
   * @param get - 現在のストア状態を取得する関数
   * @param set - ストア状態を更新する関数
   */
  function regenerateChannels(
    get: () => IStudioLogsSettings,
    set: (partial: Partial<IStudioLogsSettings>) => void,
  ) {
    const currentGlobalLevel = get().globalLevel;
    let didChange = false;

    // 各チャンネルの有効状態を再計算
    for (const channel of channels) {
      const logChannels = channelByName.get(channel.name);
      if (!logChannels) {
        continue;
      }

      // 同一名チャンネルの代表として最初のチャンネルを使用
      const anyChannel = logChannels[0];
      if (anyChannel && anyChannel.isLevelOn(currentGlobalLevel) !== channel.enabled) {
        channel.enabled = !channel.enabled;
        didChange = true;
      }
    }

    // 変更があった場合のみUIを更新
    if (!didChange) {
      return;
    }

    set({ channels: [...channels] });
  }

  // Zustandストアを作成して返却
  return createStore<IStudioLogsSettings>((set, get) => ({
    globalLevel,
    channels,

    /**
     * グローバルログレベルの設定
     *
     * アプリケーション全体のベースログレベルを変更します。
     * 全てのログチャンネルが新しいレベルに更新され、
     * UIの表示状態も自動的に同期されます。
     *
     * @param level - 新しいグローバルログレベル
     */
    setGlobalLevel(level: LogLevel) {
      log.debug(`Set global level: ${level}`);

      // 全ログチャンネルのレベルを更新
      for (const [, logChannels] of channelByName) {
        for (const channel of logChannels) {
          channel.setLevel(level);
        }
      }

      // ストア状態を更新
      set({ globalLevel: level });

      // チャンネル表示状態を再生成
      regenerateChannels(get, set);
    },

    /**
     * 特定チャンネルの有効化
     *
     * 指定されたチャンネルをデバッグレベルに設定して有効化します。
     * グローバルレベルに関係なく、そのチャンネルからの
     * 全てのログメッセージが出力されるようになります。
     *
     * @param name - 有効化するチャンネル名
     */
    enableChannel(name: string) {
      log.debug(`Enable channel: ${name}`);

      // 指定されたチャンネルをデバッグレベルに設定
      const logChannels = channelByName.get(name) ?? [];
      for (const channel of logChannels) {
        channel.setLevel("debug");
      }

      // UI表示状態を更新
      regenerateChannels(get, set);
    },

    /**
     * 特定チャンネルの無効化
     *
     * 指定されたチャンネルを警告レベルに設定して無効化します。
     * そのチャンネルからは警告レベル以上のメッセージのみが
     * 出力されるようになります。
     *
     * @param name - 無効化するチャンネル名
     */
    disableChannel(name: string) {
      log.debug(`Disable channel: ${name}`);

      // 指定されたチャンネルを警告レベルに設定
      const logChannels = channelByName.get(name) ?? [];
      for (const channel of logChannels) {
        channel.setLevel("warn");
      }

      // UI表示状態を更新
      regenerateChannels(get, set);
    },

    /**
     * プレフィックス一括有効化
     *
     * 指定されたプレフィックスで始まる全てのチャンネルを
     * 一括でデバッグレベルに設定して有効化します。
     *
     * ## 使用例
     * - "panel": 全パネル関連ログの有効化
     * - "network": 全ネットワーク関連ログの有効化
     * - "extension": 全拡張機能ログの有効化
     *
     * @param prefix - 有効化するチャンネル名のプレフィックス
     */
    enablePrefix(prefix: string) {
      log.debug(`Enable prefix ${prefix}`);

      // プレフィックスに一致する全チャンネルを有効化
      for (const [key, logChannels] of channelByName) {
        if (key.startsWith(prefix)) {
          for (const channel of logChannels) {
            channel.setLevel("debug");
          }
        }
      }

      // UI表示状態を更新
      regenerateChannels(get, set);
    },

    /**
     * プレフィックス一括無効化
     *
     * 指定されたプレフィックスで始まる全てのチャンネルを
     * 一括で警告レベルに設定して無効化します。
     *
     * ## 使用例
     * - "debug": 全デバッグ関連ログの無効化
     * - "verbose": 全詳細ログの無効化
     * - "test": 全テスト関連ログの無効化
     *
     * @param prefix - 無効化するチャンネル名のプレフィックス
     */
    disablePrefix(prefix: string) {
      log.debug(`Disable prefix ${prefix}`);

      // プレフィックスに一致する全チャンネルを無効化
      for (const [key, logChannels] of channelByName) {
        if (key.startsWith(prefix)) {
          for (const channel of logChannels) {
            channel.setLevel("warn");
          }
        }
      }

      // UI表示状態を更新
      regenerateChannels(get, set);
    },
  }));
}

export { createStudioLogsSettingsStore };
