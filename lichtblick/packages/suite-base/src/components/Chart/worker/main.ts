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

/**
 * Chart.js WebWorkerのエントリーポイント
 *
 * このファイルはChart.jsコンポーネント用のWebWorkerの起動点として機能します。
 * WebWorker環境でChartJsMuxインスタンスを初期化し、メインスレッドとの
 * RPC通信を確立します。
 *
 * ## 処理の流れ
 * 1. WebWorker環境かどうかを確認
 * 2. RPC通信チャネルを設定
 * 3. ChartJsMuxインスタンスを作成
 * 4. メインスレッドからのRPC要求を待機
 *
 * ## 技術的な注意点
 * - 単一のwebターゲットを使用するため、globalはWindowGlobalScopeではなく
 *   WorkerGlobalScopeを参照する必要があります
 * - RPC通信によりメインスレッドとWebWorker間でChart.js操作を同期します
 *
 * @see ChartJsMux - RPC要求のルーティングと複数チャートインスタンスの管理
 * @see ChartJSManager - 個別のChart.jsインスタンス管理
 */

import Rpc, { Channel } from "@lichtblick/suite-base/util/Rpc";
import { inWebWorker } from "@lichtblick/suite-base/util/workers";

import ChartJsMux from "./ChartJsMux";

// WebWorker環境でのみ実行
if (inWebWorker()) {
  // 単一のwebターゲットを使用するため、globalはwindowグローバルではなく
  // WorkerGlobalScopeを参照します。実際の値にキャストします。
  // #FG-64
  new ChartJsMux(new Rpc(global as unknown as Channel));
}
