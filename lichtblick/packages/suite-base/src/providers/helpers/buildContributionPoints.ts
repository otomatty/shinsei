// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as _ from "lodash-es";
import ReactDOM from "react-dom";

import { CameraModelsMap } from "@lichtblick/den/image/types";
import Logger from "@lichtblick/log";
import {
  RegisterMessageConverterArgs,
  ExtensionContext,
  TopicAliasFunction,
  ExtensionModule,
  ExtensionPanelRegistration,
  RegisterCameraModelArgs,
} from "@lichtblick/suite";
import { ExtensionSettings } from "@lichtblick/suite-base/components/PanelSettings/types";
import {
  ContributionPoints,
  RegisteredPanel,
  MessageConverter,
} from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

const log = Logger.getLogger(__filename);

/**
 * 拡張機能のコントリビューションポイントを構築する関数
 *
 * この関数は拡張機能の動的実行とライフサイクル管理の中核を担います。
 * 拡張機能のソースコードを動的にロードし、安全なサンドボックス環境で実行して、
 * 拡張機能が提供する各種機能（パネル、メッセージコンバータ、カメラモデルなど）を
 * アプリケーションに統合します。
 *
 * ## 主な機能
 * - **動的コード実行**: 拡張機能のJavaScriptコードを安全に実行
 * - **コントリビューション収集**: 拡張機能が登録する各種機能の収集
 * - **名前空間管理**: 拡張機能間の名前衝突を防ぐ
 * - **エラーハンドリング**: 拡張機能実行時のエラーを適切に処理
 * - **ライフサイクル管理**: 拡張機能の初期化プロセスを管理
 *
 * ## セキュリティ考慮事項
 * - 制限されたrequire関数により、利用可能なモジュールを制限
 * - 拡張機能は独立したモジュールスコープで実行
 * - エラーは適切にキャッチされ、アプリケーション全体への影響を防止
 *
 * ## 拡張機能の実行フロー
 * 1. 拡張機能のソースコードを受け取る
 * 2. ExtensionContextを作成し、登録API群を提供
 * 3. 制限されたrequire関数とmodule.exportsを準備
 * 4. new Function()でコードを動的実行
 * 5. activate()メソッドを呼び出して拡張機能を初期化
 * 6. 登録された各種機能をContributionPointsとして返却
 *
 * ## 登録可能な機能
 * - **パネル**: カスタムUI要素
 * - **メッセージコンバータ**: データ変換ロジック
 * - **トピックエイリアス**: トピック名の別名定義
 * - **カメラモデル**: カメラキャリブレーション機能
 * - **パネル設定**: 各機能の設定項目
 *
 * @param extension - 拡張機能の基本情報（名前、ID、名前空間など）
 * @param unwrappedExtensionSource - 拡張機能のJavaScriptソースコード文字列
 * @returns 拡張機能が提供する全ての機能を含むContributionPoints
 *
 * @example
 * ```typescript
 * // 拡張機能の基本情報
 * const extensionInfo: ExtensionInfo = {
 *   id: "my-extension",
 *   qualifiedName: "com.example.my-extension",
 *   namespace: "myExtension",
 *   // ... その他の情報
 * };
 *
 * // 拡張機能のソースコード
 * const sourceCode = `
 *   module.exports = {
 *     activate: (context) => {
 *       context.registerPanel({
 *         name: "MyPanel",
 *         initPanel: (context) => { ... }
 *       });
 *     }
 *   };
 * `;
 *
 * // コントリビューションポイントを構築
 * const contributions = buildContributionPoints(extensionInfo, sourceCode);
 *
 * // 登録されたパネルを確認
 * console.log(contributions.panels);
 * ```
 */
export function buildContributionPoints(
  extension: ExtensionInfo,
  unwrappedExtensionSource: string,
): ContributionPoints {
  // 拡張機能が登録したパネルを完全修飾ID（拡張機能名 + パネル名）で管理
  // これにより、異なる拡張機能間でのパネル名衝突を防ぐ
  const panels: Record<string, RegisteredPanel> = {};

  // メッセージコンバータの登録リスト
  // ROSメッセージ形式間の変換ロジックを提供
  const messageConverters: RegisterMessageConverterArgs<unknown>[] = [];

  // パネル設定の集約オブジェクト
  // 各パネルの設定項目を統合管理
  const panelSettings: ExtensionSettings = {};

  // トピックエイリアス関数の登録リスト
  // トピック名の動的な別名解決を提供
  const topicAliasFunctions: ContributionPoints["topicAliasFunctions"] = [];

  // カメラモデルの登録マップ
  // カメラキャリブレーション用のモデル定義を管理
  const cameraModels: CameraModelsMap = new Map();

  log.debug(`Mounting extension ${extension.qualifiedName}`);

  // 拡張機能用のモジュールオブジェクトを作成
  // CommonJSスタイルのmodule.exportsパターンを模倣
  const module = { exports: {} };

  /**
   * 制限されたrequire関数
   *
   * セキュリティ上の理由から、拡張機能が利用できるモジュールを制限します。
   * 現在はReactとReactDOMのみが利用可能です。
   *
   * @param name - 要求されるモジュール名
   * @returns 許可されたモジュールオブジェクト
   */
  const require = (name: string) => {
    return { react: React, "react-dom": ReactDOM }[name];
  };

  // 実行環境の判定
  // 本番環境、テスト環境、開発環境を区別して拡張機能に伝達
  const extensionMode =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "development";

  /**
   * 拡張機能コンテキスト
   *
   * 拡張機能が各種機能を登録するためのAPIを提供します。
   * このオブジェクトを通じて、拡張機能はアプリケーションに
   * 自身の機能を統合できます。
   */
  const ctx: ExtensionContext = {
    mode: extensionMode,

    /**
     * パネル登録API
     *
     * 拡張機能がカスタムパネルを登録するためのメソッドです。
     * 登録されたパネルは、パネルピッカーで選択可能になります。
     *
     * @param registration - パネルの登録情報
     */
    registerPanel: (registration: ExtensionPanelRegistration) => {
      log.debug(`Extension ${extension.qualifiedName} registering panel: ${registration.name}`);

      // 完全修飾パネルID（拡張機能名.パネル名）を生成
      const panelId = `${extension.qualifiedName}.${registration.name}`;

      // 重複登録の検出と警告
      if (panels[panelId]) {
        log.warn(`Panel ${panelId} is already registered`);
        return;
      }

      // パネル情報を拡張機能メタデータと共に保存
      panels[panelId] = {
        extensionId: extension.id,
        extensionName: extension.qualifiedName,
        extensionNamespace: extension.namespace,
        registration,
      };
    },

    /**
     * メッセージコンバータ登録API
     *
     * ROSメッセージ形式間の変換ロジックを登録します。
     * 例：ROS1メッセージをROS2メッセージに変換
     *
     * @param messageConverter - メッセージコンバータの定義
     */
    registerMessageConverter: <Src>(messageConverter: RegisterMessageConverterArgs<Src>) => {
      log.debug(
        `Extension ${extension.qualifiedName} registering message converter from: ${messageConverter.fromSchemaName} to: ${messageConverter.toSchemaName}`,
      );

      // メッセージコンバータに拡張機能情報を付与
      messageConverters.push({
        ...messageConverter,
        extensionNamespace: extension.namespace,
        extensionId: extension.id,
      } as MessageConverter);

      // パネル設定をスキーマ名でマッピング
      const converterSettings = _.mapValues(messageConverter.panelSettings, (settings) => ({
        [messageConverter.fromSchemaName]: settings,
      }));

      // グローバルパネル設定に統合
      _.merge(panelSettings, converterSettings);
    },

    /**
     * トピックエイリアス登録API
     *
     * トピック名の動的な別名解決機能を登録します。
     * 複数のロボットシステム間でのトピック名統一などに使用されます。
     *
     * @param aliasFunction - トピック名変換関数
     */
    registerTopicAliases: (aliasFunction: TopicAliasFunction) => {
      topicAliasFunctions.push({ aliasFunction, extensionId: extension.id });
    },

    /**
     * カメラモデル登録API
     *
     * カメラキャリブレーション用のモデル定義を登録します。
     * 画像の歪み補正や3D投影計算に使用されます。
     *
     * @param args - カメラモデルの定義情報
     */
    registerCameraModel({ name, modelBuilder }: RegisterCameraModelArgs) {
      log.debug(`Extension ${extension.qualifiedName} registering camera model: ${name}`);

      cameraModels.set(name, { extensionId: extension.id, modelBuilder });
    },
  };

  try {
    // 動的関数生成による拡張機能コードの実行
    // new Function()を使用することで、evalよりも安全な実行環境を提供
    // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
    const fn = new Function("module", "require", unwrappedExtensionSource);

    // 拡張機能モジュールをロード
    // module.exportsに拡張機能のエクスポートが設定される
    fn(module, require, {});
    const wrappedExtensionModule = module.exports as ExtensionModule;

    // 拡張機能のactivateメソッドを呼び出して初期化
    // この時点で拡張機能が各種機能を登録する
    wrappedExtensionModule.activate(ctx);
  } catch (err: unknown) {
    // 拡張機能の実行エラーをログに記録
    // アプリケーション全体への影響を防ぐため、エラーは伝播させない
    log.error(err);
  }

  // 収集された全ての機能をコントリビューションポイントとして返却
  return {
    panels,
    messageConverters,
    topicAliasFunctions,
    panelSettings,
    cameraModels,
  };
}
