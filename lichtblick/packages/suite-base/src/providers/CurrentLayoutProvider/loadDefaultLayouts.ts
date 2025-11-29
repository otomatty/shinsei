// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import Logger from "@lichtblick/log";
import { LayoutLoader } from "@lichtblick/suite-base/services/ILayoutLoader";
import { ILayoutManager } from "@lichtblick/suite-base/services/ILayoutManager";

const log = Logger.getLogger(__filename);

/**
 * Promise.allSettledの結果から成功したPromiseを判定するタイプガード
 *
 * @template T - Promiseの解決値の型
 * @param result - Promise.allSettledの結果オブジェクト
 * @returns 成功したPromiseかどうかの真偽値
 */
const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
  result.status === "fulfilled";

/**
 * Promise.allSettledの結果から失敗したPromiseを判定するタイプガード
 *
 * @param result - Promise.allSettledの結果オブジェクト
 * @returns 失敗したPromiseかどうかの真偽値
 */
const isRejected = (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult =>
  result.status === "rejected";

/**
 * デフォルトレイアウトの読み込みと保存処理
 *
 * 複数のLayoutLoaderからレイアウトを取得し、まだ保存されていない新しいレイアウトのみを
 * LayoutManagerに保存します。エラー処理とログ出力を含む堅牢な実装です。
 *
 * ## 処理フロー
 * 1. 現在保存されているレイアウト一覧を取得
 * 2. 全ローダーから並行してレイアウトを取得
 * 3. 重複チェック（`from`プロパティで判定）
 * 4. 新しいレイアウトのみを保存
 * 5. エラー処理とログ出力
 *
 * ## エラー処理
 * - ローダーからの取得失敗: ログ出力のみ、処理続行
 * - レイアウト保存失敗: ログ出力のみ、他レイアウトの処理続行
 * - 全体的な例外: ログ出力して処理終了
 *
 * ## 重複回避機能
 * `from`プロパティを使用して同一ソースからのレイアウトの重複保存を防止します。
 * これにより、アプリケーション再起動時の重複インポートを回避できます。
 *
 * ## 並行処理
 * - `Promise.allSettled`を使用してローダー実行を並行化
 * - 一部のローダーが失敗しても他の処理を継続
 * - 保存処理も並行実行で効率化
 *
 * ## 使用場面
 * - アプリケーション初期化時
 * - 新しいレイアウトローダーの追加時
 * - 組織固有のデフォルトレイアウト配布
 *
 * @param layoutManager - レイアウト管理サービス
 * @param loaders - レイアウトローダーの配列
 * @returns Promise<void> - 処理完了を示すPromise
 *
 * @example
 * ```typescript
 * // アプリケーション初期化時の使用例
 * const loaders = [
 *   new RemoteLayoutLoader('https://company.com/layouts'),
 *   new LocalFileLayoutLoader('./default-layouts'),
 * ];
 *
 * await loadDefaultLayouts(layoutManager, loaders);
 * console.log('デフォルトレイアウトの読み込み完了');
 * ```
 *
 * @see LayoutLoader - レイアウト読み込みインターフェース
 * @see ILayoutManager - レイアウト管理インターフェース
 */
export const loadDefaultLayouts = async (
  layoutManager: ILayoutManager,
  loaders: readonly LayoutLoader[],
): Promise<void> => {
  // ローダーが存在しない場合は早期リターン
  if (loaders.length === 0) {
    return;
  }

  try {
    // 現在保存されているレイアウト一覧を取得
    const currentLayouts = await layoutManager.getLayouts();
    const currentLayoutsFroms = new Set(currentLayouts.map(({ from }) => from));

    // 全ローダーから並行してレイアウトを取得
    const loaderPromises = loaders.map(async (loader) => await loader.fetchLayouts());
    const loaderResults = await Promise.allSettled(loaderPromises);

    // 成功したローダーの結果から新しいレイアウトのみを抽出
    const newLayouts = loaderResults
      .filter(isFulfilled)
      .flatMap(({ value }) => value)
      .filter(({ from }) => !currentLayoutsFroms.has(from));

    // ローダーエラーをログ出力（処理は継続）
    loaderResults.filter(isRejected).forEach(({ reason }) => {
      log.error(`Failed to fetch layouts from loader: ${reason}`);
    });

    // 新しいレイアウトを並行して保存
    const savedPromises = newLayouts.map(
      async (layout) =>
        await layoutManager.saveNewLayout({
          ...layout,
          permission: "CREATOR_WRITE", // 作成者書き込み権限を付与
        }),
    );

    // 保存処理を実行し、結果を取得
    const savedResults = await Promise.allSettled(savedPromises);

    // 保存エラーをログ出力
    savedResults.filter(isRejected).forEach(({ reason }) => {
      log.error(`Failed to save layout: ${reason}`);
    });
  } catch (err: unknown) {
    // 全体的な例外をキャッチしてログ出力
    log.error(`Loading default layouts failed: ${err}`);
  }
};
