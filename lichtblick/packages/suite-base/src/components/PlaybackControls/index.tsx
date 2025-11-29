// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

/**
 * PlaybackControls - 統合再生制御コンポーネント
 *
 * @overview
 * データ再生の統合制御機能を提供するメインコンポーネント。
 * スクラブバー、再生/一時停止、シーク、リピート、同期機能を統合し、
 * 複数の Lichtblick インスタンス間での同期再生にも対応。
 *
 * @features
 * - タイムラインスクラブバーによる直感的シーク操作
 * - 再生/一時停止/前進/後退の基本制御
 * - リピート再生機能
 * - イベント作成・表示機能
 * - インスタンス間同期機能
 * - 再生速度制御
 * - キーボードショートカット対応
 * - データソース情報表示
 *
 * @architecture
 * - MessagePipeline との統合
 * - BroadcastManager による複数インスタンス同期
 * - EventsContext によるイベント管理
 * - WorkspaceContext による設定管理
 * - Material UI による統一的 UI
 *
 * @keyboardShortcuts
 * - Space: 再生/一時停止切り替え
 * - 左矢印: 後退（100ms / Shift: 10ms / Alt: 500ms）
 * - 右矢印: 前進（100ms / Shift: 10ms / Alt: 500ms）
 *
 * @layout
 * 上段: スクラブバー（タイムライン）
 * 下段: 左から時間表示・基本制御・オプション制御
 *
 * @syncBehavior
 * 複数の Lichtblick インスタンス間でのBroadcastManagerによる同期:
 * - play/pause/seek/playUntil コマンドをブロードキャスト
 * - 受信側インスタンスでの自動同期処理
 *
 * @usageExample
 * ```tsx
 * <PlaybackControls
 *   play={() => player.startPlayback()}
 *   pause={() => player.pausePlayback()}
 *   seek={(time) => player.seekPlayback(time)}
 *   playUntil={(time) => player.playUntil(time)}
 *   isPlaying={player.isPlaying}
 *   getTimeInfo={() => ({ startTime, endTime, currentTime })}
 * />
 * ```
 */

import {
  ArrowRepeatAll20Regular,
  ArrowRepeatAllOff20Regular,
  Info20Regular,
  Next20Filled,
  Next20Regular,
  Pause20Filled,
  Pause20Regular,
  Play20Filled,
  Play20Regular,
  Previous20Filled,
  Previous20Regular,
} from "@fluentui/react-icons";
import { Tooltip } from "@mui/material";
import { useCallback, useMemo, useState } from "react";

import { Time, compare } from "@lichtblick/rostime";
import { CreateEventDialog } from "@lichtblick/suite-base/components/CreateEventDialog";
import { DataSourceInfoView } from "@lichtblick/suite-base/components/DataSourceInfoView";
import EventIcon from "@lichtblick/suite-base/components/EventIcon";
import EventOutlinedIcon from "@lichtblick/suite-base/components/EventOutlinedIcon";
import HoverableIconButton from "@lichtblick/suite-base/components/HoverableIconButton";
import KeyListener from "@lichtblick/suite-base/components/KeyListener";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import SyncInstanceToggle from "@lichtblick/suite-base/components/PlaybackControls/SwitchSyncInstances/SyncInstanceToggle";
import { useStyles } from "@lichtblick/suite-base/components/PlaybackControls/index.style";
import { useDirectionalSeek } from "@lichtblick/suite-base/components/PlaybackControls/useDirectionalSeek";
import PlaybackSpeedControls from "@lichtblick/suite-base/components/PlaybackSpeedControls";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useCurrentUser } from "@lichtblick/suite-base/context/BaseUserContext";
import { EventsStore, useEvents } from "@lichtblick/suite-base/context/EventsContext";
import {
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { Player, PlayerPresence } from "@lichtblick/suite-base/players/types";
import BroadcastManager from "@lichtblick/suite-base/util/broadcast/BroadcastManager";

import PlaybackTimeDisplay from "./PlaybackTimeDisplay";
import { RepeatAdapter } from "./RepeatAdapter";
import Scrubber from "./Scrubber";

const selectPresence = (ctx: MessagePipelineContext) => ctx.playerState.presence;
const selectEventsSupported = (store: EventsStore) => store.eventsSupported;
const selectPlaybackRepeat = (store: WorkspaceContextStore) => store.playbackControls.repeat;

type PlaybackControlsProps = Readonly<{
  play: NonNullable<Player["startPlayback"]>;
  pause: NonNullable<Player["pausePlayback"]>;
  seek: NonNullable<Player["seekPlayback"]>;
  playUntil?: Player["playUntil"];
  isPlaying: boolean;
  getTimeInfo: () => { startTime?: Time; endTime?: Time; currentTime?: Time };
}>;

export default function PlaybackControls({
  play,
  pause,
  seek,
  playUntil,
  isPlaying,
  getTimeInfo,
}: PlaybackControlsProps): React.JSX.Element {
  const presence = useMessagePipeline(selectPresence);

  const { classes, cx } = useStyles();
  const repeat = useWorkspaceStore(selectPlaybackRepeat);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const { currentUserType } = useCurrentUser();
  const eventsSupported = useEvents(selectEventsSupported);

  const {
    playbackControlActions: { setRepeat },
  } = useWorkspaceActions();

  const toggleRepeat = useCallback(() => {
    setRepeat((old) => !old);
  }, [setRepeat]);

  const togglePlayPause = useCallback(() => {
    const { startTime: start, endTime: end, currentTime: current } = getTimeInfo();

    if (isPlaying) {
      pause();

      BroadcastManager.getInstance().postMessage({
        type: "pause",
        time: current!,
      });
    } else {
      // if we are at the end, we need to go back to start
      if (current && end && start && compare(current, end) >= 0) {
        seek(start);
      }
      play();

      BroadcastManager.getInstance().postMessage({
        type: "play",
        time: current!,
      });
    }
  }, [isPlaying, pause, getTimeInfo, play, seek]);

  const { seekForwardAction, seekBackwardAction } = useDirectionalSeek({
    seek,
    getTimeInfo,
    playUntil,
  });

  const keyDownHandlers = useMemo(
    () => ({
      " ": togglePlayPause,
      ArrowLeft: (ev: KeyboardEvent) => {
        seekBackwardAction(ev);
      },
      ArrowRight: (ev: KeyboardEvent) => {
        seekForwardAction(ev);
      },
    }),
    [seekBackwardAction, seekForwardAction, togglePlayPause],
  );

  const toggleCreateEventDialog = useCallback(() => {
    pause();
    setCreateEventDialogOpen((open) => !open);
  }, [pause]);

  const disableControls = presence === PlayerPresence.ERROR;

  return (
    <>
      <RepeatAdapter play={play} seek={seek} repeatEnabled={repeat} />
      <KeyListener global keyDownHandlers={keyDownHandlers} />
      <div className={classes.root}>
        <div className={classes.scrubberWrapper}>
          <Scrubber onSeek={seek} />
        </div>
        <Stack direction="row" alignItems="center" flex={1} gap={1}>
          <Stack direction="row" alignItems="center" flex={1} gap={0.5}>
            {currentUserType !== "unauthenticated" && eventsSupported && (
              <HoverableIconButton
                size="small"
                title="Create event"
                icon={<EventOutlinedIcon />}
                activeIcon={<EventIcon />}
                onClick={toggleCreateEventDialog}
              />
            )}
            <Tooltip
              // A desired workflow is the ability to copy data source info text (start, end, duration)
              // from the tooltip. However, there's a UX quirk where the tooltip will close if the user
              // clicks on the <HoverableIconButton> and then goes to copy text from the tooltip.
              //
              // Disabling the focus listener fixes this quirk and the tooltip behaves as expected.
              // https://mui.com/material-ui/api/tooltip/#prop-disableFocusListener
              disableFocusListener
              classes={{ popper: classes.popper }}
              title={
                <Stack paddingY={0.75}>
                  <DataSourceInfoView disableSource />
                </Stack>
              }
            >
              <HoverableIconButton
                className={cx(classes.dataSourceInfoButton, {
                  [classes.disabled]: disableControls,
                })}
                size="small"
                icon={<Info20Regular />}
              />
            </Tooltip>
            <PlaybackTimeDisplay onSeek={seek} onPause={pause} />
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <HoverableIconButton
              disabled={disableControls}
              size="small"
              title="Seek backward"
              icon={<Previous20Regular />}
              activeIcon={<Previous20Filled />}
              onClick={() => {
                seekBackwardAction();
              }}
              data-testid="seek-backward-button"
            />
            <HoverableIconButton
              disabled={disableControls}
              size="small"
              title={isPlaying ? "Pause" : "Play"}
              onClick={togglePlayPause}
              icon={isPlaying ? <Pause20Regular /> : <Play20Regular />}
              activeIcon={isPlaying ? <Pause20Filled /> : <Play20Filled />}
              data-testid="play-button"
            />
            <HoverableIconButton
              disabled={disableControls}
              size="small"
              title="Seek forward"
              icon={<Next20Regular />}
              activeIcon={<Next20Filled />}
              onClick={() => {
                seekForwardAction();
              }}
              data-testid="seek-forward-button"
            />
          </Stack>
          <Stack direction="row" flex={1} alignItems="center" justifyContent="flex-end" gap={0.5}>
            <SyncInstanceToggle />
            <HoverableIconButton
              size="small"
              title="Loop playback"
              color={repeat ? "primary" : "inherit"}
              onClick={toggleRepeat}
              icon={repeat ? <ArrowRepeatAll20Regular /> : <ArrowRepeatAllOff20Regular />}
            />
            <PlaybackSpeedControls />
          </Stack>
        </Stack>
        {createEventDialogOpen && eventsSupported && (
          <CreateEventDialog onClose={toggleCreateEventDialog} />
        )}
      </div>
    </>
  );
}
