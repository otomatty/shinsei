// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IAppConfiguration,
  ChangeHandler,
  AppConfigurationValue,
  LOCAL_STORAGE_APP_CONFIGURATION,
} from "@lichtblick/suite-base";

/**
 * LocalStorageAppConfiguration
 *
 * ブラウザのLocalStorageを使用してアプリケーション設定を永続化するクラス
 * IAppConfigurationインターフェースを実装し、Lichtblickアプリケーションの
 * 設定値（テーマ、レイアウト、ユーザー設定など）をブラウザ内に保存・管理する
 *
 * 主な機能:
 * - 設定値の永続化（ブラウザを閉じても設定が保持される）
 * - デフォルト値の管理
 * - 設定変更時のリアルタイム通知機能
 * - 型安全な設定値の取得・設定
 *
 * 使用例:
 * - ユーザーが選択したテーマ（ダーク/ライト）の保存
 * - パネルレイアウトの保存
 * - 言語設定の保存
 * - その他のユーザーカスタマイズ設定
 */
export default class LocalStorageAppConfiguration implements IAppConfiguration {
  static #KEY_PREFIX = LOCAL_STORAGE_APP_CONFIGURATION;

  /**
   * ユーザーが一度も設定したことがない設定項目のデフォルト値
   * アプリケーション初回起動時や設定がリセットされた場合に使用される
   */
  #defaults?: { [key: string]: AppConfigurationValue };

  /**
   * 設定変更を監視するリスナーのマップ
   * キー: 設定名, 値: その設定を監視しているコールバック関数のセット
   * 複数のコンポーネントが同じ設定を監視できるようにSetを使用
   */
  #changeListeners = new Map<string, Set<ChangeHandler>>();

  /**
   * コンストラクタ
   * @param defaults - 各設定項目のデフォルト値を定義するオブジェクト
   */
  public constructor({ defaults }: { defaults?: { [key: string]: AppConfigurationValue } }) {
    this.#defaults = defaults;
  }

  /**
   * 設定値を取得する
   * @param key - 取得したい設定のキー名
   * @returns 設定値（未設定の場合はデフォルト値、それもない場合はundefined）
   */
  public get(key: string): AppConfigurationValue {
    const value = localStorage.getItem(LocalStorageAppConfiguration.#KEY_PREFIX + key);
    try {
      // LocalStorageから取得した値をJSONパースして返す
      // 値が存在しない場合はデフォルト値を返す
      return value == undefined ? this.#defaults?.[key] : JSON.parse(value);
    } catch {
      // JSONパースに失敗した場合（不正なデータ）はundefinedを返す
      return undefined;
    }
  }

  /**
   * 設定値を保存し、変更を監視しているリスナーに通知する
   * @param key - 設定のキー名
   * @param value - 保存する値（undefinedの場合は設定を削除）
   */
  public async set(key: string, value: AppConfigurationValue): Promise<void> {
    if (value == undefined) {
      // undefinedが渡された場合は設定を削除
      localStorage.removeItem(LocalStorageAppConfiguration.#KEY_PREFIX + key);
    } else {
      // 値をJSON文字列として保存
      localStorage.setItem(
        LocalStorageAppConfiguration.#KEY_PREFIX + key,
        JSON.stringify(value) ?? "",
      );
    }

    // この設定を監視しているすべてのリスナーに変更を通知
    const listeners = this.#changeListeners.get(key);
    if (listeners) {
      // イテレーション中のリスナーリストの変更から保護するためコピーを作成
      [...listeners].forEach((listener) => {
        listener(value);
      });
    }
  }

  /**
   * 設定変更の監視リスナーを追加
   * @param key - 監視したい設定のキー名
   * @param cb - 設定が変更された時に呼び出されるコールバック関数
   */
  public addChangeListener(key: string, cb: ChangeHandler): void {
    let listeners = this.#changeListeners.get(key);
    if (!listeners) {
      // 初回の場合はSetを作成
      listeners = new Set();
      this.#changeListeners.set(key, listeners);
    }
    listeners.add(cb);
  }

  /**
   * 設定変更の監視リスナーを削除
   * @param key - 監視を停止したい設定のキー名
   * @param cb - 削除したいコールバック関数
   */
  public removeChangeListener(key: string, cb: ChangeHandler): void {
    const listeners = this.#changeListeners.get(key);
    if (listeners) {
      listeners.delete(cb);
    }
  }
}
