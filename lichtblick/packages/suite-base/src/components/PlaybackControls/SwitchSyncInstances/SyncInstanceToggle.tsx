// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * SyncInstanceToggle - インスタンス同期切り替えコンポーネント
 *
 * @overview
 * 複数の Lichtblick インスタンス間での再生同期機能の ON/OFF を切り替える。
 * 実験的機能として提供され、設定により表示/非表示が制御される。
 *
 * @features
 * - インスタンス間同期機能の切り替え
 * - 実験的機能フラグによる表示制御
 * - 視覚的な ON/OFF 状態表示
 * - ワークスペース設定との統合
 *
 * @architecture
 * - AppConfiguration による機能有効化制御
 * - WorkspaceContext による状態管理
 * - Material UI コンポーネントの使用
 * - カスタムスタイルによる状態表現
 *
 * @experimentalFeature
 * SHOW_SYNC_LB_INSTANCES 設定により機能の有効/無効を制御。
 * 無効時は自動的に同期もオフにして空要素を返す。
 *
 * @usageExample
 * ```tsx
 * // PlaybackControls 内で使用
 * <SyncInstanceToggle />
 * ```
 */

import { Stack, Button, Typography } from "@mui/material";

import { useWorkspaceStore } from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

import { useStyles } from "./SyncInstanceToggle.style";

/**
 * SyncInstanceToggle コンポーネント
 *
 * @description
 * インスタンス間同期機能の切り替えボタン。
 * 実験的機能として提供され、設定により表示制御される。
 *
 * @algorithm
 * 1. 実験的機能フラグの確認
 * 2. 機能無効時の同期状態クリア
 * 3. 同期状態の表示と切り替え
 *
 * @returns 同期切り替えボタンまたは空要素
 */
const SyncInstanceToggle = (): React.JSX.Element => {
  const syncInstances = useWorkspaceStore((store) => store.playbackControls.syncInstances);

  /** ワークスペースアクション */
  const {
    playbackControlActions: { setSyncInstances },
  } = useWorkspaceActions();

  /** 同期状態に基づくスタイル */
  const { classes } = useStyles({ syncInstances });

  const handleToogle = () => {
    setSyncInstances(!syncInstances);
  };

  return (
    <Button className={classes.button} onClick={handleToogle}>
      <Stack className={classes.textWrapper}>
        <Typography className={classes.syncText}>Sync</Typography>
        <Typography className={classes.onOffText}>{syncInstances ? "on" : "off"}</Typography>
      </Stack>
    </Button>
  );
};

export default SyncInstanceToggle;
