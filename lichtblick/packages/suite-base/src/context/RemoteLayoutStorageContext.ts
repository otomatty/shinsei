// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { IRemoteLayoutStorage } from "@lichtblick/suite-base/services/IRemoteLayoutStorage";

export const RemoteLayoutStorageContext = createContext<IRemoteLayoutStorage | undefined>(
  undefined,
);
RemoteLayoutStorageContext.displayName = "RemoteLayoutStorageContext";

/**
 * ## useRemoteLayoutStorage
 *
 * **リモートレイアウトストレージ機能にアクセスするためのカスタムフック**
 *
 * ### 概要
 * - RemoteLayoutStorageContextからIRemoteLayoutStorageインスタンスを取得
 * - リモートサーバーとのレイアウト同期を提供
 * - オプショナルなContext（オフライン時はundefined）
 *
 * ### 使用例
 * ```typescript
 * function RemoteLayoutSyncComponent() {
 *   const remoteStorage = useRemoteLayoutStorage();
 *
 *   const handleSyncToRemote = async (layout: Layout) => {
 *     if (!remoteStorage) {
 *       console.log("Remote storage not available (offline mode)");
 *       return;
 *     }
 *
 *     try {
 *       if (layout.syncInfo?.status === "new") {
 *         // 新規レイアウトの保存
 *         const remoteLayout = await remoteStorage.saveNewLayout({
 *           id: undefined,
 *           name: layout.name,
 *           data: layout.baseline.data,
 *           permission: layout.permission,
 *           savedAt: new Date().toISOString()
 *         });
 *         console.log("Layout synced to remote:", remoteLayout.id);
 *       } else {
 *         // 既存レイアウトの更新
 *         const result = await remoteStorage.updateLayout({
 *           id: layout.id,
 *           data: layout.baseline.data,
 *           savedAt: new Date().toISOString()
 *         });
 *
 *         if (result.status === "conflict") {
 *           console.log("Sync conflict detected");
 *           // 競合解決UIを表示
 *         }
 *       }
 *     } catch (error) {
 *       console.error("Remote sync failed:", error);
 *     }
 *   };
 *
 *   const handleFetchRemoteLayouts = async () => {
 *     if (!remoteStorage) {
 *       return [];
 *     }
 *
 *     try {
 *       const remoteLayouts = await remoteStorage.getLayouts();
 *       console.log("Fetched remote layouts:", remoteLayouts.length);
 *       return remoteLayouts;
 *     } catch (error) {
 *       console.error("Failed to fetch remote layouts:", error);
 *       return [];
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <div>
 *         Remote Status: {remoteStorage ? "Online" : "Offline"}
 *       </div>
 *       <button
 *         onClick={handleFetchRemoteLayouts}
 *         disabled={!remoteStorage}
 *       >
 *         Sync from Remote
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### 注意点
 * - **オプショナル**: 返り値はundefinedの可能性がある
 * - **認証依存**: ログイン状態に依存する
 * - **ネットワーク依存**: オフライン時は利用不可
 * - **エラーハンドリング**: ネットワークエラーの適切な処理が必要
 *
 * @returns {IRemoteLayoutStorage | undefined} リモートレイアウトストレージインターフェース（オフライン時はundefined）
 */
export function useRemoteLayoutStorage(): IRemoteLayoutStorage | undefined {
  return useContext(RemoteLayoutStorageContext);
}
