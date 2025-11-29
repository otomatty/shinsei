// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * DataSource - データソース表示コンポーネント
 *
 * AppBarに現在のデータソースの状態と情報を表示するコンポーネントです。
 * プレイヤーの接続状態、エラー、ライブ接続の表示を管理し、
 * ユーザーに現在のデータソースの状況を視覚的に提供します。
 *
 * 主な機能：
 * - データソース名の表示（テキスト省略対応）
 * - 接続状態の視覚的表示（ローディング、エラー、通常）
 * - ライブ接続時の終了タイムスタンプ表示
 * - エラー時のアラートサイドバー開閉
 * - WebSocketエラーモーダルの表示
 *
 * 状態管理：
 * - PlayerPresence による接続状態の判定
 * - プレイヤーアラートによるエラー状態の監視
 * - seekPlayback の有無によるライブ接続の判定
 *
 * @example
 * ```typescript
 * // AppBar内での使用
 * <DataSource />
 * ```
 */

import { ErrorCircle16Filled } from "@fluentui/react-icons";
import { CircularProgress, IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";
import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import WssErrorModal from "@lichtblick/suite-base/components/WssErrorModal";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";

import { EndTimestamp } from "./EndTimestamp";

/** アイコンサイズの定数 */
const ICON_SIZE = 18;

/**
 * DataSourceスタイル定義
 *
 * データソース表示の外観とレイアウトを定義：
 * - テキスト省略とレスポンシブ幅
 * - ローディングとエラー状態の視覚的表現
 * - アイコンとスピナーの配置
 */
const useStyles = makeStyles<void, "adornmentError">()((theme, _params, _classes) => ({
  /** データソース名の表示スタイル */
  sourceName: {
    font: "inherit",
    fontSize: theme.typography.body2.fontSize,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(1.5),
    paddingInlineEnd: theme.spacing(0.75),
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  /** 状態表示アイコンのコンテナ */
  adornment: {
    display: "flex",
    flex: "none",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: theme.palette.appBar.primary,
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  /** エラー状態のアイコンスタイル */
  adornmentError: {
    color: theme.palette.error.main,
  },
  /** ローディングスピナーの配置 */
  spinner: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    margin: "auto",
  },
  /** テキスト省略の設定 */
  textTruncate: {
    maxWidth: "30vw",
    overflow: "hidden",
  },
  /** エラーアイコンボタンのスタイル */
  iconButton: {
    padding: 0,
    position: "relative",
    zIndex: 1,
    fontSize: ICON_SIZE - 2,

    "svg:not(.MuiSvgIcon-root)": {
      fontSize: "1rem",
    },
  },
}));

/**
 * Message Pipeline Selectors - メッセージパイプライン状態セレクター
 *
 * パフォーマンス最適化のため、必要な状態のみを抽出するセレクター関数群。
 */

/** プレイヤー名を取得 */
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
/** プレイヤーの接続状態を取得 */
const selectPlayerPresence = (ctx: MessagePipelineContext) => ctx.playerState.presence;
/** プレイヤーのアラート情報を取得 */
const selectPlayerAlerts = (ctx: MessagePipelineContext) => ctx.playerState.alerts;
/** シーク機能の有無を取得（ライブ接続の判定に使用） */
const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;

/**
 * DataSource - データソース表示コンポーネント
 *
 * 現在のデータソースの状態と情報を表示するメインコンポーネント。
 * プレイヤーの接続状態に応じて適切な表示を行い、エラー時にはユーザーが
 * 詳細情報にアクセスできるようにします。
 *
 * 表示パターン：
 * - データソース未接続: "No data source" メッセージ
 * - 初期化中: "Initializing…" + ローディングスピナー
 * - 再接続中: データソース名 + ローディングスピナー
 * - エラー状態: データソース名 + エラーアイコン（クリック可能）
 * - 正常状態: データソース名 + 終了タイムスタンプ（ライブ接続時）
 *
 * ライブ接続の判定：
 * - seekPlayback が undefined の場合はライブ接続とみなす
 * - この判定は現在のアーキテクチャにおける暫定的な実装
 *
 * @returns DataSourceのJSX要素
 */
export function DataSource(): React.JSX.Element {
  const { t } = useTranslation("appBar");
  const { classes, cx } = useStyles();

  /** プレイヤー状態の取得 */
  const playerName = useMessagePipeline(selectPlayerName);
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerAlerts = useMessagePipeline(selectPlayerAlerts) ?? [];
  const seek = useMessagePipeline(selectSeek);

  /** ワークスペースアクション（サイドバー制御） */
  const { sidebarActions } = useWorkspaceActions();

  /**
   * ライブ接続の判定
   *
   * 現在のアーキテクチャにおける暫定的な実装：
   * seekPlayback が undefined の場合はライブ接続とみなす
   */
  const isLiveConnection = seek == undefined;

  /** 接続状態の判定 */
  const reconnecting = playerPresence === PlayerPresence.RECONNECTING;
  const initializing = playerPresence === PlayerPresence.INITIALIZING;
  const error =
    playerPresence === PlayerPresence.ERROR ||
    playerAlerts.some((alert) => alert.severity === "error");
  const loading = reconnecting || initializing;

  /** 表示用のプレイヤー名 */
  const playerDisplayName = initializing && playerName == undefined ? "Initializing…" : playerName;

  /** データソース未接続時の表示 */
  if (playerPresence === PlayerPresence.NOT_PRESENT) {
    return <div className={classes.sourceName}>{t("noDataSource")}</div>;
  }

  return (
    <>
      {/* WebSocketエラーモーダル */}
      <WssErrorModal playerAlerts={playerAlerts} />

      <Stack direction="row" alignItems="center">
        {/* データソース名と終了タイムスタンプ */}
        <div className={classes.sourceName}>
          <div className={classes.textTruncate}>
            <TextMiddleTruncate text={playerDisplayName ?? `<${t("unknown")}>`} />
          </div>
          {/* ライブ接続時のみ終了タイムスタンプを表示 */}
          {isLiveConnection && (
            <>
              <span>/</span>
              <EndTimestamp />
            </>
          )}
        </div>

        {/* 状態表示アイコン（ローディング・エラー） */}
        <div className={cx(classes.adornment, { [classes.adornmentError]: error })}>
          {/* ローディングスピナー */}
          {loading && (
            <CircularProgress
              size={ICON_SIZE}
              color="inherit"
              className={classes.spinner}
              variant="indeterminate"
            />
          )}

          {/* エラーアイコン（クリック可能） */}
          {error && (
            <IconButton
              color="inherit"
              className={classes.iconButton}
              onClick={() => {
                // アラートサイドバーを開く
                sidebarActions.left.setOpen(true);
                sidebarActions.left.selectItem("alerts");
              }}
            >
              <ErrorCircle16Filled />
            </IconButton>
          )}
        </div>
      </Stack>
    </>
  );
}
