// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Card, CardContent, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

/**
 * コンポーネントのスタイル定義
 */
const useStyles = makeStyles()({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
});

/**
 * パネル設定バージョンエラーコンポーネント
 *
 * @description パネルが現在のバージョンの設定で使用するには古すぎることを示すメッセージを表示します。
 * PanelExtensionAdapterで設定のバージョン管理機能と組み合わせて使用され、
 * 互換性のない設定でパネルが実行されることを防ぎます。
 *
 * ### 表示条件
 * このコンポーネントは以下の条件で表示されます：
 * - パネルの設定にfoxgloveConfigVersionプロパティが含まれている
 * - そのバージョン番号がパネルのhighestSupportedConfigVersionを超えている
 *
 * ### 主要な機能
 * - **多言語対応**: react-i18nextを使用した国際化サポート
 * - **Material-UI**: 統一されたデザインシステムによる一貫したUI
 * - **フルスクリーン表示**: パネル全体を覆う中央配置のエラーメッセージ
 * - **ユーザーフレンドリー**: 技術的な詳細を隠した分かりやすいメッセージ
 *
 * ### デザイン仕様
 * - 中央配置されたカードレイアウト
 * - 警告メッセージと解決方法の表示
 * - レスポンシブデザイン対応
 *
 * ### 翻訳キー
 * - `panelConfigVersionGuard.warning`: 警告メッセージ
 * - `panelConfigVersionGuard.instructions`: 解決方法の説明
 *
 * @returns エラーメッセージを表示するReactエレメント
 *
 * @example
 * ```tsx
 * // PanelExtensionAdapterでの使用例
 * function PanelExtensionAdapter({ config, highestSupportedConfigVersion }) {
 *   const configTooNew = useMemo(() => {
 *     return (
 *       isVersionedPanelConfig(config) &&
 *       highestSupportedConfigVersion != undefined &&
 *       config.foxgloveConfigVersion > highestSupportedConfigVersion
 *     );
 *   }, [config, highestSupportedConfigVersion]);
 *
 *   if (configTooNew) {
 *     return <PanelConfigVersionError />;
 *   }
 *
 *   // 通常のパネルレンダリング...
 * }
 * ```
 *
 * ### スタイリング
 * このコンポーネントは以下のスタイルを適用します：
 * - Paper: 背景とエレベーション効果
 * - Card: コンテンツ領域の境界とパディング
 * - 中央配置: flexboxによる垂直・水平中央揃え
 * - フルハイト: 親要素の高さいっぱいに表示
 */
export function PanelConfigVersionError(): React.JSX.Element {
  const { t } = useTranslation("panelConfigVersionGuard");

  const { classes } = useStyles();

  return (
    <Paper className={classes.root}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1">{t("warning")}</Typography>
          <Typography variant="subtitle1">{t("instructions")}</Typography>
        </CardContent>
      </Card>
    </Paper>
  );
}
