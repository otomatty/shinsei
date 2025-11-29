// Type definitions for URDF Preset Extension
// Based on implementation plan and 3D panel requirements

/**
 * Model Configuration Schema
 * This schema defines the custom message type that will be converted to std_msgs/String
 * Can represent robots, vehicles, or any other URDF-compatible 3D models
 */
export interface RobotConfig {
  /** Model identifier (preset_id) - renamed from robot_id for broader model support */
  model_id: string;

  /** Model display name */
  name: string;

  /** URDF model URL (will be loaded from presets) */
  urdf_url: string;

  /** Optional: Model frame ID for TF */
  frame_id?: string;

  /** Optional: Configuration parameters */
  parameters?: Record<string, unknown>;

  /** Optional: Model description source */
  source?: "preset" | "custom";

  /** Timestamp when config was created/updated */
  timestamp?: {
    sec: number;
    nanosec: number;
  };
}

/**
 * Preset Model Type Identifiers
 * These can represent robots, vehicles, or any other 3D models with URDF format
 */
export type PresetModelType = "robot_a" | "robot_b" | "robot_c" | "default";

/**
 * Preset URDF Model Definition
 * Defines available preset models (robots, vehicles, or other 3D objects)
 */
export interface PresetModel {
  /** Unique identifier for the preset */
  id: PresetModelType;

  /** Display name for the model */
  name: string;

  /** Description of the model */
  description: string;

  /** URL to the URDF file */
  url: string;

  /** Category/type of model */
  category: "manipulator" | "mobile" | "humanoid" | "other";

  /** Default frame ID */
  default_frame_id: string;

  /** Whether this model is available */
  enabled: boolean;

  /** Optional: Additional metadata */
  metadata?: {
    author?: string;
    version?: string;
    license?: string;
    tags?: string[];
  };
}

/**
 * MessageConverter Input Schema
 * Schema for custom_robot/RobotConfig message type
 */
export interface CustomRobotSchema {
  type: "custom_robot/RobotConfig";
  fields: Array<{
    name: string;
    type: string;
    isArray?: boolean;
  }>;
}

/**
 * MessageConverter Output Schema
 * Schema for std_msgs/String output
 */
export interface StdMsgStringSchema {
  type: "std_msgs/String";
  fields: Array<{
    name: "data";
    type: "string";
  }>;
}

/**
 * Converter Configuration
 * Configuration for the URDF Preset MessageConverter
 */
export interface ConverterConfig {
  /** Enable/disable the converter */
  enabled: boolean;

  /** Default robot preset to use */
  default_preset_id: string;

  /** Cache URDF content for performance */
  enable_caching: boolean;

  /** Cache duration in milliseconds */
  cache_duration_ms: number;

  /** Log level for debugging */
  log_level: "debug" | "info" | "warn" | "error";

  /** Preset models configuration */
  presets: PresetModel[];
}

/**
 * Converter Error Types
 */
export interface ConverterError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * URDF Cache Entry
 */
export interface UrdfCacheEntry {
  content: string;
  timestamp: number;
  size: number;
}

/**
 * Converter Statistics
 */
export interface ConverterStats {
  messages_processed: number;
  cache_hits: number;
  cache_misses: number;
  errors: number;
  last_updated: Date;
}
