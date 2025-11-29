// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StoryObj } from "@storybook/react";

import { User } from "@lichtblick/suite-base/context/CurrentUserContext";

import AccountInfo from "./AccountInfo";

/**
 * AccountInfoコンポーネントのStorybookストーリー設定
 *
 * 設定内容:
 * - コンポーネントの視覚的テストとドキュメント化
 * - 異なるユーザー状態でのコンポーネント表示確認
 * - デザインシステムとの整合性検証
 */
export default {
  title: "AccountSettingsSidebar/AccountInfo",
  component: AccountInfo,
};

/**
 * ログイン済みユーザーのAccountInfoコンポーネント表示ストーリー
 *
 * 表示内容:
 * - モックユーザーデータを使用したログイン状態の再現
 * - 組織情報（ID、スラッグ、表示名、各種権限フラグ）
 * - ユーザー情報（ID、メールアドレス、組織関連情報）
 * - アカウント情報表示とサインアウト機能のUI確認
 *
 * テスト観点:
 * - ユーザー情報の正しい表示
 * - レイアウトとスタイリングの確認
 * - ボタンの配置と表示状態
 */
export const SignedIn: StoryObj = {
  render: () => {
    // モック組織データの定義
    const org: User["org"] = {
      id: "fake-orgid",
      slug: "fake-org",
      displayName: "Fake Org",
      isEnterprise: false,
      allowsUploads: false,
      supportsEdgeSites: false,
    };

    // モックユーザーデータの定義
    const me = {
      id: "fake-userid",
      orgId: org.id,
      orgDisplayName: org.displayName,
      orgSlug: org.slug,
      orgPaid: false,
      email: "foo@example.com",
      org,
    };

    // AccountInfoコンポーネントをモックデータで描画
    return <AccountInfo currentUser={me} />;
  },
};
