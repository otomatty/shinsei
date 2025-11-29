// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ReactRefreshPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { Configuration, WebpackPluginInstance } from "webpack";
import type {
  ConnectHistoryApiFallbackOptions,
  Configuration as WebpackDevServerConfiguration,
} from "webpack-dev-server";

import type { WebpackArgv } from "@lichtblick/suite-base/WebpackArgv";
import { makeConfig } from "@lichtblick/suite-base/webpack";
import * as palette from "@lichtblick/theme/src/palette";

/**
 * Webpack設定生成モジュール
 *
 * このモジュールはLichtblick Webアプリケーション用のWebpack設定を生成する
 * 開発環境と本番環境の両方に対応し、最適化されたビルド設定を提供する
 *
 * 主な機能:
 * 1. 開発サーバー設定
 *    - ホットリロード対応
 *    - ヒストリーAPIフォールバック
 *    - CORS設定
 *    - クロスオリジン分離設定
 *
 * 2. 本番ビルド設定
 *    - コード分割とバンドル最適化
 *    - ソースマップ生成
 *    - 静的アセット処理
 *    - HTMLテンプレート生成
 *
 * 3. TypeScript/React対応
 *    - TypeScript コンパイル設定
 *    - React Fast Refresh
 *    - JSX変換設定
 *
 * 使用パターン:
 * - 開発時: webpack-dev-server での開発
 * - ビルド時: 本番用静的ファイル生成
 * - テスト時: Jest との連携
 */

export interface WebpackConfiguration extends Configuration {
  devServer?: WebpackDevServerConfiguration;
}

/**
 * Webpack設定パラメータの型定義
 * ビルド設定をカスタマイズするためのオプション群
 */
export type ConfigParams = {
  /** `entrypoint` と `tsconfig.json` を見つけるディレクトリ */
  contextPath: string;
  /** アプリケーションのエントリーポイントファイル */
  entrypoint: string;
  /** ビルド出力先ディレクトリ */
  outputPath: string;
  /** 静的ファイルの公開パス（CDN等で使用） */
  publicPath?: string;
  /** 本番ビルド用のソースマップ設定（`devtool`） */
  prodSourceMap: string | false;
  /** アプリケーションのバージョン情報 */
  version: string;
  /** react-router用に上書きが必要なヒストリーAPIフォールバック設定 */
  historyApiFallback?: ConnectHistoryApiFallbackOptions;
  /** index.htmlのカスタマイズオプション */
  indexHtmlOptions?: Partial<HtmlWebpackPlugin.Options>;
};

/**
 * 開発サーバー用のWebpack設定を生成
 *
 * 開発時の快適性を重視した設定で、以下の機能を提供:
 * 1. ホットモジュールリプレースメント（HMR）
 * 2. ヒストリーAPIフォールバック（SPA対応）
 * 3. セキュリティヘッダー設定
 * 4. エラーオーバーレイ設定
 *
 * @param params - 設定パラメータ
 * @returns 開発サーバー用Webpack設定
 */
export const devServerConfig = (params: ConfigParams): WebpackConfiguration => ({
  // webpack のデフォルトフォールバック（/src）を避けるため空のエントリーを使用
  entry: {},

  // HtmlWebpackPlugin が render config 内で動作するために、ここで出力パスを指定
  output: {
    publicPath: params.publicPath ?? "",
    path: params.outputPath,
  },

  devServer: {
    static: {
      directory: params.outputPath,
    },
    // SPA（Single Page Application）のルーティング対応
    historyApiFallback: params.historyApiFallback,
    // ホットリロード機能を有効化
    hot: true,
    // 問題と解決方法は <https://github.com/webpack/webpack-dev-server/issues/1604> で説明されている
    // 開発モードで実行時に開発コンソールに2つのエラーがログ出力される:
    //  "Invalid Host/Origin header"
    //  "[WDS] Disconnected!"
    // localhost にのみ接続しているため、開発時は DNS rebinding 攻撃の心配はない
    allowedHosts: "all",
    headers: {
      // クロスオリジン分離を有効化: https://resourcepolicy.fyi
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "credentialless",
    },

    client: {
      overlay: {
        // 終了したWebWorkerからのimportScriptエラーのオーバーレイを抑制
        runtimeErrors: (error) => {
          // WebWorkerが終了した時、保留中の `importScript` 呼び出しはブラウザによってキャンセルされる
          // これらはdevtoolsのネットワークタブに "(cancelled)" として表示され、
          // 親ページに `window.onerror` をトリガーするエラーとして浮上する
          //
          // webpack devserver は window error handler にアタッチして、
          // ページに送信された未処理エラーを表面化する。しかし、この種のエラーは
          // ワーカー自体が消失しているため、終了したワーカーにとっては偽陽性である
          // ネットワークリクエストがキャンセルされても気にしない
          //
          // これにより開発中の実際のimportScriptエラーが隠される可能性があるか？
          // ワーカーが通常の動作中にこのエラーに遭遇する可能性がある（正当な理由で
          // スクリプトのインポートが失敗した場合）。その場合、スクリプトに依存していた
          // ワーカーロジックが実行に失敗し、他の種類のエラーをトリガーすることを期待する。
          // 開発者はdevtoolsコンソールでimportScriptsエラーを確認できる。
          if (
            error.message.startsWith(
              `Uncaught NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'`,
            )
          ) {
            return false;
          }

          return true;
        },
      },
    },
  },

  plugins: [new CleanWebpackPlugin()],
});

/**
 * メインのWebpack設定を生成する関数
 *
 * 開発環境と本番環境の両方に対応した包括的なWebpack設定を生成する
 * 環境に応じて最適化レベルやプラグイン構成を動的に調整する
 *
 * 設定内容:
 * 1. TypeScript/JSXコンパイル
 * 2. 静的アセット処理（画像、フォント等）
 * 3. HTMLテンプレート生成
 * 4. コード分割とバンドル最適化
 * 5. ソースマップ生成
 * 6. React Fast Refresh（開発時）
 *
 * @param params - ビルド設定パラメータ
 * @returns Webpack設定を返す関数
 */
export const mainConfig =
  (params: ConfigParams) =>
  (env: unknown, argv: WebpackArgv): Configuration => {
    // 環境判定
    const isDev = argv.mode === "development";
    const isServe = argv.env?.WEBPACK_SERVE ?? false;

    // 開発時は未使用変数を許可（開発効率のため）
    const allowUnusedVariables = isDev;

    const plugins: WebpackPluginInstance[] = [];

    // 開発サーバー実行時はReact Fast Refreshを有効化
    if (isServe) {
      plugins.push(new ReactRefreshPlugin());
    }

    // ベースとなるWebpack設定を取得
    const appWebpackConfig = makeConfig(env, argv, {
      allowUnusedVariables,
      version: params.version,
    });

    const config: Configuration = {
      name: "main",

      ...appWebpackConfig,

      // ブラウザ環境をターゲット
      target: "web",
      // TypeScript設定ファイルの検索起点
      context: params.contextPath,
      // アプリケーションエントリーポイント
      entry: params.entrypoint,
      // ソースマップ設定（開発時は高速、本番時は設定可能）
      devtool: isDev ? "eval-cheap-module-source-map" : params.prodSourceMap,

      output: {
        // 静的ファイルの公開パス（CDN対応）
        publicPath: params.publicPath ?? "auto",

        // キャッシュバスティングのため、本番時はファイル名にコンテンツハッシュを含める
        filename: isDev ? "[name].js" : "[name].[contenthash].js",

        // ビルド出力先ディレクトリ
        path: params.outputPath,
      },

      plugins: [
        ...plugins,
        ...(appWebpackConfig.plugins ?? []),
        // 静的ファイル（favicon等）をコピー
        new CopyPlugin({
          patterns: [{ from: path.resolve(__dirname, "..", "public") }],
        }),
        // HTMLテンプレート生成プラグイン
        new HtmlWebpackPlugin({
          // カスタムHTMLテンプレート
          templateContent: ({ htmlWebpackPlugin }) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <!-- PWA対応のためのmeta tag -->
      <meta name="apple-mobile-web-app-capable" content="yes">
      ${htmlWebpackPlugin.options.foxgloveExtraHeadTags}
      <!-- 初期ローディング時のスタイル -->
      <style type="text/css" id="loading-styles">
        body {
          margin: 0;
        }
        #root {
          height: 100vh;
          background-color: ${palette.light.background?.default};
          color: ${palette.light.text?.primary};
        }
        /* ダークモード対応 */
        @media (prefers-color-scheme: dark) {
          #root {
            background-color: ${palette.dark.background?.default}};
            color: ${palette.dark.text?.primary};
          }
        }
      </style>
    </head>
    <script>
      <!-- グローバル変数の初期化 -->
      global = globalThis;
      globalThis.LICHTBLICK_SUITE_DEFAULT_LAYOUT = [/*LICHTBLICK_SUITE_DEFAULT_LAYOUT_PLACEHOLDER*/][0];
    </script>
    <body>
      <!-- Reactアプリケーションのマウントポイント -->
      <div id="root"></div>
    </body>
  </html>
  `,
          // 追加のHTMLヘッダータグ（favicon、タイトル等）
          foxgloveExtraHeadTags: `
            <title>Lichtblick</title>
            <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png" />
          `,
          // 外部からの追加オプション
          ...params.indexHtmlOptions,
        }),
      ],
    };

    return config;
  };
