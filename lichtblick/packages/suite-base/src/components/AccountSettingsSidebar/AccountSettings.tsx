// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";

import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";
import { useCurrentUser } from "@lichtblick/suite-base/context/CurrentUserContext";

import AccountInfo from "./AccountInfo";
import SigninForm from "./SigninForm";

/**
 * アカウント設定サイドバーのメインコンポーネント
 *
 * 機能概要:
 * - ユーザーのログイン状態に基づいて適切なコンポーネントを表示
 * - ログイン済み: AccountInfoコンポーネント（ユーザー情報とサインアウト機能）
 * - 未ログイン: SigninFormコンポーネント（サインイン促進UI）
 * - SidebarContentでラップしてサイドバーレイアウトを提供
 *
 * アーキテクチャ:
 * - 条件分岐によるコンポーネント切り替え
 * - useMemoによるレンダリング最適化
 * - CurrentUserContextとの連携
 *
 * @returns アカウント設定サイドバーのUI
 */
export default function AccountSettings(): React.JSX.Element {
  // 現在のユーザー情報を取得
  const { currentUser } = useCurrentUser();

  /**
   * ログイン状態に基づいて表示するコンテンツを決定
   * useMemoでレンダリングパフォーマンスを最適化
   */
  const content = useMemo(() => {
    // 未ログインの場合：サインインフォームを表示
    if (!currentUser) {
      return <SigninForm />;
    }

    // ログイン済みの場合：アカウント情報を表示
    return <AccountInfo currentUser={currentUser} />;
  }, [currentUser]);

  return <SidebarContent title="Account">{content}</SidebarContent>;
}
