// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useMemo } from "react";
import { useTranslation } from "react-i18next";

import Panel from "@lichtblick/suite-base/components/Panel";
import { PanelExtensionAdapter } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import PanelCatalogContext, {
  PanelCatalog,
  PanelInfo,
} from "@lichtblick/suite-base/context/PanelCatalogContext";
import * as panels from "@lichtblick/suite-base/panels";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

/**
 * パネルコンポーネントのプロパティ型定義
 */
type PanelProps = {
  /** パネルの設定オブジェクト */
  config: unknown;
  /** 設定を保存するための関数 */
  saveConfig: SaveConfig<unknown>;
};

/**
 * PanelCatalogProvider
 *
 * パネルカタログの管理を行うProviderコンポーネントです。
 * ビルトインパネルと拡張機能パネルを統合し、アプリケーション全体で
 * 利用可能なパネルの一覧と取得機能を提供します。
 *
 * ## 主な機能
 * - ビルトインパネルの管理
 * - 拡張機能パネルの動的ロード
 * - パネルの多言語対応
 * - パネルタイプによる検索機能
 * - パネルの統合カタログ提供
 *
 * ## パネルの種類
 * - **ビルトインパネル**: アプリケーションに組み込まれたパネル
 * - **拡張機能パネル**: 動的にロードされるカスタムパネル
 *
 * ## 使用場面
 * - パネル選択UI（パネルピッカー）
 * - レイアウトエディターでのパネル一覧表示
 * - 動的パネル生成
 * - パネルの検索・フィルタリング
 *
 * ## 多言語対応
 * - 言語変更時に自動的にパネル情報を再翻訳
 * - パネル名、説明、カテゴリの国際化対応
 *
 * ## 拡張機能パネルの処理
 * - PanelExtensionAdapterによるラッピング
 * - 拡張機能名前空間の管理
 * - 動的な型定義生成
 *
 * @param props - コンポーネントのプロパティ
 * @param props.children - 子コンポーネント
 * @returns React.ReactElement
 *
 * @example
 * ```typescript
 * // アプリケーションでの使用
 * <PanelCatalogProvider>
 *   <PanelPicker />
 *   <LayoutEditor />
 * </PanelCatalogProvider>
 *
 * // 子コンポーネントでの使用
 * const panelCatalog = useContext(PanelCatalogContext);
 *
 * // 全パネルを取得
 * const allPanels = panelCatalog.getPanels();
 *
 * // 特定のパネルを取得
 * const panel = panelCatalog.getPanelByType('3d');
 *
 * // パネルを動的に生成
 * const PanelComponent = await panel.module();
 * ```
 */
export default function PanelCatalogProvider(props: PropsWithChildren): React.ReactElement {
  const { t } = useTranslation("panels");

  // 拡張機能カタログからインストール済みパネルを取得
  const extensionPanels = useExtensionCatalog((state) => state.installedPanels);

  // 拡張機能パネルをアプリケーション形式にラップ
  const wrappedExtensionPanels = useMemo<PanelInfo[]>(() => {
    return Object.values(extensionPanels ?? {}).map((panel) => {
      // 拡張機能パネルの一意な型名を生成
      const panelType = `${panel.extensionName}.${panel.registration.name}`;

      /**
       * 拡張機能パネルのラッパーコンポーネント
       * PanelExtensionAdapterを使用して拡張機能パネルを統合
       */
      const PanelWrapper = (panelProps: PanelProps) => {
        return (
          <>
            <PanelExtensionAdapter
              config={panelProps.config}
              saveConfig={panelProps.saveConfig}
              initPanel={panel.registration.initPanel}
            />
          </>
        );
      };

      // パネルの静的プロパティを設定
      PanelWrapper.panelType = panelType;
      PanelWrapper.defaultConfig = {};

      return {
        category: "misc",
        title: panel.registration.name,
        type: panelType,
        module: async () => ({ default: Panel(PanelWrapper) }),
        extensionNamespace: panel.extensionNamespace,
      };
    });
  }, [extensionPanels]);

  // 言語変更時にパネル情報を再翻訳するため、tが変更されたら再実行
  const allPanelsInfo = useMemo(() => {
    return {
      builtin: panels.getBuiltin(t),
    };
  }, [t]);

  // ビルトインパネルと拡張機能パネルを統合
  const allPanels = useMemo(() => {
    return [...allPanelsInfo.builtin, ...wrappedExtensionPanels];
  }, [wrappedExtensionPanels, allPanelsInfo]);

  // 表示可能なパネルの一覧（現在は全パネル）
  const visiblePanels = useMemo(() => {
    const panelList = [...allPanelsInfo.builtin];
    panelList.push(...wrappedExtensionPanels);
    return panelList;
  }, [wrappedExtensionPanels, allPanelsInfo]);

  // パネルタイプによる高速検索のためのマップ
  const panelsByType = useMemo(() => {
    const byType = new Map<string, PanelInfo>();

    for (const panel of allPanels) {
      const type = panel.type;
      byType.set(type, panel);
    }
    return byType;
  }, [allPanels]);

  // パネルカタログのAPIを提供
  const provider = useMemo<PanelCatalog>(() => {
    return {
      /**
       * 表示可能な全パネルを取得
       * @returns パネル情報の配列
       */
      getPanels() {
        return visiblePanels;
      },
      /**
       * 指定されたタイプのパネルを取得
       * @param type - パネルタイプ
       * @returns パネル情報またはundefined
       */
      getPanelByType(type: string) {
        return panelsByType.get(type);
      },
      /**
       * 全パネルの配列（後方互換性のため）
       */
      panels: visiblePanels,
    };
  }, [panelsByType, visiblePanels]);

  return (
    <PanelCatalogContext.Provider value={provider}>{props.children}</PanelCatalogContext.Provider>
  );
}
