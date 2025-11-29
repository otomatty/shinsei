# URDF Preset Extension 実装計画

**作成日**: 2025-10-24
**プロジェクト**: URDF固定モデル自動提供機能
**実装方式**: MessageConverter Extension

---

## プロジェクト概要

### 目標

3DパネルのUIを変更せずに、Extension経由でMessageConverterを活用して固定URDFモデルを自動的に提供する機能を実装する。

### アプローチ

```
[カスタムメッセージ] → [MessageConverter] → [std_msgs/String] → [3Dパネル]
```

## 技術アーキテクチャ

### 全体構成図

```
┌─────────────────────────────────────────────────────────────┐
│ Data Source                                                 │
├─────────────────────────────────────────────────────────────┤
│ • /robot_config トピック                                     │
│ • custom_robot/RobotConfig メッセージ                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ URDF Preset Extension                                       │
├─────────────────────────────────────────────────────────────┤
│ • MessageConverter 実装                                      │
│ • 固定URDFモデル管理                                          │
│ • キャッシュ機能                                              │
│ • エラーハンドリング                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3D Panel                                                    │
├─────────────────────────────────────────────────────────────┤
│ • 通常の /robot_description として受信                       │
│ • 既存機能との完全互換性                                      │
│ • UI変更なし                                                 │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント設計

#### 1. MessageConverter Core

```typescript
interface UrdfPresetConverter {
  convert(config: RobotConfig): Promise<UrdfMessage>;
  getPresetModels(): PresetModel[];
  validateConfig(config: RobotConfig): ValidationResult;
}
```

#### 2. Model Manager

```typescript
interface ModelManager {
  loadModel(modelId: string): Promise<string>;
  cacheModel(modelId: string, content: string): void;
  getCachedModel(modelId: string): string | null;
}
```

#### 3. Error Handler

```typescript
interface ErrorHandler {
  handleNetworkError(error: NetworkError): string;
  handleValidationError(error: ValidationError): string;
  logError(context: string, error: Error): void;
}
```

## 実装詳細

### Phase 1: プロジェクト初期化

#### ディレクトリ構造

```
urdf-preset-extension/
├── package.json                    # Extension メタデータ
├── tsconfig.json                   # TypeScript 設定
├── .eslintrc.yaml                  # ESLint 設定
├── src/
│   ├── index.ts                    # Extension エントリポイント
│   ├── converter/
│   │   ├── UrdfPresetConverter.ts  # MessageConverter実装
│   │   └── types.ts                # 型定義
│   ├── models/
│   │   ├── ModelManager.ts         # モデル管理
│   │   ├── presetModels.ts         # 固定モデル定義
│   │   └── cache.ts                # キャッシュ機能
│   ├── utils/
│   │   ├── errorHandler.ts         # エラー処理
│   │   ├── logger.ts               # ログ機能
│   │   └── validation.ts           # バリデーション
│   └── __tests__/                  # テストファイル
├── assets/
│   └── models/                     # ローカルURDFファイル
└── docs/
    ├── README.md                   # 使用方法
    └── API.md                      # API仕様
```

#### 基本セットアップ

```bash
# Extension作成
npm init lichtblick-extension@latest urdf-preset-extension
cd urdf-preset-extension

# 依存関係追加
npm install --save-dev @types/lodash lodash

# プロジェクト構造作成
mkdir -p src/{converter,models,utils,__tests__}
mkdir -p assets/models
mkdir -p docs
```

### Phase 2: Core Implementation

#### 2.1 型定義 (`src/converter/types.ts`)

```typescript
export interface RobotConfig {
  modelType: PresetModelType;
  framePrefix?: string;
  usePresetModel?: boolean;
  customSettings?: {
    displayMode?: "auto" | "visual" | "collision";
    fallbackColor?: string;
  };
}

export type PresetModelType = "robot_a" | "robot_b" | "robot_c" | "default";

export interface PresetModel {
  id: PresetModelType;
  label: string;
  url: string;
  description: string;
  localPath?: string;
  size?: number;
}

export interface UrdfMessage {
  data: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

#### 2.2 固定モデル定義 (`src/models/presetModels.ts`)

```typescript
export const PRESET_MODELS: Record<PresetModelType, PresetModel> = {
  robot_a: {
    id: "robot_a",
    label: "Production Robot Model A",
    url: "package://robots/model_a.urdf",
    description: "Main production robot used in factory automation",
    localPath: "assets/models/robot_a.urdf",
    size: 1024 * 50, // 50KB
  },
  robot_b: {
    id: "robot_b",
    label: "Development Robot Model B",
    url: "https://example.com/models/model_b.urdf",
    description: "Development and testing robot model",
    localPath: "assets/models/robot_b.urdf",
    size: 1024 * 75, // 75KB
  },
  robot_c: {
    id: "robot_c",
    label: "Experimental Robot Model C",
    url: "package://robots/model_c.urdf",
    description: "Experimental robot for R&D purposes",
    localPath: "assets/models/robot_c.urdf",
    size: 1024 * 100, // 100KB
  },
  default: {
    id: "default",
    label: "Default Robot Model",
    url: "package://robots/default.urdf",
    description: "Fallback robot model",
    localPath: "assets/models/default.urdf",
    size: 1024 * 25, // 25KB
  },
};

export function getPresetModel(modelType: PresetModelType): PresetModel {
  return PRESET_MODELS[modelType] || PRESET_MODELS.default;
}

export function getAllPresetModels(): PresetModel[] {
  return Object.values(PRESET_MODELS);
}
```

#### 2.3 モデル管理 (`src/models/ModelManager.ts`)

```typescript
import { PresetModelType, PresetModel } from "../converter/types";
import { getPresetModel } from "./presetModels";
import { UrdfCache } from "./cache";
import { Logger } from "../utils/logger";

export class ModelManager {
  private cache = new UrdfCache();
  private logger = new Logger("ModelManager");

  async loadModel(modelType: PresetModelType): Promise<string> {
    const model = getPresetModel(modelType);

    // キャッシュ確認
    const cachedContent = this.cache.get(model.id);
    if (cachedContent) {
      this.logger.debug(`Using cached model: ${model.id}`);
      return cachedContent;
    }

    try {
      // URLから取得（実際の実装では fetch API を使用）
      const content = await this.fetchUrdfFromUrl(model.url);

      // キャッシュに保存
      this.cache.set(model.id, content);

      this.logger.info(`Loaded model: ${model.id} from ${model.url}`);
      return content;
    } catch (error) {
      this.logger.error(`Failed to load model ${model.id}:`, error);

      // フォールバック: ローカルファイル
      if (model.localPath) {
        return this.loadLocalModel(model.localPath);
      }

      throw new Error(`Failed to load model: ${model.id}`);
    }
  }

  private async fetchUrdfFromUrl(url: string): Promise<string> {
    // package:// URL の処理
    if (url.startsWith("package://")) {
      return this.resolvePackageUrl(url);
    }

    // HTTP(S) URL の処理
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  private async resolvePackageUrl(packageUrl: string): Promise<string> {
    // package:// URLの解決ロジック
    // 実装は環境に依存
    throw new Error("Package URL resolution not implemented");
  }

  private async loadLocalModel(localPath: string): Promise<string> {
    // ローカルファイル読み込み（ブラウザ環境では制限あり）
    throw new Error("Local file loading not implemented");
  }
}
```

#### 2.4 MessageConverter実装 (`src/converter/UrdfPresetConverter.ts`)

```typescript
import { RegisterMessageConverterArgs } from "@lichtblick/suite";
import { RobotConfig, UrdfMessage } from "./types";
import { ModelManager } from "../models/ModelManager";
import { validateRobotConfig } from "../utils/validation";
import { ErrorHandler } from "../utils/errorHandler";
import { Logger } from "../utils/logger";

export class UrdfPresetConverter {
  private modelManager = new ModelManager();
  private errorHandler = new ErrorHandler();
  private logger = new Logger("UrdfPresetConverter");

  getConverterConfig(): RegisterMessageConverterArgs<RobotConfig> {
    return {
      fromSchemaName: "custom_robot/RobotConfig",
      toSchemaName: "std_msgs/String",
      converter: this.convert.bind(this),
      panelSettings: {
        "/robot_description": {
          settings: (config) => ({
            fields: {
              modelInfo: {
                label: "Preset Model Info",
                input: "string",
                value: this.getModelDescription(config?.modelType),
                readonly: true,
              },
            },
          }),
          handler: (action, config) => {
            this.logger.debug("Panel settings action:", action);
          },
          defaultConfig: { modelType: "default" },
        },
      },
    };
  }

  async convert(msg: RobotConfig): Promise<UrdfMessage> {
    try {
      // バリデーション
      const validation = validateRobotConfig(msg);
      if (!validation.isValid) {
        throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
      }

      // モデル読み込み
      const urdfContent = await this.modelManager.loadModel(msg.modelType);

      // フレームプレフィックス適用
      const processedUrdf = this.applyFramePrefix(urdfContent, msg.framePrefix);

      this.logger.info(`Converted model: ${msg.modelType}`);

      return { data: processedUrdf };
    } catch (error) {
      this.errorHandler.logError("convert", error as Error);

      // フォールバック: デフォルトモデル
      if (msg.modelType !== "default") {
        this.logger.warn("Falling back to default model");
        return this.convert({ ...msg, modelType: "default" });
      }

      throw error;
    }
  }

  private applyFramePrefix(urdf: string, framePrefix?: string): string {
    if (!framePrefix) {
      return urdf;
    }

    // フレーム名にプレフィックスを追加
    // 実装は URDF パースライブラリに依存
    return urdf
      .replace(/link name="([^"]+)"/g, `link name="${framePrefix}$1"`)
      .replace(/joint name="([^"]+)"/g, `joint name="${framePrefix}$1"`);
  }

  private getModelDescription(modelType?: string): string {
    if (!modelType) return "No model selected";

    try {
      const model = getPresetModel(modelType as PresetModelType);
      return `${model.label}: ${model.description}`;
    } catch {
      return "Unknown model";
    }
  }
}
```

### Phase 3: Extension登録 (`src/index.ts`)

```typescript
import { ExtensionContext } from "@lichtblick/suite";
import { UrdfPresetConverter } from "./converter/UrdfPresetConverter";
import { Logger } from "./utils/logger";

export function activate(extensionContext: ExtensionContext): void {
  const logger = new Logger("UrdfPresetExtension");

  try {
    // MessageConverter登録
    const converter = new UrdfPresetConverter();
    extensionContext.registerMessageConverter(converter.getConverterConfig());

    logger.info("URDF Preset Extension activated successfully");
  } catch (error) {
    logger.error("Failed to activate URDF Preset Extension:", error);
    throw error;
  }
}
```

## テスト計画

### 単体テスト

```typescript
// src/__tests__/UrdfPresetConverter.test.ts
describe("UrdfPresetConverter", () => {
  test("should convert valid robot config", async () => {
    const converter = new UrdfPresetConverter();
    const config: RobotConfig = {
      modelType: "robot_a",
      framePrefix: "robot1_",
    };

    const result = await converter.convert(config);

    expect(result.data).toContain('<?xml version="1.0"?>');
    expect(result.data).toContain("robot1_");
  });

  test("should handle invalid model type", async () => {
    const converter = new UrdfPresetConverter();
    const config: RobotConfig = {
      modelType: "invalid" as PresetModelType,
    };

    await expect(converter.convert(config)).rejects.toThrow();
  });
});
```

### 統合テスト

```typescript
// src/__tests__/integration.test.ts
describe("Extension Integration", () => {
  test("should register message converter successfully", () => {
    const mockContext = createMockExtensionContext();

    activate(mockContext);

    expect(mockContext.registerMessageConverter).toHaveBeenCalledTimes(1);
  });
});
```

## デプロイメント計画

### ビルド設定

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "package": "npm run build && lichtblick-extension package"
  }
}
```

### パッケージング

```bash
# 本番ビルド
npm run build

# Extension パッケージ作成
npm run package

# 出力: urdf-preset-extension-1.0.0.foxe
```

## 使用方法

### データ送信例

```python
# ROSでの送信例
import rospy
from std_msgs.msg import String
import json

pub = rospy.Publisher('/robot_config', String, queue_size=1)

config = {
    "modelType": "robot_a",
    "framePrefix": "robot1_",
    "usePresetModel": True
}

msg = String()
msg.data = json.dumps(config)
pub.publish(msg)
```

### 3Dパネルでの確認

1. 3Dパネルを開く
2. `/robot_description` トピックが自動的に表示される
3. 指定したモデルがレンダリングされる

## 監視・メンテナンス

### ログ監視

- 変換成功/失敗の統計
- モデル読み込み時間の監視
- エラー発生頻度の追跡

### パフォーマンス指標

- メッセージ変換レイテンシ: < 10ms
- キャッシュヒット率: > 80%
- メモリ使用量: < 50MB

---

**最終更新**: 2025-10-24
**作成者**: AI Assistant
