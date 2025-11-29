/**
 * URDF Preset Extension
 *
 * Automatically adds preset URDF robot models to Lichtblick 3D panel
 * via MessageConverter without requiring UI changes.
 *
 * DEPENDENCY MAP:
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite (ExtensionContext)
 *   ├─ src/converter/UrdfPresetConverter.ts (未作成)
 *   └─ src/models/presetModels.ts
 *
 * Related Files:
 *   ├─ Spec: ./index.spec.md (未作成)
 *   ├─ Tests: src/__tests__/index.test.ts (未作成)
 *   └─ Config: package.json
 */

import { ExtensionContext } from "@lichtblick/suite";

import { UrdfPresetConverter } from "./converter/UrdfPresetConverter";

export function activate(extensionContext: ExtensionContext): void {
  try {
    console.log("[URDF Preset Extension] Activating extension...");

    // Create and register MessageConverter
    const converter = new UrdfPresetConverter();

    extensionContext.registerMessageConverter(converter.getConverterConfig());

    console.log("[URDF Preset Extension] Successfully activated", {
      fromSchema: "custom_robot/RobotConfig",
      toSchema: "std_msgs/String",
      converter: "UrdfPresetConverter",
    });

    // Store converter reference for cleanup (optional)
    (globalThis as Record<string, unknown>).urdfPresetConverter = converter;
  } catch (error) {
    console.error("[URDF Preset Extension] Failed to activate:", error);
    throw error;
  }
}
