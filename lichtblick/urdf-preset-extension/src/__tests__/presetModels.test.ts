/**
 * Preset Models Test Suite
 *
 * Tests for preset model definitions and utilities
 */

import type { PresetModelType } from "../converter/types";
import { PRESET_MODELS, isValidPresetId } from "../models/presetModels";

describe("Preset Models", () => {
  describe("PRESET_MODELS", () => {
    test("should contain all required preset models", () => {
      expect(PRESET_MODELS).toHaveProperty("robot_a");
      expect(PRESET_MODELS).toHaveProperty("robot_b");
      expect(PRESET_MODELS).toHaveProperty("robot_c");
      expect(PRESET_MODELS).toHaveProperty("default");
    });

    test("should have valid model definitions", () => {
      const modelKeys = Object.keys(PRESET_MODELS) as PresetModelType[];

      for (const key of modelKeys) {
        const model = PRESET_MODELS[key];

        expect(model.id).toBe(key);
        expect(model.name).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(model.url).toBeTruthy();
        expect(model.category).toBeTruthy();
        expect(model.default_frame_id).toBeTruthy();
        expect(typeof model.enabled).toBe("boolean");

        // Validate URL format
        expect(model.url).toMatch(/^https?:\/\/.+/);
      }
    });

    test("should have consistent metadata structure", () => {
      const modelKeys = Object.keys(PRESET_MODELS) as PresetModelType[];

      for (const key of modelKeys) {
        const model = PRESET_MODELS[key];

        if (model.metadata) {
          expect(typeof model.metadata.author).toBe("string");
          expect(typeof model.metadata.version).toBe("string");
          expect(typeof model.metadata.license).toBe("string");
          expect(Array.isArray(model.metadata.tags)).toBe(true);
        }
      }
    });

    test("robot_a should be industrial manipulator", () => {
      const robotA = PRESET_MODELS.robot_a;

      expect(robotA.name).toContain("Industrial");
      expect(robotA.category).toBe("manipulator");
      expect(robotA.enabled).toBe(true);
      expect(robotA.metadata?.tags).toContain("industrial");
    });

    test("robot_b should be mobile platform", () => {
      const robotB = PRESET_MODELS.robot_b;

      expect(robotB.name).toContain("Mobile");
      expect(robotB.category).toBe("mobile");
      expect(robotB.enabled).toBe(true);
      expect(robotB.metadata?.tags).toContain("mobile");
    });

    test("robot_c should be humanoid", () => {
      const robotC = PRESET_MODELS.robot_c;

      expect(robotC.name).toContain("Humanoid");
      expect(robotC.category).toBe("humanoid");
      expect(robotC.enabled).toBe(true);
      expect(robotC.metadata?.tags).toContain("humanoid");
    });

    test("default should be fallback model", () => {
      const defaultModel = PRESET_MODELS.default;

      expect(defaultModel.name).toContain("Default");
      expect(defaultModel.enabled).toBe(true);
      expect(defaultModel.category).toBe("other");
    });
  });

  describe("isValidPresetId", () => {
    test("should return true for valid preset IDs", () => {
      expect(isValidPresetId("robot_a")).toBe(true);
      expect(isValidPresetId("robot_b")).toBe(true);
      expect(isValidPresetId("robot_c")).toBe(true);
      expect(isValidPresetId("default")).toBe(true);
    });

    test("should return false for invalid preset IDs", () => {
      expect(isValidPresetId("robot_d")).toBe(false);
      expect(isValidPresetId("invalid")).toBe(false);
      expect(isValidPresetId("")).toBe(false);
    });

    test("should handle null and undefined", () => {
      expect(isValidPresetId(null as unknown as string)).toBe(false);
      expect(isValidPresetId(undefined as unknown as string)).toBe(false);
    });

    test("should handle non-string values", () => {
      expect(isValidPresetId(123 as unknown as string)).toBe(false);
      expect(isValidPresetId({} as unknown as string)).toBe(false);
      expect(isValidPresetId([] as unknown as string)).toBe(false);
    });

    test("should be case sensitive", () => {
      expect(isValidPresetId("ROBOT_A")).toBe(false);
      expect(isValidPresetId("Robot_A")).toBe(false);
      expect(isValidPresetId("robot_A")).toBe(false);
    });
  });

  describe("Categories", () => {
    test("should have appropriate category distribution", () => {
      const categories = Object.values(PRESET_MODELS).map((model) => model.category);

      expect(categories).toContain("manipulator");
      expect(categories).toContain("mobile");
      expect(categories).toContain("humanoid");
      expect(categories).toContain("other");
    });

    test("should have unique categories for non-default models", () => {
      const nonDefaultModels = Object.values(PRESET_MODELS).filter(
        (model) => model.id !== "default",
      );

      const categories = nonDefaultModels.map((model) => model.category);
      const uniqueCategories = new Set(categories);

      expect(uniqueCategories.size).toBe(categories.length);
    });
  });

  describe("URLs", () => {
    test("should use consistent base URL", () => {
      const urls = Object.values(PRESET_MODELS).map((model) => model.url);
      const baseUrl = "https://raw.githubusercontent.com/lichtblick/urdf-models/main";

      for (const url of urls) {
        expect(url).toMatch(new RegExp(`^${baseUrl}`));
      }
    });

    test("should have .urdf file extension", () => {
      const urls = Object.values(PRESET_MODELS).map((model) => model.url);

      for (const url of urls) {
        expect(url).toMatch(/\.urdf$/);
      }
    });
  });
});
