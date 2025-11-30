// StorageBridge: ローカルファイルストレージを提供するTauriブリッジ
// lichtblickのLocalFileStorage相当の機能を実装
import { invoke } from "@tauri-apps/api/core";

/**
 * ストレージコンテンツ型
 */
export type StorageContent = Uint8Array | string;

/**
 * ストレージエラー
 */
export interface StorageError {
  message: string;
  code?: string;
}

/**
 * StorageBridge - ローカルファイルストレージを提供するサービス
 *
 * lichtblickのLocalFileStorage相当の機能を提供
 * データストアごとにキー・バリューでデータを保存
 */
export const StorageBridge = {
  /**
   * データストア内のすべてのキーを一覧表示
   * @param datastore - データストア名（小文字とハイフンのみ）
   */
  async list(datastore: string): Promise<string[]> {
    return await invoke<string[]>("storage_list", { datastore });
  },

  /**
   * データストア内のすべてのデータを取得
   * @param datastore - データストア名
   */
  async all(datastore: string): Promise<Uint8Array[]> {
    const results = await invoke<number[][]>("storage_all", { datastore });
    return results.map((arr) => new Uint8Array(arr));
  },

  /**
   * 指定したキーのデータを取得（バイナリ）
   * @param datastore - データストア名
   * @param key - キー名（小文字とハイフンのみ）
   */
  async get(datastore: string, key: string): Promise<Uint8Array | undefined> {
    const result = await invoke<number[] | null>("storage_get", {
      datastore,
      key,
    });

    if (result === null) {
      return undefined;
    }

    return new Uint8Array(result);
  },

  /**
   * 指定したキーのデータを取得（UTF-8文字列）
   * @param datastore - データストア名
   * @param key - キー名
   */
  async getString(datastore: string, key: string): Promise<string | undefined> {
    const result = await invoke<string | null>("storage_get_string", {
      datastore,
      key,
    });
    return result ?? undefined;
  },

  /**
   * データを保存
   * @param datastore - データストア名
   * @param key - キー名
   * @param value - 保存するデータ（Uint8Array または string）
   */
  async put(
    datastore: string,
    key: string,
    value: StorageContent
  ): Promise<void> {
    if (typeof value === "string") {
      await invoke("storage_put_string", { datastore, key, value });
    } else {
      // Uint8Arrayを通常の配列に変換（Tauriのシリアライゼーション用）
      await invoke("storage_put", {
        datastore,
        key,
        value: Array.from(value),
      });
    }
  },

  /**
   * データを削除
   * @param datastore - データストア名
   * @param key - キー名
   */
  async delete(datastore: string, key: string): Promise<void> {
    await invoke("storage_delete", { datastore, key });
  },

  /**
   * データが存在するか確認
   * @param datastore - データストア名
   * @param key - キー名
   */
  async exists(datastore: string, key: string): Promise<boolean> {
    return await invoke<boolean>("storage_exists", { datastore, key });
  },

  /**
   * JSON形式でデータを保存するヘルパー
   * @param datastore - データストア名
   * @param key - キー名
   * @param data - 保存するオブジェクト
   */
  async putJson<T>(datastore: string, key: string, data: T): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await this.put(datastore, key, json);
  },

  /**
   * JSON形式のデータを取得するヘルパー
   * @param datastore - データストア名
   * @param key - キー名
   */
  async getJson<T>(datastore: string, key: string): Promise<T | undefined> {
    const content = await this.getString(datastore, key);
    if (content === undefined) {
      return undefined;
    }
    return JSON.parse(content) as T;
  },
};

export default StorageBridge;
