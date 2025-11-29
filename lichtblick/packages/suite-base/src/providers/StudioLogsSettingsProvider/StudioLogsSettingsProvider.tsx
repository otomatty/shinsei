// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use";

import Log from "@lichtblick/log";
import { SESSION_STORAGE_LOGS_SETTINGS } from "@lichtblick/suite-base/constants/browserStorageKeys";
import { StudioLogsSettingsContext } from "@lichtblick/suite-base/context/StudioLogsSettingsContext";

import { createStudioLogsSettingsStore } from "./store";
import { LocalStorageSaveState } from "./types";

/**
 * Studioログ設定プロバイダーコンポーネント
 *
 * アプリケーション全体のログ設定を管理するProviderコンポーネントです。
 * Zustandベースの状態管理とLocalStorageによる永続化を組み合わせ、
 * 動的なログチャンネル管理と設定の自動保存を実現します。
 *
 * ## 主な機能
 * - **永続化対応**: LocalStorageによる設定の自動保存・復元
 * - **動的チャンネル管理**: 実行時に追加されるログチャンネルの自動検出
 * - **リアルタイム同期**: ログ設定の変更を即座にLocalStorageに反映
 * - **チャンネル監視**: 1秒間隔でのログチャンネル数変化の監視
 * - **状態管理**: Zustandストアによる効率的な状態管理
 *
 * ## 永続化の仕組み
 * - LocalStorageキー: "blick.logs-settings"
 * - 保存内容: グローバルログレベル + 無効化チャンネル一覧
 * - 自動保存: ログ設定変更時に即座に保存
 * - 復元: コンポーネント初期化時に自動復元
 *
 * ## 動的チャンネル管理
 * - 定期監視: 1秒間隔でLog.channels()の数をチェック
 * - 自動再初期化: チャンネル数変化時にストアを再作成
 * - 設定保持: 既存設定を保持したまま新チャンネルを追加
 *
 * ## パフォーマンス最適化
 * - useRef: LocalStorage状態の参照を最適化
 * - 条件付き再初期化: チャンネル数変化時のみストア再作成
 * - 効率的な購読: Zustandの選択的購読による無駄な再レンダリング防止
 *
 * ## 使用場面
 * - 開発時のデバッグログ制御
 * - 本番環境でのログレベル調整
 * - 特定機能のログ有効/無効切り替え
 * - パフォーマンス分析用のログ制御
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @returns React.JSX.Element
 *
 * @example
 * ```typescript
 * // アプリケーションでの使用
 * <StudioLogsSettingsProvider>
 *   <App />
 * </StudioLogsSettingsProvider>
 *
 * // 子コンポーネントでのログ設定使用
 * const logsSettings = useContext(StudioLogsSettingsContext);
 * const state = logsSettings.getState();
 *
 * // ログレベル変更
 * state.setGlobalLevel("debug");
 *
 * // 特定チャンネルの制御
 * state.enableChannel("network");
 * state.disableChannel("verbose");
 * ```
 */
function StudioLogsSettingsProvider(props: PropsWithChildren): React.JSX.Element {
  // LocalStorageからのログ設定状態の管理
  // "blick.logs-settings"キーで永続化される
  const [studioLogsSettingsSavedState, setStudioLogsSettingsSavedState] =
    useLocalStorage<LocalStorageSaveState>(SESSION_STORAGE_LOGS_SETTINGS, {});

  // Zustandストアの状態管理
  // 初期化時にLocalStorageの状態を使用
  const [studioLogsSettingsStore, setStudioLogsSettingsStore] = useState(() =>
    createStudioLogsSettingsStore(studioLogsSettingsSavedState),
  );

  // LocalStorage状態の参照を最適化
  // useEffectの依存配列での不要な再実行を防ぐためuseRefを使用
  const savedStateRef = useRef<LocalStorageSaveState | undefined>(studioLogsSettingsSavedState);
  useEffect(() => {
    savedStateRef.current = studioLogsSettingsSavedState;
  });

  // ログチャンネル数の変化を監視する定期処理
  // 新しいログチャンネルが動的に追加された場合の自動対応
  useEffect(() => {
    // 現在のストアが管理しているチャンネル数を記録
    const storeChannelsCount = studioLogsSettingsStore.getState().channels.length;

    // 1秒間隔でチャンネル数の変化をチェック
    const intervalHandle = setInterval(() => {
      // 実際のログチャンネル数と比較
      if (storeChannelsCount !== Log.channels().length) {
        // チャンネル数が変化した場合、ストアを再初期化
        // 既存の設定状態を保持したまま新しいチャンネルを統合
        setStudioLogsSettingsStore(createStudioLogsSettingsStore(savedStateRef.current));
      }
    }, 1000);

    // クリーンアップ関数でインターバルを解除
    return () => {
      clearInterval(intervalHandle);
    };
  }, [studioLogsSettingsStore, studioLogsSettingsSavedState]);

  // ログ設定の変更をLocalStorageに自動保存
  useEffect(() => {
    // Zustandストアの状態変更を購読
    return studioLogsSettingsStore.subscribe((value) => {
      // 無効化されたチャンネルの一覧を抽出
      const disabledChannels: string[] = [];

      for (const channel of value.channels) {
        if (!channel.enabled) {
          disabledChannels.push(channel.name);
        }
      }

      // LocalStorageに保存する形式に変換して保存
      setStudioLogsSettingsSavedState({
        globalLevel: value.globalLevel,
        disabledChannels,
      });
    });
  }, [studioLogsSettingsStore, setStudioLogsSettingsSavedState]);

  // StudioLogsSettingsContextを通じてストアを提供
  return (
    <StudioLogsSettingsContext.Provider value={studioLogsSettingsStore}>
      {props.children}
    </StudioLogsSettingsContext.Provider>
  );
}

export { StudioLogsSettingsProvider };
