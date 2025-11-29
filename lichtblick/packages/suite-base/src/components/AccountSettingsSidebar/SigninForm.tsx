// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Button, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { useCurrentUser } from "@lichtblick/suite-base/context/CurrentUserContext";

import AccountSyncGraphic from "./AccountSyncGraphic";

/**
 * SigninFormコンポーネントのスタイル定義
 * Material-UIのテーマシステムと連動したスタイル設定
 */
const useStyles = makeStyles()((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2.5),
  },
  icon: {
    display: "flex",
    justifyContent: "center",
    color: theme.palette.primary.main,
  },
}));

/**
 * 未ログインユーザー向けのサインインフォームコンポーネント
 *
 * 主な機能:
 * - Foxgloveアカウントの価値提案を表示
 * - 同期機能、共有機能、データ管理機能のメリット説明
 * - 視覚的なアカウント同期グラフィックの表示
 * - サインインボタンによる認証フロー開始
 *
 * UI構成:
 * - 中央配置のアカウント同期グラフィック
 * - 機能説明のリスト表示
 * - プライマリカラーのサインインボタン
 *
 * @returns サインインフォームのUI
 */
export default function SigninForm(): React.JSX.Element {
  // スタイルクラスの取得
  const { classes } = useStyles();

  // 現在のユーザーコンテキストからサインイン機能を取得
  const { signIn } = useCurrentUser();

  return (
    <div className={classes.root}>
      {/* アカウント同期グラフィック表示エリア */}
      <div className={classes.icon}>
        <AccountSyncGraphic width={192} />
      </div>

      {/* Foxgloveアカウントの価値提案 */}
      <Typography variant="body1">
        <>
          Create a Foxglove account to:
          <ul>
            {/* レイアウト同期機能 */}
            <li>Sync your layouts across multiple devices</li>
            {/* レイアウト共有機能 */}
            <li>Share your layouts with others</li>
            {/* データ管理機能 */}
            <li>Manage and store your robotics data</li>
          </ul>
        </>
      </Typography>

      {/* サインインボタン */}
      <Button variant="contained" color="primary" onClick={signIn}>
        Sign in
      </Button>
    </div>
  );
}
