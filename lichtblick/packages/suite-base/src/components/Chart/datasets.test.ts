// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * datasets.ts用のテストファイル
 *
 * チャートデータセット処理ユーティリティ関数のテストを提供します。
 * 特に型付き配列データの効率的な処理機能をテストします。
 */

import { findIndices } from "./datasets";

/**
 * findIndices関数のテストスイート
 *
 * 型付き配列データセット内で特定のインデックスに対応する
 * データセットとローカルインデックスを効率的に見つける機能をテストします。
 */
describe("findIndices", () => {
  /**
   * 空のスライスを正しく無視することをテスト
   *
   * データセット配列に空のデータセット（長さ0の配列）が含まれている場合、
   * それらを適切にスキップして有効なデータセットのみを処理することを確認します。
   */
  it("ignores empty slices", () => {
    expect(
      findIndices(
        [
          {
            // 空のデータセット（スキップされるべき）
            x: new Float32Array(),
            y: new Float32Array(),
            value: [],
          },
          {
            // 有効なデータセット（1要素）
            x: new Float32Array(1),
            y: new Float32Array(1),
            value: ["foo"],
          },
        ],
        0, // グローバルインデックス0を検索
      ),
    ).toEqual([1, 0]); // データセット1のローカルインデックス0
  });

  /**
   * インデックス計算が正しく行われることをテスト
   *
   * 複数のデータセットにまたがるグローバルインデックスを
   * 正しいデータセットとローカルインデックスに変換できることを確認します。
   */
  it("calculates index correctly", () => {
    expect(
      findIndices(
        [
          {
            // 3要素のデータセット（インデックス0-2）
            x: new Float32Array(3),
            y: new Float32Array(3),
            value: [1, 2, 3],
          },
          {
            // 1要素のデータセット（インデックス3）
            x: new Float32Array(1),
            y: new Float32Array(1),
            value: [4],
          },
        ],
        3, // グローバルインデックス3を検索（2番目のデータセットの最初の要素）
      ),
    ).toEqual([1, 0]); // データセット1のローカルインデックス0
  });
});
