// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Button, CircularProgress, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback } from "react";
import { useAsyncFn } from "react-use";
import { makeStyles } from "tss-react/mui";

import Logger from "@lichtblick/log";
import BlockheadFilledIcon from "@lichtblick/suite-base/components/BlockheadFilledIcon";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useCurrentUser, User } from "@lichtblick/suite-base/context/CurrentUserContext";
import { useConfirm } from "@lichtblick/suite-base/hooks/useConfirm";

const log = Logger.getLogger(__filename);

/**
 * アバターアイコンのサイズ定数
 * ユーザーアイコンの表示サイズを統一するための定数
 */
const AVATAR_ICON_SIZE = 42;

/**
 * AccountInfoコンポーネントのスタイル定義
 * Material-UIのテーマシステムと連動したスタイル設定
 */
const useStyles = makeStyles()((theme) => ({
  icon: {
    color: theme.palette.primary.main,
    fontSize: AVATAR_ICON_SIZE,
  },
}));

/**
 * AccountInfoコンポーネントのProps型定義
 * @interface Props
 * @property {User} [currentUser] - 現在ログインしているユーザー情報（オプショナル）
 */
export interface Props {
  currentUser?: User;
}

/**
 * ログイン済みユーザーのアカウント情報表示コンポーネント
 *
 * 主な機能:
 * - ユーザー情報の表示（メールアドレス、組織名）
 * - アカウント設定ページへのリンク
 * - サインアウト機能（確認ダイアログ付き）
 * - 非同期処理のローディング状態管理
 * - エラーハンドリングとユーザー通知
 *
 * @param props - コンポーネントのプロパティ
 * @returns ログイン済みユーザーのアカウント情報UI
 */
export default function AccountInfo(props: Props): React.JSX.Element {
  // 現在のユーザーコンテキストからサインアウト機能を取得
  const { signOut } = useCurrentUser();

  // 通知システムのフック
  const { enqueueSnackbar } = useSnackbar();

  // 確認ダイアログのフック
  const [confirm, confirmModal] = useConfirm();

  // スタイルクラスの取得
  const { classes } = useStyles();

  /**
   * 非同期サインアウト処理
   * エラーハンドリングとローディング状態を管理
   */
  const [{ loading }, beginSignOut] = useAsyncFn(async () => {
    try {
      await signOut?.();
    } catch (error) {
      // エラーログの記録
      log.error(error);
      // ユーザーへのエラー通知
      enqueueSnackbar((error as Error).toString(), { variant: "error" });
    }
  }, [enqueueSnackbar, signOut]);

  /**
   * サインアウトボタンクリック時の処理
   * 確認ダイアログを表示し、ユーザーの確認後にサインアウトを実行
   */
  const onSignoutClick = useCallback(() => {
    void confirm({
      title: "Are you sure you want to sign out?",
      ok: "Sign out",
    }).then((response) => {
      if (response === "ok") {
        void beginSignOut();
      }
    });
  }, [beginSignOut, confirm]);

  /**
   * アカウント設定ボタンクリック時の処理
   * 外部のアカウント設定ページを新しいタブで開く
   */
  const onSettingsClick = useCallback(() => {
    window.open(process.env.LICHTBLICK_ACCOUNT_PROFILE_URL, "_blank");
  }, []);

  // ユーザーが未ログインの場合は何も表示しない
  if (!props.currentUser) {
    return <></>;
  }

  return (
    <Stack fullHeight justifyContent="space-between">
      {/* 確認ダイアログのモーダル */}
      {confirmModal}

      {/* ユーザー情報とアカウント設定セクション */}
      <Stack gap={2}>
        {/* ユーザー情報表示エリア */}
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          {/* ユーザーアバターアイコン */}
          <BlockheadFilledIcon className={classes.icon} />

          {/* ユーザー詳細情報 */}
          <Stack justifyContent="center">
            {/* ユーザーのメールアドレス */}
            <Typography variant="subtitle1">{props.currentUser.email}</Typography>

            {/* 組織名（表示名または組織スラッグ） */}
            <Typography variant="body2" color="text.secondary">
              {props.currentUser.orgDisplayName ?? props.currentUser.orgSlug}
            </Typography>
          </Stack>
        </Stack>

        {/* アカウント設定ボタン */}
        <Button onClick={onSettingsClick} variant="contained">
          Account settings
        </Button>
      </Stack>

      {/* サインアウトセクション */}
      <Stack gap={1}>
        {/* サインアウトボタン（ローディング状態対応） */}
        <Button onClick={onSignoutClick} variant="outlined">
          Sign out&nbsp;{loading && <CircularProgress size={16} />}
        </Button>
      </Stack>
    </Stack>
  );
}
