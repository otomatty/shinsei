// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { EventEmitter } from "events";

import Log from "@lichtblick/log";
import { Time, add, compare, fromNanoSec } from "@lichtblick/rostime";
import { MessageEvent } from "@lichtblick/suite";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";

import { IDeserializedIterableSource, IteratorResult } from "./IIterableSource";
import {
  IterablePlayerInternalState,
  MessageTickEvent,
  ITERABLE_PLAYER_CONSTANTS,
  EMPTY_ARRAY,
} from "./IterablePlayerTypes";

const log = Log.getLogger(__filename);

/**
 * Events emitted by the message handler
 */
interface MessageHandlerEvents {
  messageTick: MessageTickEvent;
  presenceChange: { presence: PlayerPresence };
  messagesReady: { messages: readonly MessageEvent[]; currentTime: Time };
}

/**
 * Handles message reading, buffering, and delivery.
 * Manages the tick-based message streaming and timing logic.
 */
export class IterablePlayerMessageHandler extends EventEmitter<MessageHandlerEvents> {
  #state: IterablePlayerInternalState;
  #bufferedSource: IDeserializedIterableSource;
  #playbackIterator?: AsyncIterator<Readonly<IteratorResult>>;

  constructor(state: IterablePlayerInternalState, bufferedSource: IDeserializedIterableSource) {
    super();
    this.#state = state;
    this.#bufferedSource = bufferedSource;
  }

  /**
   * Initialize or reset the playback iterator
   */
  public async resetPlaybackIterator(): Promise<void> {
    if (!this.#state.currentTime) {
      throw new Error("Invariant: Tried to reset playback iterator with no current time.");
    }

    if (!this.#state.start) {
      throw new Error("Invariant: Tried to reset playback iterator with no start time.");
    }

    // When resetting the iterator to the start of the source, we must not add 1 ns
    // otherwise we might skip messages whose timestamp is equal to the source start time.
    const next =
      compare(this.#state.currentTime, this.#state.start) === 0
        ? this.#state.start
        : add(this.#state.currentTime, { sec: 0, nsec: 1 });

    log.debug("Ending previous iterator");
    await this.#playbackIterator?.return?.();

    log.debug("Initializing forward iterator from", next);
    this.#playbackIterator = this.#bufferedSource.messageIterator({
      topics: this.#state.allTopics,
      start: next,
      consumptionType: "partial",
    });
  }

  /**
   * Read initial messages for startup
   */
  public async readInitialMessages(): Promise<void> {
    if (!this.#state.start || !this.#state.end) {
      throw new Error("Invariant: start and end must be set");
    }

    const stopTime = clampTime(
      add(this.#state.start, fromNanoSec(ITERABLE_PLAYER_CONSTANTS.SEEK_ON_START_NS)),
      this.#state.start,
      this.#state.end,
    );

    log.debug(`Reading initial messages from ${this.#state.start} to ${stopTime}`);

    if (this.#playbackIterator) {
      throw new Error("Invariant: playbackIterator was already set");
    }

    this.#playbackIterator = this.#bufferedSource.messageIterator({
      topics: this.#state.allTopics,
      start: this.#state.start,
      consumptionType: "partial",
    });

    this.#state.lastMessageEvent = undefined;
    this.#state.messages = EMPTY_ARRAY;

    const messageEvents: MessageEvent[] = [];

    // Set buffering state if reading takes too long
    const bufferingTimeout = setTimeout(() => {
      this.#state.presence = PlayerPresence.BUFFERING;
      this.emit("presenceChange", { presence: PlayerPresence.BUFFERING });
    }, ITERABLE_PLAYER_CONSTANTS.BUFFERING_TIMEOUT_MS);

    try {
      for (;;) {
        const result = await this.#playbackIterator.next();
        if (result.done === true) {
          break;
        }

        const iterResult = result.value;

        if (iterResult.type === "stamp" && compare(iterResult.stamp, stopTime) >= 0) {
          this.#state.lastStamp = iterResult.stamp;
          break;
        }

        if (iterResult.type === "message-event") {
          // Save message for next tick if it's past the stop time
          if (compare(iterResult.msgEvent.receiveTime, stopTime) > 0) {
            this.#state.lastMessageEvent = iterResult.msgEvent;
            break;
          }

          messageEvents.push(iterResult.msgEvent);
        }
      }
    } finally {
      clearTimeout(bufferingTimeout);
    }

    this.#state.currentTime = stopTime;
    this.#state.messages = messageEvents;
    this.#state.presence = PlayerPresence.PRESENT;

    this.emit("messagesReady", {
      messages: messageEvents,
      currentTime: stopTime,
    });
  }

  /**
   * Read messages for backfill (seek operation)
   */
  public async readBackfillMessages(targetTime: Time, abortSignal?: AbortSignal): Promise<void> {
    log.debug(`Reading backfill messages at time ${targetTime}`);

    this.#state.lastMessageEvent = undefined;

    const messages = await this.#bufferedSource.getBackfillMessages({
      topics: this.#state.allTopics,
      time: targetTime,
      abortSignal,
    });

    this.#state.messages = messages;
    this.#state.currentTime = targetTime;
    this.#state.lastSeekEmitTime = Date.now();
    this.#state.presence = PlayerPresence.PRESENT;

    this.emit("messagesReady", {
      messages,
      currentTime: targetTime,
    });
  }

  /**
   * Perform a single tick of message reading
   */
  public async tick(endTime: Time): Promise<void> {
    if (!this.#state.isPlaying) {
      return;
    }

    const tickStart = performance.now();

    // Check if we can shortcut using lastStamp
    if (this.#state.lastStamp && compare(this.#state.lastStamp, endTime) >= 0) {
      this.#state.currentTime = endTime;
      this.#state.messages = EMPTY_ARRAY;

      this.emit("messageTick", {
        messages: EMPTY_ARRAY,
        currentTime: endTime,
        tickDuration: performance.now() - tickStart,
        bufferingTime: 0,
      });

      return;
    }

    this.#state.lastStamp = undefined;

    const msgEvents: MessageEvent[] = [];

    // Include any leftover message from the previous tick
    if (this.#state.lastMessageEvent) {
      if (compare(this.#state.lastMessageEvent.receiveTime, endTime) > 0) {
        // Message is still ahead of current tick end
        this.#state.currentTime = endTime;
        this.#state.messages = EMPTY_ARRAY;

        this.emit("messageTick", {
          messages: EMPTY_ARRAY,
          currentTime: endTime,
          tickDuration: performance.now() - tickStart,
          bufferingTime: 0,
        });

        return;
      }

      msgEvents.push(this.#state.lastMessageEvent);
      this.#state.lastMessageEvent = undefined;
    }

    // Set buffering state if reading takes too long
    const bufferingTimeout = setTimeout(() => {
      this.#state.presence = PlayerPresence.BUFFERING;
      this.emit("presenceChange", { presence: PlayerPresence.BUFFERING });
    }, ITERABLE_PLAYER_CONSTANTS.BUFFERING_TIMEOUT_MS);

    const bufferingStart = performance.now();
    let bufferingTime = 0;

    try {
      // Read messages until we reach the tick end time
      for (;;) {
        if (!this.#playbackIterator) {
          throw new Error("Invariant: playbackIterator is undefined");
        }

        const result = await this.#playbackIterator.next();
        if (result.done === true) {
          break;
        }

        const iterResult = result.value;

        if (iterResult.type === "stamp" && compare(iterResult.stamp, endTime) >= 0) {
          this.#state.lastStamp = iterResult.stamp;
          break;
        }

        if (iterResult.type === "message-event") {
          // Save message for next tick if it's past the end time
          if (compare(iterResult.msgEvent.receiveTime, endTime) > 0) {
            this.#state.lastMessageEvent = iterResult.msgEvent;
            break;
          }

          msgEvents.push(iterResult.msgEvent);
        }
      }

      bufferingTime = performance.now() - bufferingStart;
    } finally {
      clearTimeout(bufferingTimeout);
    }

    // Restore normal presence
    this.#state.presence = PlayerPresence.PRESENT;
    this.#state.currentTime = endTime;
    this.#state.messages = msgEvents;

    const tickDuration = performance.now() - tickStart;

    this.emit("messageTick", {
      messages: msgEvents,
      currentTime: endTime,
      tickDuration,
      bufferingTime,
    });
  }

  /**
   * Clear all cached messages
   */
  public clearMessages(): void {
    this.#state.messages = EMPTY_ARRAY;
    this.#state.lastMessageEvent = undefined;
    this.#state.lastStamp = undefined;
  }

  /**
   * Get the current message iterator
   */
  public getPlaybackIterator(): AsyncIterator<Readonly<IteratorResult>> | undefined {
    return this.#playbackIterator;
  }

  /**
   * Terminate the message handler
   */
  public async terminate(): Promise<void> {
    await this.#playbackIterator?.return?.();
    this.#playbackIterator = undefined;
  }

  /**
   * Get current message statistics
   */
  public getMessageStats() {
    return {
      messageCount: this.#state.messages.length,
      hasLastMessage: this.#state.lastMessageEvent != undefined,
      hasLastStamp: this.#state.lastStamp != undefined,
      receivedBytes: this.#state.receivedBytes,
    };
  }
}

/**
 * Helper function to clamp time between bounds
 */
function clampTime(time: Time, start: Time, end: Time): Time {
  if (compare(time, start) < 0) {
    return start;
  }
  if (compare(time, end) > 0) {
    return end;
  }
  return time;
}
