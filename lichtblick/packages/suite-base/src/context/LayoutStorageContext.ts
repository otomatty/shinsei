// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ILayoutStorage } from "@lichtblick/suite-base/services/ILayoutStorage";
import { createContext, useContext } from "react";

/**
 * ## LayoutStorageContext
 *
 * **レイアウトの永続化ストレージへのアクセスを提供するContext**
 *
 * ### 概要
 * - レイアウトデータの低レベルストレージ操作を抽象化
 * - ローカルストレージ（IndexedDB、ファイルシステム）への統一インターフェース
 * - 名前空間ベースのレイアウト管理
 * - レイアウトの基本CRUD操作を提供
 *
 * ### 主な機能
 * - **基本CRUD操作**: list, get, put, delete
 * - **名前空間管理**: ユーザー・組織別のレイアウト分離
 * - **レイアウト移行**: 古いレイアウトの新形式への移行
 * - **レイアウトインポート**: 異なる名前空間間でのレイアウト移動
 * - **同期状態管理**: ローカル・リモート間の同期情報
 *
 * ### レイアウトデータ構造
 * ```typescript
 * interface Layout {
 *   id: LayoutID;
 *   name: string;
 *   from?: string;
 *   permission: LayoutPermission;
 *
 *   // 最後に明示的に保存されたバージョン
 *   baseline: LayoutBaseline;
 *
 *   // 編集中のワーキングコピー
 *   working: LayoutBaseline | undefined;
 *
 *   // リモートストレージとの同期情報
 *   syncInfo: LayoutSyncInfo | undefined;
 * }
 * ```
 *
 * ### 使用例
 * ```typescript
 * // レイアウトストレージの基本操作
 * const layoutStorage = useLayoutStorage();
 *
 * // 名前空間内のレイアウト一覧取得
 * const layouts = await layoutStorage.list("user-123");
 *
 * // 特定レイアウトの取得
 * const layout = await layoutStorage.get("user-123", "layout-456");
 *
 * // レイアウトの保存
 * const savedLayout = await layoutStorage.put("user-123", {
 *   id: "layout-456",
 *   name: "My Layout",
 *   permission: "CREATOR_WRITE",
 *   baseline: {
 *     data: layoutData,
 *     savedAt: new Date().toISOString()
 *   },
 *   working: undefined,
 *   syncInfo: { status: "new", lastRemoteSavedAt: undefined }
 * });
 *
 * // レイアウトの削除
 * await layoutStorage.delete("user-123", "layout-456");
 *
 * // レイアウトの移行・インポート
 * await layoutStorage.migrateUnnamespacedLayouts?.("user-123");
 * await layoutStorage.importLayouts({
 *   fromNamespace: "local",
 *   toNamespace: "user-123"
 * });
 * ```
 *
 * ### 名前空間の概念
 * - **local**: ローカル専用レイアウト
 * - **user-{id}**: ユーザー個人レイアウト
 * - **org-{id}**: 組織共有レイアウト
 * - **temp**: 一時的なレイアウト
 *
 * ### 同期状態の管理
 * - **new**: 新規作成、未同期
 * - **updated**: 更新済み、同期待ち
 * - **tracked**: 同期完了
 * - **locally-deleted**: ローカル削除済み
 * - **remotely-deleted**: リモート削除済み
 *
 * ### 実装パターン
 * - **Abstract Storage**: 具体的なストレージ実装を抽象化
 * - **Namespace Isolation**: 名前空間による完全分離
 * - **Version Management**: baseline/workingによる版管理
 * - **Migration Support**: 古いレイアウトの自動移行
 *
 * @see ILayoutStorage - レイアウトストレージインターフェース
 * @see LayoutManager - 高レベルレイアウト管理
 * @see WriteThroughLayoutCache - キャッシュ機能付きストレージ
 */
const LayoutStorageContext = createContext<ILayoutStorage | undefined>(undefined);
LayoutStorageContext.displayName = "LayoutStorageContext";

/**
 * ## useLayoutStorage
 *
 * **レイアウトストレージ機能にアクセスするためのカスタムフック**
 *
 * ### 概要
 * - LayoutStorageContextからILayoutStorageインスタンスを取得
 * - レイアウトの永続化操作を提供
 * - 必須のContext依存関係をチェック
 *
 * ### 注意点
 * - 直接的なストレージ操作のため、通常はLayoutManagerを使用することを推奨
 * - 名前空間の管理は呼び出し側の責任
 * - 同期状態の整合性は呼び出し側で保証する必要がある
 *
 * @returns {ILayoutStorage} レイアウトストレージインターフェース
 * @throws {Error} LayoutStorageProviderが設定されていない場合
 */
export function useLayoutStorage(): ILayoutStorage {
  const ctx = useContext(LayoutStorageContext);
  if (ctx == undefined) {
    throw new Error("A LayoutStorage provider is required to useLayoutStorage");
  }
  return ctx;
}

export default LayoutStorageContext;
