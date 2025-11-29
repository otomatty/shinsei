// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview IndexedDBを使用したレイアウトストレージの実装
 *
 * 【主な役割】
 * - パネルレイアウトをブラウザのIndexedDBに永続化
 * - レイアウトのCRUD操作（作成・読み取り・更新・削除）を提供
 * - 名前空間ベースのレイアウト管理
 * - LocalStorageからの移行処理
 *
 * 【使用箇所】
 * - App.tsx: アプリケーションのメインレイアウトストレージとして使用
 * - StudioApp.tsx: デスクトップ版でのレイアウトストレージ
 * - LayoutManager: レイアウト管理システムの基盤ストレージ
 *
 * 【処理の流れ】
 * 1. IndexedDBデータベース"foxglove-layouts"を開く
 * 2. レイアウトを[namespace, id]の複合キーで管理
 * 3. 名前空間ごとにレイアウトを分離して管理
 * 4. レガシーLocalStorageからの自動移行
 *
 * 【特徴】
 * - LocalStorageの容量制限問題を解決
 * - 複数ユーザー・組織でのレイアウト分離
 * - レイアウトのバージョン移行をサポート
 * - 非同期操作でUIをブロックしない
 *
 * 【データベース構造】
 * - データベース名: "foxglove-layouts"
 * - オブジェクトストア: "layouts"
 * - プライマリキー: [namespace, layout.id]
 * - インデックス: namespace（名前空間での検索用）
 */

import * as IDB from "idb/with-async-ittr";

import Log from "@lichtblick/log";
import { KEY_WORKSPACE_PREFIX } from "@lichtblick/suite-base/constants/browserStorageKeys";
import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { ILayoutStorage, Layout } from "@lichtblick/suite-base/services/ILayoutStorage";
import { migrateLayout } from "@lichtblick/suite-base/services/migrateLayout";

const log = Log.getLogger(__filename);

const DATABASE_NAME = `${KEY_WORKSPACE_PREFIX}lichtblick-layouts`;
const OBJECT_STORE_NAME = "layouts";

/**
 * IndexedDBのスキーマ定義
 *
 * レイアウトデータの型安全な管理を提供
 */
interface LayoutsDB extends IDB.DBSchema {
  layouts: {
    /** 複合プライマリキー: [名前空間, レイアウトID] */
    key: [namespace: string, id: LayoutID];
    /** 保存される値の型 */
    value: {
      /** レイアウトが属する名前空間 */
      namespace: string;
      /** レイアウトデータ本体 */
      layout: Layout;
    };
    /** 検索用インデックス */
    indexes: {
      /** 名前空間での検索を高速化 */
      namespace: string;
    };
  };
}

/**
 * IndexedDBにレイアウトを保存するストレージ実装
 *
 * すべてのレイアウトは単一のオブジェクトストアに保存され、
 * プライマリキーは[namespace, id]のタプルとなる
 *
 * 【パフォーマンス特性】
 * - 読み取り: O(log n) - インデックスによる高速検索
 * - 書き込み: O(log n) - B-treeによる効率的な挿入
 * - 削除: O(log n) - キーによる直接削除
 *
 * 【容量制限】
 * - LocalStorage: ~5-10MB（ブラウザ依存）
 * - IndexedDB: ~50MB〜無制限（ユーザー許可により拡張可能）
 */
export class IdbLayoutStorage implements ILayoutStorage {
  /**
   * IndexedDBデータベースへの接続
   *
   * 初回アクセス時に自動的にデータベースとスキーマを作成
   */
  #db = IDB.openDB<LayoutsDB>(DATABASE_NAME, 1, {
    upgrade(db) {
      // オブジェクトストアを作成
      // keyPathで複合キー[namespace, layout.id]を指定
      const store = db.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: ["namespace", "layout.id"],
      });
      // 名前空間での高速検索のためのインデックスを作成
      store.createIndex("namespace", "namespace");
    },
  });

  /**
   * 指定された名前空間のすべてのレイアウトを取得
   *
   * @param namespace レイアウトの名前空間
   * @returns レイアウトの配列（読み取り専用）
   *
   * @example
   * ```typescript
   * const personalLayouts = await storage.list('personal');
   * const orgLayouts = await storage.list('org:123');
   * ```
   */
  public async list(namespace: string): Promise<readonly Layout[]> {
    const results: Layout[] = [];
    const records = await (
      await this.#db
    ).getAllFromIndex(OBJECT_STORE_NAME, "namespace", namespace);

    // 各レコードをレイアウト移行処理を通してから結果に追加
    for (const record of records) {
      try {
        results.push(migrateLayout(record.layout));
      } catch (err: unknown) {
        log.error(err);
      }
    }
    return results;
  }

  /**
   * 指定されたレイアウトを取得
   *
   * @param namespace レイアウトの名前空間
   * @param id レイアウトID
   * @returns レイアウト、存在しない場合は`undefined`
   *
   * @example
   * ```typescript
   * const layout = await storage.get('personal', 'my-layout-id');
   * if (layout) {
   *   console.log('レイアウト名:', layout.name);
   * }
   * ```
   */
  public async get(namespace: string, id: LayoutID): Promise<Layout | undefined> {
    const record = await (await this.#db).get(OBJECT_STORE_NAME, [namespace, id]);
    return record == undefined ? undefined : migrateLayout(record.layout);
  }

  /**
   * レイアウトを保存（新規作成または更新）
   *
   * @param namespace レイアウトの名前空間
   * @param layout 保存するレイアウト
   * @returns 保存されたレイアウト
   *
   * @example
   * ```typescript
   * const newLayout = {
   *   id: 'my-layout',
   *   name: 'My Layout',
   *   // ... その他のプロパティ
   * };
   * await storage.put('personal', newLayout);
   * ```
   */
  public async put(namespace: string, layout: Layout): Promise<Layout> {
    await (await this.#db).put(OBJECT_STORE_NAME, { namespace, layout });
    return layout;
  }

  /**
   * レイアウトを削除
   *
   * @param namespace レイアウトの名前空間
   * @param id 削除するレイアウトID
   *
   * @example
   * ```typescript
   * await storage.delete('personal', 'unused-layout-id');
   * ```
   */
  public async delete(namespace: string, id: LayoutID): Promise<void> {
    await (await this.#db).delete(OBJECT_STORE_NAME, [namespace, id]);
  }

  /**
   * レイアウトを別の名前空間にインポート（移動）
   *
   * 主にユーザーログイン時にローカルレイアウトを個人レイアウトに変換する際に使用
   *
   * @param params インポートパラメータ
   * @param params.fromNamespace 移動元の名前空間
   * @param params.toNamespace 移動先の名前空間
   *
   * @example
   * ```typescript
   * // ローカルレイアウトを個人レイアウトに移行
   * await storage.importLayouts({
   *   fromNamespace: 'local',
   *   toNamespace: 'personal:user123'
   * });
   * ```
   */
  public async importLayouts({
    fromNamespace,
    toNamespace,
  }: {
    fromNamespace: string;
    toNamespace: string;
  }): Promise<void> {
    const tx = (await this.#db).transaction("layouts", "readwrite");
    const store = tx.objectStore("layouts");

    try {
      // 移動元の名前空間のすべてのレイアウトを反復処理
      for await (const cursor of store.index("namespace").iterate(fromNamespace)) {
        // 新しい名前空間で保存
        await store.put({ namespace: toNamespace, layout: cursor.value.layout });
        // 元のレコードを削除
        await cursor.delete();
      }
      await tx.done;
    } catch (error) {
      log.error(error);
    }
  }

  /**
   * 名前空間化されていない古いレイアウトを移行
   *
   * IdbLayoutStorage作成時点では、すべてのレイアウトが
   * 既に名前空間化されているため、実際の移行処理は不要
   *
   * @param namespace 移行先の名前空間（使用されない）
   */
  public async migrateUnnamespacedLayouts(namespace: string): Promise<void> {
    // LocalStorageからの移行を実行
    await this.#migrateFromLocalStorage();

    // IdbLayoutStorage作成時点では、すべてのレイアウトが既に名前空間化済み
    // そのため、名前空間化されていないレイアウトの移行は不要
    void namespace;
  }

  /**
   * 以前の実装（LocalStorageLayoutStorage）からレイアウトを移行
   *
   * LocalStorageの容量制限問題により、IndexedDBベースの実装に移行
   * 参考: https://github.com/foxglove/studio/issues/3100
   *
   * 【移行処理の流れ】
   * 1. LocalStorageから"studio.layouts"プレフィックスのキーを検索
   * 2. 各レイアウトをJSONパースしてバリデーション
   * 3. IndexedDBに移行
   * 4. 移行成功後にLocalStorageから削除
   *
   * 【エラーハンドリング】
   * - 個別のレイアウト移行に失敗しても処理を継続
   * - 移行に成功したもののみLocalStorageから削除
   */
  async #migrateFromLocalStorage() {
    const legacyLocalStorageKeyPrefix = "studio.layouts";
    const keysToMigrate: string[] = [];

    // LocalStorageから移行対象のキーを収集
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${legacyLocalStorageKeyPrefix}.`) === true) {
        keysToMigrate.push(key);
      }
    }

    // 各キーを個別に移行処理
    for (const key of keysToMigrate) {
      const layoutJson = localStorage.getItem(key);
      if (layoutJson == undefined) {
        continue;
      }

      try {
        const layout = migrateLayout(JSON.parse(layoutJson));

        // キー形式: "studio.layouts.namespace.id"
        const [_prefix1, _prefix2, namespace, id] = key.split(".");
        if (namespace == undefined || id == undefined || id !== layout.id) {
          log.error(`Failed to migrate ${key} from localStorage`);
          continue;
        }

        // 個別のトランザクションを使用して安全にLocalStorageから削除
        await (await this.#db).put("layouts", { namespace, layout });
        localStorage.removeItem(key);
      } catch (err: unknown) {
        log.error(err);
      }
    }
  }
}
