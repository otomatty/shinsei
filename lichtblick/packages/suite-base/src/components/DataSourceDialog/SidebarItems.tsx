// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Button, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DataSourceDialogItem } from "@lichtblick/suite-base/components/DataSourceDialog/DataSourceDialog";
import DontShowThisAgainCheckbox from "@lichtblick/suite-base/components/DataSourceDialog/DontShowThisAgainCheckbox";
import { useStyles } from "@lichtblick/suite-base/components/DataSourceDialog/index.style";
import { SidebarItem } from "@lichtblick/suite-base/components/DataSourceDialog/types";
import Stack from "@lichtblick/suite-base/components/Stack";
import { LICHTBLICK_DOCUMENTATION_LINK } from "@lichtblick/suite-base/constants/documentation";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { useCurrentUser } from "@lichtblick/suite-base/context/BaseUserContext";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";

/**
 * DataSourceDialogのサイドバーアイテム表示コンポーネント
 *
 * このコンポーネントは、データソースダイアログの右側サイドバーに表示される
 * 各種アクションアイテム（チュートリアル、ヘルプ、コラボレーション機能など）を管理します。
 *
 * ## 主な機能
 * - **ユーザータイプ別表示制御**: 認証状態とプランに応じて異なるアイテムを表示
 * - **アナリティクス統合**: 各種ボタンクリックイベントの追跡
 * - **外部リンク管理**: ドキュメント、チュートリアル、コンソールへのリンク
 * - **国際化対応**: 多言語対応でのテキスト表示
 *
 * ## ユーザータイプ別表示内容
 *
 * ### 未認証ユーザー (unauthenticated)
 * - Lichtblickが初めての方向け案内
 * - サンプルデータ探索ボタン
 * - ドキュメント閲覧ボタン
 *
 * ### 認証済み無料ユーザー (authenticated-free)
 * - コラボレーション開始案内
 * - データプラットフォームアップロードボタン
 * - レイアウト共有ボタン
 * - 上記に加えて未認証ユーザー向けアイテム
 *
 * ### チーム/エンタープライズユーザー (authenticated-team/enterprise)
 * - Lichtblickが初めての方向け案内
 * - ヘルプとサポート案内
 * - チュートリアル閲覧ボタン
 *
 * ## レイアウト構造
 * ```
 * サイドバーアイテム
 * ├── メインコンテンツエリア
 * │   ├── アイテム1 (タイトル + 説明 + アクションボタン群)
 * │   ├── アイテム2 (タイトル + 説明 + アクションボタン群)
 * │   └── ...
 * └── 「今後表示しない」チェックボックス
 * ```
 *
 * ## アナリティクス追跡
 * - DIALOG_SELECT_VIEW: ビュー選択イベント
 * - DIALOG_CLICK_CTA: CTA（行動喚起）ボタンクリックイベント
 * - ユーザータイプとアクション種別を含む詳細な追跡情報
 *
 * ## 外部リンク
 * - Lichtblickドキュメント
 * - Foxgloveチュートリアル
 * - Foxgloveコンソール（データプラットフォーム）
 * - レイアウト共有ドキュメント
 *
 * @param props - コンポーネントプロパティ
 * @param props.onSelectView - ビュー選択時のコールバック関数
 * @returns サイドバーアイテムを表示するReactコンポーネント
 *
 * @example
 * ```tsx
 * <SidebarItems
 *   onSelectView={(view) => setCurrentView(view)}
 * />
 * ```
 */
const SidebarItems = (props: {
  onSelectView: (newValue: DataSourceDialogItem) => void;
}): React.JSX.Element => {
  const { onSelectView } = props;
  const { currentUserType } = useCurrentUser();
  const analytics = useAnalytics();
  const { classes } = useStyles();
  const { t } = useTranslation("openDialog");

  /**
   * ユーザータイプ別のサイドバーアイテム定義
   *
   * 無料ユーザー向けとチーム/エンタープライズユーザー向けの
   * 基本的なアイテムセットを定義します。
   *
   * ## 共通アイテム (demoItem)
   * - タイトル: "Lichtblickが初めての方"
   * - 説明: 初回利用者向けの案内文
   * - アクション: サンプルデータ探索、ドキュメント閲覧
   *
   * ## チーム/エンタープライズ専用アイテム
   * - タイトル: "ヘルプが必要ですか？"
   * - 説明: サポートとチュートリアル案内
   * - アクション: チュートリアル閲覧
   */
  const { freeUser, teamOrEnterpriseUser } = useMemo(() => {
    const demoItem = {
      id: "new",
      title: t("newToLichtblick"),
      text: t("newToLichtblickDescription"),
      actions: (
        <>
          <Button
            onClick={() => {
              onSelectView("demo");
              void analytics.logEvent(AppEvent.DIALOG_SELECT_VIEW, { type: "demo" });
              void analytics.logEvent(AppEvent.DIALOG_CLICK_CTA, {
                user: currentUserType,
                cta: "demo",
              });
            }}
            className={classes.button}
            variant="outlined"
          >
            {t("exploreSampleData")}
          </Button>
          <Button
            onClick={() => {
              window.open(LICHTBLICK_DOCUMENTATION_LINK, "_blank", "noopener,noreferrer");
            }}
            className={classes.button}
            variant="outlined"
          >
            {t("viewDocumentation")}
          </Button>
        </>
      ),
    };
    return {
      freeUser: [demoItem],
      teamOrEnterpriseUser: [
        demoItem,
        {
          id: "need-help",
          title: t("needHelp"),
          text: t("needHelpDescription"),
          actions: (
            <>
              <Button
                href="https://foxglove.dev/tutorials"
                target="_blank"
                className={classes.button}
                onClick={() => {
                  void analytics.logEvent(AppEvent.DIALOG_CLICK_CTA, {
                    user: currentUserType,
                    cta: "tutorials",
                  });
                }}
              >
                {t("seeTutorials")}
              </Button>
            </>
          ),
        },
      ],
    };
  }, [analytics, classes.button, currentUserType, onSelectView, t]);

  /**
   * 現在のユーザータイプに基づいたサイドバーアイテム配列の生成
   *
   * ユーザーの認証状態とプランに応じて、適切なアイテムセットを返します。
   *
   * ## 表示ロジック
   * - **未認証**: 基本的な案内のみ
   * - **認証済み無料**: コラボレーション機能の案内を追加
   * - **チーム/エンタープライズ**: 高度なサポート機能を含む完全セット
   *
   * ## 各ユーザータイプの特徴
   * - 無料ユーザーにはアップグレード促進要素を含む
   * - 有料ユーザーには高度な機能へのアクセスを提供
   * - 全ユーザーに基本的なヘルプとドキュメントを提供
   */
  const sidebarItems: SidebarItem[] = useMemo(() => {
    switch (currentUserType) {
      case "unauthenticated":
        return [...freeUser];
      case "authenticated-free":
        return [
          {
            id: "start-collaborating",
            title: t("startCollaborating"),
            text: t("startCollaboratingDescription"),
            actions: (
              <>
                <Button
                  href="https://console.foxglove.dev/recordings"
                  target="_blank"
                  variant="outlined"
                  className={classes.button}
                  onClick={() => {
                    void analytics.logEvent(AppEvent.DIALOG_CLICK_CTA, {
                      user: currentUserType,
                      cta: "upload-to-dp",
                    });
                  }}
                >
                  {t("uploadToDataPlatform")}
                </Button>
                <Button
                  href="https://docs.foxglove.dev/docs/visualization/layouts#team-layouts"
                  target="_blank"
                  className={classes.button}
                >
                  {t("shareLayouts")}
                </Button>
              </>
            ),
          },
          ...freeUser,
        ];
      case "authenticated-team":
        return teamOrEnterpriseUser;
      case "authenticated-enterprise":
        return teamOrEnterpriseUser;
    }
  }, [analytics, classes.button, currentUserType, freeUser, teamOrEnterpriseUser, t]);

  return (
    <Stack fullHeight direction="column" justifyContent="space-between">
      <Stack>
        {sidebarItems.map((item) => (
          <Stack key={item.id}>
            <Typography variant="h5" gutterBottom>
              {item.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.text}
            </Typography>
            {item.actions != undefined && (
              <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} paddingTop={1.5}>
                {item.actions}
              </Stack>
            )}
          </Stack>
        ))}
      </Stack>
      <DontShowThisAgainCheckbox />
    </Stack>
  );
};

export default SidebarItems;
