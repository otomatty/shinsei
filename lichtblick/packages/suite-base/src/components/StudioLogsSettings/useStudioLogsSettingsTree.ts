// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview useStudioLogsSettingsTree - ログ設定ツリー構築フック
 *
 * このファイルは、Lichtblickアプリケーションのログチャンネルを
 * 階層構造を持つ設定ツリーに変換するカスタムフックを提供します。
 *
 * ## 主要機能
 * - **パッケージ構造解析**: ログチャンネル名からディレクトリ構造を推定
 * - **階層ツリー構築**: 論理的な階層表示のためのツリー生成
 * - **カテゴリ分類**: "packages"と"misc"への自動分類
 * - **アクションハンドラー**: 設定変更時の処理実装
 * - **動的制御**: グローバルレベルによる個別制御の無効化
 *
 * ## ツリー構造例
 * ```
 * Settings
 * ├── level: "debug" | "info" | "warn" | "error"
 * suite-base
 * ├── components
 * │   ├── Panel.tsx
 * │   └── Layout.tsx
 * ├── players
 * │   └── UserScriptPlayer.ts
 * misc
 * ├── network
 * ├── websocket
 * └── custom-module
 * ```
 *
 * ## チャンネル名解析ルール
 * 1. `packages/[パッケージ名]/src/[コンポーネント]/[サブファイル]` → packages階層
 * 2. `[その他のパターン]` → misc階層
 * 3. スタジオワークスペース: `studio/packages/...` → 同様に処理
 * 4. ファイル拡張子: 子ノードなしの末端ノード
 */

import { extname } from "path";
import { useMemo } from "react";

import Log, { toLogLevel } from "@lichtblick/log";
import { SettingsTree, SettingsTreeNode, SettingsTreeNodes } from "@lichtblick/suite";
import { useStudioLogsSettings } from "@lichtblick/suite-base/context/StudioLogsSettingsContext";

const log = Log.getLogger(__filename);

/**
 * アイテム詳細情報の定義
 *
 * パス文字列から元のチャンネル名/プレフィックスへのマッピング情報を格納します。
 * UI上でのパス表示と実際のログチャンネル操作の橋渡しを行います。
 */
type ItemDetail = {
  /** アイテムタイプ: "prefix"（一括制御）または "channel"（個別制御） */
  type: "prefix" | "channel";
  /** 実際のログチャンネル名またはプレフィックス */
  fullPath: string;
};

/**
 * **useStudioLogsSettingsTree** - ログ設定ツリー構築カスタムフック
 *
 * アプリケーションのログチャンネルを解析し、階層構造を持つ設定ツリーに変換します。
 * パッケージ構造に基づく論理的なグループ化と、直感的な設定変更UIを提供します。
 *
 * ## 主要処理フロー
 * 1. **ログ設定取得**: StudioLogsSettingsContextからの現在設定読み込み
 * 2. **チャンネル分析**: 各ログチャンネル名の構造解析
 * 3. **階層構築**: packages/miscカテゴリでの階層ツリー生成
 * 4. **マッピング作成**: UI表示パスと実際のチャンネル名の対応表作成
 * 5. **アクション統合**: 設定変更時のハンドラー機能統合
 *
 * ## パッケージ構造解析アルゴリズム
 * ### ステップ1: スタジオワークスペース検出
 * ```typescript
 * // スタジオワークスペース内のパッケージを検出
 * const studioSpacePrefix = /^(studio\/)/.test(channelName) ? `${parts.shift()}/` : "";
 * ```
 *
 * ### ステップ2: パッケージパス分解
 * ```typescript
 * // パス構成要素への分解
 * const [type, pkgName, srcPath, component, ...rest] = parts;
 * // 例: ["packages", "suite-base", "src", "components", "Panel.tsx"]
 * ```
 *
 * ### ステップ3: カテゴリ判定と配置
 * - `type === "packages"` → packages階層に配置
 * - `srcPath !== "src"` → misc階層に配置
 * - `component`の拡張子有無で子ノード判定
 *
 * ## 階層ツリー構造
 * ### Settings ルートノード
 * ```typescript
 * Settings: {
 *   label: "Settings",
 *   fields: {
 *     level: {
 *       input: "select",
 *       options: ["error", "warn", "info", "debug"]
 *     }
 *   }
 * }
 * ```
 *
 * ### パッケージノード
 * ```typescript
 * [パッケージ名]: {
 *   label: パッケージ名,
 *   visible: 子ノードの有効状態,
 *   children: {
 *     [コンポーネント名]: {...}
 *   }
 * }
 * ```
 *
 * ### Miscノード
 * ```typescript
 * misc: {
 *   label: "Misc",
 *   defaultExpansionState: "expanded",
 *   children: {
 *     [チャンネル名]: {
 *       label: チャンネル名,
 *       visible: 有効状態
 *     }
 *   }
 * }
 * ```
 *
 * ## 動的制御機能
 * ### グローバルレベル制限
 * ```typescript
 * // warn/errorレベル時は個別制御を無効化
 * const disableIndividualOverride =
 *   logsConfig.globalLevel === "warn" || logsConfig.globalLevel === "error";
 * ```
 *
 * ### 表示状態同期
 * ```typescript
 * // 子ノードが有効な場合、親ノードも表示
 * if (channel.enabled) {
 *   pkgNode.visible = true;
 *   componentNode.visible = true;
 * }
 * ```
 *
 * ## アクションハンドラー実装
 * ### グローバルレベル変更
 * ```typescript
 * if (action.payload.path.join(".") === "Settings.level") {
 *   logsConfig.setGlobalLevel(toLogLevel(action.payload.value));
 * }
 * ```
 *
 * ### 可視性切り替え
 * ```typescript
 * if (action.payload.input === "boolean" && path.endsWith("visible")) {
 *   const item = itemDetailByPath.get(pathStr);
 *   if (item?.type === "prefix") {
 *     enable ? logsConfig.enablePrefix(item.fullPath)
 *            : logsConfig.disablePrefix(item.fullPath);
 *   }
 * }
 * ```
 *
 * ## パフォーマンス最適化
 * - **useMemo**: 依存関係変更時のみ再計算
 * - **Map使用**: O(1)での高速パスルックアップ
 * - **早期リターン**: 不要な処理のスキップ
 * - **メモリ効率**: 最小限のデータ構造使用
 *
 * ## エラーハンドリング
 * - **不正パス**: undefined チェックによる安全な処理
 * - **型変換**: toLogLevel による安全な文字列→LogLevel変換
 * - **デフォルト値**: 設定不備時のフォールバック値提供
 *
 * ## 使用例
 * ```typescript
 * // コンポーネント内での使用
 * function LogSettingsComponent() {
 *   const settingsTree = useStudioLogsSettingsTree();
 *
 *   return (
 *     <SettingsTreeEditor
 *       variant="log"
 *       settings={settingsTree}
 *     />
 *   );
 * }
 * ```
 *
 * ## デバッグ情報
 * ```typescript
 * // 開発時のデバッグログ出力
 * log.debug("action", action);  // アクション実行時
 * ```
 *
 * @returns {SettingsTree} 階層構造を持つログ設定ツリー
 *
 * @example
 * 返却されるツリー構造の例:
 * ```typescript
 * {
 *   enableFilter: true,
 *   actionHandler: (action) => { ... },
 *   nodes: {
 *     Settings: { ... },           // グローバル設定
 *     "suite-base": { ... },       // パッケージノード
 *     "misc": { ... }              // その他のチャンネル
 *   }
 * }
 * ```
 */
function useStudioLogsSettingsTree(): SettingsTree {
  const logsConfig = useStudioLogsSettings();

  return useMemo<SettingsTree>(() => {
    // When building the settings tree we strip away uninformative parts of the channel name (i.e.
    // packages, src) to reduce the repetitive noise. However, to enable/disable channels and
    // prefixes we need to know the original name or prefix. Here we store the stripped path to
    // original path mapping.

    /**
     * パス詳細マッピング
     *
     * UI上の簡略化されたパス（例: "suite-base/components"）から
     * 実際のログチャンネル名（例: "packages/suite-base/src/components"）への
     * マッピング情報を格納します。
     *
     * この情報により、ユーザーがUI上で設定変更した際に、
     * 正確なログチャンネルに対してアクションを実行できます。
     */
    const itemDetailByPath = new Map<string, ItemDetail>();

    // Root node of all other settings nodes
    /**
     * 設定ツリーのルートノード群
     *
     * 全ての設定項目のトップレベルコンテナです。
     * グローバル設定、各パッケージ、miscカテゴリが含まれます。
     */
    const settingsRoot: SettingsTreeNodes = {
      Settings: {
        label: "Settings",
        fields: {
          level: {
            label: "level",
            input: "select",
            value: logsConfig.globalLevel,
            options: [
              { label: "error", value: "error" },
              { label: "warn", value: "warn" },
              { label: "info", value: "info" },
              { label: "debug", value: "debug" },
            ],
          },
        },
      },
    };

    // Channels are split into two buckets - "packages" and "misc". This is the root for "misc"
    // channels.
    /**
     * Miscカテゴリのルートノード
     *
     * パッケージ構造に該当しないログチャンネルを格納するカテゴリです。
     * ネットワーク、WebSocket、カスタムモジュール等が含まれます。
     */
    const miscRoot: SettingsTreeNode = {
      label: "Misc",
      defaultExpansionState: "expanded",
      children: {},
    };

    // When the global level is warn or error we don't allow suppressing individual files. This is
    // to make sure you always see warning and errors go to console since they are also visible in
    // prod.
    /**
     * 個別制御の無効化判定
     *
     * グローバルログレベルがwarnまたはerrorの場合、
     * 個別チャンネルの制御を無効化します。
     *
     * これにより、本番環境で重要な警告・エラーログが
     * 誤って無効化されることを防ぎます。
     */
    const disableIndividualOverride =
      logsConfig.globalLevel === "warn" || logsConfig.globalLevel === "error";

    /**
     * ログチャンネル解析とツリー構築メインループ
     *
     * 各ログチャンネルの名前を解析し、適切な階層に配置します。
     * パッケージ構造の自動検出と論理的なグループ化を行います。
     */
    for (const channel of logsConfig.channels) {
      // 個別制御が無効化されている場合はスキップ
      if (disableIndividualOverride) {
        continue;
      }

      const channelName = channel.name;

      // チャンネル名を"/"で分割してパス要素に変換
      const parts = channelName.split("/");

      // Studio code may live in a `studio` workspace, and we'll still want the tree to work the same
      /**
       * スタジオワークスペースプレフィックス検出
       *
       * チャンネル名が"studio/"で始まる場合、スタジオワークスペース内の
       * コードであることを示すため、プレフィックスを分離します。
       */
      const studioSpacePrefix = /^(studio\/)/.test(channelName) ? `${parts.shift()}/` : "";

      // パス要素の分解（例: ["packages", "suite-base", "src", "components", "Panel.tsx"]）
      const [type, pkgName, srcPath, component, ...rest] = parts;

      // misc entry
      /**
       * Miscカテゴリ配置判定
       *
       * 以下の条件でmiscカテゴリに配置：
       * 1. type !== "packages"（パッケージ構造でない）
       * 2. その他の非標準構造
       */
      if (type !== "packages") {
        miscRoot.children![channelName] = {
          label: channelName,
          visible: channel.enabled,
        };

        itemDetailByPath.set(`misc/${channelName}`, {
          type: "channel",
          fullPath: channel.name,
        });
        continue;
      }

      // パッケージ名が存在しない場合はスキップ
      if (!pkgName) {
        continue;
      }

      // The package doesn't keep src files in `src`, drop into the misc items section
      /**
       * 非標準パッケージ構造の検出
       *
       * srcPath !== "src" または component が未定義の場合、
       * 標準的なパッケージ構造ではないためmiscカテゴリに配置します。
       */
      if (srcPath !== "src" || !component) {
        miscRoot.children![channel.name] = {
          label: channel.name,
          visible: channel.enabled,
        };

        itemDetailByPath.set(`misc/${channelName}`, {
          type: "channel",
          fullPath: channel.name,
        });
        continue;
      }

      // Setup the package name node
      /**
       * パッケージノードの初期化
       *
       * パッケージ名に対応するツリーノードを作成または取得します。
       * 初期状態では非表示で、子ノードが有効な場合に表示されます。
       */
      const pkgNode = (settingsRoot[pkgName] ??= {
        label: pkgName,
        visible: false,
        children: {},
      });

      // パッケージプレフィックスのマッピング登録
      itemDetailByPath.set(pkgName, {
        type: "prefix",
        fullPath: `${studioSpacePrefix}packages/${pkgName}`,
      });

      /**
       * コンポーネントノードの初期化
       *
       * パッケージ内のコンポーネント（ディレクトリまたはファイル）に
       * 対応するノードを作成または取得します。
       */
      const componentNode = (pkgNode.children![component] ??= {
        label: component,
        visible: false,
      });

      /**
       * 親ノードの表示状態同期
       *
       * チャンネルが有効な場合、その親ノード（パッケージ、コンポーネント）も
       * 表示状態にして、階層構造を正しく表示します。
       */
      if (channel.enabled) {
        pkgNode.visible = true;
        componentNode.visible = true;
      }

      // The component has a file extension, no subtree is added under the component
      /**
       * ファイル拡張子判定と終端ノード処理
       *
       * コンポーネント名に拡張子がある場合（例: "Panel.tsx"）、
       * それは終端ファイルであるため、子ノードは作成しません。
       */
      if (extname(component)) {
        itemDetailByPath.set(`${pkgName}/${component}`, {
          type: "channel",
          fullPath: `${studioSpacePrefix}packages/${pkgName}/src/${component}`,
        });
        continue;
      }

      // ディレクトリコンポーネントのプレフィックスマッピング
      itemDetailByPath.set(`${pkgName}/${component}`, {
        type: "prefix",
        fullPath: `${studioSpacePrefix}packages/${pkgName}/src/${component}`,
      });

      // If there are items under the component, add a children entry and add them to the children entry
      /**
       * サブファイル処理
       *
       * コンポーネントディレクトリ下にサブファイルがある場合、
       * 子ノードとして追加します。
       */
      if (rest.length > 0) {
        // Component node is not a file so it might have children under it
        componentNode.children ??= {};

        const leafId = rest.join("/");
        componentNode.children[leafId] = {
          label: leafId,
          visible: channel.enabled,
        };

        itemDetailByPath.set(`${pkgName}/${component}/${leafId}`, {
          type: "channel",
          fullPath: `${studioSpacePrefix}packages/${pkgName}/src/${component}/${leafId}`,
        });
      }
    }

    /**
     * Miscノードの追加
     *
     * 個別制御が有効な場合のみ、miscカテゴリを
     * 設定ツリーに追加します。
     */
    if (!disableIndividualOverride) {
      // Add misc nodes at the end of root
      settingsRoot["misc"] = miscRoot;
    }

    /**
     * 設定ツリーの最終構成と返却
     *
     * 完成した階層ツリー、アクションハンドラー、フィルター機能を
     * 統合したSettingsTreeオブジェクトを返却します。
     */
    return {
      enableFilter: true,

      /**
       * アクションハンドラー - 設定変更時の処理実装
       *
       * ユーザーがUI上で設定を変更した際に呼び出される関数です。
       * グローバルレベル変更と個別チャンネル制御の両方に対応します。
       *
       * @param action - 実行するアクション（update, perform-node-action等）
       */
      actionHandler: (action) => {
        log.debug("action", action);

        /**
         * グローバルログレベル変更処理
         *
         * "Settings.level"パスでの値変更をグローバルレベル設定に反映します。
         */
        if (action.action === "update" && action.payload.path.join(".") === "Settings.level") {
          if (typeof action.payload.value !== "string") {
            return;
          }
          logsConfig.setGlobalLevel(toLogLevel(action.payload.value));
          return;
        }

        // visibility toggle sends and update as if it was a boolean input
        /**
         * 表示切り替え処理
         *
         * ノードの可視性切り替え（チェックボックス操作）を
         * ログチャンネルの有効/無効制御に変換します。
         */
        if (action.action !== "update" || action.payload.input !== "boolean") {
          return;
        }

        // When using settings visibility toggle the last item of the path is the word "visible"
        // Since that's our only action we ignore any other type of path
        const path = action.payload.path;
        const lastPathItem = path[path.length - 1];
        if (lastPathItem !== "visible") {
          return;
        }

        const enable = action.payload.value === true;

        // パスからアイテム識別子を構築
        const remain = path.slice(0, path.length - 1);
        const pathStr = remain.join("/");

        /**
         * アイテムタイプ別制御処理
         *
         * プレフィックス（一括制御）と個別チャンネルで
         * 異なる制御方法を適用します。
         */
        const item = itemDetailByPath.get(pathStr);
        switch (item?.type) {
          case "prefix":
            // プレフィックス一括制御
            if (enable) {
              logsConfig.enablePrefix(item.fullPath);
            } else {
              logsConfig.disablePrefix(item.fullPath);
            }
            break;
          case "channel":
            // 個別チャンネル制御
            if (enable) {
              logsConfig.enableChannel(item.fullPath);
            } else {
              logsConfig.disableChannel(item.fullPath);
            }
            break;
          default:
            // no-op for undefined
            break;
        }
      },
      nodes: settingsRoot,
    };
  }, [logsConfig]);
}

export { useStudioLogsSettingsTree };
