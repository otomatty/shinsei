/**
 * Validation utilities for URDF Preset Extension
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/converter/UrdfPresetConverter.ts (未作成)
 *   ├─ src/models/ModelManager.ts (未作成)
 *   └─ src/__tests__/validation.test.ts (未作成)
 *
 * Dependencies (依存先):
 *   ├─ src/converter/types.ts
 *   └─ src/models/presetModels.ts
 *
 * Related Files:
 *   ├─ Spec: ./validation.spec.md (未作成)
 *   └─ Tests: src/__tests__/validation.test.ts (未作成)
 */

import type { RobotConfig, PresetModel, ConverterError, PresetModelType } from "../converter/types";
import { isValidPresetId, getPresetModel } from "../models/presetModels";

/**
 * Validate RobotConfig message structure
 * @param data - Raw message data to validate
 * @returns Validation result with typed data or error
 */
export function validateRobotConfig(data: unknown): {
  valid: boolean;
  robotConfig?: RobotConfig;
  error?: ConverterError;
} {
  if (data == null || typeof data !== "object") {
    return {
      valid: false,
      error: {
        code: "INVALID_MESSAGE_TYPE",
        message: "Message data must be an object",
        details: { received: typeof data },
        timestamp: new Date(),
      },
    };
  }

  const msg = data as Record<string, unknown>;

  // Check required fields
  if (typeof msg.model_id !== "string") {
    return {
      valid: false,
      error: {
        code: "MISSING_MODEL_ID",
        message: "model_id field is required and must be a string",
        details: { received: typeof msg.model_id },
        timestamp: new Date(),
      },
    };
  }

  if (typeof msg.name !== "string" || msg.name.length === 0) {
    return {
      valid: false,
      error: {
        code: "MISSING_NAME",
        message: "name field is required and must be a non-empty string",
        details: { received: typeof msg.name },
        timestamp: new Date(),
      },
    };
  }

  // Validate preset ID if provided (and not empty)
  if (msg.model_id.length === 0 || !isValidPresetId(msg.model_id)) {
    return {
      valid: false,
      error: {
        code: "INVALID_PRESET_ID",
        message: `Preset ID '${msg.model_id}' is not valid or enabled`,
        details: { model_id: msg.model_id },
        timestamp: new Date(),
      },
    };
  }

  // Build validated RobotConfig
  const robotConfig: RobotConfig = {
    model_id: msg.model_id,
    name: msg.name,
    urdf_url: typeof msg.urdf_url === "string" ? msg.urdf_url : "",
    frame_id: typeof msg.frame_id === "string" ? msg.frame_id : undefined,
    parameters:
      typeof msg.parameters === "object" ? (msg.parameters as Record<string, unknown>) : undefined,
    source: msg.source === "preset" || msg.source === "custom" ? msg.source : "preset",
    timestamp: validateTimestamp(msg.timestamp),
  };

  // If urdf_url is missing, try to get from preset
  if (!robotConfig.urdf_url && isValidPresetId(robotConfig.model_id)) {
    const preset = getPresetModel(robotConfig.model_id);
    if (preset) {
      robotConfig.urdf_url = preset.url;
      robotConfig.frame_id = robotConfig.frame_id ?? preset.default_frame_id;
    }
  }

  return {
    valid: true,
    robotConfig,
  };
}

/**
 * Validate timestamp structure
 * @param timestamp - Timestamp data to validate
 * @returns Valid timestamp or undefined
 */
function validateTimestamp(timestamp: unknown): RobotConfig["timestamp"] {
  if (timestamp == null || typeof timestamp !== "object") {
    return undefined;
  }

  const ts = timestamp as Record<string, unknown>;
  if (typeof ts.sec === "number" && typeof ts.nanosec === "number") {
    return {
      sec: ts.sec,
      nanosec: ts.nanosec,
    };
  }

  return undefined;
}

/**
 * Validate URDF URL format
 * @param url - URL to validate
 * @returns true if URL is valid
 */
export function isValidUrdfUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    // Check if it's a valid file path pattern
    return /^[./].*\.urdf$/i.test(url) || /^\/.*\.urdf$/i.test(url);
  }
}

/**
 * Validate preset model structure
 * @param preset - Preset model to validate
 * @returns Validation result
 */
export function validatePresetModel(preset: unknown): {
  valid: boolean;
  presetModel?: PresetModel;
  error?: ConverterError;
} {
  if (preset == null || typeof preset !== "object") {
    return {
      valid: false,
      error: {
        code: "INVALID_PRESET_TYPE",
        message: "Preset must be an object",
        details: { received: typeof preset },
        timestamp: new Date(),
      },
    };
  }

  const p = preset as Record<string, unknown>;

  // Check required fields
  const requiredFields = ["id", "name", "description", "urdf_url", "category", "default_frame_id"];
  for (const field of requiredFields) {
    if (typeof p[field] !== "string" || (p[field] as string).length === 0) {
      return {
        valid: false,
        error: {
          code: "MISSING_PRESET_FIELD",
          message: `Preset field '${field}' is required and must be a non-empty string`,
          details: { field, received: typeof p[field] },
          timestamp: new Date(),
        },
      };
    }
  }

  // Validate category
  const validCategories = ["manipulator", "mobile", "humanoid", "other"];
  if (!validCategories.includes(p.category as string)) {
    return {
      valid: false,
      error: {
        code: "INVALID_CATEGORY",
        message: `Category must be one of: ${validCategories.join(", ")}`,
        details: { received: p.category },
        timestamp: new Date(),
      },
    };
  }

  // Validate URDF URL
  if (!isValidUrdfUrl(p.urdf_url as string)) {
    return {
      valid: false,
      error: {
        code: "INVALID_URDF_URL",
        message: "URDF URL is not valid",
        details: { urdf_url: p.urdf_url },
        timestamp: new Date(),
      },
    };
  }

  const presetModel: PresetModel = {
    id: p.id as PresetModelType,
    name: p.name as string,
    description: p.description as string,
    url: p.urdf_url as string,
    category: p.category as PresetModel["category"],
    default_frame_id: p.default_frame_id as string,
    enabled: typeof p.enabled === "boolean" ? p.enabled : true,
    metadata: typeof p.metadata === "object" ? (p.metadata as PresetModel["metadata"]) : undefined,
  };

  return {
    valid: true,
    presetModel,
  };
}

/**
 * Create standardized error
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns ConverterError object
 */
export function createError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConverterError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
  };
}

/**
 * Check if a string is a valid frame ID
 * @param frameId - Frame ID to validate
 * @returns true if frame ID is valid
 */
export function isValidFrameId(frameId: string): boolean {
  if (!frameId || typeof frameId !== "string") {
    return false;
  }

  // Basic frame ID validation (ROS naming conventions)
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(frameId);
}
