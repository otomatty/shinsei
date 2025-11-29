// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { v4 as uuidv4 } from "uuid";

import { debouncePromise } from "@lichtblick/den/async";
import { filterMap } from "@lichtblick/den/collection";
import Log from "@lichtblick/log";
import {
  Time,
  add,
  clampTime,
  compare,
  fromMillis,
  fromNanoSec,
  toRFC3339String,
  toString,
} from "@lichtblick/rostime";
import { Immutable, MessageEvent, Metadata, ParameterValue } from "@lichtblick/suite";
import { DeserializedSourceWrapper } from "@lichtblick/suite-base/players/IterablePlayer/DeserializedSourceWrapper";
import { DeserializingIterableSource } from "@lichtblick/suite-base/players/IterablePlayer/DeserializingIterableSource";
import { freezeMetadata } from "@lichtblick/suite-base/players/IterablePlayer/freezeMetadata";
import NoopMetricsCollector from "@lichtblick/suite-base/players/NoopMetricsCollector";
import PlayerAlertManager from "@lichtblick/suite-base/players/PlayerAlertManager";
import { PLAYER_CAPABILITIES } from "@lichtblick/suite-base/players/constants";
import {
  AdvertiseOptions,
  Player,
  PlayerMetricsCollectorInterface,
  PlayerPresence,
  PlayerState,
  PlayerStateActiveData,
  Progress,
  PublishPayload,
  SubscribePayload,
  Topic,
  TopicSelection,
  TopicStats,
} from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import delay from "@lichtblick/suite-base/util/delay";

import { BlockLoader } from "./BlockLoader";
import { BufferedIterableSource } from "./BufferedIterableSource";
import {
  IDeserializedIterableSource,
  ISerializedIterableSource,
  IteratorResult,
} from "./IIterableSource";
import { IterablePlayerMessageHandler } from "./IterablePlayerMessageHandler";
import { IterablePlayerPlaybackController } from "./IterablePlayerPlaybackController";
import { IterablePlayerStateMachine, StateHandler } from "./IterablePlayerStateMachine";
import {
  IterablePlayerOptions,
  IterablePlayerInternalState,
  ITERABLE_PLAYER_CONSTANTS,
  EMPTY_ARRAY,
} from "./IterablePlayerTypes";

const log = Log.getLogger(__filename);

/**
 * IterablePlayer implements the Player interface for IIterableSource instances.
 *
 * This is a refactored version that separates concerns into multiple focused classes:
 * - IterablePlayerStateMachine: State transition logic
 * - IterablePlayerPlaybackController: Playback control (play/pause/seek/speed)
 * - IterablePlayerMessageHandler: Message reading and delivery
 *
 * The player is implemented as a state machine with the following states:
 * preinit → initialize → start-play → idle ⇄ play
 *                                     ↓     ↑
 *                               seek-backfill ↗
 *                                     ↓
 *                            reset-playback-iterator
 *                                     ↓
 *                                   close
 */
export class IterablePlayerRefactored implements Player {
  // Core components
  #stateMachine: IterablePlayerStateMachine;
  #playbackController: IterablePlayerPlaybackController;
  #messageHandler: IterablePlayerMessageHandler;
  #alertManager = new PlayerAlertManager();

  // State container
  #internalState: IterablePlayerInternalState;

  // Data sources
  #iterableSource: IDeserializedIterableSource | ISerializedIterableSource;
  #bufferedSource: IDeserializedIterableSource;
  #bufferImpl: BufferedIterableSource;

  // Block loading for preload
  #blockLoader?: BlockLoader;
  #blockLoadingProcess?: Promise<void>;

  // Event management
  #listener?: (playerState: PlayerState) => Promise<void>;
  #queueEmitState: ReturnType<typeof debouncePromise>;

  // Cleanup
  #resolveIsClosed: () => void = () => {};
  public readonly isClosed: Promise<void>;

  public constructor(options: IterablePlayerOptions) {
    const {
      metricsCollector,
      urlParams,
      source,
      name,
      enablePreload,
      sourceId,
      readAheadDuration = { sec: 10, nsec: 0 },
    } = options;

    // Initialize internal state
    this.#internalState = this.#createInitialState(options);

    // Setup data sources
    this.#iterableSource = source;
    if (source.sourceType === "deserialized") {
      this.#bufferImpl = new BufferedIterableSource(source);
      this.#bufferedSource = new DeserializedSourceWrapper(this.#bufferImpl);
    } else {
      const MEGABYTE_IN_BYTES = 1024 * 1024;
      const bufferInterface = new BufferedIterableSource(source, {
        readAheadDuration,
        maxCacheSizeBytes: 300 * MEGABYTE_IN_BYTES, // 300mb
      });
      this.#bufferImpl = bufferInterface;
      this.#bufferedSource = new DeserializingIterableSource(bufferInterface);
    }

    // Initialize components
    this.#stateMachine = new IterablePlayerStateMachine(this.#internalState);
    this.#playbackController = new IterablePlayerPlaybackController(this.#internalState);
    this.#messageHandler = new IterablePlayerMessageHandler(
      this.#internalState,
      this.#bufferedSource,
    );

    // Setup state machine handlers
    this.#setupStateHandlers();

    // Setup event listeners
    this.#setupEventListeners();

    // Initialize metrics
    const metricsCollectorImpl = metricsCollector ?? new NoopMetricsCollector();
    metricsCollectorImpl.playerConstructed();

    // Setup cleanup
    this.isClosed = new Promise((resolveClose) => {
      this.#resolveIsClosed = resolveClose;
    });

    // Setup debounced state emission
    this.#queueEmitState = debouncePromise(this.#emitStateImpl.bind(this));
  }

  // Public Player interface methods
  public setListener(listener: (playerState: PlayerState) => Promise<void>): void {
    if (this.#listener) {
      throw new Error("Cannot setListener again");
    }
    this.#listener = listener;
    this.#stateMachine.setState("initialize");
  }

  public startPlayback(): void {
    this.#playbackController.startPlayback();
  }

  public playUntil(time: Time): void {
    this.#playbackController.playUntil(time);
  }

  public pausePlayback(): void {
    this.#playbackController.pausePlayback();
  }

  public setPlaybackSpeed(speed: number): void {
    this.#playbackController.setPlaybackSpeed(speed);
  }

  public seekPlayback(time: Time): void {
    // Wait until initialization is complete
    if (
      this.#stateMachine.getCurrentState() === "preinit" ||
      this.#stateMachine.getCurrentState() === "initialize"
    ) {
      log.debug(`Ignoring seek, state=${this.#stateMachine.getCurrentState()}`);
      this.#internalState.seekTarget = time;
      return;
    }

    this.#playbackController.seekPlayback(time);
  }

  public setSubscriptions(newSubscriptions: SubscribePayload[]): void {
    log.debug("set subscriptions", newSubscriptions);
    this.#internalState.subscriptions = newSubscriptions;

    const allTopics: TopicSelection = new Map(
      this.#internalState.subscriptions.map((subscription) => [subscription.topic, subscription]),
    );
    const preloadTopics = new Map(
      filterMap(this.#internalState.subscriptions, (sub) =>
        sub.preloadType === "full" ? [sub.topic, sub] : undefined,
      ),
    );

    // If there are no changes to topics, no need to trigger loading
    if (
      _.isEqual(allTopics, this.#internalState.allTopics) &&
      _.isEqual(preloadTopics, this.#internalState.preloadTopics)
    ) {
      return;
    }

    this.#internalState.allTopics = allTopics;
    this.#internalState.preloadTopics = preloadTopics;
    this.#blockLoader?.setTopics(this.#internalState.preloadTopics);

    // Trigger backfill if needed
    const currentState = this.#stateMachine.getCurrentState();
    if (["idle", "seek-backfill", "play", "start-play"].includes(currentState)) {
      if (!this.#internalState.isPlaying && this.#internalState.currentTime) {
        this.#internalState.seekTarget ??= this.#internalState.currentTime;
        this.#internalState.untilTime = undefined;
        this.#internalState.lastTickMillis = undefined;
        this.#internalState.lastRangeMillis = undefined;

        this.#stateMachine.setState("seek-backfill");
      }
    }
  }

  public setPublishers(_publishers: AdvertiseOptions[]): void {
    // no-op
  }

  public setParameter(_key: string, _value: ParameterValue): void {
    throw new Error("Parameter editing is not supported by this data source");
  }

  public publish(_payload: PublishPayload): void {
    throw new Error("Publishing is not supported by this data source");
  }

  public async callService(): Promise<unknown> {
    throw new Error("Service calls are not supported by this data source");
  }

  public close(): void {
    this.#stateMachine.setState("close");
  }

  public setGlobalVariables(): void {
    // no-op
  }

  public getMetadata(): ReadonlyArray<Readonly<Metadata>> {
    return this.#internalState.metadata;
  }

  // Private implementation methods

  #createInitialState(options: IterablePlayerOptions): IterablePlayerInternalState {
    return {
      // Core state
      state: "preinit",
      runningState: false,
      hasError: false,

      // Playback state
      isPlaying: false,
      speed: 1.0,
      lastSeekEmitTime: Date.now(),

      // Data state
      providerTopics: [],
      providerTopicStats: new Map(),
      providerDatatypes: new Map(),
      subscriptions: [],
      allTopics: new Map(),
      preloadTopics: new Map(),
      publishedTopics: new Map(),

      // Message handling
      messages: EMPTY_ARRAY,
      receivedBytes: 0,

      // System state
      presence: PlayerPresence.INITIALIZING,
      progress: {},
      capabilities: [...ITERABLE_PLAYER_CONSTANTS.DEFAULT_CAPABILITIES],
      metadata: Object.freeze([]),
      enablePreload: options.enablePreload ?? true,

      // Identifiers
      id: uuidv4(),
      name: options.name,
      urlParams: options.urlParams,
      sourceId: options.sourceId,
    };
  }

  #setupStateHandlers(): void {
    this.#stateMachine.registerStateHandler("preinit", this.#handlePreinitState.bind(this));
    this.#stateMachine.registerStateHandler("initialize", this.#handleInitializeState.bind(this));
    this.#stateMachine.registerStateHandler("start-play", this.#handleStartPlayState.bind(this));
    this.#stateMachine.registerStateHandler("idle", this.#handleIdleState.bind(this));
    this.#stateMachine.registerStateHandler(
      "seek-backfill",
      this.#handleSeekBackfillState.bind(this),
    );
    this.#stateMachine.registerStateHandler("play", this.#handlePlayState.bind(this));
    this.#stateMachine.registerStateHandler("close", this.#handleCloseState.bind(this));
    this.#stateMachine.registerStateHandler(
      "reset-playback-iterator",
      this.#handleResetIteratorState.bind(this),
    );
  }

  #setupEventListeners(): void {
    // Playback controller events
    this.#playbackController.on("playRequest", ({ untilTime }) => {
      const currentState = this.#stateMachine.getCurrentState();
      if (currentState === "idle" && !this.#stateMachine.getInternalState().nextState) {
        this.#stateMachine.setState("play");
      } else {
        this.#queueEmitState(); // Update isPlaying state to UI
      }
    });

    this.#playbackController.on("pauseRequest", () => {
      if (this.#stateMachine.getCurrentState() === "play") {
        this.#stateMachine.setState("idle");
      } else {
        this.#queueEmitState(); // Update isPlaying state to UI
      }
    });

    this.#playbackController.on("seekRequest", () => {
      this.#stateMachine.setState("seek-backfill");
    });

    this.#playbackController.on("speedChange", () => {
      this.#queueEmitState();
    });

    // Message handler events
    this.#messageHandler.on("messagesReady", () => {
      this.#queueEmitState();
    });

    this.#messageHandler.on("presenceChange", () => {
      this.#queueEmitState();
    });

    this.#messageHandler.on("messageTick", () => {
      this.#queueEmitState();
    });

    // State machine events
    this.#stateMachine.on("error", (error) => {
      this.#setError(error.message, error);
      this.#queueEmitState();
    });

    this.#stateMachine.on("stateChange", () => {
      // State changes might affect UI, queue an emit
      this.#queueEmitState();
    });
  }

  // State handlers

  async #handlePreinitState(): Promise<void> {
    this.#queueEmitState();
  }

  async #handleInitializeState(): Promise<void> {
    this.#queueEmitState();

    try {
      const initResult = await this.#bufferedSource.initialize();
      const {
        start,
        end,
        topics,
        profile,
        topicStats,
        alerts,
        publishersByTopic,
        datatypes,
        name,
        metadata,
      } = initResult;

      // Clamp seek target to bounds
      if (this.#internalState.seekTarget) {
        this.#internalState.seekTarget = clampTime(this.#internalState.seekTarget, start, end);
      }

      // Update state
      this.#internalState.metadata = metadata ?? [];
      freezeMetadata(this.#internalState.metadata);
      this.#internalState.profile = profile;
      this.#internalState.start = start;
      this.#internalState.currentTime = this.#internalState.seekTarget ?? start;
      this.#internalState.end = end;
      this.#internalState.publishedTopics = publishersByTopic;
      this.#internalState.providerDatatypes = datatypes;
      this.#internalState.name = name ?? this.#internalState.name;

      // Process topics
      const uniqueTopics = new Map<string, Topic>();
      for (const topic of topics) {
        const existingTopic = uniqueTopics.get(topic.name);
        if (existingTopic) {
          alerts.push({
            severity: "warn",
            message: `Inconsistent datatype for topic: ${topic.name}`,
            tip: `Topic ${topic.name} has messages with multiple datatypes: ${existingTopic.schemaName}, ${topic.schemaName}. This may result in errors during visualization.`,
          });
          continue;
        }
        uniqueTopics.set(topic.name, topic);
      }

      this.#internalState.providerTopics = Array.from(uniqueTopics.values());
      this.#internalState.providerTopicStats = topicStats;

      // Add alerts
      let idx = 0;
      for (const alert of alerts) {
        this.#alertManager.addAlert(`init-alert-${idx}`, alert);
        idx += 1;
      }

      // Setup block loader if preloading is enabled
      if (this.#internalState.enablePreload) {
        await this.#setupBlockLoader(initResult);
      }

      this.#internalState.presence = PlayerPresence.PRESENT;
    } catch (error) {
      this.#setError(`Error initializing: ${(error as Error).message}`, error as Error);
    }

    this.#queueEmitState();

    if (!this.#internalState.hasError && this.#internalState.start) {
      await delay(ITERABLE_PLAYER_CONSTANTS.START_DELAY_MS);
      this.#blockLoader?.setTopics(this.#internalState.preloadTopics);

      this.#blockLoadingProcess = this.#startBlockLoading().catch((err: unknown) => {
        this.#setError((err as Error).message, err as Error);
      });

      this.#stateMachine.setState("start-play");
    }
  }

  async #handleStartPlayState(): Promise<void> {
    if (this.#internalState.seekTarget) {
      this.#stateMachine.setState("seek-backfill");
      return;
    }

    await this.#messageHandler.readInitialMessages();
    this.#stateMachine.setState("idle");
  }

  async #handleIdleState(
    state: IterablePlayerInternalState,
    abort?: AbortController,
  ): Promise<void> {
    this.#internalState.isPlaying = false;
    this.#internalState.presence = PlayerPresence.PRESENT;

    // Update progress with loaded ranges
    this.#internalState.progress = {
      ...this.#internalState.progress,
      fullyLoadedFractionRanges: this.#bufferImpl.loadedRanges(),
      messageCache: this.#internalState.progress.messageCache,
    };

    const rangeChangeHandler = () => {
      this.#internalState.progress = {
        fullyLoadedFractionRanges: this.#bufferImpl.loadedRanges(),
        messageCache: this.#internalState.progress.messageCache,
        memoryInfo: {
          ...this.#internalState.progress.memoryInfo,
          [ITERABLE_PLAYER_CONSTANTS.MEMORY_INFO_BUFFERED_MSGS]: this.#bufferImpl.getCacheSize(),
        },
      };
      this.#queueEmitState();
    };

    this.#bufferImpl.on("loadedRangesChange", rangeChangeHandler);

    this.#queueEmitState();

    // Wait for abort signal
    const aborted = new Promise<void>((resolve) => {
      abort?.signal.addEventListener("abort", resolve);
    });

    await aborted;
    this.#bufferImpl.off("loadedRangesChange", rangeChangeHandler);
  }

  async #handleSeekBackfillState(
    state: IterablePlayerInternalState,
    abort?: AbortController,
  ): Promise<void> {
    if (!this.#internalState.start || !this.#internalState.end || !this.#internalState.seekTarget) {
      return;
    }

    const targetTime = clampTime(
      this.#internalState.seekTarget,
      this.#internalState.start,
      this.#internalState.end,
    );

    // Show buffering state if backfill takes too long
    const seekAckTimeout = setTimeout(() => {
      this.#internalState.presence = PlayerPresence.BUFFERING;
      this.#internalState.messages = EMPTY_ARRAY;
      this.#internalState.currentTime = targetTime;
      this.#queueEmitState();
    }, ITERABLE_PLAYER_CONSTANTS.SEEK_ACK_TIMEOUT_MS);

    try {
      await this.#messageHandler.readBackfillMessages(targetTime, abort?.signal);
      clearTimeout(seekAckTimeout);

      if (this.#stateMachine.getInternalState().nextState) {
        return;
      }

      await this.#messageHandler.resetPlaybackIterator();
      this.#stateMachine.setState(this.#internalState.isPlaying ? "play" : "idle");
    } catch (e: unknown) {
      const err = e as Error;
      if (this.#stateMachine.getInternalState().nextState && err.name === "AbortError") {
        log.debug("Aborted backfill");
      } else {
        throw err;
      }
    } finally {
      if (this.#stateMachine.getInternalState().nextState !== "seek-backfill") {
        this.#internalState.seekTarget = undefined;
      }
      clearTimeout(seekAckTimeout);
    }
  }

  async #handlePlayState(): Promise<void> {
    this.#internalState.presence = PlayerPresence.PRESENT;

    if (
      !this.#internalState.currentTime ||
      !this.#internalState.start ||
      !this.#internalState.end
    ) {
      throw new Error("Invariant: currentTime, start & end should be set before play state");
    }

    const allTopics = this.#internalState.allTopics;

    try {
      while (
        this.#internalState.isPlaying &&
        !this.#internalState.hasError &&
        !this.#stateMachine.getInternalState().nextState
      ) {
        if (this.#playbackController.hasReachedEnd()) {
          this.#playbackController.resetTimingState();
          this.#stateMachine.setState("idle");
          return;
        }

        const start = Date.now();

        // Calculate tick duration and end time
        const rangeMillis = this.#playbackController.calculateTickDuration();
        const targetTime = add(this.#internalState.currentTime, fromMillis(rangeMillis));
        const endTime = clampTime(
          targetTime,
          this.#internalState.start,
          this.#internalState.untilTime ?? this.#internalState.end,
        );

        await this.#messageHandler.tick(endTime);

        if (this.#stateMachine.getInternalState().nextState) {
          return;
        }

        // Update progress
        this.#internalState.progress = {
          fullyLoadedFractionRanges: this.#bufferImpl.loadedRanges(),
          messageCache: this.#internalState.progress.messageCache,
          memoryInfo: {
            ...this.#internalState.progress.memoryInfo,
            [ITERABLE_PLAYER_CONSTANTS.MEMORY_INFO_BUFFERED_MSGS]: this.#bufferImpl.getCacheSize(),
          },
        };

        // Check if subscriptions changed
        if (this.#internalState.allTopics !== allTopics) {
          this.#internalState.lastMessageEvent = undefined;
          this.#stateMachine.setState("reset-playback-iterator");
          return;
        }

        // Check if we should pause at untilTime
        if (this.#playbackController.shouldStopAtUntilTime()) {
          this.#playbackController.pausePlayback();
          return;
        }

        // Ensure minimum frame time
        const elapsed = Date.now() - start;
        if (elapsed < ITERABLE_PLAYER_CONSTANTS.MIN_FRAME_TIME_MS) {
          await delay(ITERABLE_PLAYER_CONSTANTS.MIN_FRAME_TIME_MS - elapsed);
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      this.#setError(err.message, err);
      this.#queueEmitState();
    }
  }

  async #handleResetIteratorState(): Promise<void> {
    await this.#messageHandler.resetPlaybackIterator();
    this.#stateMachine.setState(this.#internalState.isPlaying ? "play" : "idle");
  }

  async #handleCloseState(): Promise<void> {
    this.#internalState.isPlaying = false;
    await this.#blockLoader?.stopLoading();
    await this.#blockLoadingProcess;
    await this.#bufferImpl.terminate();
    await this.#messageHandler.terminate();
    await this.#iterableSource.terminate?.();
    this.#resolveIsClosed();
  }

  // Helper methods

  async #setupBlockLoader(initResult: any): Promise<void> {
    try {
      let blockLoaderSource;
      if (this.#iterableSource.sourceType === "deserialized") {
        blockLoaderSource = this.#iterableSource;
      } else {
        blockLoaderSource = new DeserializingIterableSource(this.#iterableSource);
        blockLoaderSource.initializeDeserializers(initResult);
      }

      this.#blockLoader = new BlockLoader({
        cacheSizeBytes: ITERABLE_PLAYER_CONSTANTS.DEFAULT_CACHE_SIZE_BYTES,
        source: blockLoaderSource,
        start: this.#internalState.start!,
        end: this.#internalState.end!,
        maxBlocks: ITERABLE_PLAYER_CONSTANTS.MAX_BLOCKS,
        minBlockDurationNs: ITERABLE_PLAYER_CONSTANTS.MIN_MEM_CACHE_BLOCK_SIZE_NS,
        alertManager: this.#alertManager,
      });
    } catch (err: unknown) {
      log.error(err);

      const startStr = toRFC3339String(this.#internalState.start!);
      const endStr = toRFC3339String(this.#internalState.end!);

      this.#alertManager.addAlert("block-loader", {
        severity: "warn",
        message: "Failed to initialize message preloading",
        tip: `The start (${startStr}) and end (${endStr}) of your data is too far apart.`,
        error: err as Error,
      });
    }
  }

  async #startBlockLoading(): Promise<void> {
    await this.#blockLoader?.startLoading({
      progress: async (progress) => {
        this.#internalState.progress = {
          fullyLoadedFractionRanges: this.#internalState.progress.fullyLoadedFractionRanges,
          messageCache: progress.messageCache,
          memoryInfo: {
            ...this.#internalState.progress.memoryInfo,
            ...progress.memoryInfo,
          },
        };

        if (this.#stateMachine.getCurrentState() !== "play") {
          this.#queueEmitState();
        }
      },
    });
  }

  #setError(message: string, error?: Error): void {
    this.#internalState.hasError = true;
    this.#alertManager.addAlert("global-error", {
      severity: "error",
      message,
      error,
    });
    this.#internalState.isPlaying = false;
  }

  async #emitStateImpl(): Promise<void> {
    if (!this.#listener) {
      return;
    }

    if (this.#internalState.hasError) {
      await this.#listener({
        name: this.#internalState.name,
        presence: PlayerPresence.ERROR,
        progress: {},
        capabilities: this.#internalState.capabilities,
        profile: this.#internalState.profile,
        playerId: this.#internalState.id,
        activeData: undefined,
        alerts: this.#alertManager.alerts(),
        urlState: {
          sourceId: this.#internalState.sourceId,
          parameters: this.#internalState.urlParams,
        },
      });
      return;
    }

    const messages = this.#internalState.messages;
    this.#internalState.messages = EMPTY_ARRAY;

    let activeData: PlayerStateActiveData | undefined;
    if (this.#internalState.start && this.#internalState.end && this.#internalState.currentTime) {
      activeData = {
        messages,
        totalBytesReceived: this.#internalState.receivedBytes,
        currentTime: this.#internalState.currentTime,
        startTime: this.#internalState.start,
        endTime: this.#internalState.end,
        isPlaying: this.#internalState.isPlaying,
        speed: this.#internalState.speed,
        lastSeekTime: this.#internalState.lastSeekEmitTime,
        topics: this.#internalState.providerTopics,
        topicStats: this.#internalState.providerTopicStats,
        datatypes: this.#internalState.providerDatatypes,
        publishedTopics: this.#internalState.publishedTopics,
      };
    }

    const data: PlayerState = {
      name: this.#internalState.name,
      presence: this.#internalState.presence,
      progress: this.#internalState.progress,
      capabilities: this.#internalState.capabilities,
      profile: this.#internalState.profile,
      playerId: this.#internalState.id,
      alerts: this.#alertManager.alerts(),
      activeData,
      urlState: {
        sourceId: this.#internalState.sourceId,
        parameters: this.#internalState.urlParams,
      },
    };

    await this.#listener(data);
  }
}
