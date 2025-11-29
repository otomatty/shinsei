// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { EventEmitter } from "events";

import Log from "@lichtblick/log";

import {
  IterablePlayerState,
  IterablePlayerInternalState,
  StateChangeEvent,
} from "./IterablePlayerTypes";

const log = Log.getLogger(__filename);

/**
 * Events emitted by the state machine
 */
interface StateMachineEvents {
  stateChange: StateChangeEvent;
  error: Error;
}

/**
 * Interface for state handlers
 */
export type StateHandler = (
  state: IterablePlayerInternalState,
  abort?: AbortController,
) => Promise<void>;

/**
 * State machine implementation for IterablePlayer.
 * Manages state transitions and ensures only one state runs at a time.
 */
export class IterablePlayerStateMachine extends EventEmitter<StateMachineEvents> {
  #internalState: IterablePlayerInternalState;
  #stateHandlers = new Map<IterablePlayerState, StateHandler>();
  #abort?: AbortController;

  constructor(initialState: IterablePlayerInternalState) {
    super();
    this.#internalState = initialState;
  }

  /**
   * Register a handler for a specific state
   */
  public registerStateHandler(state: IterablePlayerState, handler: StateHandler): void {
    this.#stateHandlers.set(state, handler);
  }

  /**
   * Get the current state
   */
  public getCurrentState(): IterablePlayerState {
    return this.#internalState.state;
  }

  /**
   * Get the internal state (read-only access)
   */
  public getInternalState(): Readonly<IterablePlayerInternalState> {
    return this.#internalState;
  }

  /**
   * Update internal state properties
   */
  public updateState(updates: Partial<IterablePlayerInternalState>): void {
    Object.assign(this.#internalState, updates);
  }

  /**
   * Request a state transition to the specified state
   */
  public setState(newState: IterablePlayerState): void {
    // Nothing should override closing the player
    if (this.#internalState.nextState === "close") {
      return;
    }

    log.debug(`Set next state: ${newState}`);
    this.#internalState.nextState = newState;
    this.#abort?.abort();
    this.#abort = undefined;
    void this.#runState();
  }

  /**
   * Run the state machine until no more state transitions are requested.
   * Ensures that only one state is running at a time.
   */
  async #runState(): Promise<void> {
    if (this.#internalState.runningState) {
      return;
    }

    this.#internalState.runningState = true;
    try {
      while (this.#internalState.nextState) {
        const fromState = this.#internalState.state;
        const toState = this.#internalState.nextState;

        this.#internalState.state = toState;
        this.#internalState.nextState = undefined;

        log.debug(`State transition: ${fromState} → ${toState}`);

        // Emit state change event
        this.emit("stateChange", {
          from: fromState,
          to: toState,
          timestamp: Date.now(),
        });

        // Get and execute the state handler
        const handler = this.#stateHandlers.get(toState);
        if (!handler) {
          throw new Error(`No handler registered for state: ${toState}`);
        }

        // Create abort controller for this state
        this.#abort = new AbortController();

        try {
          await handler(this.#internalState, this.#abort);
        } catch (error) {
          // If the error is due to abort, we check if a new state is pending
          if (
            error instanceof Error &&
            error.name === "AbortError" &&
            this.#internalState.nextState
          ) {
            log.debug(
              `State ${toState} was aborted for transition to ${this.#internalState.nextState}`,
            );
            continue;
          }
          throw error;
        }

        log.debug(`State ${toState} completed`);
      }
    } catch (error) {
      const err = error as Error;
      log.error(`State machine error in state ${this.#internalState.state}:`, err);
      this.emit("error", err);
    } finally {
      this.#internalState.runningState = false;
      this.#abort = undefined;
    }
  }

  /**
   * Abort the current state execution
   */
  public abortCurrentState(): void {
    this.#abort?.abort();
  }

  /**
   * Check if a state transition is valid
   */
  public isValidTransition(from: IterablePlayerState, to: IterablePlayerState): boolean {
    // Define valid state transitions
    const validTransitions: Record<IterablePlayerState, IterablePlayerState[]> = {
      preinit: ["initialize", "close"],
      initialize: ["start-play", "close"],
      "start-play": ["idle", "seek-backfill", "close"],
      idle: ["play", "seek-backfill", "close"],
      play: ["idle", "seek-backfill", "reset-playback-iterator", "close"],
      "seek-backfill": ["idle", "play", "seek-backfill", "close"],
      "reset-playback-iterator": ["idle", "play", "close"],
      close: [], // Terminal state
    };

    return validTransitions[from].includes(to) ?? false;
  }

  /**
   * Get all possible next states from the current state
   */
  public getPossibleNextStates(): IterablePlayerState[] {
    const validTransitions: Record<IterablePlayerState, IterablePlayerState[]> = {
      preinit: ["initialize", "close"],
      initialize: ["start-play", "close"],
      "start-play": ["idle", "seek-backfill", "close"],
      idle: ["play", "seek-backfill", "close"],
      play: ["idle", "seek-backfill", "reset-playback-iterator", "close"],
      "seek-backfill": ["idle", "play", "seek-backfill", "close"],
      "reset-playback-iterator": ["idle", "play", "close"],
      close: [],
    };

    return validTransitions[this.#internalState.state] ?? [];
  }

  /**
   * Check if the state machine is in a terminal state
   */
  public isTerminal(): boolean {
    return this.#internalState.state === "close";
  }

  /**
   * Force set internal state (for testing purposes)
   */
  public forceSetInternalState(state: IterablePlayerInternalState): void {
    this.#internalState = state;
  }
}
