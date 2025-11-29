import type { PresetModel, PresetModelType } from "../converter/types";

/**
 * Preset URDF Models
 * These models can represent robots, vehicles, or any other 3D objects with URDF format
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/converter/UrdfPresetConverter.ts
 *   ├─ src/models/ModelManager.ts
 *   └─ src/utils/validation.ts
 *
 * Dependencies (依存先):
 *   └─ src/converter/types.ts (PresetModel interface)
 *
 * Related Files:
 *   ├─ Spec: ./presetModels.spec.md (未作成)
 *   ├─ Tests: src/__tests__/presetModels.test.ts (未作成)
 *   └─ Assets: assets/models/ (URDF files)
 */

/**
 * Default URDF model URLs
 * These can be replaced with local assets or CDN URLs
 */
const URDF_BASE_URL = "https://raw.githubusercontent.com/lichtblick/urdf-models/main";

/**
 * Preset models available for automatic addition
 * Includes robots, vehicles, and other 3D objects with URDF format
 */
export const PRESET_MODELS: Record<PresetModelType, PresetModel> = {
  robot_a: {
    id: "robot_a",
    name: "Robot A - Industrial Arm",
    description: "6-DOF industrial manipulator arm for assembly tasks",
    url: `${URDF_BASE_URL}/industrial/robot_a/robot.urdf`,
    category: "manipulator",
    default_frame_id: "robot_a_base_link",
    enabled: true,
    metadata: {
      author: "Lichtblick",
      version: "1.0.0",
      license: "MIT",
      tags: ["industrial", "6dof", "manipulator"],
    },
  },
  robot_b: {
    id: "robot_b",
    name: "Robot B - Mobile Platform",
    description: "Differential drive mobile robot platform with sensors",
    url: `${URDF_BASE_URL}/mobile/robot_b/robot.urdf`,
    category: "mobile",
    default_frame_id: "robot_b_base_link",
    enabled: true,
    metadata: {
      author: "Lichtblick",
      version: "1.0.0",
      license: "MIT",
      tags: ["mobile", "differential", "sensors"],
    },
  },
  robot_c: {
    id: "robot_c",
    name: "Robot C - Humanoid",
    description: "Bipedal humanoid robot for research applications",
    url: `${URDF_BASE_URL}/humanoid/robot_c/robot.urdf`,
    category: "humanoid",
    default_frame_id: "robot_c_base_link",
    enabled: true,
    metadata: {
      author: "Lichtblick",
      version: "1.0.0",
      license: "MIT",
      tags: ["humanoid", "bipedal", "research"],
    },
  },
  default: {
    id: "default",
    name: "Default Robot",
    description: "Simple default robot model for testing",
    url: `${URDF_BASE_URL}/default/default_robot.urdf`,
    category: "other",
    default_frame_id: "base_link",
    enabled: true,
    metadata: {
      author: "Lichtblick",
      version: "1.0.0",
      license: "MIT",
      tags: ["default", "simple", "testing"],
    },
  },
};

/**
 * Get preset model by ID
 * @param presetId - The preset ID to lookup
 * @returns PresetModel if found, undefined otherwise
 */
export function getPresetModel(presetId: PresetModelType): PresetModel | undefined {
  return PRESET_MODELS[presetId];
}

/**
 * Get all enabled preset models
 * @returns Array of enabled PresetModel objects
 */
export function getEnabledPresets(): PresetModel[] {
  return Object.values(PRESET_MODELS).filter((model) => model.enabled);
}

/**
 * Get presets by category
 * @param category - The category to filter by
 * @returns Array of PresetModel objects in the specified category
 */
export function getPresetsByCategory(category: PresetModel["category"]): PresetModel[] {
  return Object.values(PRESET_MODELS).filter(
    (model) => model.category === category && model.enabled,
  );
}

/**
 * Validate preset ID
 * @param presetId - The preset ID to validate
 * @returns true if preset ID is valid and enabled
 */
export function isValidPresetId(presetId: string): presetId is PresetModelType {
  return presetId in PRESET_MODELS && PRESET_MODELS[presetId as PresetModelType].enabled;
}

/**
 * Get default preset ID
 * @returns The default preset ID
 */
export function getDefaultPresetId(): PresetModelType {
  return "default";
}

/**
 * Default converter configuration using presets
 */
export const DEFAULT_CONVERTER_CONFIG = {
  enabled: true,
  default_preset_id: getDefaultPresetId(),
  enable_caching: true,
  cache_duration_ms: 5 * 60 * 1000, // 5 minutes
  log_level: "info" as const,
  presets: Object.values(PRESET_MODELS),
};
