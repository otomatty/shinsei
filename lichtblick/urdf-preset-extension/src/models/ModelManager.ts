/**
 * ModelManager
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ src/converter/UrdfPresetConverter.ts
 *
 * Dependencies (依存先):
 *   ├─ ./presetModels.ts
 *   ├─ ../converter/types.ts
 *   └─ ../utils/logger.ts (未作成)
 *
 * Related Files:
 *   ├─ Spec: ./ModelManager.spec.md (未作成)
 *   └─ Tests: src/__tests__/ModelManager.test.ts (未作成)
 */

import { getPresetModel } from "./presetModels";
import { PresetModelType, UrdfCacheEntry } from "../converter/types";

export class ModelManager {
  #cache = new Map<string, UrdfCacheEntry>();
  readonly #cacheExpiration = 5 * 60 * 1000; // 5 minutes
  readonly #requestTimeout = 10000; // 10 seconds

  /**
   * Load URDF model content by preset type
   */
  async loadModel(modelType: PresetModelType): Promise<string> {
    const model = getPresetModel(modelType);

    if (!model) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    // Check cache first
    const cachedContent = this.#getCachedModel(model.id);
    if (cachedContent) {
      console.log(`[ModelManager] Using cached model: ${model.id}`);
      return cachedContent;
    }

    try {
      console.log(`[ModelManager] Loading model: ${model.id} from ${model.url}`);
      const content = await this.#fetchUrdfFromUrl(model.url);

      // Cache the result
      this.#cacheModel(model.id, content);

      console.log(
        `[ModelManager] Successfully loaded model: ${model.id} (${String(content.length)} chars)`,
      );
      return content;
    } catch (error) {
      console.error(`[ModelManager] Failed to load model ${model.id}:`, error);

      // Fallback to default model if not already default
      if (model.id !== "default") {
        console.warn(`[ModelManager] Falling back to default model`);
        return await this.loadModel("default");
      }

      // Return minimal URDF as last resort
      return this.#getMinimalUrdf();
    }
  }

  /**
   * Fetch URDF content from URL with timeout and error handling
   */
  async #fetchUrdfFromUrl(url: string): Promise<string> {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.#requestTimeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/xml, text/xml, text/plain, */*",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
      }

      const content = await response.text();

      // Basic URDF validation
      if (!this.#isValidUrdf(content)) {
        throw new Error("Invalid URDF content: missing required tags");
      }

      return content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request timeout after ${String(this.#requestTimeout)}ms`);
      }

      throw error;
    }
  }

  /**
   * Get cached model content if available and not expired
   */
  #getCachedModel(modelId: string): string | null {
    const entry = this.#cache.get(modelId);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() - entry.timestamp > this.#cacheExpiration) {
      console.log(`[ModelManager] Cache expired for model: ${modelId}`);
      this.#cache.delete(modelId);
      return null;
    }

    return entry.content;
  }

  /**
   * Cache model content with timestamp
   */
  #cacheModel(modelId: string, content: string): void {
    const entry: UrdfCacheEntry = {
      content,
      timestamp: Date.now(),
      size: content.length,
    };

    this.#cache.set(modelId, entry);
    console.log(`[ModelManager] Cached model: ${modelId} (${String(content.length)} chars)`);
  }

  /**
   * Basic URDF content validation
   */
  #isValidUrdf(content: string): boolean {
    // Check for basic URDF structure
    return content.includes("<robot") && content.includes("</robot>");
  }

  /**
   * Generate minimal fallback URDF
   */
  #getMinimalUrdf(): string {
    return `<?xml version="1.0"?>
<robot name="fallback_robot">
  <link name="base_link">
    <visual>
      <geometry>
        <box size="0.1 0.1 0.1"/>
      </geometry>
      <material name="red">
        <color rgba="1.0 0.0 0.0 1.0"/>
      </material>
    </visual>
  </link>
</robot>`;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; entries: Array<{ id: string; size: number; age: number }> } {
    const entries = Array.from(this.#cache.entries()).map(([id, entry]) => ({
      id,
      size: entry.size,
      age: Date.now() - entry.timestamp,
    }));

    return {
      size: this.#cache.size,
      entries,
    };
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.#cache.clear();
    console.log(`[ModelManager] Cache cleared`);
  }
}
