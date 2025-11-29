import { ExtensionContext } from "@lichtblick/suite";
import { initVehicleStatusPanel } from "./panels/VehicleStatusPanel";
import { initTrafficLightPanel } from "./panels/TrafficLightPanel";
import { initObstacleDetectionPanel } from "./panels/ObstacleDetectionPanel";
import { initDemoDataGeneratorPanel } from "./panels/DemoDataGeneratorPanel";

export function activate(extensionContext: ExtensionContext): void {
  // 車両状態モニターパネル
  extensionContext.registerPanel({
    name: "vehicle-status-monitor",
    initPanel: initVehicleStatusPanel,
  });

  // 信号機認識パネル
  extensionContext.registerPanel({
    name: "traffic-light-recognition",
    initPanel: initTrafficLightPanel,
  });

  // 障害物検知ビジュアライザー
  extensionContext.registerPanel({
    name: "obstacle-detection-visualizer",
    initPanel: initObstacleDetectionPanel,
  });

  // デモデータジェネレーター
  extensionContext.registerPanel({
    name: "demo-data-generator",
    initPanel: initDemoDataGeneratorPanel,
  });
}
