// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PlayerPresence } from "@lichtblick/suite-base/players/types";

import { IterablePlayerStateMachine, StateHandler } from "./IterablePlayerStateMachine";
import {
  IterablePlayerInternalState,
  IterablePlayerState,
  EMPTY_ARRAY,
} from "./IterablePlayerTypes";

/**
 * Create a minimal mock state for testing
 */
function createMockState(): IterablePlayerInternalState {
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
    capabilities: ["setSpeed", "playbackControl"],
    metadata: Object.freeze([]),
    enablePreload: true,

    // Identifiers
    id: "test-id",
    name: "test-player",
    urlParams: {},
    sourceId: "test-source",
  };
}

describe("IterablePlayerStateMachine", () => {
  let stateMachine: IterablePlayerStateMachine;
  let mockState: IterablePlayerInternalState;
  let handlerCallLog: Array<{ state: IterablePlayerState; timestamp: number }>;

  beforeEach(() => {
    mockState = createMockState();
    stateMachine = new IterablePlayerStateMachine(mockState);
    handlerCallLog = [];
  });

  afterEach(() => {
    stateMachine.removeAllListeners();
  });

  /**
   * Create a mock state handler that logs calls
   */
  function createMockHandler(state: IterablePlayerState, delay = 0): StateHandler {
    return async (internalState, abort) => {
      handlerCallLog.push({ state, timestamp: Date.now() });

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Check for abort signal
      if (abort?.signal.aborted) {
        throw new Error("Aborted");
      }
    };
  }

  describe("basic functionality", () => {
    it("should initialize with correct state", () => {
      expect(stateMachine.getCurrentState()).toBe("preinit");
      expect(stateMachine.getInternalState()).toBe(mockState);
    });

    it("should register and call state handlers", async () => {
      const handler = createMockHandler("initialize");
      stateMachine.registerStateHandler("initialize", handler);

      stateMachine.setState("initialize");

      // Wait for async state execution
      await new Promise(setImmediate);

      expect(handlerCallLog).toHaveLength(1);
      expect(handlerCallLog[0]?.state).toBe("initialize");
      expect(stateMachine.getCurrentState()).toBe("initialize");
    });

    it("should emit state change events", async () => {
      const stateChangeHandler = jest.fn();
      stateMachine.on("stateChange", stateChangeHandler);

      const handler = createMockHandler("initialize");
      stateMachine.registerStateHandler("initialize", handler);

      stateMachine.setState("initialize");
      await new Promise(setImmediate);

      expect(stateChangeHandler).toHaveBeenCalledWith({
        from: "preinit",
        to: "initialize",
        timestamp: expect.any(Number),
      });
    });

    it("should update internal state", () => {
      stateMachine.updateState({ isPlaying: true, speed: 2.0 });

      const state = stateMachine.getInternalState();
      expect(state.isPlaying).toBe(true);
      expect(state.speed).toBe(2.0);
    });
  });

  describe("state transitions", () => {
    it("should validate state transitions", () => {
      expect(stateMachine.isValidTransition("preinit", "initialize")).toBe(true);
      expect(stateMachine.isValidTransition("preinit", "play")).toBe(false);
      expect(stateMachine.isValidTransition("idle", "play")).toBe(true);
      expect(stateMachine.isValidTransition("play", "idle")).toBe(true);
    });

    it("should get possible next states", () => {
      const nextStates = stateMachine.getPossibleNextStates();
      expect(nextStates).toContain("initialize");
      expect(nextStates).toContain("close");
    });

    it("should handle sequential state transitions", async () => {
      const states: IterablePlayerState[] = ["initialize", "start-play", "idle"];

      states.forEach((state) => {
        stateMachine.registerStateHandler(state, createMockHandler(state));
      });

      // Trigger sequential transitions
      stateMachine.setState("initialize");
      await new Promise(setImmediate);

      stateMachine.setState("start-play");
      await new Promise(setImmediate);

      stateMachine.setState("idle");
      await new Promise(setImmediate);

      expect(handlerCallLog).toHaveLength(3);
      expect(handlerCallLog.map((log) => log.state)).toEqual(states);
      expect(stateMachine.getCurrentState()).toBe("idle");
    });

    it("should not override close state", async () => {
      stateMachine.registerStateHandler("close", createMockHandler("close"));
      stateMachine.registerStateHandler("play", createMockHandler("play"));

      stateMachine.setState("close");
      stateMachine.setState("play"); // This should be ignored

      await new Promise(setImmediate);

      expect(handlerCallLog).toHaveLength(1);
      expect(handlerCallLog[0]?.state).toBe("close");
      expect(stateMachine.getCurrentState()).toBe("close");
    });
  });

  describe("error handling", () => {
    it("should emit error events when handler throws", async () => {
      const errorHandler = jest.fn();
      stateMachine.on("error", errorHandler);

      const faultyHandler: StateHandler = async () => {
        throw new Error("Test error");
      };

      stateMachine.registerStateHandler("initialize", faultyHandler);
      stateMachine.setState("initialize");

      await new Promise(setImmediate);

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle missing state handler", async () => {
      const errorHandler = jest.fn();
      stateMachine.on("error", errorHandler);

      stateMachine.setState("initialize"); // No handler registered

      await new Promise(setImmediate);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No handler registered for state: initialize",
        }),
      );
    });
  });

  describe("abort functionality", () => {
    it("should abort current state when new state is set", async () => {
      let abortCallCount = 0;

      const slowHandler: StateHandler = async (state, abort) => {
        abort?.signal.addEventListener("abort", () => {
          abortCallCount++;
        });

        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (abort?.signal.aborted) {
          throw new Error("Aborted");
        }
      };

      stateMachine.registerStateHandler("initialize", slowHandler);
      stateMachine.registerStateHandler("idle", createMockHandler("idle"));

      stateMachine.setState("initialize");

      // Immediately set another state to trigger abort
      setTimeout(() => {
        stateMachine.setState("idle");
      }, 10);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(abortCallCount).toBe(1);
    });

    it("should handle abort in state handlers gracefully", async () => {
      const abortingHandler: StateHandler = async (state, abort) => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));

        if (abort?.signal.aborted) {
          throw new Error("Aborted");
        }
      };

      stateMachine.registerStateHandler("initialize", abortingHandler);
      stateMachine.registerStateHandler("idle", createMockHandler("idle"));

      stateMachine.setState("initialize");
      stateMachine.setState("idle"); // Should abort initialize

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should end up in idle state despite abort
      expect(stateMachine.getCurrentState()).toBe("idle");
    });
  });

  describe("terminal state", () => {
    it("should recognize terminal state", () => {
      expect(stateMachine.isTerminal()).toBe(false);

      stateMachine.updateState({ state: "close" });
      expect(stateMachine.isTerminal()).toBe(true);
    });

    it("should not allow transitions from terminal state", () => {
      expect(stateMachine.getPossibleNextStates()).not.toContain("close");

      stateMachine.updateState({ state: "close" });
      expect(stateMachine.getPossibleNextStates()).toHaveLength(0);
    });
  });

  describe("concurrent state management", () => {
    it("should only run one state at a time", async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const concurrentHandler: StateHandler = async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        await new Promise((resolve) => setTimeout(resolve, 20));

        concurrentCount--;
      };

      stateMachine.registerStateHandler("initialize", concurrentHandler);
      stateMachine.registerStateHandler("start-play", concurrentHandler);
      stateMachine.registerStateHandler("idle", concurrentHandler);

      // Rapidly trigger multiple state changes
      stateMachine.setState("initialize");
      stateMachine.setState("start-play");
      stateMachine.setState("idle");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(maxConcurrent).toBe(1);
    });
  });
});

/**
 * Integration test for realistic state flow
 */
describe("IterablePlayerStateMachine Integration", () => {
  it("should handle typical player lifecycle", async () => {
    const mockState = createMockState();
    const stateMachine = new IterablePlayerStateMachine(mockState);
    const stateChanges: string[] = [];

    // Track state changes
    stateMachine.on("stateChange", (event) => {
      stateChanges.push(`${event.from}→${event.to}`);
    });

    // Register realistic handlers
    const handlers: Record<IterablePlayerState, StateHandler> = {
      preinit: async () => {
        // Initial state
      },
      initialize: async (state) => {
        state.start = { sec: 0, nsec: 0 };
        state.end = { sec: 10, nsec: 0 };
        state.providerTopics = [{ name: "/test", schemaName: "TestMsg" }];
      },
      "start-play": async (state) => {
        state.currentTime = state.start;
        state.messages = [];
      },
      idle: async (state) => {
        state.isPlaying = false;
        state.presence = PlayerPresence.PRESENT;
      },
      play: async (state) => {
        state.isPlaying = true;
        // Simulate reaching end
        setTimeout(() => {
          if (state.state === "play") {
            stateMachine.setState("idle");
          }
        }, 10);
      },
      "seek-backfill": async (state) => {
        if (state.seekTarget) {
          state.currentTime = state.seekTarget;
          state.seekTarget = undefined;
        }
      },
      "reset-playback-iterator": async () => {
        // Reset iterator
      },
      close: async (state) => {
        state.isPlaying = false;
      },
    };

    Object.entries(handlers).forEach(([state, handler]) => {
      stateMachine.registerStateHandler(state as IterablePlayerState, handler);
    });

    // Execute typical lifecycle
    stateMachine.setState("initialize");
    await new Promise(setImmediate);

    stateMachine.setState("start-play");
    await new Promise(setImmediate);

    stateMachine.setState("idle");
    await new Promise(setImmediate);

    stateMachine.setState("play");
    await new Promise((resolve) => setTimeout(resolve, 20));

    stateMachine.setState("close");
    await new Promise(setImmediate);

    expect(stateChanges).toEqual([
      "preinit→initialize",
      "initialize→start-play",
      "start-play→idle",
      "idle→play",
      "play→idle",
      "idle→close",
    ]);

    expect(stateMachine.getCurrentState()).toBe("close");
    expect(stateMachine.isTerminal()).toBe(true);
  });
});
