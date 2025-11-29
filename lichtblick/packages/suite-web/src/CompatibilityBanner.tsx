// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Dismiss20Filled, Warning24Filled } from "@fluentui/react-icons";
import {
  Button,
  IconButton,
  Link,
  ThemeProvider as MuiThemeProvider,
  Portal,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";
import { createMuiTheme } from "@lichtblick/theme";

/**
 * CompatibilityBanner - ブラウザ互換性警告バナーコンポーネント
 *
 * このコンポーネントは古いブラウザや非対応ブラウザを使用している
 * ユーザーに対して警告を表示し、推奨ブラウザへの移行を促す
 *
 * 主な機能:
 * 1. ブラウザバージョンチェック
 *    - Chrome最小バージョン要件の確認
 *    - 非対応ブラウザの検出
 *
 * 2. 適応的UI表示
 *    - 一時的な警告バナー（画面上部）
 *    - 全画面警告（重篤な非互換性の場合）
 *    - レスポンシブデザイン対応
 *
 * 3. ユーザーアクション
 *    - 推奨ブラウザダウンロードリンク
 *    - 警告の一時的な非表示機能
 *    - ブラウザサポート情報へのリンク
 *
 * 使用シナリオ:
 * - Chrome < 76での警告表示
 * - Safari、Firefox等の非対応ブラウザでの警告
 * - 企業環境での古いブラウザ使用時の案内
 */

// Chrome最小サポートバージョン
// Lichtblickが正常に動作するために必要な最小バージョン
const MINIMUM_CHROME_VERSION = 76;

// バナーの高さ定数（デスクトップ版）
const BANNER_HEIGHT = 54;
// バナーの高さ定数（モバイル版）
const BANNER_MOBILE_HEIGHT = 100;

/**
 * Material-UIのスタイル定義
 * レスポンシブデザインと動的スタイリングを実装
 */
const useStyles = makeStyles<void, "button" | "icon">()((theme, _params, classes) => ({
  // メインコンテナのスタイル
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: BANNER_HEIGHT,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxSizing: "border-box",
    padding: theme.spacing(1, 1.5),
    zIndex: theme.zIndex.modal + 1, // モーダルより上に表示
    gap: theme.spacing(1),
    position: "fixed",
    top: 0,
    right: 0,
    left: 0,

    // タブレット以下のサイズでアイコンを非表示
    [theme.breakpoints.down("md")]: {
      [`.${classes.icon}`]: {
        display: "none",
      },
    },
    // スマートフォンサイズでボタンを非表示、高さを調整
    [theme.breakpoints.down("sm")]: {
      height: BANNER_MOBILE_HEIGHT,

      [`.${classes.button}`]: {
        display: "none",
      },
    },
  },
  // 全画面表示モード（重篤な非互換性の場合）
  fullscreen: {
    flexDirection: "column",
    bottom: 0,
    minHeight: "100vh",
    justifyContent: "center",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    textAlign: "center",
  },
  // 警告アイコンのスタイル
  icon: {
    color: theme.palette.primary.dark,
  },
  // アクションボタンのスタイル
  button: {
    whiteSpace: "nowrap", // テキストの改行を防ぐ
  },
  // バナー表示時のスペーサー（コンテンツが隠れないようにする）
  spacer: {
    height: BANNER_HEIGHT,
    flex: "none",

    [theme.breakpoints.down("sm")]: {
      minHeight: BANNER_MOBILE_HEIGHT,
    },
  },
}));

/**
 * 互換性バナーのベースコンポーネント
 * 実際のUI表示とユーザーインタラクションを担当
 *
 * @param isChrome - 現在のブラウザがChromeかどうか
 * @param isDismissable - バナーを閉じることができるかどうか
 * @param onDismiss - バナーを閉じる時のコールバック関数
 */
function CompatibilityBannerBase({
  isChrome,
  isDismissable,
  onDismiss,
}: {
  isChrome: boolean;
  isDismissable: boolean;
  onDismiss: () => void;
}): React.JSX.Element {
  const { classes, cx } = useStyles();

  // ブラウザタイプに応じたメッセージ生成
  const prompt = isChrome
    ? "You're using an outdated version of Chrome." // 古いChromeバージョンの警告
    : "You're using an unsupported browser."; // 非対応ブラウザの警告
  const fixText = isChrome ? "Update Chrome" : "Download Chrome"; // アクションボタンのテキスト

  return (
    <div className={cx(classes.root, { [classes.fullscreen]: !isDismissable })}>
      <Stack direction={!isDismissable ? "column" : "row"} alignItems="center" gap={2}>
        {/* 警告アイコン */}
        <Warning24Filled className={classes.icon} />

        <div>
          {/* メイン警告メッセージ */}
          <Typography variant="subtitle2">
            {prompt} Lichtblick currently requires Chrome v{MINIMUM_CHROME_VERSION}+.
          </Typography>

          {/* 非Chromeブラウザの場合の追加情報 */}
          {!isChrome && (
            <Typography variant="body2">
              Check out our{" "}
              <Link
                color="inherit"
                href="https://lichtblick-suite.github.io/docs/browser-support"
                target="_blank"
              >
                Browser Support documentation
              </Link>{" "}
              for more information.
            </Typography>
          )}
        </div>
      </Stack>

      {/* アクションボタン群 */}
      <Stack direction="row" gap={1} alignItems="center">
        {/* Chrome ダウンロードボタン */}
        <Button
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noreferrer"
          color="inherit"
          variant="outlined"
          size="small"
          className={classes.button}
        >
          {fixText}
        </Button>

        {/* バナー閉じるボタン（一時的な非表示の場合のみ） */}
        {isDismissable && (
          <IconButton edge="end" color="inherit" size="small" onClick={onDismiss}>
            <Dismiss20Filled />
          </IconButton>
        )}
      </Stack>
    </div>
  );
}

/**
 * 互換性バナーのメインコンポーネント
 *
 * ブラウザの互換性をチェックし、必要に応じて警告バナーを表示する
 * 条件分岐により表示/非表示を制御し、ユーザー体験を最適化する
 *
 * 表示条件:
 * 1. ユーザーがバナーを閉じていない
 * 2. ブラウザバージョンが最小要件を満たしていない
 *
 * 表示パターン:
 * - isDismissable=true: 一時的な警告（ユーザーが閉じることができる）
 * - isDismissable=false: 重篤な警告（全画面表示、閉じることができない）
 *
 * @param isChrome - 現在のブラウザがChromeかどうか
 * @param currentVersion - 現在のブラウザバージョン
 * @param isDismissable - バナーを一時的に閉じることができるかどうか
 */
export function CompatibilityBanner({
  isChrome,
  currentVersion,
  isDismissable,
}: {
  isChrome: boolean;
  currentVersion: number;
  isDismissable: boolean;
}): React.JSX.Element | ReactNull {
  const { classes } = useStyles();
  const muiTheme = createMuiTheme("dark"); // ダークテーマを使用
  const [showBanner, setShowBanner] = useState(true); // バナー表示状態の管理

  // 表示条件チェック：バナーが閉じられているか、バージョンが要件を満たしている場合は非表示
  if (!showBanner || currentVersion >= MINIMUM_CHROME_VERSION) {
    return ReactNull;
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      {/* Portalを使用してDOMの最上位に配置（z-index問題を回避） */}
      <Portal>
        <CompatibilityBannerBase
          isChrome={isChrome}
          isDismissable={isDismissable}
          onDismiss={() => {
            setShowBanner(false); // バナーを閉じる
          }}
        />
      </Portal>
      {/* バナー表示時にコンテンツが隠れないようにするスペーサー */}
      <div className={classes.spacer} />
    </MuiThemeProvider>
  );
}
