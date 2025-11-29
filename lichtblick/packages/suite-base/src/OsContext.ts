// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview OS固有の機能にアクセスするためのインターフェース定義
 *
 * 【主な役割】
 * - OS固有の機能にアクセスするためのAPIインターフェースを定義
 * - Electron Context Bridge経由で安全にOS機能を公開
 * - ネットワークインターフェース情報の型定義
 *
 * 【使用箇所】
 * - OsContextSingleton.ts: 実際のシングルトンインスタンスの型として使用
 * - suite-desktop: Electronのメインプロセスでの実装
 * - index.ts: 外部パッケージへのエクスポート
 *
 * 【特徴】
 * - TypeScriptの型安全性を提供
 * - Node.jsのAPIを安全にレンダラープロセスに公開
 * - セキュリティ境界を明確に定義
 */

/**
 * ネットワークインターフェース情報を表すインターフェース
 *
 * Node.jsの`os.networkInterfaces()`の戻り値と互換性がある
 */
export interface NetworkInterface {
  /** インターフェース名（例: "eth0", "wlan0", "en0"） */
  name: string;
  /** IPアドレスファミリー（IPv4またはIPv6） */
  family: "IPv4" | "IPv6";
  /** 内部ネットワークかどうか（ループバックアドレスなど） */
  internal: boolean;
  /** IPアドレス */
  address: string;
  /** CIDR記法のネットワークアドレス（オプション） */
  cidr?: string;
  /** MACアドレス */
  mac: string;
  /** ネットマスク */
  netmask: string;
}

/**
 * OS固有の機能にアクセスするためのコンテキストインターフェース
 *
 * このインターフェースはElectron Context Bridge経由で公開される
 *
 * 【セキュリティ考慮事項】
 * - Electronのセキュリティモデルに従い、必要最小限のAPIのみ公開
 * - メインプロセスでのみ実装され、レンダラープロセスには安全に公開
 * - 任意のNode.js APIへの直接アクセスは提供しない
 */
export interface OsContext {
  /**
   * プラットフォーム識別子
   *
   * Node.jsの`process.platform`と同じ値
   * - 'darwin': macOS
   * - 'win32': Windows
   * - 'linux': Linux
   */
  platform: string;

  /**
   * このアプリケーションのプロセスID
   *
   * デバッグやモニタリングに使用
   */
  pid: number;

  /**
   * 環境変数を取得する
   *
   * @param envVar 取得する環境変数名
   * @returns 環境変数の値、存在しない場合は`undefined`
   *
   * @example
   * ```typescript
   * const rosPackagePath = osContext.getEnvVar('ROS_PACKAGE_PATH');
   * const home = osContext.getEnvVar('HOME');
   * ```
   */
  getEnvVar: (envVar: string) => string | undefined;

  /**
   * オペレーティングシステムのホスト名を取得する
   *
   * @returns システムのホスト名
   *
   * @example
   * ```typescript
   * const hostname = osContext.getHostname(); // "my-computer.local"
   * ```
   */
  getHostname: () => string;

  /**
   * システム上で発見されたすべてのネットワークインターフェースの一覧を取得する
   *
   * @returns ネットワークインターフェース情報の配列
   *
   * @example
   * ```typescript
   * const interfaces = osContext.getNetworkInterfaces();
   * const ethInterface = interfaces.find(i => i.name === 'eth0');
   * ```
   */
  getNetworkInterfaces: () => NetworkInterface[];

  /**
   * package.jsonからアプリケーションのバージョン文字列を取得する
   *
   * @returns アプリケーションのバージョン（例: "1.2.3"）
   *
   * @example
   * ```typescript
   * const version = osContext.getAppVersion(); // "1.85.0"
   * ```
   */
  getAppVersion: () => string;
}
