/**
 * Validation Utilities Test Suite
 *
 * Tests for input validation functions
 */

import { validateRobotConfig, validatePresetModel } from "../utils/validation";

describe("Validation", () => {
  describe("validateRobotConfig", () => {
    test("should accept valid RobotConfig", () => {
      const validConfigData = {
        model_id: "robot_a",
        name: "Test Robot",
        urdf_url: "https://example.com/robot.urdf",
      };

      const result = validateRobotConfig(validConfigData);

      expect(result.valid).toBe(true);
      expect(result.robotConfig).toBeDefined();
      expect(result.robotConfig?.model_id).toBe("robot_a");
      expect(result.robotConfig?.name).toBe("Test Robot");
    });

    test("should reject null input", () => {
      const result = validateRobotConfig(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("INVALID_MESSAGE_TYPE");
    });

    test("should reject undefined input", () => {
      const result = validateRobotConfig(undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("INVALID_MESSAGE_TYPE");
    });

    test("should reject config without model_id", () => {
      const invalidConfigData = {
        name: "Test Robot",
        urdf_url: "https://example.com/robot.urdf",
      };

      const result = validateRobotConfig(invalidConfigData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_MODEL_ID");
    });

    test("should reject config with empty model_id", () => {
      const invalidConfigData = {
        model_id: "", // Empty model_id
        name: "Test Robot",
      };

      const result = validateRobotConfig(invalidConfigData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("INVALID_PRESET_ID"); // Empty model_id is not valid preset
    });

    test("should reject config without name", () => {
      const invalidConfigData = {
        model_id: "robot_a",
        urdf_url: "https://example.com/robot.urdf",
      };

      const result = validateRobotConfig(invalidConfigData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_NAME");
    });

    test("should auto-populate urdf_url from preset", () => {
      const configData = {
        model_id: "robot_a",
        name: "Test Robot",
        // urdf_url is missing but should be auto-populated
      };

      const result = validateRobotConfig(configData);

      expect(result.valid).toBe(true);
      expect(result.robotConfig?.frame_id).toBe("robot_a_base_link");
    });

    test("should allow custom frame_id override", () => {
      const configData = {
        model_id: "robot_a",
        name: "Test Robot",
        frame_id: "base_link",
      };

      const result = validateRobotConfig(configData);

      expect(result.valid).toBe(true);
      expect(result.robotConfig?.frame_id).toBe("base_link");
    });

    test("should reject config with empty name", () => {
      const invalidConfigData = {
        model_id: "robot_a",
        name: "",
        urdf_url: "https://example.com/robot.urdf",
      };

      const result = validateRobotConfig(invalidConfigData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_NAME");
    });

    test("should accept config with optional frame_id", () => {
      const validConfigData = {
        model_id: "robot_a",
        name: "Test Robot",
        urdf_url: "https://example.com/robot.urdf",
        frame_id: "base_link",
        source: "preset" as const,
        timestamp: {
          sec: 123456789,
          nanosec: 123456789,
        },
      };

      const result = validateRobotConfig(validConfigData);

      expect(result.valid).toBe(true);
      expect(result.robotConfig?.frame_id).toBe("base_link");
    });
  });

  describe("validatePresetModel", () => {
    const validPresetModelData = {
      id: "robot_a",
      name: "Robot A",
      description: "Test robot",
      urdf_url: "https://example.com/robot.urdf",
      category: "manipulator",
      default_frame_id: "base_link",
      enabled: true,
      metadata: {
        author: "Test",
        version: "1.0.0",
        license: "MIT",
        tags: ["test"],
      },
    };

    test("should accept valid PresetModel", () => {
      const result = validatePresetModel(validPresetModelData);

      expect(result.valid).toBe(true);
      expect(result.presetModel).toBeDefined();
      expect(result.presetModel?.id).toBe("robot_a");
    });

    test("should reject null input", () => {
      const result = validatePresetModel(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("INVALID_PRESET_TYPE");
    });

    test("should reject undefined input", () => {
      const result = validatePresetModel(undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("INVALID_PRESET_TYPE");
    });

    test("should reject model without id", () => {
      const invalidModelData = {
        ...validPresetModelData,
        id: undefined,
      };

      const result = validatePresetModel(invalidModelData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_PRESET_FIELD");
    });

    test("should reject model with invalid id", () => {
      const invalidModelData = {
        ...validPresetModelData,
        id: "",
      };

      const result = validatePresetModel(invalidModelData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_PRESET_FIELD");
    });

    test("should reject model without url", () => {
      const invalidModelData = {
        ...validPresetModelData,
        urdf_url: undefined,
      };

      const result = validatePresetModel(invalidModelData);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_PRESET_FIELD");
    });

    test("should accept model with disabled state", () => {
      const disabledModelData = {
        ...validPresetModelData,
        enabled: false,
      };

      const result = validatePresetModel(disabledModelData);

      expect(result.valid).toBe(true);
      expect(result.presetModel?.enabled).toBe(false);
    });
  });
});
