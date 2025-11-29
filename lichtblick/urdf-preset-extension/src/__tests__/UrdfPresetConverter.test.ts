/**
 * UrdfPresetConverter Test Suite
 *
 * Tests for the main converter class
 */

import { UrdfPresetConverter } from "../converter/UrdfPresetConverter";
import type { RobotConfig } from "../converter/types";

// Mock console methods
jest.spyOn(console, "log").mockImplementation();
jest.spyOn(console, "warn").mockImplementation();
jest.spyOn(console, "error").mockImplementation();

describe("UrdfPresetConverter", () => {
  let converter: UrdfPresetConverter;

  beforeEach(() => {
    jest.clearAllMocks();
    converter = new UrdfPresetConverter();
  });

  describe("Constructor", () => {
    test("should create converter instance", () => {
      expect(converter).toBeInstanceOf(UrdfPresetConverter);
    });

    test("should initialize with default statistics", () => {
      const stats = converter.getStatistics();

      expect(stats.messagesProcessed).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe("convert", () => {
    const validConfig: RobotConfig = {
      model_id: "robot_a",
      name: "Test Robot",
      urdf_url: "https://example.com/robot.urdf",
    };

    test("should convert valid RobotConfig", async () => {
      const result = await converter.convert(validConfig);

      expect(result).toHaveProperty("data");
      expect(typeof result.data).toBe("string");

      // Verify statistics were updated
      const stats = converter.getStatistics();
      expect(stats.messagesProcessed).toBe(1);
    });

    test("should handle invalid model_id gracefully", async () => {
      const invalidConfig = {
        ...validConfig,
        model_id: "invalid_robot" as "robot_a",
      };

      // Should still work but use fallback
      const result = await converter.convert(invalidConfig);
      expect(result).toHaveProperty("data");
    });

    test("should apply frame transformations when frame_id is provided", async () => {
      const configWithFrame: RobotConfig = {
        ...validConfig,
        frame_id: "custom_frame",
      };

      const result = await converter.convert(configWithFrame);

      expect(result.data).toContain("custom_frame");
      expect(result).toHaveProperty("data");
    });

    test("should handle conversion with timestamp", async () => {
      const configWithTimestamp: RobotConfig = {
        ...validConfig,
        timestamp: {
          sec: 1234567890,
          nanosec: 123456789,
        },
      };

      const result = await converter.convert(configWithTimestamp);

      expect(result).toHaveProperty("data");
      expect(typeof result.data).toBe("string");
    });
  });

  describe("getStatistics", () => {
    test("should return current statistics", () => {
      const stats = converter.getStatistics();

      expect(stats).toHaveProperty("messagesProcessed");
      expect(stats).toHaveProperty("cacheHits");
      expect(stats).toHaveProperty("cacheMisses");
      expect(stats).toHaveProperty("errors");
      expect(stats).toHaveProperty("cache");
    });

    test("should update statistics after conversions", async () => {
      const config: RobotConfig = {
        model_id: "robot_a",
        name: "Test Robot",
        urdf_url: "https://example.com/robot.urdf",
      };

      // Perform multiple conversions
      await converter.convert(config);
      await converter.convert(config);

      const stats = converter.getStatistics();
      expect(stats.messagesProcessed).toBe(2);
    });
  });

  describe("Performance", () => {
    test("should complete conversion within reasonable time", async () => {
      const config: RobotConfig = {
        model_id: "robot_a",
        name: "Test Robot",
        urdf_url: "https://example.com/robot.urdf",
      };

      const start = performance.now();
      await converter.convert(config);
      const duration = performance.now() - start;

      // Should complete within 1 second (generous for testing)
      expect(duration).toBeLessThan(1000);
    });
  });
});
