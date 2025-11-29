// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * ブラウザ互換性チェック機能
 *
 * このモジュールはLichtblickアプリケーションが正常に動作するために
 * 必要なブラウザ機能とJavaScript APIの対応状況をチェックする
 *
 * チェック対象:
 * 1. BigInt64Array/BigUint64Array - 64ビット整数配列のサポート
 * 2. クラスの静的初期化ブロック - TypeScriptのデコレータで使用
 * 3. OffscreenCanvas - WebWorkerでのCanvas操作に必要
 *
 * 主な用途:
 * - アプリケーション起動前の事前チェック
 * - 非対応ブラウザでの警告表示の判定
 * - 機能制限モードの判定
 */

/**
 * Safari < 16.4 はクラス内の `static{}` ブロックをサポートしていない
 * TypeScriptがデコレータのコードを出力する際にこの構文を使用することがある
 *
 * この関数は動的にコードを生成・実行してクラス静的初期化ブロックの
 * サポート状況を確認する
 *
 * @returns クラス静的初期化ブロックがサポートされている場合true
 */
function supportsClassStaticInitialization() {
  try {
    // 動的にクラス静的初期化ブロックを含むコードを生成・実行
    // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
    new Function("class X { static { } }");
    return true;
  } catch (err: unknown) {
    // サポートされていない場合はSyntaxErrorが発生する
    console.error(err);
    return false;
  }
}

/**
 * OffscreenCanvasのサポート状況をチェック
 * OffscreenCanvasはWebWorker内でCanvas操作を行うために必要
 *
 * Lichtblickでは以下の用途で使用:
 * - 3Dレンダリングの最適化
 * - 画像処理のバックグラウンド実行
 * - メインスレッドをブロックしない描画処理
 */
const supportsOffscreenCanvas =
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function";

/**
 * アプリケーションの残りの部分をレンダリングするために必要な
 * JavaScript構文とAPIがサポートされているかどうかを判定する
 *
 * チェック項目の詳細:
 *
 * 1. BigInt64Array/BigUint64Array
 *    - ROSメッセージの64ビット整数フィールドの処理に必要
 *    - バイナリデータの効率的な操作に使用
 *
 * 2. クラス静的初期化ブロック
 *    - TypeScriptのデコレータ機能で生成されるコード
 *    - Safari < 16.4 では未対応
 *
 * 3. OffscreenCanvas
 *    - WebWorkerでのCanvas操作に必要
 *    - 3Dビジュアライゼーションの性能向上に重要
 *
 * @returns 全ての必要機能がサポートされている場合true
 */
export function canRenderApp(): boolean {
  return (
    // 64ビット整数配列のサポートチェック
    typeof BigInt64Array === "function" &&
    typeof BigUint64Array === "function" &&
    // クラス静的初期化ブロックのサポートチェック
    supportsClassStaticInitialization() &&
    // OffscreenCanvasのサポートチェック
    supportsOffscreenCanvas
  );
}
