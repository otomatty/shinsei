// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useLayoutEffect, useState } from "react";
import { useResizeDetector } from "react-resize-detector";

/**
 * Canvas描画関数の型定義
 * @param context - 2Dレンダリングコンテキスト
 * @param width - CSS座標系での幅（デバイスピクセル比を考慮しない）
 * @param height - CSS座標系での高さ（デバイスピクセル比を考慮しない）
 */
type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;

/**
 * AutoSizingCanvasコンポーネントのプロパティ
 */
type AutoSizingCanvasProps = {
  /** Canvas描画処理を行う関数 */
  draw: Draw;
  /** テスト用のデバイスピクセル比のオーバーライド値 */
  overrideDevicePixelRatioForTest?: number;
};

/**
 * 自動リサイズ対応Canvas コンポーネント
 *
 * 親要素のサイズ変更に自動的に追従し、高解像度ディスプレイ（Retina等）にも対応したCanvas要素を提供します。
 *
 * ## 主な機能
 * - **自動リサイズ**: 親要素のサイズ変更を検出し、Canvas要素を自動的にリサイズ
 * - **高解像度対応**: デバイスピクセル比を考慮した適切なCanvas解像度の設定
 * - **パフォーマンス最適化**: デバウンス処理により不要なリサイズ処理を抑制
 * - **動的ピクセル比対応**: ディスプレイ設定の変更やウィンドウの移動に対応
 *
 * ## 使用例
 * ```tsx
 * <AutoSizingCanvas
 *   draw={(ctx, width, height) => {
 *     ctx.fillStyle = "blue";
 *     ctx.fillRect(0, 0, width, height);
 *   }}
 * />
 * ```
 *
 * ## 技術的詳細
 * - `react-resize-detector`を使用してサイズ変更を検出
 * - `matchMedia`APIを使用してデバイスピクセル比の変更を監視
 * - Canvas要素の内部解像度とCSS表示サイズを適切に分離
 *
 * ## 注意事項
 * - 描画関数（draw）は毎フレーム呼び出される可能性があるため、パフォーマンスを考慮した実装が必要
 * - Canvas要素は親要素のサイズに100%フィットするため、親要素でサイズを制御する必要がある
 *
 * @param props - コンポーネントのプロパティ
 * @returns 自動リサイズ対応のCanvas要素
 */
const AutoSizingCanvas = ({
  draw,
  overrideDevicePixelRatioForTest,
}: AutoSizingCanvasProps): React.JSX.Element => {
  // リサイズ検出の設定
  // デバウンス処理と0のリフレッシュレートにより、リサイズ処理中に新たなリサイズ監視が
  // トリガーされることを防ぐ
  // 参考: https://github.com/maslianok/react-resize-detector/issues/45
  const {
    width,
    height,
    ref: canvasRef,
  } = useResizeDetector<HTMLCanvasElement>({
    refreshRate: 0,
    refreshMode: "debounce",
  });

  // デバイスピクセル比の動的監視
  // ディスプレイ設定の変更やウィンドウの移動に対応
  const [pixelRatio, setPixelRatio] = useState(window.devicePixelRatio);
  useLayoutEffect(() => {
    /**
     * デバイスピクセル比変更時のイベントリスナー
     * 高解像度ディスプレイ間での移動や、ディスプレイ設定の変更に対応
     */
    const listener = () => {
      setPixelRatio(window.devicePixelRatio);
    };

    // 現在のピクセル比に対応するメディアクエリを作成
    const query = window.matchMedia(`(resolution: ${pixelRatio}dppx)`);
    query.addEventListener("change", listener, { once: true });

    return () => {
      query.removeEventListener("change", listener);
    };
  }, [pixelRatio]);

  // 実際に使用するピクセル比を決定（テスト用オーバーライドがある場合はそれを使用）
  const ratio = overrideDevicePixelRatioForTest ?? pixelRatio;

  // Canvas要素の実際の解像度を計算
  // CSS表示サイズ × デバイスピクセル比 = 実際の解像度
  const actualWidth = ratio * (width ?? 0);
  const actualHeight = ratio * (height ?? 0);

  // Canvas描画処理
  // サイズやピクセル比が変更されるたびに再描画を実行
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width == undefined || height == undefined) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // 座標系をデバイスピクセル比に合わせてスケール
    // これにより、draw関数ではCSS座標系で描画できる
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // ユーザー定義の描画関数を実行
    draw(ctx, width, height);
  });

  return (
    <canvas
      ref={canvasRef}
      width={actualWidth}
      height={actualHeight}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default AutoSizingCanvas;
