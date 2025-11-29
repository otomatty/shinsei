// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { EventEmitter } from "events";

import Log from "@lichtblick/log";
import { Time, clampTime, compare } from "@lichtblick/rostime";

import {
  IterablePlayerInternalState,
  PlaybackEvent,
  ITERABLE_PLAYER_CONSTANTS,
} from "./IterablePlayerTypes";

const log = Log.getLogger(__filename);

/**
 * Events emitted by the playback controller
 */
interface PlaybackControllerEvents {
  playbackEvent: PlaybackEvent;
  speedChange: { speed: number };
  seekRequest: { time: Time };
  playRequest: { untilTime?: Time };
  pauseRequest: void;
}

/**
 * Controller for playback operations (play, pause, seek, speed control).
 * Handles timing logic and playback state management.
 */
export class IterablePlayerPlaybackController extends EventEmitter<PlaybackControllerEvents> {
  #state: IterablePlayerInternalState;

  constructor(state: IterablePlayerInternalState) {
    super();
    this.#state = state;
  }

  /**
   * Start playback from the current position
   */
  public startPlayback(): void {
    this.#startPlayImpl();
  }

  /**
   * Play until the specified time, then pause
   */
  public playUntil(time: Time): void {
    this.#startPlayImpl({ untilTime: time });
  }

  /**
   * Pause playback
   */
  public pausePlayback(): void {
    if (!this.#state.isPlaying) {
      return;
    }

    log.debug("Pausing playback");

    // Clear out last tick millis so we don't read a huge chunk when we unpause
    this.#state.lastTickMillis = undefined;
    this.#state.isPlaying = false;
    this.#state.untilTime = undefined;
    this.#state.lastRangeMillis = undefined;

    this.emit("playbackEvent", {
      type: "pause",
      timestamp: Date.now(),
    });

    this.emit("pauseRequest");
  }

  /**
   * Set the playback speed
   */
  public setPlaybackSpeed(speed: number): void {
    if (speed <= 0) {
      throw new Error("Playback speed must be positive");
    }

    log.debug(`Setting playback speed to ${speed}x`);

    this.#state.lastRangeMillis = undefined;
    this.#state.speed = speed;

    this.emit("playbackEvent", {
      type: "speed-change",
      timestamp: Date.now(),
      details: { speed },
    });

    this.emit("speedChange", { speed });
  }

  /**
   * Seek to the specified time
   */
  public seekPlayback(time: Time): void {
    if (!this.#state.start || !this.#state.end) {
      log.debug("Cannot seek before initialization is complete");
      return;
    }

    // Limit seek to within the valid range
    const targetTime = clampTime(time, this.#state.start, this.#state.end);

    // Check if we're already seeking to this time
    if (this.#state.seekTarget && compare(this.#state.seekTarget, targetTime) === 0) {
      log.debug("Ignoring seek, already seeking to this time");
      return;
    }

    // Check if we're already at this time
    if (this.#state.currentTime && compare(this.#state.currentTime, targetTime) === 0) {
      log.debug("Ignoring seek, already at this time");
      return;
    }

    log.debug(`Seeking to ${time.sec}.${time.nsec}`);

    this.#state.seekTarget = targetTime;
    this.#state.untilTime = undefined;
    this.#state.lastTickMillis = undefined;
    this.#state.lastRangeMillis = undefined;

    this.emit("playbackEvent", {
      type: "seek",
      timestamp: Date.now(),
      details: { time: targetTime },
    });

    this.emit("seekRequest", { time: targetTime });
  }

  /**
   * Calculate the appropriate read duration for the current tick
   */
  public calculateTickDuration(): number {
    const tickTime = performance.now();
    const durationMillis =
      this.#state.lastTickMillis != undefined && this.#state.lastTickMillis !== 0
        ? tickTime - this.#state.lastTickMillis
        : 20; // Default to 20ms if no previous tick

    this.#state.lastTickMillis = tickTime;

    // Read at most 300ms worth of messages to prevent overwhelming rendering
    // Smooth over the range that we request to avoid frame size spikes
    let rangeMillis = Math.min(
      durationMillis * this.#state.speed,
      ITERABLE_PLAYER_CONSTANTS.MAX_TICK_DURATION_MS,
    );

    if (this.#state.lastRangeMillis != undefined) {
      // Exponential smoothing: 90% old + 10% new
      rangeMillis = this.#state.lastRangeMillis * 0.9 + rangeMillis * 0.1;
    }

    this.#state.lastRangeMillis = rangeMillis;
    return rangeMillis;
  }

  /**
   * Check if playback should stop due to reaching untilTime
   */
  public shouldStopAtUntilTime(): boolean {
    return (
      this.#state.untilTime != undefined &&
      this.#state.currentTime != undefined &&
      compare(this.#state.currentTime, this.#state.untilTime) >= 0
    );
  }

  /**
   * Check if playback has reached the end of the data
   */
  public hasReachedEnd(): boolean {
    return (
      this.#state.currentTime != undefined &&
      this.#state.end != undefined &&
      compare(this.#state.currentTime, this.#state.end) >= 0
    );
  }

  /**
   * Reset playback timing state
   */
  public resetTimingState(): void {
    this.#state.lastTickMillis = undefined;
    this.#state.lastRangeMillis = undefined;
    this.#state.lastStamp = undefined;
  }

  /**
   * Get current playback information
   */
  public getPlaybackInfo() {
    return {
      isPlaying: this.#state.isPlaying,
      speed: this.#state.speed,
      currentTime: this.#state.currentTime,
      startTime: this.#state.start,
      endTime: this.#state.end,
      seekTarget: this.#state.seekTarget,
      untilTime: this.#state.untilTime,
    };
  }

  /**
   * Check if the player is currently seeking
   */
  public isSeeking(): boolean {
    return this.#state.seekTarget != undefined;
  }

  /**
   * Clear the seek target (typically called after seek completion)
   */
  public clearSeekTarget(): void {
    this.#state.seekTarget = undefined;
  }

  /**
   * Internal implementation for starting playback
   */
  #startPlayImpl(opt?: { untilTime: Time }): void {
    if (this.#state.isPlaying || this.#state.untilTime != undefined) {
      return;
    }

    if (!this.#state.start || !this.#state.end) {
      log.debug("Cannot start playback before initialization");
      return;
    }

    if (opt?.untilTime) {
      if (this.#state.currentTime && compare(opt.untilTime, this.#state.currentTime) <= 0) {
        throw new Error("Invariant: playUntil time must be after the current time");
      }
      this.#state.untilTime = clampTime(opt.untilTime, this.#state.start, this.#state.end);
    }

    log.debug(
      `Starting playback${opt?.untilTime ? ` until ${opt.untilTime.sec}.${opt.untilTime.nsec}` : ""}`,
    );

    this.#state.isPlaying = true;

    this.emit("playbackEvent", {
      type: "play",
      timestamp: Date.now(),
      details: opt?.untilTime ? { time: opt.untilTime } : undefined,
    });

    this.emit("playRequest", { untilTime: opt?.untilTime });
  }
}
