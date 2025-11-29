// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import EmptyState from "@lichtblick/suite-base/components/EmptyState";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";

/**
 * EmptyWrapperコンポーネントのプロパティ
 *
 * @interface EmptyWrapperProps
 */
export type EmptyWrapperProps = {
  /** 表示するコンテンツ */
  children: React.ReactNode;
  /** 新しいTopNavUIを使用するかどうか */
  enableNewTopNav: boolean;
};

/**
 * パネル設定の空状態を表示するラッパーコンポーネント
 *
 * @description パネルが選択されていない、または設定がロード中の場合に
 * 適切な空状態を表示する。新しいTopNavUIの設定に応じて、
 * 表示レイアウトを切り替える。
 *
 * @param props - EmptyWrapperのプロパティ
 * @param props.children - 表示するコンテンツ（通常はメッセージテキスト）
 * @param props.enableNewTopNav - 新しいTopNavUIを使用するかどうか
 *
 * @returns 空状態を表示するラッパーコンポーネント
 *
 * @example
 * ```typescript
 * <EmptyWrapper enableNewTopNav={true}>
 *   {t("selectAPanelToEditItsSettings")}
 * </EmptyWrapper>
 * ```
 */
export const EmptyWrapper = ({
  children,
  enableNewTopNav,
}: EmptyWrapperProps): React.JSX.Element => {
  const { t } = useTranslation("panelSettings");

  // 新しいTopNavUIが有効な場合は、EmptyStateコンポーネントを使用
  if (enableNewTopNav) {
    return <EmptyState>{children}</EmptyState>;
  }

  // 従来のUIの場合は、SidebarContentコンポーネントを使用
  return (
    <SidebarContent title={t("panelSettings")}>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </SidebarContent>
  );
};
