/**
 * UrdfPresetConverter
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ src/index.ts
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite (RegisterMessageConverterArgs)
 *   ├─ ./types.ts
 *   ├─ ../models/ModelManager.ts
 *   ├─ ../models/presetModels.ts
 *   └─ ../utils/validation.ts
 *
 * Related Files:
 *   ├─ Spec: ./UrdfPresetConverter.spec.md (未作成)
 *   └─ Tests: src/__tests__/UrdfPresetConverter.test.ts (未作成)
 */

import { RegisterMessageConverterArgs } from "@lichtblick/suite";

import { RobotConfig, PresetModelType } from "./types";
import { ModelManager } from "../models/ModelManager";
import { isValidPresetId, getDefaultPresetId } from "../models/presetModels";
import { validateRobotConfig } from "../utils/validation";

/**
 * URDF message type for std_msgs/String output
 */
interface UrdfMessage {
  data: string;
}

/**
 * MessageConverter implementation for URDF preset functionality
 */
export class UrdfPresetConverter {
  #modelManager = new ModelManager();
  readonly #statisticsInterval = 60000; // 1 minute
  #stats = {
    messagesProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    lastReset: Date.now(),
  };

  constructor() {
    // Start statistics logging
    this.#startStatisticsLogging();
  }

  /**
   * Get MessageConverter configuration for registration
   */
  getConverterConfig(): RegisterMessageConverterArgs<RobotConfig> {
    return {
      fromSchemaName: "custom_robot/RobotConfig",
      toSchemaName: "std_msgs/String",
      converter: this.convert.bind(this),
    };
  }

  /**
   * Convert RobotConfig message to URDF string
   */
  async convert(msg: RobotConfig): Promise<UrdfMessage> {
    this.#stats.messagesProcessed++;

    try {
      console.log("[UrdfPresetConverter] Converting message:", {
        model_id: msg.model_id,
        name: msg.name,
        source: msg.source ?? "preset",
      });

      // Validate input message
      const validation = validateRobotConfig(msg);
      if (!validation.valid) {
        const errorMessage = validation.error
          ? validation.error.message
          : "Invalid RobotConfig message";
        throw new Error(`Invalid RobotConfig: ${errorMessage}`);
      }

      // Determine model type to use
      const modelType = this.#determineModelType(msg);

      // Load URDF content
      const urdfContent = await this.#modelManager.loadModel(modelType);

      // Apply frame ID transformations if specified
      const processedUrdf = this.#applyFrameTransformations(urdfContent, msg.frame_id);

      console.log("[UrdfPresetConverter] Successfully converted message", {
        model_id: msg.model_id,
        modelType,
        urdfLength: processedUrdf.length,
      });

      return { data: processedUrdf };
    } catch (error) {
      this.#stats.errors++;
      console.error("[UrdfPresetConverter] Conversion failed:", error);

      // Attempt fallback to default model
      if (msg.model_id !== getDefaultPresetId()) {
        console.warn("[UrdfPresetConverter] Attempting fallback to default model");
        return await this.#convertWithFallback(msg);
      }

      throw error;
    }
  }

  /**
   * Determine which model type to use based on the message
   */
  #determineModelType(msg: RobotConfig): PresetModelType {
    // If source is explicitly "custom", try to map model_id to preset
    if (msg.source === "custom" && msg.model_id) {
      // Try to find matching preset by model_id
      if (isValidPresetId(msg.model_id)) {
        return msg.model_id;
      }
    }

    // Default behavior: use model_id if it's a valid preset
    if (msg.model_id && isValidPresetId(msg.model_id)) {
      return msg.model_id;
    }

    // Fallback to default
    console.warn(`[UrdfPresetConverter] Unknown model_id '${msg.model_id}', using default`);
    return getDefaultPresetId();
  }

  /**
   * Apply frame ID transformations to URDF content
   */
  #applyFrameTransformations(urdf: string, frameId?: string): string {
    if (!frameId) {
      return urdf;
    }

    // Simple frame ID replacement - in production, use proper URDF parser
    // This is a basic implementation for demonstration
    console.log(`[UrdfPresetConverter] Applying frame prefix: ${frameId}`);

    // Replace link names with frame prefix
    let processedUrdf = urdf.replace(/(<link\s+name=")([^"]+)(")/g, `$1${frameId}_$2$3`);

    // Replace joint names with frame prefix
    processedUrdf = processedUrdf.replace(/(<joint\s+name=")([^"]+)(")/g, `$1${frameId}_$2$3`);

    // Update parent/child link references in joints
    processedUrdf = processedUrdf.replace(/(<parent\s+link=")([^"]+)(")/g, `$1${frameId}_$2$3`);

    processedUrdf = processedUrdf.replace(/(<child\s+link=")([^"]+)(")/g, `$1${frameId}_$2$3`);

    return processedUrdf;
  }

  /**
   * Fallback conversion using default model
   */
  async #convertWithFallback(originalMsg: RobotConfig): Promise<UrdfMessage> {
    try {
      const urdfContent = await this.#modelManager.loadModel("default");
      const processedUrdf = this.#applyFrameTransformations(urdfContent, originalMsg.frame_id);

      console.log("[UrdfPresetConverter] Fallback conversion successful");
      return { data: processedUrdf };
    } catch (error) {
      console.error("[UrdfPresetConverter] Fallback conversion failed:", error);

      // Last resort: return minimal URDF
      return { data: this.#getMinimalUrdf(originalMsg.name || "Error Robot") };
    }
  }

  /**
   * Generate minimal URDF for error cases
   */
  #getMinimalUrdf(robotName: string): string {
    return `<?xml version="1.0"?>
<robot name="${robotName.replace(/[^a-zA-Z0-9_]/g, "_")}">
  <link name="base_link">
    <visual>
      <geometry>
        <box size="0.1 0.1 0.1"/>
      </geometry>
      <material name="error_red">
        <color rgba="1.0 0.0 0.0 1.0"/>
      </material>
    </visual>
  </link>
</robot>`;
  }

  /**
   * Start periodic statistics logging
   */
  #startStatisticsLogging(): void {
    setInterval(() => {
      const cacheStats = this.#modelManager.getCacheStats();

      console.log("[UrdfPresetConverter] Statistics:", {
        period: `${String(this.#statisticsInterval / 1000)}s`,
        processed: this.#stats.messagesProcessed,
        errors: this.#stats.errors,
        errorRate:
          this.#stats.messagesProcessed > 0
            ? ((this.#stats.errors / this.#stats.messagesProcessed) * 100).toFixed(1) + "%"
            : "0%",
        cache: {
          size: cacheStats.size,
          entries: cacheStats.entries.length,
        },
      });

      // Reset counters for next period
      this.#stats = {
        messagesProcessed: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        lastReset: Date.now(),
      };
    }, this.#statisticsInterval);
  }

  /**
   * Get current statistics (for testing and monitoring)
   */
  getStatistics(): {
    messagesProcessed: number;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
    lastReset: number;
    cache: { size: number; entries: { id: string; size: number; age: number }[] };
  } {
    return {
      ...this.#stats,
      cache: this.#modelManager.getCacheStats(),
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.#modelManager.clearCache();
    console.log("[UrdfPresetConverter] Converter destroyed");
  }
}
