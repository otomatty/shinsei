# Sora MCAP対応機能 設計・実装ドキュメント

## 1. プロジェクト概要

### 1.1 目的

MCAPファイルの再生において、ファイル固有の最適な拡張機能・レイアウト組み合わせを自動推奨し、エラー発生時には詳細なガイダンスを提供するシステムを構築する。

### 1.2 課題認識

- **ファイル依存の問題**: MCAPファイルによって最適な拡張機能・レイアウトが異なる
- **エラー情報不足**: 再生失敗時の原因特定が困難
- **設定の複雑さ**: 手動での最適化が非効率
- **ナレッジ散逸**: 成功パターンの蓄積・共有ができていない

### 1.3 解決方針

1. **スマートエラーガイダンス**: 具体的で実行可能な解決策を段階的提示
2. **ファイル固有プロファイル**: MCAP固有の最適設定を自動保存・復元
3. **フィードバック学習**: 匿名化された使用データから最適パターンを学習
4. **プライバシー重視**: 機密情報を含まない匿名化フィンガープリント

## 2. アーキテクチャ設計

### 2.1 システム全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Sora Client (Electron)                  │
├─────────────────────────────────────────────────────────────┤
│  MCAP Analysis  │  Profile Manager  │  Error Handler      │
│  ┌─────────────┐ │  ┌──────────────┐ │  ┌─────────────────┐ │
│  │Fingerprint  │ │  │Local Storage │ │  │Smart Guidance   │ │
│  │Generator    │ │  │Profile Cache │ │  │Auto Recovery    │ │
│  └─────────────┘ │  └──────────────┘ │  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Extension & Layout System                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Multi-Version Extension Loader (sora-local)           │ │
│  │  Layout Marketplace Loader (sora-marketplace)          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (匿名化フィードバック)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Lightweight Server                       │
├─────────────────────────────────────────────────────────────┤
│  Feedback API   │  Recommendation  │  Static File Server   │
│  ┌─────────────┐ │  ┌──────────────┐ │  ┌─────────────────┐ │
│  │POST feedback│ │  │GET recommend │ │  │Extensions .foxe │ │
│  │Validation   │ │  │Pattern Match │ │  │Layouts .json    │ │
│  └─────────────┘ │  └──────────────┘ │  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    SQLite Database                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  feedback_data  │  recommendations  │  statistics      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 コンポーネント責務

#### クライアント側

- **MCAP Analysis**: ファイル解析・フィンガープリント生成
- **Profile Manager**: ローカル設定保存・復元
- **Error Handler**: エラー検出・自動復旧・ユーザーガイダンス
- **Extension System**: 既存のSora拡張機能システムとの統合

#### サーバー側

- **Feedback API**: 匿名化フィードバックの受信・検証
- **Recommendation Engine**: パターンマッチング・推奨生成
- **File Server**: 拡張機能・レイアウトファイルの配信

## 3. 詳細設計

### 3.1 MCAP フィンガープリント システム

#### 3.1.1 匿名化フィンガープリント

```typescript
interface MCAPFingerprint {
  // 構造的特徴（プライバシー安全）
  topicStructureHash: string; // トピック構造のハッシュ
  messageTypePattern: string; // メッセージタイプ組み合わせパターン
  frequencyProfile: string; // データ頻度プロファイル（カテゴリ化）
  durationCategory: "short" | "medium" | "long";
  sizeCategory: "small" | "medium" | "large";
  complexityScore: number; // 0-100の複雑度スコア

  // 機能要求の推定
  requiresVisualization: boolean;
  requires3D: boolean;
  requiresMapping: boolean;
  requiresPointCloud: boolean;

  // メタデータ（非識別）
  version: string; // フィンガープリント仕様バージョン
  generatedAt: number; // 生成タイムスタンプ（エポック）
}

class MCAPFingerprintGenerator {
  constructor(private config: FingerprintConfig) {}

  async generateFingerprint(mcapFile: string): Promise<MCAPFingerprint> {
    const metadata = await this.extractMetadata(mcapFile);

    return {
      topicStructureHash: await this.hashTopicStructure(metadata.topics),
      messageTypePattern: this.analyzeMessageTypes(metadata.messageTypes),
      frequencyProfile: this.categorizeFrequencies(metadata.frequencies),
      durationCategory: this.categorizeDuration(metadata.duration),
      sizeCategory: this.categorizeSize(metadata.size),
      complexityScore: this.calculateComplexity(metadata),

      requiresVisualization: this.detectVisualizationNeeds(metadata),
      requires3D: this.detect3DNeeds(metadata),
      requiresMapping: this.detectMappingNeeds(metadata),
      requiresPointCloud: this.detectPointCloudNeeds(metadata),

      version: "1.0.0",
      generatedAt: Date.now(),
    };
  }

  private async hashTopicStructure(topics: string[]): Promise<string> {
    // トピック名を抽象パターンに変換
    const patterns = topics.map(this.abstractTopicName);
    const sortedPatterns = patterns.sort();

    // SHA-256でハッシュ化
    const encoder = new TextEncoder();
    const data = encoder.encode(sortedPatterns.join("|"));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private abstractTopicName(topic: string): string {
    // 具体的な名前を抽象パターンに変換
    if (/\/camera.*\/image/.test(topic)) return "CAMERA_IMAGE";
    if (/\/lidar.*\/points/.test(topic)) return "LIDAR_POINTS";
    if (/\/nav.*\/path/.test(topic)) return "NAVIGATION_PATH";
    if (/\/tf/.test(topic)) return "TRANSFORM";
    if (/\/odom/.test(topic)) return "ODOMETRY";
    // ... 他のパターン
    return "GENERIC_TOPIC";
  }

  private detectVisualizationNeeds(metadata: MCAPMetadata): boolean {
    const visualizationTopics = ["CAMERA_IMAGE", "LIDAR_POINTS", "LASER_SCAN", "MARKER_ARRAY"];
    return metadata.abstractTopics.some((topic) => visualizationTopics.includes(topic));
  }

  private detect3DNeeds(metadata: MCAPMetadata): boolean {
    const threeDTopics = ["LIDAR_POINTS", "POINT_CLOUD", "MESH", "MARKER_3D"];
    return metadata.abstractTopics.some((topic) => threeDTopics.includes(topic));
  }
}
```

#### 3.1.2 フィンガープリント精度向上

```typescript
interface FingerprintSimilarity {
  exactMatch: boolean;
  similarityScore: number; // 0-1
  matchingFeatures: string[];
  differingFeatures: string[];
}

class FingerprintMatcher {
  calculateSimilarity(fp1: MCAPFingerprint, fp2: MCAPFingerprint): FingerprintSimilarity {
    let score = 0;
    let totalWeight = 0;
    const matching: string[] = [];
    const differing: string[] = [];

    // 重要度による重み付け
    const weights = {
      topicStructureHash: 0.4, // 最重要
      messageTypePattern: 0.3, // 重要
      complexityScore: 0.2, // 中程度
      requiresVisualization: 0.05,
      requires3D: 0.05,
    };

    // ハッシュ完全一致
    if (fp1.topicStructureHash === fp2.topicStructureHash) {
      score += weights.topicStructureHash;
      matching.push("topicStructure");
    } else {
      differing.push("topicStructure");
    }
    totalWeight += weights.topicStructureHash;

    // メッセージタイプパターン
    if (fp1.messageTypePattern === fp2.messageTypePattern) {
      score += weights.messageTypePattern;
      matching.push("messageTypes");
    } else {
      differing.push("messageTypes");
    }
    totalWeight += weights.messageTypePattern;

    // 複雑度スコア（近似一致）
    const complexityDiff = Math.abs(fp1.complexityScore - fp2.complexityScore);
    const complexitySimilarity = Math.max(0, 1 - complexityDiff / 100);
    score += weights.complexityScore * complexitySimilarity;
    totalWeight += weights.complexityScore;

    if (complexitySimilarity > 0.8) {
      matching.push("complexity");
    } else {
      differing.push("complexity");
    }

    // 機能要求
    if (fp1.requiresVisualization === fp2.requiresVisualization) {
      score += weights.requiresVisualization;
      matching.push("visualization");
    } else {
      differing.push("visualization");
    }
    totalWeight += weights.requiresVisualization;

    if (fp1.requires3D === fp2.requires3D) {
      score += weights.requires3D;
      matching.push("3d");
    } else {
      differing.push("3d");
    }
    totalWeight += weights.requires3D;

    const finalScore = score / totalWeight;

    return {
      exactMatch: finalScore === 1.0,
      similarityScore: finalScore,
      matchingFeatures: matching,
      differingFeatures: differing,
    };
  }
}
```

### 3.2 ファイル固有プロファイル システム

#### 3.2.1 プロファイル構造

```typescript
interface MCAPProfile {
  // 識別情報
  id: string; // UUID
  fingerprint: MCAPFingerprint; // ファイル特徴
  fileHash?: string; // ファイルハッシュ（オプション）

  // 設定情報
  configuration: PlaybackConfiguration;

  // 使用統計
  usage: ProfileUsageStats;

  // メタデータ
  metadata: ProfileMetadata;
}

interface PlaybackConfiguration {
  extensions: Array<{
    baseId: string;
    version: string;
    enabled: boolean;
    config?: Record<string, any>; // 拡張機能固有設定
  }>;

  layout: {
    baseId: string;
    version: string;
    customizations?: Record<string, any>;
  };

  playbackSettings: {
    speed: number;
    loop: boolean;
    timeRange?: [number, number];
    selectedTopics?: string[];
  };

  displaySettings: {
    theme: string;
    panelLayout?: any;
    viewerConfigs?: Record<string, any>;
  };
}

interface ProfileUsageStats {
  created: Date;
  lastUsed: Date;
  useCount: number;
  successRate: number; // 0-1
  averageLoadTime: number; // ミリ秒
  errorHistory: Array<{
    timestamp: Date;
    errorType: string;
    resolved: boolean;
  }>;
}

interface ProfileMetadata {
  name?: string; // ユーザー定義名
  description?: string; // ユーザー定義説明
  tags?: string[]; // ユーザー定義タグ
  isShared: boolean; // コミュニティ共有フラグ
  sourceType: "auto" | "manual" | "imported";
  version: string; // プロファイル仕様バージョン
}
```

#### 3.2.2 プロファイル管理システム

```typescript
class MCAPProfileManager {
  private storage: IDBProfileStorage;
  private fingerprintGenerator: MCAPFingerprintGenerator;

  constructor() {
    this.storage = new IDBProfileStorage();
    this.fingerprintGenerator = new MCAPFingerprintGenerator();
  }

  async getProfileForFile(filePath: string): Promise<MCAPProfile | undefined> {
    // 1. ファイルハッシュによる完全一致検索
    const fileHash = await this.calculateFileHash(filePath);
    let profile = await this.storage.getByFileHash(fileHash);

    if (profile) {
      await this.updateLastUsed(profile.id);
      return profile;
    }

    // 2. フィンガープリントによる類似検索
    const fingerprint = await this.fingerprintGenerator.generateFingerprint(filePath);
    const similarProfiles = await this.findSimilarProfiles(fingerprint);

    if (similarProfiles.length > 0) {
      // 最も類似度の高いプロファイルを返す
      const bestMatch = similarProfiles[0];

      // 新しいプロファイルとして保存（ファイルハッシュ付き）
      const newProfile = await this.createProfileFromTemplate(
        bestMatch.profile,
        fingerprint,
        fileHash,
      );

      return newProfile;
    }

    return undefined;
  }

  async saveProfile(
    filePath: string,
    configuration: PlaybackConfiguration,
    metadata: Partial<ProfileMetadata> = {},
  ): Promise<MCAPProfile> {
    const fingerprint = await this.fingerprintGenerator.generateFingerprint(filePath);
    const fileHash = await this.calculateFileHash(filePath);

    const profile: MCAPProfile = {
      id: crypto.randomUUID(),
      fingerprint,
      fileHash,
      configuration,
      usage: {
        created: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        successRate: 1.0,
        averageLoadTime: 0,
        errorHistory: [],
      },
      metadata: {
        isShared: false,
        sourceType: "manual",
        version: "1.0.0",
        ...metadata,
      },
    };

    await this.storage.save(profile);
    return profile;
  }

  async updateProfileUsage(profileId: string, result: PlaybackResult): Promise<void> {
    const profile = await this.storage.getById(profileId);
    if (!profile) return;

    // 使用統計更新
    profile.usage.lastUsed = new Date();
    profile.usage.useCount++;

    // 成功率計算
    const wasSuccessful = result.success && result.errorCount === 0;
    const totalAttempts = profile.usage.useCount;
    const previousSuccesses = Math.round(profile.usage.successRate * (totalAttempts - 1));
    const currentSuccesses = previousSuccesses + (wasSuccessful ? 1 : 0);
    profile.usage.successRate = currentSuccesses / totalAttempts;

    // エラー記録
    if (!wasSuccessful) {
      profile.usage.errorHistory.push({
        timestamp: new Date(),
        errorType: result.primaryErrorType || "unknown",
        resolved: false,
      });

      // エラー履歴の制限（最新100件まで）
      if (profile.usage.errorHistory.length > 100) {
        profile.usage.errorHistory = profile.usage.errorHistory.slice(-100);
      }
    }

    await this.storage.save(profile);
  }

  private async findSimilarProfiles(
    fingerprint: MCAPFingerprint,
    threshold: number = 0.7,
  ): Promise<Array<{ profile: MCAPProfile; similarity: FingerprintSimilarity }>> {
    const allProfiles = await this.storage.getAll();
    const matcher = new FingerprintMatcher();
    const similarities: Array<{ profile: MCAPProfile; similarity: FingerprintSimilarity }> = [];

    for (const profile of allProfiles) {
      const similarity = matcher.calculateSimilarity(fingerprint, profile.fingerprint);

      if (similarity.similarityScore >= threshold) {
        similarities.push({ profile, similarity });
      }
    }

    // 類似度でソート
    similarities.sort((a, b) => b.similarity.similarityScore - a.similarity.similarityScore);

    return similarities;
  }

  private async createProfileFromTemplate(
    template: MCAPProfile,
    newFingerprint: MCAPFingerprint,
    fileHash: string,
  ): Promise<MCAPProfile> {
    const newProfile: MCAPProfile = {
      id: crypto.randomUUID(),
      fingerprint: newFingerprint,
      fileHash,
      configuration: { ...template.configuration },
      usage: {
        created: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        successRate: template.usage.successRate, // テンプレートの成功率を継承
        averageLoadTime: 0,
        errorHistory: [],
      },
      metadata: {
        ...template.metadata,
        sourceType: "auto",
        name: `Auto-generated from ${template.metadata.name || "similar profile"}`,
      },
    };

    await this.storage.save(newProfile);
    return newProfile;
  }
}
```

### 3.3 スマートエラーガイダンス システム

#### 3.3.1 エラー分析エンジン

```typescript
interface PlaybackError {
  type: string;
  message: string;
  context: {
    topic?: string;
    messageType?: string;
    timestamp?: number;
    extensionId?: string;
  };
  severity: "low" | "medium" | "high" | "critical";
  count: number;
}

interface ErrorGuidance {
  problemType: ErrorProblemType;
  confidence: number; // 0-1
  rootCause: string;
  userFriendlyExplanation: string;
  automaticFixAvailable: boolean;
  solutions: SolutionStep[];
  preventionTips?: string[];
}

interface SolutionStep {
  id: string;
  title: string;
  description: string;
  type: "automatic" | "manual" | "download" | "configuration";
  estimatedTime: number; // 秒
  riskLevel: "low" | "medium" | "high";
  prerequisites?: string[];
  action: () => Promise<SolutionResult>;
}

interface SolutionResult {
  success: boolean;
  message: string;
  nextSteps?: string[];
  rollbackAction?: () => Promise<void>;
}

type ErrorProblemType =
  | "missing_extension"
  | "version_mismatch"
  | "configuration_error"
  | "data_corruption"
  | "performance_issue"
  | "dependency_conflict"
  | "resource_limitation";

class SmartErrorAnalyzer {
  private extensionLoader: SoraExtensionLoader;
  private profileManager: MCAPProfileManager;

  constructor(extensionLoader: SoraExtensionLoader, profileManager: MCAPProfileManager) {
    this.extensionLoader = extensionLoader;
    this.profileManager = profileManager;
  }

  async analyzeError(error: PlaybackError, context: PlaybackContext): Promise<ErrorGuidance> {
    // エラータイプに応じた分析ルーティング
    switch (true) {
      case this.isMissingExtensionError(error):
        return await this.analyzeMissingExtension(error, context);

      case this.isVersionMismatchError(error):
        return await this.analyzeVersionMismatch(error, context);

      case this.isConfigurationError(error):
        return await this.analyzeConfigurationError(error, context);

      case this.isPerformanceIssue(error):
        return await this.analyzePerformanceIssue(error, context);

      default:
        return await this.analyzeGenericError(error, context);
    }
  }

  private async analyzeMissingExtension(
    error: PlaybackError,
    context: PlaybackContext,
  ): Promise<ErrorGuidance> {
    const messageType = error.context.messageType;
    const topicName = error.context.topic;

    // 推奨拡張機能の検索
    const recommendations = await this.findExtensionsForMessageType(messageType);
    const alternatives = await this.findAlternativeExtensions(messageType);

    const solutions: SolutionStep[] = [];

    // 1. 推奨拡張機能のインストール
    for (const ext of recommendations) {
      solutions.push({
        id: `install_${ext.baseId}`,
        title: `${ext.displayName} をインストール`,
        description: `${messageType} メッセージに最適化された拡張機能です。`,
        type: "download",
        estimatedTime: 30,
        riskLevel: "low",
        action: async () => {
          try {
            await this.extensionLoader.installExtensionFromMarketplace(ext.baseId);
            return {
              success: true,
              message: `${ext.displayName} のインストールが完了しました。`,
              nextSteps: ["再生を再開してください。"],
            };
          } catch (installError) {
            return {
              success: false,
              message: `インストールに失敗しました: ${installError.message}`,
            };
          }
        },
      });
    }

    // 2. 代替拡張機能の提案
    for (const alt of alternatives) {
      solutions.push({
        id: `try_alternative_${alt.baseId}`,
        title: `代替拡張機能: ${alt.displayName}`,
        description: `完全な互換性はありませんが、基本的な表示が可能です。`,
        type: "download",
        estimatedTime: 30,
        riskLevel: "medium",
        action: async () => {
          // 代替拡張機能のインストール処理
          return { success: false, message: "Not implemented" };
        },
      });
    }

    // 3. 手動設定の案内
    solutions.push({
      id: "manual_configuration",
      title: "手動で拡張機能を探す",
      description: "マーケットプレイスで関連する拡張機能を検索します。",
      type: "manual",
      estimatedTime: 300,
      riskLevel: "low",
      action: async () => {
        // 拡張機能設定画面を開く
        return {
          success: true,
          message: "拡張機能設定画面を開きました。",
          nextSteps: [
            `「${messageType}」で検索してください。`,
            "適切な拡張機能を見つけてインストールしてください。",
          ],
        };
      },
    });

    return {
      problemType: "missing_extension",
      confidence: 0.9,
      rootCause: `Message type "${messageType}" requires a visualization extension`,
      userFriendlyExplanation: `
        このMCAPファイルには「${messageType}」というタイプのメッセージが含まれていますが、
        それを表示するための拡張機能がインストールされていません。

        トピック「${topicName}」のデータを可視化するには、専用の拡張機能が必要です。
      `,
      automaticFixAvailable: recommendations.length > 0,
      solutions,
      preventionTips: [
        "MCAPファイルと一緒に推奨拡張機能のリストを共有してもらう",
        "ファイル固有のプロファイルを作成して設定を保存する",
        "定期的に拡張機能を最新バージョンに更新する",
      ],
    };
  }

  private async analyzeVersionMismatch(
    error: PlaybackError,
    context: PlaybackContext,
  ): Promise<ErrorGuidance> {
    const extensionId = error.context.extensionId!;
    const currentVersion = await this.getCurrentExtensionVersion(extensionId);
    const compatibleVersions = await this.getCompatibleVersions(extensionId, context);

    const solutions: SolutionStep[] = [];

    // 互換バージョンへの切り替え
    for (const version of compatibleVersions) {
      const isInstalled = await this.extensionLoader.isVersionInstalled(extensionId, version);

      if (isInstalled) {
        solutions.push({
          id: `switch_to_${version}`,
          title: `バージョン ${version} に切り替え`,
          description: "既にインストール済みのバージョンに切り替えます。",
          type: "automatic",
          estimatedTime: 5,
          riskLevel: "low",
          action: async () => {
            await this.extensionLoader.setActiveVersion(extensionId, version);
            return {
              success: true,
              message: `バージョン ${version} に切り替えました。`,
              rollbackAction: async () => {
                await this.extensionLoader.setActiveVersion(extensionId, currentVersion);
              },
            };
          },
        });
      } else {
        solutions.push({
          id: `install_${version}`,
          title: `バージョン ${version} をダウンロード`,
          description: "互換性のあるバージョンをダウンロードしてインストールします。",
          type: "download",
          estimatedTime: 30,
          riskLevel: "low",
          action: async () => {
            await this.extensionLoader.installSpecificVersion(extensionId, version);
            await this.extensionLoader.setActiveVersion(extensionId, version);
            return {
              success: true,
              message: `バージョン ${version} をインストールしました。`,
            };
          },
        });
      }
    }

    return {
      problemType: "version_mismatch",
      confidence: 0.95,
      rootCause: `Extension version incompatibility: ${currentVersion}`,
      userFriendlyExplanation: `
        拡張機能「${extensionId}」の現在のバージョン（${currentVersion}）が、
        このMCAPファイルと互換性がありません。

        このファイルは特定のバージョンで作成されたデータを含んでいるため、
        互換性のあるバージョンが必要です。
      `,
      automaticFixAvailable: true,
      solutions,
      preventionTips: [
        "複数バージョンを並列インストールしておく",
        "MCAPファイル作成時に使用した拡張機能バージョンを記録する",
        "プロファイル機能を使用して設定を自動保存する",
      ],
    };
  }
}
```

#### 3.3.2 自動復旧システム

```typescript
class AutoRecoverySystem {
  private analyzer: SmartErrorAnalyzer;
  private maxRecoveryAttempts = 3;

  async handlePlaybackError(
    error: PlaybackError,
    context: PlaybackContext,
  ): Promise<RecoveryResult> {
    const guidance = await this.analyzer.analyzeError(error, context);

    if (!guidance.automaticFixAvailable) {
      return {
        success: false,
        guidance,
        message: "自動復旧できません。手動での対応が必要です。",
      };
    }

    // 自動復旧の実行
    for (let attempt = 1; attempt <= this.maxRecoveryAttempts; attempt++) {
      const result = await this.executeAutoFix(guidance, attempt);

      if (result.success) {
        return {
          success: true,
          guidance,
          message: `自動復旧が成功しました（試行回数: ${attempt}/${this.maxRecoveryAttempts}）`,
          appliedFix: result.appliedFix,
        };
      }

      // 次の試行前に少し待機
      if (attempt < this.maxRecoveryAttempts) {
        await this.delay(1000 * attempt); // 指数的バックオフ
      }
    }

    return {
      success: false,
      guidance,
      message: `自動復旧に失敗しました（${this.maxRecoveryAttempts}回試行）`,
    };
  }

  private async executeAutoFix(
    guidance: ErrorGuidance,
    attempt: number,
  ): Promise<{ success: boolean; appliedFix?: string }> {
    // リスクレベルの低いソリューションから順に試行
    const safeSolutions = guidance.solutions
      .filter((sol) => sol.type === "automatic" && sol.riskLevel === "low")
      .sort((a, b) => a.estimatedTime - b.estimatedTime); // 時間の短い順

    for (const solution of safeSolutions) {
      try {
        log.info(`Auto-recovery attempt ${attempt}: executing ${solution.id}`);

        const result = await solution.action();

        if (result.success) {
          return { success: true, appliedFix: solution.id };
        }

        log.warn(`Auto-recovery solution ${solution.id} failed: ${result.message}`);
      } catch (error) {
        log.error(`Auto-recovery solution ${solution.id} threw error:`, error);
      }
    }

    return { success: false };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface RecoveryResult {
  success: boolean;
  guidance: ErrorGuidance;
  message: string;
  appliedFix?: string;
}
```

### 3.4 フィードバック学習システム

#### 3.4.1 フィードバックデータ構造

```typescript
interface PlaybackFeedback {
  // 識別情報（匿名化済み）
  sessionId: string; // セッション固有ID（ランダム）
  fingerprint: MCAPFingerprint; // ファイル特徴

  // 設定情報
  configuration: PlaybackConfiguration;

  // 結果情報
  result: PlaybackResult;

  // メタデータ
  timestamp: number; // エポック時間
  soraVersion: string;
  platform: "web" | "desktop";

  // プライバシー保護フィールド
  // - ファイル名、パス
  // - ユーザー識別情報
  // - 具体的なエラーメッセージ
  // - タイムスタンプ（相対時間のみ）
}

interface PlaybackResult {
  success: boolean;
  playbackDuration: number; // 成功した再生時間（秒）
  totalErrors: number;
  totalWarnings: number;

  performance: {
    averageFPS: number;
    peakMemoryMB: number;
    averageCPUPercent: number;
    loadTimeMs: number;
  };

  errorSummary: Array<{
    type: string; // 汎用化されたエラータイプ
    count: number;
    severity: "low" | "medium" | "high" | "critical";
  }>;

  // 機能使用状況
  featuresUsed: {
    visualizationPanels: string[];
    exportedData: boolean;
    customConfiguration: boolean;
  };
}

class FeedbackCollector {
  private isEnabled: boolean = false;
  private consent: FeedbackConsent | null = null;

  async initialize(): Promise<void> {
    this.consent = await this.loadConsentSettings();
    this.isEnabled = this.consent?.feedbackEnabled ?? false;

    if (!this.consent) {
      this.isEnabled = await this.requestUserConsent();
    }
  }

  async collectPlaybackFeedback(
    fingerprint: MCAPFingerprint,
    configuration: PlaybackConfiguration,
    result: PlaybackResult,
  ): Promise<void> {
    if (!this.isEnabled) return;

    const feedback: PlaybackFeedback = {
      sessionId: crypto.randomUUID(),
      fingerprint: this.sanitizeFingerprint(fingerprint),
      configuration: this.sanitizeConfiguration(configuration),
      result: this.sanitizeResult(result),
      timestamp: Date.now(),
      soraVersion: this.getSoraVersion(),
      platform: this.getPlatform(),
    };

    // ローカル一時保存（バッチ送信用）
    await this.storeLocalFeedback(feedback);

    // 定期送信のスケジュール
    this.scheduleBatchUpload();
  }

  private sanitizeConfiguration(config: PlaybackConfiguration): PlaybackConfiguration {
    return {
      extensions: config.extensions.map((ext) => ({
        baseId: ext.baseId,
        version: ext.version,
        enabled: ext.enabled,
        // config は除去（機密情報の可能性）
      })),
      layout: {
        baseId: config.layout.baseId,
        version: config.layout.version,
        // customizations は除去
      },
      playbackSettings: {
        speed: config.playbackSettings.speed,
        loop: config.playbackSettings.loop,
        // timeRange, selectedTopics は除去（ファイル内容推測可能）
      },
      displaySettings: {
        theme: config.displaySettings.theme,
        // panelLayout, viewerConfigs は除去
      },
    };
  }

  private sanitizeResult(result: PlaybackResult): PlaybackResult {
    return {
      ...result,
      errorSummary: result.errorSummary.map((error) => ({
        type: this.categorizeErrorType(error.type),
        count: error.count,
        severity: error.severity,
      })),
      // 具体的なエラーメッセージは除去済み
    };
  }

  private categorizeErrorType(errorType: string): string {
    // 具体的なエラーを汎用カテゴリに分類
    if (errorType.includes("extension")) return "EXTENSION_ERROR";
    if (errorType.includes("decode")) return "DECODE_ERROR";
    if (errorType.includes("memory")) return "MEMORY_ERROR";
    if (errorType.includes("network")) return "NETWORK_ERROR";
    return "GENERIC_ERROR";
  }

  private async requestUserConsent(): Promise<boolean> {
    return new Promise((resolve) => {
      const dialog = new ConsentDialog({
        title: "データ品質向上へのご協力",
        content: `
          Soraの品質向上のため、匿名化された使用状況データの送信にご協力ください。

          📊 送信される情報:
          ✅ ファイル構造のパターン（ファイル名・内容は含まれません）
          ✅ 使用した拡張機能の名前とバージョン
          ✅ 再生の成功・失敗情報
          ✅ エラーの種類（具体的な内容は含まれません）
          ✅ パフォーマンス統計

          🔒 送信されない情報:
          ❌ ファイル名・ファイル内容
          ❌ ユーザー識別情報
          ❌ 具体的な設定値・エラーメッセージ
          ❌ 位置情報・個人データ

          この設定は後から変更できます。
          詳細なプライバシーポリシーを確認することもできます。
        `,
        buttons: [
          {
            text: "協力する",
            variant: "contained",
            onClick: () => resolve(true),
          },
          {
            text: "協力しない",
            variant: "outlined",
            onClick: () => resolve(false),
          },
          {
            text: "詳細を確認",
            variant: "text",
            onClick: () => this.showPrivacyPolicy(),
          },
        ],
      });

      dialog.show();
    });
  }
}
```

#### 3.4.2 推奨生成エンジン

```typescript
class RecommendationEngine {
  private database: FeedbackDatabase;
  private matcher: FingerprintMatcher;

  async generateRecommendations(
    fingerprint: MCAPFingerprint,
  ): Promise<ConfigurationRecommendation[]> {
    // 1. 完全一致検索
    const exactMatches = await this.findExactMatches(fingerprint);

    if (exactMatches.length >= 3) {
      return this.analyzeExactMatches(exactMatches);
    }

    // 2. 高類似度検索
    const similarMatches = await this.findSimilarMatches(fingerprint, 0.8);

    if (similarMatches.length >= 5) {
      return this.analyzeSimilarMatches(similarMatches);
    }

    // 3. 特徴ベース検索
    const featureMatches = await this.findFeatureBasedMatches(fingerprint);

    if (featureMatches.length >= 10) {
      return this.analyzeFeatureMatches(featureMatches);
    }

    // 4. デフォルト推奨
    return this.getDefaultRecommendations(fingerprint);
  }

  private async analyzeExactMatches(
    matches: PlaybackFeedback[],
  ): Promise<ConfigurationRecommendation[]> {
    // 成功率でグループ化
    const configGroups = this.groupByConfiguration(matches);
    const recommendations: ConfigurationRecommendation[] = [];

    for (const [configKey, feedbacks] of configGroups) {
      const successRate = this.calculateSuccessRate(feedbacks);
      const avgPerformance = this.calculateAveragePerformance(feedbacks);

      if (successRate >= 0.8) {
        // 80%以上の成功率
        recommendations.push({
          configuration: this.parseConfiguration(configKey),
          confidence: successRate,
          evidence: {
            sampleSize: feedbacks.length,
            successRate,
            averagePerformance: avgPerformance,
            recentUsage: this.calculateRecentUsage(feedbacks),
          },
          tags: this.generateRecommendationTags(feedbacks),
        });
      }
    }

    // 信頼度とパフォーマンスでソート
    recommendations.sort((a, b) => {
      const scoreA = a.confidence * 0.6 + a.evidence.averagePerformance.score * 0.4;
      const scoreB = b.confidence * 0.6 + b.evidence.averagePerformance.score * 0.4;
      return scoreB - scoreA;
    });

    return recommendations.slice(0, 5); // 上位5件
  }

  private groupByConfiguration(feedbacks: PlaybackFeedback[]): Map<string, PlaybackFeedback[]> {
    const groups = new Map<string, PlaybackFeedback[]>();

    for (const feedback of feedbacks) {
      const key = this.generateConfigurationKey(feedback.configuration);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(feedback);
    }

    return groups;
  }

  private generateConfigurationKey(config: PlaybackConfiguration): string {
    // 設定を正規化してキーを生成
    const extensionKeys = config.extensions
      .map((ext) => `${ext.baseId}@${ext.version}`)
      .sort()
      .join("|");

    const layoutKey = `${config.layout.baseId}@${config.layout.version}`;

    return `${extensionKeys}::${layoutKey}`;
  }

  private calculateSuccessRate(feedbacks: PlaybackFeedback[]): number {
    const successCount = feedbacks.filter((f) => f.result.success).length;
    return successCount / feedbacks.length;
  }

  private calculateAveragePerformance(feedbacks: PlaybackFeedback[]): PerformanceScore {
    const successfulFeedbacks = feedbacks.filter((f) => f.result.success);

    if (successfulFeedbacks.length === 0) {
      return { score: 0, details: {} };
    }

    const avgFPS = this.average(successfulFeedbacks.map((f) => f.result.performance.averageFPS));
    const avgMemory = this.average(
      successfulFeedbacks.map((f) => f.result.performance.peakMemoryMB),
    );
    const avgCPU = this.average(
      successfulFeedbacks.map((f) => f.result.performance.averageCPUPercent),
    );
    const avgLoadTime = this.average(
      successfulFeedbacks.map((f) => f.result.performance.loadTimeMs),
    );

    // 正規化スコア（0-1）
    const fpsScore = Math.min(avgFPS / 60, 1); // 60FPS を最高とする
    const memoryScore = Math.max(0, 1 - avgMemory / 1000); // 1GB を基準
    const cpuScore = Math.max(0, 1 - avgCPU / 100);
    const loadTimeScore = Math.max(0, 1 - avgLoadTime / 10000); // 10秒を基準

    const overallScore = (fpsScore + memoryScore + cpuScore + loadTimeScore) / 4;

    return {
      score: overallScore,
      details: {
        averageFPS: avgFPS,
        averageMemoryMB: avgMemory,
        averageCPUPercent: avgCPU,
        averageLoadTimeMs: avgLoadTime,
      },
    };
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

interface ConfigurationRecommendation {
  configuration: PlaybackConfiguration;
  confidence: number; // 0-1
  evidence: {
    sampleSize: number;
    successRate: number;
    averagePerformance: PerformanceScore;
    recentUsage: number; // 最近の使用頻度
  };
  tags: string[]; // ["high-performance", "stable", "popular" など]
}

interface PerformanceScore {
  score: number; // 0-1の正規化スコア
  details: {
    averageFPS: number;
    averageMemoryMB: number;
    averageCPUPercent: number;
    averageLoadTimeMs: number;
  };
}
```

## 4. 実装フェーズ

### Phase 1: 基盤システム (2-3週間)

#### 4.1 優先実装項目

1. **MCAPFingerprintGenerator** - ファイル解析・匿名化
2. **MCAPProfileManager** - ローカルプロファイル管理
3. **SmartErrorAnalyzer** - 基本的なエラー分析
4. **FeedbackCollector** - データ収集（ローカル保存のみ）

#### 4.2 検証項目

- フィンガープリントの一意性・匿名性
- プロファイルの保存・復元
- エラー分析の精度
- プライバシー保護の妥当性

### Phase 2: エラーハンドリング強化 (2週間)

#### 2.1 実装項目

1. **AutoRecoverySystem** - 自動復旧機能
2. **拡張機能自動インストール** - マーケットプレイス連携
3. **ユーザーガイダンスUI** - ステップバイステップ案内
4. **エラーパターン拡張** - より多くのエラータイプ対応

### Phase 3: 学習システム (2-3週間)

#### 3.1 実装項目

1. **RecommendationEngine** - 推奨生成
2. **サーバー連携** - フィードバック送信・推奨取得
3. **統計分析** - 使用パターン分析
4. **A/Bテスト機能** - 推奨精度の検証

### Phase 4: 最適化・運用 (1-2週間)

#### 4.1 実装項目

1. **パフォーマンス最適化** - 応答時間改善
2. **ユーザビリティ向上** - UI/UX改善
3. **監視・ログ** - 運用監視機能
4. **ドキュメント整備** - ユーザー向けガイド

## 5. 品質保証

### 5.1 プライバシー・セキュリティ

- [ ] データ匿名化の妥当性検証
- [ ] PII除去の完全性確認
- [ ] フィンガープリント逆算不可能性の検証
- [ ] GDPR/各国プライバシー法準拠確認

### 5.2 機能品質

- [ ] エラー検出精度: 90%以上
- [ ] 自動復旧成功率: 70%以上
- [ ] 推奨設定精度: 80%以上
- [ ] 応答時間: 500ms以下

### 5.3 運用品質

- [ ] システム可用性: 99.9%以上
- [ ] データ損失ゼロ
- [ ] セキュリティインシデントゼロ
- [ ] ユーザー満足度: 4.0/5.0以上

## 6. 成功指標 (KPI)

### 6.1 技術指標

- **エラー解決率**: 手動介入なしでの問題解決率
- **設定時間短縮**: プロファイル使用による設定時間削減
- **再生成功率**: 初回再生での成功率向上

### 6.2 ユーザー指標

- **機能採用率**: MCAP再生でのプロファイル使用率
- **エラー減少率**: ユーザー報告エラーの減少
- **満足度**: 機能に対するユーザー評価

---

**注意**: このシステムはプライバシー保護を最優先として設計されています。実装時には必ずプライバシー影響評価を実施し、適切な同意取得プロセスを確立してください。
