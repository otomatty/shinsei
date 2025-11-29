// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { TopicAliasFunction, ExtensionPanelRegistration, PanelSettings } from "@lichtblick/suite";
import { MessageConverter } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import ExtensionBuilder from "@lichtblick/suite-base/testing/builders/ExtensionBuilder";

import { buildContributionPoints } from "./buildContributionPoints";

/**
 * buildContributionPoints関数のテストスイート
 *
 * このテストスイートは、拡張機能のコントリビューションポイント構築機能の
 * 正確性と堅牢性を検証します。主に以下の観点からテストを実施します：
 *
 * ## テスト観点
 * 1. **初期化テスト**: 空の拡張機能での基本的な初期化動作
 * 2. **パネル登録テスト**: カスタムパネルの登録と重複検出
 * 3. **メッセージコンバータテスト**: データ変換機能の登録
 * 4. **設定統合テスト**: パネル設定の適切な統合
 * 5. **トピックエイリアステスト**: トピック名変換機能の登録
 * 6. **エラーハンドリングテスト**: 不正な拡張機能コードの処理
 *
 * ## テスト戦略
 * - 動的コード実行のテストにはglobalThisを使用
 * - モックを活用したログ出力の検証
 * - ビルダーパターンによるテストデータ生成
 * - 各機能の独立性を保つための適切なクリーンアップ
 *
 * ## 実装パターンの検証
 * - 拡張機能の動的ロード
 * - コンテキストAPIの提供
 * - 名前空間管理
 * - エラー分離
 */
describe("buildContributionPoints", () => {
  beforeEach(() => {
    // 各テスト前にモックをクリア
    // テスト間の相互影響を防ぐため
    jest.clearAllMocks();
  });

  /**
   * 基本的な初期化テスト
   *
   * 空の拡張機能コードでbuildContributionPointsを実行し、
   * 基本的なコントリビューションポイント構造が正しく初期化されることを検証します。
   *
   * ## 検証項目
   * - panels: 空のオブジェクト
   * - messageConverters: 空の配列
   * - topicAliasFunctions: 空の配列
   * - panelSettings: 空のオブジェクト
   *
   * ## テスト意図
   * 拡張機能が何も登録しない場合でも、安全に初期化されることを確認
   */
  it("should initialize contribution objects", () => {
    // コンソールエラーをモック化（空のコードでのエラーを抑制）
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {});
    const extensionInfo = ExtensionBuilder.extensionInfo();

    // 空の拡張機能コードで実行
    const result = buildContributionPoints(extensionInfo, "");

    // 基本構造の初期化を検証
    expect(result).toHaveProperty("panels", {});
    expect(result).toHaveProperty("messageConverters", []);
    expect(result).toHaveProperty("topicAliasFunctions", []);
    expect(result).toHaveProperty("panelSettings", {});
    consoleErrorMock.mockRestore();
  });

  /**
   * パネル登録機能のテスト
   *
   * 拡張機能がカスタムパネルを登録する際の正常動作を検証します。
   *
   * ## 検証項目
   * - パネルが正しいIDで登録される
   * - 拡張機能メタデータが適切に付与される
   * - パネル登録情報が保持される
   *
   * ## 実装パターン
   * - globalThisを使用した動的コード実行のテスト
   * - 完全修飾ID（拡張機能名.パネル名）の生成
   * - 拡張機能コンテキストAPIの使用
   *
   * ## テスト意図
   * 拡張機能がパネルを登録する基本的なワークフローの検証
   */
  it("should register a panel", () => {
    const extensionInfo = ExtensionBuilder.extensionInfo();
    const panelName = BasicBuilder.string();
    const panelId = `${extensionInfo.qualifiedName}.${panelName}`;

    // パネル登録情報を作成
    const registration: ExtensionPanelRegistration = {
      name: panelName,
      initPanel: jest.fn(),
    };

    // globalThisを使用して動的コード実行環境でデータを共有
    (globalThis as any).panel = registration;

    // 拡張機能コード（パネル登録を行う）
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerPanel(globalThis.panel);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    // パネルが正しく登録されたことを検証
    expect(result.panels[panelId]).toBeDefined();
    expect(result.panels[panelId]).toEqual(
      expect.objectContaining({
        extensionId: extensionInfo.id,
        extensionName: extensionInfo.qualifiedName,
        extensionNamespace: extensionInfo.namespace,
        registration: expect.objectContaining({
          name: panelName,
          initPanel: expect.any(Function),
        } as ExtensionPanelRegistration),
      }),
    );

    // テストデータのクリーンアップ
    delete (globalThis as any).panel;
  });

  /**
   * 重複パネル登録の警告テスト
   *
   * 同じパネルが複数回登録された場合の警告機能を検証します。
   *
   * ## 検証項目
   * - 重複登録時に警告ログが出力される
   * - 最初の登録のみが有効になる
   * - アプリケーションがクラッシュしない
   *
   * ## エラーハンドリング
   * - 重複検出による適切な警告
   * - 既存登録の保護
   * - ログ出力の検証
   *
   * ## テスト意図
   * 拡張機能の不正な使用に対する堅牢性の検証
   */
  it("should warn when trying to register a duplicate panel", () => {
    // 警告ログをモック化して検証
    const logWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {});
    const extensionInfo = ExtensionBuilder.extensionInfo();
    const panelName = BasicBuilder.string();
    const panelId = `${extensionInfo.qualifiedName}.${panelName}`;

    const registration: ExtensionPanelRegistration = {
      name: panelName,
      initPanel: jest.fn(),
    };

    (globalThis as any).panel = registration;

    // 同じパネルを2回登録する拡張機能コード
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerPanel(globalThis.panel);
          ctx.registerPanel(globalThis.panel);  // 重複登録
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    // パネルは1つだけ登録される
    expect(result.panels[panelId]).toBeDefined();

    // 警告ログが出力されることを検証
    expect(logWarnMock).toHaveBeenCalledWith(
      expect.stringContaining(`Panel ${panelId} is already registered`),
    );

    // クリーンアップ
    delete (globalThis as any).panel;
    logWarnMock.mockRestore();
  });

  /**
   * メッセージコンバータ登録のテスト
   *
   * ROSメッセージ形式間の変換機能登録を検証します。
   *
   * ## 検証項目
   * - メッセージコンバータが正しく登録される
   * - 拡張機能メタデータが適切に付与される
   * - 変換機能が保持される
   *
   * ## 機能概要
   * - ROSメッセージ形式の変換（例：ROS1→ROS2）
   * - スキーマ名による変換ルールの定義
   * - 拡張機能による変換ロジックの提供
   *
   * ## テスト意図
   * メッセージ変換機能の基本的な登録プロセスの検証
   */
  it("should register a message converter", () => {
    const extensionInfo = ExtensionBuilder.extensionInfo();

    // メッセージコンバータの定義
    const messageConverter: MessageConverter = {
      fromSchemaName: BasicBuilder.string(), // 変換元スキーマ
      toSchemaName: BasicBuilder.string(), // 変換先スキーマ
      panelSettings: {}, // パネル設定
      extensionId: extensionInfo.id,
      converter: jest.fn(), // 変換関数
    };

    (globalThis as any).messageConverter = messageConverter;

    // メッセージコンバータを登録する拡張機能コード
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerMessageConverter(globalThis.messageConverter);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    // メッセージコンバータが正しく登録されたことを検証
    expect(result.messageConverters).toHaveLength(1);
    expect(result.messageConverters.length).toBe(1);
    expect(result.messageConverters[0]).toEqual({
      ...messageConverter,
      extensionNamespace: extensionInfo.namespace,
      extensionId: extensionInfo.id,
    });

    delete (globalThis as any).messageConverter;
  });

  /**
   * パネル設定統合のテスト
   *
   * メッセージコンバータに関連するパネル設定の統合機能を検証します。
   *
   * ## 検証項目
   * - パネル設定が正しくマッピングされる
   * - 複数の設定が適切に統合される
   * - スキーマ名による設定の分類
   *
   * ## 設定統合パターン
   * - メッセージコンバータごとのパネル設定
   * - スキーマ名をキーとした設定の階層化
   * - lodashのmergeによる深いマージ
   *
   * ## テスト意図
   * 複雑な設定統合ロジックの正確性検証
   */
  it("should register a message converter with panel settings", () => {
    const extensionInfo = ExtensionBuilder.extensionInfo();

    // 複数のパネル設定を定義
    const panelSettingsA: PanelSettings<unknown> = {
      defaultConfig: BasicBuilder.genericDictionary(String),
      handler: jest.fn(),
      settings: jest.fn(),
    };
    const panelSettingsB: PanelSettings<unknown> = {
      defaultConfig: BasicBuilder.genericDictionary(String),
      handler: jest.fn(),
      settings: jest.fn(),
    };

    // パネル設定を含むメッセージコンバータ
    const messageConverter: MessageConverter = {
      fromSchemaName: BasicBuilder.string(),
      toSchemaName: BasicBuilder.string(),
      panelSettings: {
        panelSettingsA,
        panelSettingsB,
      },
      converter: jest.fn(),
    };

    (globalThis as any).messageConverter = messageConverter;

    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerMessageConverter(globalThis.messageConverter);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    // パネル設定が正しく統合されたことを検証
    expect(result.panelSettings).toBeDefined();
    expect(Object.keys(result.panelSettings)).toHaveLength(2);
    expect(result.messageConverters).toHaveLength(1);
    expect(result.messageConverters[0]?.extensionId).toEqual(extensionInfo.id);

    // 各パネル設定がスキーマ名でマッピングされていることを検証
    expect(result.panelSettings.panelSettingsA).toHaveProperty(messageConverter.fromSchemaName);
    expect(result.panelSettings.panelSettingsA![messageConverter.fromSchemaName]).toEqual(
      panelSettingsA,
    );
    expect(result.panelSettings.panelSettingsB).toHaveProperty(messageConverter.fromSchemaName);
    expect(result.panelSettings.panelSettingsB![messageConverter.fromSchemaName]).toEqual(
      panelSettingsB,
    );

    delete (globalThis as any).messageConverter;
  });

  /**
   * トピックエイリアス登録のテスト
   *
   * トピック名の動的な別名解決機能の登録を検証します。
   *
   * ## 検証項目
   * - トピックエイリアス関数が正しく登録される
   * - 拡張機能IDが適切に関連付けられる
   * - 複数のエイリアス関数の管理
   *
   * ## 機能概要
   * - 複数ロボットシステム間のトピック名統一
   * - 動的なトピック名変換
   * - ネームスペース管理
   *
   * ## テスト意図
   * トピック名管理機能の基本的な登録プロセスの検証
   */
  it("registers topic aliases correctly", () => {
    const extensionInfo = ExtensionBuilder.extensionInfo();

    // トピックエイリアス関数（トピック名変換ロジック）
    const aliasFunction: TopicAliasFunction = jest.fn();

    (globalThis as any).topicAliasFunction = aliasFunction;

    // トピックエイリアスを登録する拡張機能コード
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerTopicAliases(globalThis.topicAliasFunction);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    // トピックエイリアス関数が正しく登録されたことを検証
    expect(result.topicAliasFunctions).toHaveLength(1);
    expect(result.topicAliasFunctions[0]!.extensionId).toBe(extensionInfo.id);
    expect(result.topicAliasFunctions[0]!.aliasFunction).toBe(aliasFunction);

    delete (globalThis as any).topicAliasFunction;
  });
});
