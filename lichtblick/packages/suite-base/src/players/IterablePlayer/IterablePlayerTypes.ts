// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time } from "@lichtblick/rostime";
import { MessageEvent, Metadata } from "@lichtblick/suite";
import {
  PlayerMetricsCollectorInterface,
  PlayerPresence,
  Progress,
  SubscribePayload,
  Topic,
  TopicSelection,
  TopicStats,
} from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

import { IDeserializedIterableSource, ISerializedIterableSource } from "./IIterableSource";

/**
 * Configuration options for IterablePlayer construction
 */
export type IterablePlayerOptions = {
  metricsCollector?: PlayerMetricsCollectorInterface;
  source: IDeserializedIterableSource | ISerializedIterableSource;
  name?: string;
  urlParams?: Record<string, string | string[]>;
  sourceId: string;
  isSampleDataSource?: boolean;
  enablePreload?: boolean;
  readAheadDuration?: Time;
};

/**
 * Internal state machine states for IterablePlayer
 */
export type IterablePlayerState =
  | "preinit"
  | "initialize"
  | "start-play"
  | "idle"
  | "seek-backfill"
  | "play"
  | "close"
  | "reset-playback-iterator";

/**
 * Internal state container for IterablePlayer
 */
export interface IterablePlayerInternalState {
  // Core state
  state: IterablePlayerState;
  nextState?: IterablePlayerState;
  runningState: boolean;
  hasError: boolean;

  // Playback state
  isPlaying: boolean;
  speed: number;
  currentTime?: Time;
  start?: Time;
  end?: Time;
  lastTickMillis?: number;
  lastRangeMillis?: number;
  lastSeekEmitTime: number;
  seekTarget?: Time;
  untilTime?: Time;

  // Data state
  providerTopics: Topic[];
  providerTopicStats: Map<string, TopicStats>;
  providerDatatypes: RosDatatypes;
  subscriptions: SubscribePayload[];
  allTopics: TopicSelection;
  preloadTopics: TopicSelection;
  publishedTopics: Map<string, Set<string>>;

  // Message handling
  messages: readonly MessageEvent[];
  lastMessageEvent?: MessageEvent;
  lastStamp?: Time;
  receivedBytes: number;

  // System state
  presence: PlayerPresence;
  progress: Progress;
  capabilities: string[];
  profile?: string;
  metadata: readonly Metadata[];
  enablePreload: boolean;

  // Identifiers
  id: string;
  name?: string;
  urlParams?: Record<string, string | string[]>;
  sourceId: string;
}

/**
 * Interface for state change events
 */
export interface StateChangeEvent {
  from: IterablePlayerState;
  to: IterablePlayerState;
  timestamp: number;
}

/**
 * Interface for playback events
 */
export interface PlaybackEvent {
  type: "play" | "pause" | "seek" | "speed-change";
  timestamp: number;
  details?: {
    speed?: number;
    time?: Time;
  };
}

/**
 * Interface for message tick events
 */
export interface MessageTickEvent {
  messages: readonly MessageEvent[];
  currentTime: Time;
  tickDuration: number;
  bufferingTime: number;
}

/**
 * Constants for IterablePlayer
 */
export const ITERABLE_PLAYER_CONSTANTS = {
  // Default cache size in bytes (1.0GB)
  DEFAULT_CACHE_SIZE_BYTES: 1.0e9,

  // Delay before starting playback to let panels subscribe
  START_DELAY_MS: 100,

  // Minimum block size for memory cache
  MIN_MEM_CACHE_BLOCK_SIZE_NS: 0.1e9,

  // Maximum number of blocks to prevent performance issues
  MAX_BLOCKS: 100,

  // Amount to seek from start when loading initially
  SEEK_ON_START_NS: BigInt(99 * 1e6),

  // Memory info key for buffered messages
  MEMORY_INFO_BUFFERED_MSGS: "Buffered messages",

  // Default capabilities
  DEFAULT_CAPABILITIES: ["setSpeed", "playbackControl"],

  // Minimum frame time in milliseconds
  MIN_FRAME_TIME_MS: 16,

  // Maximum tick duration in milliseconds
  MAX_TICK_DURATION_MS: 300,

  // Default buffering timeout in milliseconds
  BUFFERING_TIMEOUT_MS: 500,

  // Seek acknowledgment timeout in milliseconds
  SEEK_ACK_TIMEOUT_MS: 100,
} as const;

/**
 * Empty array constant to avoid creating new arrays
 */
export const EMPTY_ARRAY = Object.freeze([]) as readonly MessageEvent[];
